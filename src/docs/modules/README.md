# Core Module Reference

One page per core module. Each page covers **Purpose**, **Public API**, **Usage**, **File responsibilities**, and **Dependencies**.

| Module                   | Doc                                      | What it owns                                               |
| :----------------------- | :--------------------------------------- | :--------------------------------------------------------- |
| `@/core/kernel`          | [kernel.md](./kernel.md)                 | Registry microkernel, `usePage`, page controller           |
| `@/modules/dock`         | [dock.md](./dock.md)                     | Floating navigation card stack, surfaces, HUD, breadcrumbs |
| `@/modules/modal`        | [modal.md](./modal.md)                   | Stacked modal dialogs                                      |
| `@/modules/notification` | [notification.md](./notification.md)     | Toasts (`useToast`) anchored to the dock                   |
| `@/modules/background`   | [background.md](./background.md)         | Page background image / video / YouTube layer              |
| `@/modules/ambient`      | [ambient.md](./ambient.md)               | Palette extraction → CSS color variables                   |
| `@/modules/context-menu` | [context-menu.md](./context-menu.md)     | Right-click / long-press menus                             |
| `@/modules/controls`     | [controls.md](./controls.md)             | Floating control rails beside the dock                     |
| `@/modules/loading`      | [loading.md](./loading.md)               | Page loading overlay                                       |
| `@/core/error`           | [error-boundary.md](./error-boundary.md) | Crash boundaries and error reporting                       |
| `@/core/primitives`      | [primitives.md](./primitives.md)         | Unstyled-by-variant UI building blocks                     |
| `@/core/result`          | [result.md](./result.md)                 | `Result<T, E>` for server actions                          |

Architecture rules that apply to every module live in [../architecture-and-rules.md](../architecture-and-rules.md).

---

## Canonical module template

Every folder in `src/modules/` follows the same layout. `tests/architecture.test.js` fails if a module is missing a required file or its doc page.

| File           | Required | Responsibility                                                                                                                        |
| :------------- | :------: | :------------------------------------------------------------------------------------------------------------------------------------ |
| `index.ts`     |    ✅    | Public barrel. Named exports only; nothing internal leaks through it.                                                                 |
| `types.ts`     |    ✅    | Public TypeScript contracts. No runtime code. May be a `types/` folder with an `index.ts` (see `dock/`).                              |
| `constants.ts` |    ✅    | Frozen configuration values, class maps, event names.                                                                                 |
| `utils.ts`     |    ✅    | Pure helpers (no React state). May be a `utils/` folder with an `index.ts`.                                                           |
| `builder.ts`   | optional | Declarative `defineX()` / `useX()` API used by pages and features.                                                                    |
| `provider.tsx` | optional | React context + state for the module (one unified context per module).                                                                |
| `view.tsx`     | optional | The rendered UI the provider drives.                                                                                                  |
| `motion.ts`    | optional | Module motion presets derived from `@/core/tokens`.                                                                                   |
| `module.tsx`   | optional | The `defineModule` definition: context, provider, overlays, registry type, page slice and page API. Every installable module has one. |

Rules of thumb:

- A module may add extra files for its own concerns (e.g. `background/youtube.ts`). If a file grows past ~500 lines, split it into a sub-folder with its own `index.ts` (see `dock/`).
- Relative imports may reach into sub-folders of the **same** module (`dock/cards → ../utils`) but never into a sibling module. Cross-module needs go through `useModule(id)` / `useModuleState(id, …)` (see `src/docs/modules/kernel.md`) or `globalEvents`.
- Barrels use explicit named exports (`export { a, b } from "./x"`), never `export *` from implementation files. `export type * from "./types"` is fine because types have no runtime cost.

### Why some optional files are absent

| Module           | Absent                                                | Reason                                                                                                                                                                                                |
| :--------------- | :---------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ambient`        | `view.tsx`, `motion.ts`                               | Renders nothing. It writes CSS custom properties (`--primary`, `--black`, …); color transitions are CSS classes (`AMBIENT_TRANSITION_CLASS`).                                                         |
| `controls`       | `provider.tsx`, `motion.ts`                           | Stateless. Entries live in its `controls` registry type and layout is read from the DOM with `useSyncExternalStore`. It uses no animation.                                                            |
| `error-boundary` | `builder.ts`, `provider.tsx`, `view.tsx`, `motion.ts` | React error boundaries must be class components, and they are configured through props. `boundary.tsx` is the view, `listener.ts` wires window-level errors, and `reporter.ts` holds reporting sinks. |
| `loading`        | `motion.ts`                                           | The overlay renders the shared `Spinner` primitive (or a caller-supplied skeleton) and mounts and unmounts without animation.                                                                         |
| `notification`   | `builder.ts`                                          | Toasts are imperative, not declarative. `toast.ts` (`useToast`) plays the builder role.                                                                                                               |

---

## Dependency direction

```
src/app ─┐
src/features ─┼─▶ @/modules/* ──▶ @/core/kernel ──▶ @/core/{utils,hooks,tokens,events,result}
src/core/provider.tsx ┘         │
                               └──▶ @/core/primitives
```

Modules are installed by `CoreProvider` from the list the app passes (`modules={defaultModules}` or a subset); `src/modules/index.ts` is the only core file that imports every module. Orchestration drives modules through their `defineModule` definitions and never imports them.
