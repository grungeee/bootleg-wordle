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

The app now uses [Tailwind CSS](https://tailwindcss.com) loaded from the CDN. Styles are applied directly in the HTML using Tailwind utility classes. Additional state classes such as `char--green` are defined in `css/custom.css`.

To modify styles, edit the HTML classes or the custom CSS file. No build step is required because the CDN version of Tailwind generates the required styles on the fly.
