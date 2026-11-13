"""Self-hosted, privacy-minimized API for sharapa.io."""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import ipaddress
import json
import os
import re
import secrets
import sqlite3
import time
import uuid
from collections import defaultdict, deque
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

DB_PATH = Path(os.environ.get("SHARAPA_API_DATABASE", "/var/lib/sharapa-api/site.sqlite3"))
GEOIP_PATH = Path(os.environ.get("SHARAPA_GEOIP_DATABASE", "/var/lib/sharapa-api/ip-to-country.mmdb"))
ORIGINS = tuple(x.strip() for x in os.environ.get(
    "SHARAPA_ALLOWED_ORIGINS", "https://www.sharapa.io,https://sharapa.io"
).split(",") if x.strip())
ANALYTICS_HMAC_KEY = os.environ.get("SHARAPA_ANALYTICS_HMAC_KEY", secrets.token_hex(32)).encode()
SESSION_DAYS = 30
ANALYTICS_SESSION_DAYS = 30
ANALYTICS_AGGREGATE_DAYS = 396
COOKIE_NAME = "sharapa_session"

PASSWORDS = PasswordHasher(time_cost=2, memory_cost=19_456, parallelism=1, hash_len=32, salt_len=16)
DUMMY_PASSWORD_HASH = PASSWORDS.hash("not-a-real-user-password")
LOGIN_ATTEMPTS: dict[tuple[str, str], deque[float]] = defaultdict(deque)
GEO_READER: Any = None
CLEANUP_TASK: asyncio.Task | None = None

PAGES = {"home", "play", "world", "scores", "privacy"}
FEATURES = {
    "help_open", "stats_open", "theme_toggle", "practice_start", "daily_start",
    "game_finish", "world_unlock", "world_sphere", "leaderboard_open", "account_open",
}
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,24}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

app = FastAPI(title="SHARAPA API", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["api.sharapa.io", "localhost", "127.0.0.1", "testserver"],
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(ORIGINS),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    max_age=600,
)


@app.middleware("http")
async def privacy_and_security_headers(request: Request, call_next):
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > 16_384:
        return Response(status_code=413, content="Request too large")
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


def connect_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA secure_delete = ON")
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        os.chmod(DB_PATH.parent, 0o700)
    except OSError:
        pass
    conn = connect_db()
    try:
        conn.execute("PRAGMA journal_mode = DELETE")
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                email_norm TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL,
                username_norm TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                leaderboard_public INTEGER NOT NULL DEFAULT 0 CHECK (leaderboard_public IN (0, 1)),
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS auth_sessions (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions(user_id);
            CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                day TEXT NOT NULL,
                guesses INTEGER NOT NULL CHECK (guesses BETWEEN 1 AND 6),
                won INTEGER NOT NULL CHECK (won IN (0, 1)),
                points INTEGER NOT NULL CHECK (points BETWEEN 0 AND 6),
                created_at TEXT NOT NULL,
                UNIQUE(user_id, day)
            );
            CREATE INDEX IF NOT EXISTS scores_day ON scores(day);
            CREATE TABLE IF NOT EXISTS analytics_sessions (
                session_key TEXT NOT NULL,
                day TEXT NOT NULL,
                country TEXT NOT NULL,
                device TEXT NOT NULL,
                os TEXT NOT NULL,
                page_views INTEGER NOT NULL DEFAULT 0,
                seconds INTEGER NOT NULL DEFAULT 0,
                explorations INTEGER NOT NULL DEFAULT 0,
                pages_json TEXT NOT NULL DEFAULT '{}',
                durations_json TEXT NOT NULL DEFAULT '{}',
                features_json TEXT NOT NULL DEFAULT '{}',
                PRIMARY KEY(session_key, day)
            );
            CREATE TABLE IF NOT EXISTS analytics_daily (
                day TEXT NOT NULL,
                country TEXT NOT NULL,
                device TEXT NOT NULL,
                os TEXT NOT NULL,
                sessions INTEGER NOT NULL DEFAULT 0,
                page_views INTEGER NOT NULL DEFAULT 0,
                seconds INTEGER NOT NULL DEFAULT 0,
                explorations INTEGER NOT NULL DEFAULT 0,
                pages_json TEXT NOT NULL DEFAULT '{}',
                durations_json TEXT NOT NULL DEFAULT '{}',
                features_json TEXT NOT NULL DEFAULT '{}',
                PRIMARY KEY(day, country, device, os)
            );
            """
        )
        conn.commit()
        if DB_PATH.exists():
            os.chmod(DB_PATH, 0o600)
    finally:
        conn.close()
    _open_geo_database()


def _open_geo_database() -> None:
    global GEO_READER
    if not GEOIP_PATH.is_file():
        GEO_READER = None
        return
    try:
        import maxminddb
        GEO_READER = maxminddb.open_database(str(GEOIP_PATH))
    except Exception:
        GEO_READER = None


def purge_expired_analytics() -> None:
    conn = connect_db()
    try:
        conn.execute("DELETE FROM analytics_sessions WHERE day < date('now','-30 day')")
        conn.execute("DELETE FROM analytics_daily WHERE day < date('now','-396 day')")
        conn.commit()
    finally:
        conn.close()


async def _analytics_cleanup_loop() -> None:
    while True:
        await asyncio.sleep(86_400)
        try:
            purge_expired_analytics()
        except Exception:
            continue


@app.on_event("startup")
async def startup() -> None:
    global CLEANUP_TASK
    init_db()
    purge_expired_analytics()
    CLEANUP_TASK = asyncio.create_task(_analytics_cleanup_loop())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_map(value: str | None) -> dict[str, int]:
    try:
        result = json.loads(value or "{}")
        if isinstance(result, dict):
            return {str(k): int(v) for k, v in result.items() if isinstance(v, int) and v >= 0}
    except (TypeError, ValueError, json.JSONDecodeError):
        pass
    return {}


def _map_json(value: dict[str, int]) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _require_origin(request: Request) -> None:
    if request.headers.get("origin") not in ORIGINS:
        raise HTTPException(status_code=403, detail="This request origin is not allowed.")


def _rate_limit(request: Request, bucket: str, maximum: int, window: int) -> None:
    host = request.client.host if request.client else "unknown"
    digest = hmac.new(ANALYTICS_HMAC_KEY, host.encode("utf-8", "ignore"), hashlib.sha256).hexdigest()
    key = (bucket, digest)
    now = time.monotonic()
    attempts = LOGIN_ATTEMPTS[key]
    while attempts and attempts[0] <= now - window:
        attempts.popleft()
    if len(attempts) >= maximum:
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait and try again.")
    attempts.append(now)
    if len(LOGIN_ATTEMPTS) > 10_000:
        for old_key in list(LOGIN_ATTEMPTS):
            q = LOGIN_ATTEMPTS[old_key]
            while q and q[0] <= now - window:
                q.popleft()
            if not q:
                LOGIN_ATTEMPTS.pop(old_key, None)


def _body_string(data: dict[str, Any], name: str, maximum: int) -> str:
    value = data.get(name)
    if not isinstance(value, str) or len(value) > maximum:
        raise HTTPException(status_code=422, detail=f"Invalid {name}.")
    return value


async def _read_json(request: Request) -> dict[str, Any]:
    try:
        value = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Expected a JSON request.")
    if not isinstance(value, dict):
        raise HTTPException(status_code=400, detail="Expected a JSON object.")
    return value


def _new_session(conn: sqlite3.Connection, user_id: str, response: Response) -> None:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    now = int(time.time())
    expiry = now + SESSION_DAYS * 86_400
    conn.execute(
        "INSERT INTO auth_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)",
        (token_hash, user_id, expiry, _now_iso()),
    )
    response.set_cookie(
        COOKIE_NAME, token, max_age=SESSION_DAYS * 86_400, path="/",
        secure=True, httponly=True, samesite="lax",
    )


def _current_user(request: Request, conn: sqlite3.Connection) -> sqlite3.Row:
    token = request.cookies.get(COOKIE_NAME, "")
    if not token or len(token) > 256:
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    row = conn.execute(
        "SELECT u.id,u.email,u.username,u.leaderboard_public,u.created_at,s.token_hash "
        "FROM auth_sessions s JOIN users u ON u.id=s.user_id "
        "WHERE s.token_hash=? AND s.expires_at>?",
        (token_hash, int(time.time())),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    return row


def _user_json(user: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "leaderboard_public": bool(user["leaderboard_public"]),
        "email_verified": False,
        "created_at": user["created_at"],
    }


def _verify_password(encoded: str, password: str) -> bool:
    try:
        return PASSWORDS.verify(encoded, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


@app.get("/api/v1/healthz")
def healthz():
    return {"ok": True, "service": "sharapa-api"}


@app.post("/api/v1/register", status_code=201)
async def register(request: Request, response: Response):
    _require_origin(request)
    _rate_limit(request, "register", 5, 86_400)
    data = await _read_json(request)
    email = _body_string(data, "email", 254).strip()
    username = _body_string(data, "username", 24).strip()
    password = _body_string(data, "password", 128)
    if not EMAIL_RE.fullmatch(email):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    if not USERNAME_RE.fullmatch(username):
        raise HTTPException(status_code=422, detail="Username must be 3 to 24 letters, numbers, dots, underscores, or hyphens.")
    if len(password) < 12:
        raise HTTPException(status_code=422, detail="Use a password with at least 12 characters.")
    public = data.get("leaderboard_public") is True
    user_id = str(uuid.uuid4())
    password_hash = PASSWORDS.hash(password)
    conn = connect_db()
    try:
        try:
            conn.execute(
                "INSERT INTO users(id,email,email_norm,username,username_norm,password_hash,leaderboard_public,created_at) "
                "VALUES(?,?,?,?,?,?,?,?)",
                (user_id, email, email.casefold(), username, username.casefold(), password_hash,
                 int(public), _now_iso()),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="That email or username is already in use.")
        _new_session(conn, user_id, response)
        conn.commit()
        user = conn.execute(
            "SELECT id,email,username,leaderboard_public,created_at FROM users WHERE id=?", (user_id,)
        ).fetchone()
        return {"user": _user_json(user), "message": "Account created. No confirmation email is sent."}
    finally:
        conn.close()


@app.post("/api/v1/login")
async def login(request: Request, response: Response):
    _require_origin(request)
    _rate_limit(request, "login", 10, 900)
    data = await _read_json(request)
    login_id = _body_string(data, "login", 254).strip().casefold()
    password = _body_string(data, "password", 128)
    conn = connect_db()
    try:
        user = conn.execute(
            "SELECT id,email,username,leaderboard_public,created_at,password_hash FROM users "
            "WHERE email_norm=? OR username_norm=?",
            (login_id, login_id),
        ).fetchone()
        encoded = user["password_hash"] if user else DUMMY_PASSWORD_HASH
        if not _verify_password(encoded, password) or user is None:
            raise HTTPException(status_code=401, detail="Email or username, or password, was not recognized.")
        _new_session(conn, user["id"], response)
        conn.commit()
        return {"user": _user_json(user)}
    finally:
        conn.close()


@app.get("/api/v1/me")
def me(request: Request):
    conn = connect_db()
    try:
        return {"user": _user_json(_current_user(request, conn))}
    finally:
        conn.close()


@app.post("/api/v1/account/leaderboard")
async def set_leaderboard_visibility(request: Request):
    _require_origin(request)
    _rate_limit(request, "account-settings", 30, 3_600)
    data = await _read_json(request)
    public = data.get("leaderboard_public")
    if not isinstance(public, bool):
        raise HTTPException(status_code=422, detail="Choose whether your username may appear on public scores.")
    conn = connect_db()
    try:
        user = _current_user(request, conn)
        conn.execute("UPDATE users SET leaderboard_public=? WHERE id=?", (int(public), user["id"]))
        conn.commit()
        updated = conn.execute(
            "SELECT id,email,username,leaderboard_public,created_at FROM users WHERE id=?", (user["id"],)
        ).fetchone()
        return {"user": _user_json(updated)}
    finally:
        conn.close()


@app.post("/api/v1/logout", status_code=204)
def logout(request: Request) -> Response:
    _require_origin(request)
    token = request.cookies.get(COOKIE_NAME, "")
    if token:
        conn = connect_db()
        try:
            conn.execute("DELETE FROM auth_sessions WHERE token_hash=?", (hashlib.sha256(token.encode()).hexdigest(),))
            conn.commit()
        finally:
            conn.close()
    # Returning the injected Response leaves its status_code as None, which the
    # ASGI server rejects with an empty reply; build the response explicitly.
    out = Response(status_code=204)
    out.delete_cookie(COOKIE_NAME, path="/", secure=True, httponly=True, samesite="lax")
    return out


@app.post("/api/v1/account/delete")
async def delete_account(request: Request, response: Response):
    _require_origin(request)
    data = await _read_json(request)
    password = _body_string(data, "password", 128)
    conn = connect_db()
    try:
        user = _current_user(request, conn)
        row = conn.execute("SELECT password_hash FROM users WHERE id=?", (user["id"],)).fetchone()
        if row is None or not _verify_password(row["password_hash"], password):
            raise HTTPException(status_code=403, detail="Password did not match.")
        conn.execute("DELETE FROM users WHERE id=?", (user["id"],))
        conn.commit()
        response.delete_cookie(COOKIE_NAME, path="/", secure=True, httponly=True, samesite="lax")
        return {"deleted": True}
    finally:
        conn.close()


@app.post("/api/v1/scores")
async def save_score(request: Request, response: Response):
    _require_origin(request)
    _rate_limit(request, "scores", 20, 3_600)
    data = await _read_json(request)
    raw_day = _body_string(data, "day", 10)
    try:
        score_day = date.fromisoformat(raw_day)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid game date.")
    today = datetime.now(timezone.utc).date()
    if score_day < today - timedelta(days=7) or score_day > today + timedelta(days=1):
        raise HTTPException(status_code=422, detail="That game date is outside the accepted range.")
    guesses = data.get("guesses")
    won = data.get("won")
    if isinstance(guesses, bool) or not isinstance(guesses, int) or not 1 <= guesses <= 6:
        raise HTTPException(status_code=422, detail="Invalid attempt count.")
    if not isinstance(won, bool) or (not won and guesses != 6):
        raise HTTPException(status_code=422, detail="Invalid completed-game result.")
    points = 7 - guesses if won else 0
    conn = connect_db()
    try:
        user = _current_user(request, conn)
        inserted = conn.execute(
            "INSERT OR IGNORE INTO scores(user_id,day,guesses,won,points,created_at) VALUES(?,?,?,?,?,?)",
            (user["id"], score_day.isoformat(), guesses, int(won), points, _now_iso()),
        ).rowcount == 1
        conn.commit()
        saved = conn.execute(
            "SELECT guesses,won,points FROM scores WHERE user_id=? AND day=?",
            (user["id"], score_day.isoformat()),
        ).fetchone()
        return {"saved": True, "duplicate": not inserted,
                "score": {"day": score_day.isoformat(), "guesses": saved["guesses"],
                          "won": bool(saved["won"]), "points": saved["points"]}}
    finally:
        conn.close()


@app.get("/api/v1/scores")
def leaderboard(days: int = 30, limit: int = 50):
    if not 1 <= days <= 365 or not 1 <= limit <= 100:
        raise HTTPException(status_code=422, detail="Invalid leaderboard range.")
    since = (datetime.now(timezone.utc).date() - timedelta(days=days - 1)).isoformat()
    conn = connect_db()
    try:
        rows = conn.execute(
            "SELECT u.username,SUM(s.points) AS points,SUM(s.won) AS wins,"
            "AVG(CASE WHEN s.won=1 THEN s.guesses END) AS average_guesses "
            "FROM scores s JOIN users u ON u.id=s.user_id "
            "WHERE s.day>=? AND u.leaderboard_public=1 "
            "GROUP BY u.id HAVING SUM(s.won)>0 "
            "ORDER BY points DESC,wins DESC,average_guesses ASC,u.username_norm ASC LIMIT ?",
            (since, limit),
        ).fetchall()
        return {"days": days, "scoring": "A win earns 7 minus guesses. A loss earns 0.",
                "scores": [{"username": r["username"], "points": r["points"], "wins": r["wins"],
                            "average_guesses": round(r["average_guesses"], 2)} for r in rows]}
    finally:
        conn.close()


def _country_for_ip(host: str) -> str:
    try:
        address = ipaddress.ip_address(host)
        if not address.is_global or GEO_READER is None:
            return "ZZ"
        record = GEO_READER.get(str(address)) or {}
        country = record.get("country") or {}
        code = country.get("iso_code") or record.get("country_code")
        return code if isinstance(code, str) and re.fullmatch(r"[A-Z]{2}", code) else "ZZ"
    except Exception:
        return "ZZ"


def _device_os(user_agent: str) -> tuple[str, str]:
    ua = user_agent.lower()
    if any(x in ua for x in ("ipad", "tablet", "kindle", "silk/")):
        device = "tablet"
    elif any(x in ua for x in ("mobile", "iphone", "ipod", "android")):
        device = "mobile"
    else:
        device = "desktop"
    if "windows" in ua:
        os_name = "Windows"
    elif "iphone" in ua or "ipad" in ua or "ipod" in ua:
        os_name = "iOS"
    elif "android" in ua:
        os_name = "Android"
    elif "mac os" in ua or "macintosh" in ua:
        os_name = "macOS"
    elif "cros" in ua:
        os_name = "ChromeOS"
    elif "linux" in ua:
        os_name = "Linux"
    else:
        os_name = "Other"
    return device, os_name


def _increment(mapping: dict[str, int], key: str, amount: int = 1) -> None:
    mapping[key] = mapping.get(key, 0) + amount


@app.post("/api/v1/analytics", status_code=204)
async def record_analytics(request: Request):
    _require_origin(request)
    _rate_limit(request, "analytics", 240, 3_600)
    data = await _read_json(request)
    if data.get("consent") is not True:
        raise HTTPException(status_code=403, detail="Analytics consent is required.")
    raw_id = _body_string(data, "session_id", 36)
    try:
        session_id = str(uuid.UUID(raw_id))
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid visit session.")
    page = data.get("page")
    event = data.get("event")
    if not isinstance(page, str) or page not in PAGES or not isinstance(event, str) or event not in {"page_view", "duration", "explore"}:
        raise HTTPException(status_code=422, detail="Invalid analytics event.")
    feature = ""
    seconds = 0
    if event == "duration":
        seconds = data.get("seconds")
        if isinstance(seconds, bool) or not isinstance(seconds, int) or not 1 <= seconds <= 30:
            raise HTTPException(status_code=422, detail="Invalid duration increment.")
    elif event == "explore":
        feature = data.get("feature")
        if not isinstance(feature, str) or feature not in FEATURES:
            raise HTTPException(status_code=422, detail="Invalid exploration event.")
    host = request.client.host if request.client else ""
    country = _country_for_ip(host)
    device, os_name = _device_os(request.headers.get("user-agent", ""))
    session_key = hmac.new(ANALYTICS_HMAC_KEY, session_id.encode(), hashlib.sha256).hexdigest()
    day = datetime.now(timezone.utc).date().isoformat()
    group = (day, country, device, os_name)
    conn = connect_db()
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute("DELETE FROM analytics_sessions WHERE day < date('now','-30 day')")
        conn.execute("DELETE FROM analytics_daily WHERE day < date('now','-396 day')")
        row = conn.execute(
            "SELECT page_views,seconds,explorations,pages_json,durations_json,features_json "
            "FROM analytics_sessions WHERE session_key=? AND day=?", (session_key, day)
        ).fetchone()
        is_new = row is None
        page_views = row["page_views"] if row else 0
        total_seconds = row["seconds"] if row else 0
        explorations = row["explorations"] if row else 0
        pages = _json_map(row["pages_json"] if row else "{}")
        durations = _json_map(row["durations_json"] if row else "{}")
        features = _json_map(row["features_json"] if row else "{}")
        delta_views = delta_seconds = delta_explorations = 0
        if event == "page_view":
            page_views += 1
            delta_views = 1
            _increment(pages, page)
        elif event == "duration":
            total_seconds += seconds
            delta_seconds = seconds
            _increment(durations, page, seconds)
        else:
            explorations += 1
            delta_explorations = 1
            _increment(features, feature)
        conn.execute(
            "INSERT INTO analytics_sessions(session_key,day,country,device,os,page_views,seconds,explorations,pages_json,durations_json,features_json) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(session_key,day) DO UPDATE SET "
            "page_views=excluded.page_views,seconds=excluded.seconds,explorations=excluded.explorations,"
            "pages_json=excluded.pages_json,durations_json=excluded.durations_json,features_json=excluded.features_json",
            (session_key, day, country, device, os_name, page_views, total_seconds, explorations,
             _map_json(pages), _map_json(durations), _map_json(features)),
        )
        daily = conn.execute(
            "SELECT sessions,page_views,seconds,explorations,pages_json,durations_json,features_json "
            "FROM analytics_daily WHERE day=? AND country=? AND device=? AND os=?", group
        ).fetchone()
        daily_sessions = (daily["sessions"] if daily else 0) + int(is_new)
        daily_views = (daily["page_views"] if daily else 0) + delta_views
        daily_seconds = (daily["seconds"] if daily else 0) + delta_seconds
        daily_explorations = (daily["explorations"] if daily else 0) + delta_explorations
        daily_pages = _json_map(daily["pages_json"] if daily else "{}")
        daily_durations = _json_map(daily["durations_json"] if daily else "{}")
        daily_features = _json_map(daily["features_json"] if daily else "{}")
        if event == "page_view":
            _increment(daily_pages, page)
        elif event == "duration":
            _increment(daily_durations, page, seconds)
        elif event == "explore":
            _increment(daily_features, feature)
        conn.execute(
            "INSERT INTO analytics_daily(day,country,device,os,sessions,page_views,seconds,explorations,pages_json,durations_json,features_json) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(day,country,device,os) DO UPDATE SET "
            "sessions=excluded.sessions,page_views=excluded.page_views,seconds=excluded.seconds,"
            "explorations=excluded.explorations,pages_json=excluded.pages_json,"
            "durations_json=excluded.durations_json,features_json=excluded.features_json",
            (*group, daily_sessions, daily_views, daily_seconds, daily_explorations,
             _map_json(daily_pages), _map_json(daily_durations), _map_json(daily_features)),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return Response(status_code=204)


@app.on_event("shutdown")
async def shutdown() -> None:
    global GEO_READER, CLEANUP_TASK
    if CLEANUP_TASK is not None:
        CLEANUP_TASK.cancel()
        try:
            await CLEANUP_TASK
        except asyncio.CancelledError:
            pass
        CLEANUP_TASK = None
    if GEO_READER is not None:
        try:
            GEO_READER.close()
        except Exception:
            pass
        GEO_READER = None
