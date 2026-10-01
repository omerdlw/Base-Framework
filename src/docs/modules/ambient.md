# Ambient — `@/modules/ambient`

## Purpose

Ambient gives a page a color atmosphere derived from an image. It samples the image (a cover photo, avatar, backdrop), extracts a palette in OKLCH (a bright `primary` and a deep `black`), and writes it to CSS custom properties (`--primary`, `--black`, `--color-primary`, `--color-ambient-glow`, …). Components and Tailwind classes that read those variables pick up the page's tint automatically.

Ambient renders nothing. Palettes are cached (`COLOR_EXTRACT_CONFIG.cacheLimit`), scoped to an element or applied globally (`tintGlobals`), and re-applied only when the stabilized config actually changes (it uses `shallowEqual`, never `JSON.stringify`, which `tests/kernel.test.js` enforces).

## Public API

| Export                                                                              | Kind      | Description                                                                                                                         |
| :---------------------------------------------------------------------------------- | :-------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| `ambientModule`                                                                     | module    | The `defineModule` definition: install it in `CoreProvider` to get the provider and `usePage({ ambient })`.                         |
| `AmbientProvider`                                                                   | component | Stable palette setters plus a store holding the palette and `isExtracting` (read via `useAmbient`). Mounted by the module host.     |
| `useAmbientTheme(config)`                                                           | hook      | Main entry point. Accepts an image URL or `AmbientConfig`, extracts, and applies the CSS vars. Returns `{ palette, isExtracting }`. |
| `useAmbientColor(image, options?)`                                                  | hook      | Extract a palette without applying it.                                                                                              |
| `useAmbient(configOrImage?)`                                                        | hook      | Context value (palette + setters), optionally applying a theme.                                                                     |
| `defineAmbient(def)`                                                                | builder   | Reusable ambient theme; `image`/`colors` may be functions of props.                                                                 |
| `extractPaletteFromImage`, `rgbToOklch`, `oklchToString`, `resolvePageAmbientTheme` | utils     | Extraction, color conversion and the page-config → theme mapping.                                                                   |
| `AMBIENT_CSS_VARS`, `AMBIENT_DEFAULTS`, `COLOR_EXTRACT_CONFIG`                      | constants | Variable names, fallback palette, extraction tuning.                                                                                |

## Usage

```tsx
// Tint the page from the profile backdrop (src/features/account/components/account-layout.tsx)
useAmbientTheme({ image: backdropUrl || account?.avatarUrl || null });
```

```tsx
// Through usePage: a string is the image; `true` uses the dock banner, then
// the background video's poster; `false` turns off the automatic banner theme
usePage({ ambient: "/images/album-cover.jpg" });
```

```tsx
// Explicit colors, scoped to one element
useAmbientTheme({
  colors: { primary: "#e5d3ff", black: "#140d1f" },
  scope: cardRef,
});
```

## File responsibilities

| File           | Responsibility                                                                                                             |
| :------------- | :------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`     | Public barrel.                                                                                                             |
| `types.ts`     | `AmbientPalette`, `AmbientConfig`, `AmbientDescriptor`, targets and sources.                                               |
| `constants.ts` | CSS variable names, defaults, extraction tuning, transition classes.                                                       |
| `color.ts`     | OKLCH conversion, canvas sampling, palette derivation.                                                                     |
| `extract.ts`   | `extractPaletteFromImage`: image fetch (CORS, then proxy), cache, in-flight sharing.                                       |
| `utils.ts`     | Scoped CSS-variable application, target resolution, page-config → theme.                                                   |
| `builder.ts`   | `defineAmbient`.                                                                                                           |
| `module.tsx`   | `ambientModule`: reads `ambient` and the dock banner from the page config and themes the page; `page.modules.ambient.set`. |
| `provider.tsx` | Context plus the extraction and application hooks.                                                                         |

`view.tsx` and `motion.ts` are intentionally absent; see [README](./README.md#why-some-optional-files-are-absent).

## Theming

The module has no classes of its own. The `transition` class list that is added to the scope element when `transition` is enabled comes from `src/config/ambient.module.theme.ts` (`ambientTheme` spec). Palette defaults (`AMBIENT_DEFAULTS`) and CSS variable names stay in the module.

## Dependencies

- **Uses:** `@/core/kernel` (`defineModule`, `useModuleState` for the background's `posterUrl`), `@/core/utils` (`shallowEqual`, `isBrowser`), `@/core/hooks` (`useRequiredContext`).
- **Used by:** `src/core/provider.tsx` (installs `ambientModule`), and features such as `account-layout.tsx` (`useAmbientTheme`).
