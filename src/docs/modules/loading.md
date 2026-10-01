# Loading — `@/modules/loading`

## Purpose

Loading owns the full-screen loading overlay and the app-wide "is something loading" flag. Pages declare a loading state through `usePage({ loading })` or `useLoading()`, and imperative code wraps async work with `withLoading()`. Either way, one overlay is shown with a spinner or a caller-supplied skeleton.

It keeps a `minDuration` so quick tasks don't flash the overlay, and it hides itself while a `FullscreenState` primitive is active (full-screen empty or error states take precedence).

## Public API

| Export                          | Kind      | Description                                                                                                          |
| :------------------------------ | :-------- | :------------------------------------------------------------------------------------------------------------------- |
| `loadingModule`                 | module    | The `defineModule` definition: install it in `CoreProvider` to get the provider, overlay and `usePage({ loading })`. |
| `LoadingProvider`               | component | Stable actions context plus a state store (read via `useLoadingState`). Mounted by the module host.                  |
| `LoadingOverlay` (default)      | component | The fixed overlay (`Z_INDEX.LOADING`), shown when `isLoading && showOverlay`.                                        |
| `LoadingContent`                | component | The overlay body: `skeleton` if given, otherwise a `Spinner`.                                                        |
| `useLoading(config?, options?)` | hook      | Registers a page-level loading config (`boolean`, message string, or `LoadingOptions`) and returns state + actions.  |
| `useLoadingState()`             | hook      | Read-only `LoadingStateWithPage` (`isLoading`, `isPageLoading`, `message`, `skeleton`, …).                           |
| `useLoadingActions()`           | hook      | `startLoading`, `stopLoading`, `setLoading`, `setSkeleton`, `withLoading`.                                           |
| `defineLoading(def)`            | builder   | Reusable loading preset with a `.use(overrides?)` hook.                                                              |
| `useLoadingRegistration`        | hook      | Registers a loading config for the current page outside `usePage` (same input as `usePage({ loading })`).            |
| `DEFAULT_LOADING_STATE`         | constant  | Initial state.                                                                                                       |
| `normalizeLoadingOptions`       | util      | Coerces loose input into `LoadingOptions`.                                                                           |
| types                           | —         | `LoadingState`, `LoadingOptions`, `LoadingActions`, `DefinedLoading`, …                                              |

## Usage

```tsx
// Declarative: loading while a route-level query resolves
usePage({ loading: isFetching ? "Loading profile…" : false });
```

```tsx
// From the page controller: the loading actions plus `set` for the page's own config
const page = usePage({ loading: false });
page.modules.loading?.set("Refreshing…");
```

```tsx
// Imperative: wrap a task; the overlay stays up at least `minDuration`
const { withLoading } = useLoadingActions();
await withLoading(saveSettings(), "Saving…");
```

```tsx
// Reusable preset
const CheckoutLoading = defineLoading({
  message: "Processing payment",
  minDuration: 600,
});
CheckoutLoading.use(isSubmitting); // boolean | string | LoadingOptions
```

## File responsibilities

| File           | Responsibility                                                                                                               |
| :------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`     | Public barrel.                                                                                                               |
| `types.ts`     | State, options, and action contracts.                                                                                        |
| `constants.ts` | `DEFAULT_LOADING_STATE`.                                                                                                     |
| `utils.ts`     | `normalizeLoadingOptions`.                                                                                                   |
| `builder.ts`   | `defineLoading`.                                                                                                             |
| `module.tsx`   | `loadingModule`: registry type `loading` (singleton key `page-loading`, graceful, 600 ms), page slice and page API.          |
| `provider.tsx` | Context, `startLoading` / `stopLoading` / `withLoading` with `minDuration` handling, and merging of page-registered loading. |
| `view.tsx`     | `LoadingOverlay` and `LoadingContent`.                                                                                       |

## Theming

The module contains no classes or inline styles. Styling comes from `src/config/loading.module.theme.ts` (`loadingTheme` spec): slot `overlay`, plus optional per-slot `styles` (the `z-index` lives there).

## Dependencies

- **Uses:** `@/core/kernel` (`defineModule`, `useModuleRegistration`, `useRegistryValue`), `@/core/primitives` (`Spinner`, `useIsFullscreenStateActive`), `@/core/tokens` (`Z_INDEX`), `@/core/hooks`.
- **Used by:** `src/core/provider.tsx` (installs `loadingModule`) and the dock, which reads it with `useModule("loading")` (inert when not installed, via `definePeer`).
