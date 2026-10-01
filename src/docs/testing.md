# Testing

> **Scope:** how the test suite is organised, the harness it runs on, and how to add to it.

## Running

| Command                                                                       | Purpose                                               |
| :---------------------------------------------------------------------------- | :---------------------------------------------------- |
| `npm test`                                                                    | Whole suite (Node's built-in test runner)             |
| `npm run test:coverage`                                                       | Same, with a line/branch/function report for `src/**` |
| `npm run type-check`                                                          | Type-checks the app and, separately, the tests        |
| `node --import ./tests/support/register.mjs --test tests/core/kernel.test.ts` | One file                                              |

## Layout

Tests mirror the source layers, with one TypeScript file per unit holding every test for it:

```
tests/
  architecture.test.ts          layer boundaries and source-level contracts
  app/                          API route handlers, end to end
  core/                         kernel, error, hooks, primitives, tokens, utils, events, result, theme
  modules/                      dock, modal, notification, background, context-menu, controls, loading, ambient
  features/                     auth, account
  infrastructure/               security, http, env
  scripts/                      scaffold, sync, generate, check-architecture (run against throwaway repos)
  support/                      the harness (see below)
  tsconfig.json                 type-checking for the tests
```

Inside a file, a `describe` block per topic keeps related tests together (for example `dock.test.ts` groups context, guards, reducers, surface transitions, utils, status and display).

## Harness (`tests/support`)

- `register.mjs` runs TypeScript and TSX directly: it resolves the `@/` alias, transpiles on load and stubs `next/font`, `next/navigation`, `next/cache`, `server-only` and the server Supabase client.
- `dom.ts` installs a happy-dom window for component and hook tests.
- `render.ts` provides `render`, `renderHook` and `flush`, wrapping React's `act`. Rendered trees are unmounted after every test.
- `themes.ts` provides `Themed`, a `ThemeProvider` with the core themes from `src/config/`. Components that read a theme need it.
- `supabase.ts` provides `installFakeSupabase`: an authenticated or anonymous session, per-table results (or a sequence of results), recorded queries and RPC calls. `apiRequest` and `signedIn` build requests and claims. Route handlers, server actions and `requireUser` all run for real on top of it.
- `fixture.ts` builds a miniature framework checkout (the real scaffold, sync and validate scripts plus a few project files) in a temp directory, committed and tagged, so the scripts run end to end.

## Type-checking the tests

`tests/tsconfig.json` extends the root configuration with `strict` on but `noImplicitAny` off, so fixtures and stubs stay light while imports, call signatures and return types are still verified. Reach for a typed helper before an `as any` cast.

## Conventions

- Assert behaviour a user or a caller can observe, not implementation detail.
- Failures deserve as much care as success: what is shown to people, what is reported, what is rethrown, what is never leaked.
- Security rules get their own tests: cross-site rejection, authentication, ownership filters on every write, privacy gates, rate limits.
- Code that reports through `report()` is tested by installing a sink with `setReportSink` and releasing it afterwards.
- A rejection inside `act` leaves React's act scope open; catch it inside the callback and assert on what you caught.
- Timer-based code takes short real delays (15 to 50 ms) or an injected clock; avoid sleeping longer.
- Every file starts in its own process, but the tests inside one file share globals (`globalEvents`, the error reporter). Subscribe in `beforeEach` and release in `afterEach`.

## Not covered

The visual overlays and cards of the dock, modal, notification and context-menu modules, the dock's navigation and transaction hooks, the YouTube iframe player and the Supabase client factories are exercised only indirectly. Browser-level checks (sign-in, passkeys, realtime) need a running Supabase stack and are done by hand.
