# Primitives — `@/core/primitives`

## Purpose

Primitives are the structural, accessible building blocks every module and feature composes: buttons, inputs, selects, icons, images, loaders and so on. They carry behaviour and accessibility (focus rings, ARIA, keyboard handling, loading and error states) but **no stylistic variants**. There is no `variant="primary"`; styling is composed with Tailwind through `className` (and `classNames` for multi-slot components). This keeps design decisions in one place, at the call site or in module constants, rather than hidden behind variant props.

Primitives import only from `@/core/utils`, `@/core/hooks` and `@/core/tokens`, never from modules or features.

## Public API

| Export                                         | Description                                                                                                |
| :--------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| `Button`                                       | `<button>` with an opt-in `loading` state (renders `loader`) and slot `classNames`.                        |
| `Input`, `Textarea`                            | Form controls; `Textarea` can grow with its content (`autoResize`).                                        |
| `Select`                                       | Accessible listbox select (`SelectOption<T>`, `SelectClassNames` for slot styling).                        |
| `Checkbox`, `Switch`                           | Boolean controls.                                                                                          |
| `Icon`                                         | Iconify icon (`icon="solar:home-bold"`, `size`, `color`).                                                  |
| `AdaptiveImage`                                | `<img>` or `next/image` (`mode`) with skeleton, `fallback` on error, and priority/preload hints.           |
| `BackdropHero`                                 | Full-bleed hero image with a bottom gradient into `--black` (used by profile headers).                     |
| `Avatar`                                       | Image avatar with a `fallback` node.                                                                       |
| `Badge`, `Separator`, `Progress`, `Skeleton`   | Small display elements.                                                                                    |
| `Tooltip`                                      | Radix tooltip content wrapper (the provider is mounted by `CoreProvider`).                                 |
| `Spinner`, `Loader`                            | Indeterminate progress (`Spinner` is the compact ring; `Loader` wraps content).                            |
| `FullscreenState`                              | Full-screen empty/error/success state; `useIsFullscreenStateActive()` lets the loading overlay step aside. |
| `resolveSlotClasses` (from `primitives/utils`) | Merges `className` / `classNames` slot maps for multi-part components.                                     |

Every component also exports its props type (`ButtonProps`, `SelectProps`, `IconProps`, …).

## Usage

```tsx
import { Button, Icon, Select } from "@/core/primitives";

<Button className="rounded-full bg-white px-4 text-black" onClick={save}>
  <Icon icon="solar:diskette-bold" size={16} /> Save
</Button>

<Select
  value={visibility}
  onChange={setVisibility}
  options={[{ value: "public", label: "Public" }, { value: "private", label: "Private" }]}
  classNames={{ trigger: "h-10 rounded-xl bg-white/5" }}
/>
```

## File responsibilities

One file per primitive (`button.tsx`, `select.tsx`, …), plus:

| File       | Responsibility                                                                               |
| :--------- | :------------------------------------------------------------------------------------------- |
| `index.ts` | Barrel. `tests/kernel.test.js` checks the foundational set (including `Select`) is exported. |
| `utils.ts` | `resolveSlotClasses` and the shared `debounce` re-export.                                    |

## Dependencies

- **Uses:** `@/core/utils` (`cn`, `debounce`), `@/core/tokens`, `@iconify-icon/react`, `@radix-ui/react-tooltip`, `next/image`.
- **Used by:** every core module view, `src/features/**`, and `src/app/**`.

## Theming

Primitives keep layout mechanics (flex, positioning, transforms) in the component and read their visual layer (colors, sizes, radii, typography) from `primitivesTheme`, supplied by `src/config/primitives.core.theme.ts`. The error boundary does the same through `errorTheme` and `src/config/error.core.theme.ts`. Both are listed in `src/config/index.ts` and injected by `ThemeProvider` from `@/core/theme`, exactly like module themes; `@/modules/theme` re-exports the same API.
