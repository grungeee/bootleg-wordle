# Nikita Sharapa's interactive portfolio

Live: https://www.sharapa.io/
Game: https://www.sharapa.io/play/

A small, static personal world. The homepage has a low-poly avatar study and
four depth-sorted folders that orbit in front of and behind it. Drag horizontally,
use arrow controls, or use the ordinary shortcut links. Reduced motion disables
automatic rotation. With JavaScript disabled, folders remain ordinary links.

Only one project is currently featured: Nikita's first self-programmed word game.
The original code and visual design were his own. Later versions include
AI-assisted development and polish. The format is inspired by Wordle. No unrelated
repositories, third-party work presented as his own, or GitHub directory is promoted.

## Structure

- `index.html`, `css/portfolio.css`, `js/orbit.js`: homepage and navigation.
- `img/avatar-study.svg`: deliberately labelled stand-in, not a verified likeness.
- `play/index.html`, `css/style.css`, `css/game-portfolio.css`, `js/game.js`: game.
- `js/core.js`: pure scoring, local date seed and result grid logic.
- `js/words.js`: allowed guesses and common-answer pool.
- `tests/*.test.cjs`: logic, orbit interactions, attribution and internal-link checks.
- `fonts/inter-latin.woff2`, `fonts/OFL.txt`: locally hosted Inter and its license.
- `404.html`, `robots.txt`, `sitemap.xml`: navigation and search basics.

## Run and verify

```sh
npm run serve
# Open http://localhost:8080/ and http://localhost:8080/play/
npm test
node --check js/orbit.js
node --check js/game.js
```

No install or build step is needed for the site or tests. The homepage uses local
assets only; the game currently also uses Google Fonts. No analytics is installed.

The daily answer uses `pickIndex('sharapa-' + YYYY-MM-DD, ANSWERS.length)` and the
local calendar date. Daily progress and statistics retain the existing
`sharapa.wordle.v1` localStorage key, so moving the game to `/play/` on the same
origin does not discard them. Practice does not change daily statistics.

## Publishing

GitHub Pages serves the root of `master` with `CNAME` set to `www.sharapa.io`.
The apex redirects to the canonical HTTPS hostname. Check the actual certificate,
redirects and both routes after deploying, not only the Pages build status.
GitHub Pages manages certificate renewal; no manual certbot installation is needed.

## Intentional limits and next decisions

- The avatar is a generic geometric study until Nikita provides a reference.
- The orbit uses CSS transforms and depth sorting, not a fully rendered 3D scene.
- Other folders are story/about/contact, not invented portfolio projects.
- Daily words and answers are available client-side; this is a casual game, not
  a competitive anti-cheat system.
- Statistics are browser-local and do not sync between devices.
- No analytics, accounts, forms, cookies or tracking were added.
- Actual iOS Safari, Android and screen-reader device checks remain useful after
  the tested Chromium responsive, keyboard and reduced-motion checks.
