# Bootleg Wordle

This project is a simple implementation of Wordle.

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

The UI now relies on [Tailwind CSS](https://tailwindcss.com/) loaded from the CDN. Custom theme colors and fonts are configured directly in `index.html` using the `tailwind.config` global. Dynamic classes used by the game logic (for example `char--green`) are implemented in `css/tailwind-overrides.css`.
