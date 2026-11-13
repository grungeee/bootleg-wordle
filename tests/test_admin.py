import os
import sqlite3
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

os.environ.setdefault("SHARAPA_ANALYTICS_HMAC_KEY", "test-only-key-" + "0" * 48)
os.environ["SHARAPA_ADMIN_TOKEN"] = "admin-test-token-" + "1" * 24

from api import admin  # noqa: E402


SCHEMA = '''
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, username TEXT, username_norm TEXT,
                    leaderboard_public INTEGER DEFAULT 0, created_at TEXT);
CREATE TABLE scores (id TEXT PRIMARY KEY, user_id TEXT, day TEXT, points INTEGER, won INTEGER);
CREATE TABLE analytics_daily (day TEXT, country TEXT, device TEXT, os TEXT, sessions INTEGER,
    page_views INTEGER, seconds INTEGER, explorations INTEGER, pages_json TEXT,
    durations_json TEXT, features_json TEXT);
'''


def tailnet_client(host="100.64.0.5"):
    return TestClient(admin.app, client=(host, 41234))


class AdminGateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        path = Path(self.temp.name) / "admin.sqlite3"
        with sqlite3.connect(path) as conn:
            conn.executescript(SCHEMA)
        self.old_db = admin.DB_PATH
        admin.DB_PATH = path

    def tearDown(self):
        admin.DB_PATH = self.old_db
        self.temp.cleanup()

    def test_requests_outside_the_tailnet_are_refused(self):
        self.assertEqual(tailnet_client("203.0.113.9").get("/").status_code, 403)
        self.assertEqual(tailnet_client("203.0.113.9").get("/api/overview").status_code, 403)

    def test_a_tailnet_peer_without_the_token_is_refused(self):
        self.assertEqual(tailnet_client().get("/").status_code, 401)
        self.assertEqual(tailnet_client().get("/api/overview").status_code, 401)
        wrong = {"Authorization": "Bearer " + "x" * 40}
        self.assertEqual(tailnet_client().get("/api/overview", headers=wrong).status_code, 401)

    def test_the_token_opens_the_dashboard_and_sets_a_cookie(self):
        good = {"Authorization": "Bearer " + os.environ["SHARAPA_ADMIN_TOKEN"]}
        page = tailnet_client().get("/?token=" + os.environ["SHARAPA_ADMIN_TOKEN"], follow_redirects=False)
        self.assertEqual(page.status_code, 303)
        self.assertIn(admin.ADMIN_COOKIE, page.cookies)
        signed_in = tailnet_client()
        signed_in.cookies.update(page.cookies)
        self.assertEqual(signed_in.get("/").status_code, 200)
        self.assertEqual(tailnet_client().get("/api/overview", headers=good).status_code, 200)


if __name__ == "__main__":
    unittest.main()
