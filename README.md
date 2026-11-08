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
Google Fonts is used by the game. No analytics is installed.

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
