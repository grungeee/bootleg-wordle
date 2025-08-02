# Bootleg Wordle

This project is a simple implementation of Wordle.

## How the Game Works

Bootleg Wordle follows the core rules of the original Wordle puzzle:

1. **Guess the Word** – Each round starts with the game choosing a random
   five‑letter secret word from a large internal word list. Players have six
   attempts to identify this secret word.
2. **Enter Letters** – Use the physical keyboard (or on‑screen keys if
   available) to type a guess into the current row of the game board. Only
   alphabetic characters are permitted and pasting is disabled to keep input
   honest.
3. **Submit a Guess** – When a five‑letter word is entered, press **Enter** to
   submit it. Invalid or unknown words are rejected and the player must try a
   different guess.
4. **Read the Feedback** – After a valid guess, each letter is coloured to show
   how it relates to the secret word:
   - **Green** means the letter is in the correct position.
   - **Yellow** means the letter appears in the word but in a different
     position.
   - **Gray** means the letter does not appear in the word at all.
   Keyboard keys mirror these colours so you can track which letters are still
   viable for later guesses.
5. **Win or Lose** – Guessing the word within six tries triggers a win screen;
   failing to do so reveals the answer and presents a loss screen. The end
   modal includes a link to a Wikipedia page for the solution so players can
   learn more about the word.
6. **Play Again** – Starting a new game resets the board, keyboard colours and
   randomly selects a new word, allowing you to keep playing as long as you
   like.

These mechanics are implemented in `js/wordleJS.js`, which handles word
selection, input validation and user interface updates. For a detailed
walkthrough of how that script works step by step, see
[`PROGRAM.md`](PROGRAM.md).

## Running tests

1. Ensure you have Node.js installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the test suite:
   ```bash
   npm test
   ```

The tests use [Jest](https://jestjs.io/) and currently cover utility functions such as `newRNG`.

## Styling with Tailwind CSS

The UI now relies on [Tailwind CSS](https://tailwindcss.com/) built locally. Run
`npm run build:css` to generate `css/tailwind.css` from `src/tailwind.css` using
`tailwind.config.js`. Dynamic classes used by the game logic (for example
`char--green`) are implemented in `css/tailwind-overrides.css`.
