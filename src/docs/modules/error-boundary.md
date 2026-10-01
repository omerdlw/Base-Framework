# Error Boundary — `@/core/error`

## Purpose

Error Boundary keeps a crash in one part of the UI from taking down the app, and reports what happened. It provides three boundary sizes:

- `GlobalError`: full screen, resets on route change.
- `ModuleError`: wraps each core module inside `CoreProvider`.
- `ComponentError`: inline, for risky widgets.

It also provides a `GlobalErrorListener` that catches `window.error` and `unhandledrejection`.

Every caught error goes to a pluggable `ErrorReporter` (sampling, de-duplication by fingerprint, `beforeSend`, console or Sentry sinks) and is broadcast as `EVENT_TYPES.APP_ERROR`. The dock turns that event into its error status card, and notifications can toast it. Neither needs to import this module.

## Public API

| Export                                                                                                                                                                                                  | Kind            | Description                                                                                                           |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `GlobalError`                                                                                                                                                                                           | component       | Full-screen boundary; `resetKey` is the pathname.                                                                     |
| `ModuleError`                                                                                                                                                                                           | component       | Module-scoped boundary (`name` shows in the fallback title).                                                          |
| `ComponentError`                                                                                                                                                                                        | component       | Inline boundary with an optional custom `message`.                                                                    |
| `ErrorBoundaryCore`                                                                                                                                                                                     | class component | The shared implementation (`variant: "full" \| "module" \| "inline"`, `fallback` render prop, `onReset`, `resetKey`). |
| `GlobalErrorListener`                                                                                                                                                                                   | component       | Window error/rejection listener → reporter + `APP_ERROR`.                                                             |
| `getErrorReporter(options?)`                                                                                                                                                                            | factory         | Singleton reporter: `addHandler`, `removeHandler`, `setContext`, `captureError`.                                      |
| `createConsoleHandler()`, `createSentryHandler(Sentry)`                                                                                                                                                 | factories       | Reporter sinks.                                                                                                       |
| `createReport`, `createErrorContext`, `fingerprint`, `getErrorMessage`, `shouldIgnoreError`, `getBrowserEnvironment`, `normalizeSampleRate`, `normalizeDedupeWindow`, `getRuntimePath`, `getUserAgent`, | utils           | Report construction and filtering.                                                                                    |
| `ERROR_MESSAGES`, `errorTheme`, `ERROR_LISTENER_CONFIG`, `DEFAULT_DEDUPE_WINDOW`, `MAX_CONTEXT`, `MAX_FINGERPRINTS`                                                                                     | constants       | Copy, styles, limits.                                                                                                 |

## Usage

```tsx
<ComponentError message="Chart failed to load">
  <RevenueChart />
</ComponentError>
```

```ts
// Wire a reporting sink once, e.g. in an app-level client component
import * as Sentry from "@sentry/nextjs";
getErrorReporter({ sampleRate: 0.5 })
  .addHandler(createSentryHandler(Sentry))
  .setContext("release", process.env.NEXT_PUBLIC_RELEASE);
```

## File responsibilities

| File           | Responsibility                                                                   |
| :------------- | :------------------------------------------------------------------------------- |
| `index.ts`     | Public barrel.                                                                   |
| `types.ts`     | Report, context, environment, reporter options, fallback render types.           |
| `constants.ts` | Messages, styles, listener config, dedupe limits.                                |
| `utils.ts`     | Fingerprinting, report creation, error normalization and ignore rules.           |
| `boundary.tsx` | `ErrorBoundaryCore` plus the three boundary variants; this is the module's view. |
| `listener.ts`  | `GlobalErrorListener`: window events → reporter and `globalEvents`.              |
| `reporter.ts`  | `ErrorReporter` (sampling, dedupe, handlers) and sink factories.                 |

`builder.ts`, `provider.tsx`, `view.tsx` and `motion.ts` are intentionally absent; see [README](./README.md#why-some-optional-files-are-absent).

## Dependencies

- **Uses:** `@/core/events` (`APP_ERROR`), `@/core/primitives` (fallback UI), `next/navigation` (`usePathname` for reset).
- **Used by:** `src/core/provider.tsx` (wraps the tree in `GlobalError`, passes `ModuleError` to `ModuleHost` as the boundary around every module backdrop and overlay (and `ModuleBoundary`), mounts `GlobalErrorListener`). The dock status and notifications react to `APP_ERROR`.

## What users read, what reports keep

Raw `Error.message` values (database, SDK, vendor wording) never reach the UI. `toUserMessage(error, { fallback?, codes? })` from `@/core/utils` is the single gate: only a `UserError`, a string `Result` error or a 4xx payload from our own API is shown as written; everything else maps to a fixed sentence in `USER_MESSAGES`. Server code throws `UserError` for validation and permission text it wants shown, and route handlers answer with `apiErrorResponse` from `@/infrastructure/http/api-error`.

`report(scope, error, level?)` from `@/core/utils` replaces `console.*` everywhere: `GlobalErrorListener` installs the reporter as its sink on the client, browsers stay silent in production without one, and servers always log. Only the reporter's dev-only console handler touches `console`.
