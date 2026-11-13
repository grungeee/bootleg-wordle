# SHARAPA word game and invite-only world

The public front page is the word game. `/play/` remains a compatible game URL.
The optional `/world/` page is an encrypted, passcode-gated portfolio experience.

## Site

- `index.html`, `play/index.html`: public game only.
- `css/style.css`, `css/public-game.css`, `js/core.js`, `js/game.js`, `js/words.js`: game.
- `world/index.html`, `css/lock.css`, `js/unlock.js`: public lock screen.
- `world/payload.json`: AES-256-GCM ciphertext, PBKDF2-SHA256, random salt/IV.
- Private source and build tooling are kept outside this public repository.
- `tests/*.test.cjs`: game rules, gate structure and public boundary tests.

## Run

```sh
npm run serve
npm test
```

No site build dependencies. HTTPS or localhost is required for Web Crypto.
Google Fonts is used by the game. Optional visit statistics are loaded only after a
visitor chooses ALLOW VISIT STATS; see the API backend section below.

## Access model and limits

The extras are encrypted rather than merely hidden by CSS or a JavaScript boolean.
The code and decrypted document are not saved to cookies, localStorage or
sessionStorage. Reload or LOCK WORLD discards the current unlocked document.
Decrypted markup runs in an opaque-origin, sandboxed iframe with no network
connections permitted by its embedded Content Security Policy.

This is a casual invitation lock, not authentication for sensitive material.
A short numeric code can be brute-forced offline despite the deliberately costly
key derivation. This public repository previously contained an unencrypted
portfolio, so historical commits may retain previously public content. Encryption
of the current site does not erase copies or repository history. Strong privacy
requires a server-side authenticated service and a longer secret.

## Deployment

GitHub Pages serves `master`/root with CNAME `www.sharapa.io`. GitHub manages TLS
issuance and renewal. Verify the exact deployed content and both hostnames after
publishing. Do not install certbot for this Pages site.

## Game persistence

Keep the existing `sharapa.wordle.v1` localStorage key. Moving between `/` and
`/play/` on the same origin must not discard daily progress. Statistics remain
browser-local. Daily answers use the local calendar date and are client-visible.

## API backend (accounts, high scores, visit statistics)

The static site stays on GitHub Pages; writes go to a small self-hosted API at
`https://api.sharapa.io`. Implementation lives in `api/app.py`, a FastAPI app with
SQLite, Argon2id password hashing, hashed session tokens in `Secure`, `HttpOnly`
cookies, per-IP rate limits and origin checks.

Accounts are optional and have no email confirmation: a player registers with
email, username and password. Scores are one row per account per day and are
browser-submitted, so the leaderboard is casual play, not tamper-proof. Usernames
appear publicly only after the player opts in.

Visit statistics are opt-in. The client posts only device class, OS, IP-derived
country, page time and exploration counts. No raw IP, user agent string, tracking
cookie or fingerprint is stored. Session rows are deleted after 30 days, daily
aggregates after 396 days.

### Deploying

```bash
bash deploy/generate-secrets.sh      # writes .secrets/api.env (0600, gitignored)
sudo bash deploy/setup-server.sh     # nginx, venv, service, vhost, TLS when DNS is ready
```

`deploy/setup-server.sh` copies the app to `/opt/sharapa-api`, the database to
`/var/lib/sharapa-api`, and the environment file to `/etc/sharapa-api/api.env`
(mode 0640, group `sharapa-api`). It installs and enables
`sharapa-api.service` (bound to `127.0.0.1:8760`) behind nginx, which is the only
public listener.

The API hostname needs its own DNS record, because GitHub Pages owns the apex and
`www` records:

```
api.sharapa.io  A     <server IPv4>
api.sharapa.io  AAAA  <server IPv6>
```

Once the record resolves to the server, re-run `deploy/setup-server.sh` (it
requests the certificate automatically) or run
`certbot --nginx -d api.sharapa.io --redirect`.

### Country lookup data

Country comes from the DB-IP Lite database (CC BY 4.0), stored at
`/var/lib/sharapa-api/ip-to-country.mmdb`. Refresh it monthly:

```bash
curl -fsSL -o /tmp/dbip.mmdb.gz "https://download.db-ip.com/free/dbip-country-lite-$(date +%Y-%m).mmdb.gz"
gunzip -c /tmp/dbip.mmdb.gz > /tmp/dbip.mmdb
sudo install -o root -g sharapa-api -m 0640 /tmp/dbip.mmdb /var/lib/sharapa-api/ip-to-country.mmdb
sudo systemctl restart sharapa-api
```

Without the file the API records `ZZ` and never fails.

### Operating

```bash
systemctl status sharapa-api
journalctl -u sharapa-api -n 50
curl -fsS https://api.sharapa.io/api/v1/healthz
```

Tests: `npm test` for the static site, and
`/opt/sharapa-api/venv/bin/python -m unittest discover -s tests -p 'test_api.py'`
from the repository root for the API (the venv has the runtime dependencies; the
system interpreter does not).
