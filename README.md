# SHARAPA word game

A daily five letter word game that runs as a static site. Plain HTML, CSS and
JavaScript: no framework, no bundler, no dependencies, no tracking.

Live at [sharapa.io](https://www.sharapa.io).

## What it does

- One word a day for every visitor, picked from a hash of the date, so no server is needed.
- Six guesses, five letters, colour coded feedback on the tiles and the keyboard.
- Statistics, streaks and a guess distribution stored in local storage on the player's device.
- Shareable result grid, copied to the clipboard in one click.
- Practice words once the daily puzzle is finished, without touching the streak.
- Playable from a physical keyboard or the on screen one, with dialogs that handle focus and escape.
- Respects `prefers-reduced-motion` and keeps a readable contrast ratio on every state.

## Structure

```
index.html          markup, dialogs, the portfolio sections below the game
css/style.css       all styling, one file
js/words.js         ANSWERS (daily pool) and ALLOWED (accepted guesses)
js/core.js          pure logic: scoring, date hash, share grid
js/game.js          the interface
tests/core.test.cjs tests for the scoring rules
```

`js/core.js` has no DOM access and is imported by the test suite, which is why the
tricky part (repeated letters) is covered by tests instead of by eye.

## Run it

```sh
python3 -m http.server 8099   # or: npm run serve
npm test                      # node --test, nothing to install
```

## How the daily word works

`pickIndex('sharapa-' + YYYY-MM-DD, ANSWERS.length)` hashes the local calendar date
into an index. Every visitor on the same day gets the same word, the puzzle rolls
over at local midnight, and nothing is fetched from a server.

## Scoring

A guess is scored in two passes. Exact matches are marked first and their tiles are
removed from the pool, then the remaining letters are marked present only if a tile
is still free. That is what stops a repeated letter from borrowing a tile that is
already green.

## History

Grew out of a prototype built while learning JavaScript. Rewritten with a tested
scoring core, a daily seed, saved progress and an accessible interface.
