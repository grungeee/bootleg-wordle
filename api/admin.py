"""Private read-only dashboard. Run bound to the server's Tailscale address."""
from __future__ import annotations

import hmac
import ipaddress
import json
import os
import sqlite3
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse, Response

from .app import DB_PATH

app = FastAPI(title="SHARAPA private admin", docs_url=None, redoc_url=None, openapi_url=None)
TAILSCALE_NETWORKS = (
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("fd7a:115c:a1e0::/48"),
)
ADMIN_HTML = Path(__file__).with_name("admin.html")
ADMIN_TOKEN = os.environ.get("SHARAPA_ADMIN_TOKEN", "").strip()
ADMIN_COOKIE = "sharapa_admin"


def _require_tailnet(request: Request) -> None:
    host = request.client.host if request.client else ""
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        raise HTTPException(status_code=403, detail="Tailscale access only.")
    if not any(address in network for network in TAILSCALE_NETWORKS):
        raise HTTPException(status_code=403, detail="Tailscale access only.")


def _presented_token(request: Request) -> str:
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return request.cookies.get(ADMIN_COOKIE, "")


def _require_token(request: Request) -> None:
    """The tailnet is a network boundary, not an identity: ask for the token too."""
    if len(ADMIN_TOKEN) < 24:
        raise HTTPException(status_code=503, detail="Admin token is not configured.")
    if not hmac.compare_digest(_presented_token(request), ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="Admin token required.")


def _read_db() -> sqlite3.Connection:
    if not DB_PATH.is_file():
        raise HTTPException(status_code=503, detail="Database is not ready.")
    conn = sqlite3.connect(DB_PATH.as_uri() + "?mode=ro", uri=True, timeout=5)
    conn.row_factory = sqlite3.Row
    return conn


@app.middleware("http")
async def no_cache(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"
    return response


@app.get("/")
def admin_home(request: Request, token: str = ""):
    _require_tailnet(request)
    if token:
        if len(ADMIN_TOKEN) < 24:
            raise HTTPException(status_code=503, detail="Admin token is not configured.")
        if not hmac.compare_digest(token, ADMIN_TOKEN):
            raise HTTPException(status_code=401, detail="Admin token required.")
        out = RedirectResponse("/", status_code=303)
        out.set_cookie(ADMIN_COOKIE, ADMIN_TOKEN, max_age=8 * 3600, httponly=True,
                       samesite="strict", secure=False, path="/")
        return out
    _require_token(request)
    return FileResponse(ADMIN_HTML, media_type="text/html; charset=utf-8")


@app.get("/api/overview")
def overview(request: Request):
    _require_tailnet(request)
    _require_token(request)
    conn = _read_db()
    try:
        totals = {
            "users": conn.execute("SELECT COUNT(*) FROM users").fetchone()[0],
            "public_players": conn.execute("SELECT COUNT(*) FROM users WHERE leaderboard_public=1").fetchone()[0],
            "scores": conn.execute("SELECT COUNT(*) FROM scores").fetchone()[0],
        }
        users = [dict(row) for row in conn.execute(
            "SELECT u.id,u.email,u.username,u.leaderboard_public,u.created_at,COUNT(s.id) AS score_count "
            "FROM users u LEFT JOIN scores s ON s.user_id=u.id GROUP BY u.id "
            "ORDER BY u.created_at DESC LIMIT 500"
        ).fetchall()]
        visitors = [dict(row) for row in conn.execute(
            "SELECT day,country,device,os,sessions,page_views,seconds,explorations,pages_json,durations_json,features_json "
            "FROM analytics_daily WHERE day>=date('now','-30 day') ORDER BY day DESC,country,device,os"
        ).fetchall()]
        for row in visitors:
            for key in ("pages_json", "durations_json", "features_json"):
                try:
                    row[key.removesuffix("_json")] = json.loads(row.pop(key))
                except (TypeError, ValueError, json.JSONDecodeError):
                    row[key.removesuffix("_json")] = {}
        leaders = [dict(row) for row in conn.execute(
            "SELECT u.username,SUM(s.points) AS points,SUM(s.won) AS wins "
            "FROM scores s JOIN users u ON u.id=s.user_id WHERE s.day>=date('now','-30 day') "
            "GROUP BY u.id ORDER BY points DESC,wins DESC,u.username_norm LIMIT 20"
        ).fetchall()]
        return {
            "totals": totals,
            "users": users,
            "visitors": visitors,
            "leaders": leaders,
            "retention": {
                "session_level": "30 days",
                "daily_aggregates": "396 days",
                "accounts_and_scores": "Until the account is deleted",
            },
        }
    finally:
        conn.close()
