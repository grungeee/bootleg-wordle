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

The UI now relies on [Tailwind CSS](https://tailwindcss.com/) built locally. Run
`npm run build:css` to generate `css/tailwind.css` from `src/tailwind.css` using
`tailwind.config.js`. Dynamic classes used by the game logic (for example
`char--green`) are implemented in `css/tailwind-overrides.css`.

## Development

Bootleg Wordle now uses Next.js for its frontend. After installing dependencies you can start the dev server with:

```bash
npm run dev
```

Create a `.env.local` file with your Supabase credentials (see `.env.example`).

These environment variables are required; the application will throw an error at startup if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing.

Signing in is optional. Create an account from the login modal to save scores and view the `/leaderboard`, which lists the top results refreshed every 30 seconds.
