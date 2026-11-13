import json
import tempfile
import unittest
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from api import app as api

ORIGIN = {"Origin": "https://www.sharapa.io"}


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old_db = api.DB_PATH
        api.DB_PATH = Path(self.temp.name) / "site.sqlite3"
        api.GEO_READER = None
        api.LOGIN_ATTEMPTS.clear()
        self.client = TestClient(api.app, base_url="https://api.sharapa.io")
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        api.DB_PATH = self.old_db
        self.temp.cleanup()

    def register(self, *, public=True, username="wordfan"):
        return self.client.post("/api/v1/register", headers=ORIGIN, json={
            "email": f"{username}@example.test",
            "username": username,
            "password": "a sufficiently long test phrase",
            "leaderboard_public": public,
        })

    def test_registration_hashes_password_and_sets_secure_session_cookie(self):
        response = self.register()
        self.assertEqual(response.status_code, 201, response.text)
        self.assertFalse(response.json()["user"]["email_verified"])
        self.assertIn("no confirmation email", response.json()["message"].lower())
        cookie = response.headers["set-cookie"].lower()
        self.assertIn("httponly", cookie)
        self.assertIn("secure", cookie)
        self.assertIn("samesite=lax", cookie)
        self.assertEqual(self.client.get("/api/v1/me").status_code, 200)
        with closing(api.connect_db()) as conn:
            stored = conn.execute("SELECT password_hash FROM users").fetchone()[0]
        self.assertNotIn("a sufficiently long test phrase", stored)
        self.assertTrue(stored.startswith("$argon2id$"))

    def test_login_and_duplicate_registration(self):
        self.assertEqual(self.register().status_code, 201)
        duplicate = self.register()
        self.assertEqual(duplicate.status_code, 409)
        self.client.post("/api/v1/logout", headers=ORIGIN)
        login = self.client.post("/api/v1/login", headers=ORIGIN, json={
            "login": "WORDFAN", "password": "a sufficiently long test phrase"
        })
        self.assertEqual(login.status_code, 200, login.text)
        self.assertEqual(login.json()["user"]["username"], "wordfan")

    def test_leaderboard_records_one_daily_result_without_exposing_email(self):
        self.assertEqual(self.register(public=True).status_code, 201)
        today = datetime.now(timezone.utc).date().isoformat()
        first = self.client.post("/api/v1/scores", headers=ORIGIN, json={
            "day": today, "guesses": 3, "won": True
        })
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(first.json()["score"]["points"], 4)
        duplicate = self.client.post("/api/v1/scores", headers=ORIGIN, json={
            "day": today, "guesses": 1, "won": True
        })
        self.assertTrue(duplicate.json()["duplicate"])
        scores = self.client.get("/api/v1/scores?days=30").json()["scores"]
        self.assertEqual(len(scores), 1)
        self.assertEqual(scores[0]["username"], "wordfan")
        self.assertEqual(scores[0]["points"], 4)
        self.assertNotIn("email", scores[0])

    def test_private_scores_are_not_public(self):
        self.assertEqual(self.register(public=False).status_code, 201)
        today = datetime.now(timezone.utc).date().isoformat()
        self.client.post("/api/v1/scores", headers=ORIGIN, json={
            "day": today, "guesses": 2, "won": True
        })
        self.assertEqual(self.client.get("/api/v1/scores").json()["scores"], [])

    def test_account_can_change_public_score_visibility(self):
        self.assertEqual(self.register(public=False).status_code, 201)
        changed = self.client.post("/api/v1/account/leaderboard", headers=ORIGIN,
            json={"leaderboard_public": True})
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertTrue(changed.json()["user"]["leaderboard_public"])
        today = datetime.now(timezone.utc).date().isoformat()
        self.client.post("/api/v1/scores", headers=ORIGIN, json={
            "day": today, "guesses": 2, "won": True
        })
        self.assertEqual(len(self.client.get("/api/v1/scores").json()["scores"]), 1)

    def test_analytics_requires_opt_in_and_stores_only_coarse_dimensions(self):
        session_id = "6a2db47e-90a9-4b49-8e27-114de32d4088"
        denied = self.client.post("/api/v1/analytics", headers=ORIGIN, json={
            "consent": False, "session_id": session_id, "page": "world", "event": "page_view"
        })
        self.assertEqual(denied.status_code, 403)
        common = {"consent": True, "session_id": session_id, "page": "world"}
        self.assertEqual(self.client.post("/api/v1/analytics", headers=ORIGIN,
            json={**common, "event": "page_view"}).status_code, 204)
        self.assertEqual(self.client.post("/api/v1/analytics", headers=ORIGIN,
            json={**common, "event": "duration", "seconds": 12}).status_code, 204)
        self.assertEqual(self.client.post("/api/v1/analytics", headers=ORIGIN,
            json={**common, "event": "explore", "feature": "world_sphere"}).status_code, 204)
        with closing(api.connect_db()) as conn:
            raw = conn.execute("SELECT * FROM analytics_sessions").fetchone()
            daily = conn.execute("SELECT * FROM analytics_daily").fetchone()
            self.assertEqual(raw["page_views"], 1)
            self.assertEqual(raw["seconds"], 12)
            self.assertEqual(raw["explorations"], 1)
            self.assertEqual(json.loads(daily["features_json"]), {"world_sphere": 1})
            values = " ".join(str(value) for value in raw)
            self.assertNotIn(session_id, values)
            self.assertNotIn("Mozilla", values)
            self.assertNotIn("127.0.0.1", values)
            self.assertNotIn("user_agent", raw.keys())
            self.assertNotIn("ip", raw.keys())

    def test_analytics_rejects_unknown_page_or_feature(self):
        base = {"consent": True, "session_id": "6a2db47e-90a9-4b49-8e27-114de32d4088",
                "page": "world", "event": "explore", "feature": "passcode"}
        response = self.client.post("/api/v1/analytics", headers=ORIGIN, json=base)
        self.assertEqual(response.status_code, 422)

    def test_analytics_retention_removes_expired_rows(self):
        with closing(api.connect_db()) as conn:
            conn.execute("INSERT INTO analytics_sessions(session_key,day,country,device,os) VALUES(?,?,?,?,?)",
                         ("old", "2000-01-01", "ZZ", "desktop", "Other"))
            conn.execute("INSERT INTO analytics_daily(day,country,device,os) VALUES(?,?,?,?)",
                         ("2000-01-01", "ZZ", "desktop", "Other"))
            conn.commit()
        api.purge_expired_analytics()
        with closing(api.connect_db()) as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM analytics_sessions").fetchone()[0], 0)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM analytics_daily").fetchone()[0], 0)

    def test_mutations_reject_unapproved_origin(self):
        response = self.client.post("/api/v1/register", headers={"Origin": "https://evil.example"}, json={
            "email": "user@example.test", "username": "someone", "password": "long enough password"
        })
        self.assertEqual(response.status_code, 403)

    def test_account_deletion_cascades_scores(self):
        self.assertEqual(self.register().status_code, 201)
        today = datetime.now(timezone.utc).date().isoformat()
        self.client.post("/api/v1/scores", headers=ORIGIN, json={
            "day": today, "guesses": 4, "won": True
        })
        response = self.client.post("/api/v1/account/delete", headers=ORIGIN,
                                    json={"password": "a sufficiently long test phrase"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"deleted": True})
        with closing(api.connect_db()) as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM users").fetchone()[0], 0)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM scores").fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()
