/**
 * The Sanity CLI injects `SANITY_APP_*` variables into the browser bundle as
 * `process.env.*`. Declaring only that shape keeps the app free of Node types.
 */
declare const process: {
  env: Record<string, string | undefined>
}
