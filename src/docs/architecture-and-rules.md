# Architecture, Boundaries & The 10 Inviolable Rules

> **Verification:** Every rule is verified via `npm test` (`tests/architecture.test.js` & `tests/kernel.test.js`) and `npm run type-check`.

---

## 1. The Layer Hierarchy

```
src/app            (5. Routing, layout, providers, fonts, registry.tsx, API handlers)
  ↓ imports
src/features       (4. Domain capabilities: auth, account — mandatory index.ts)
  ↓ imports
src/modules        (3. First-party UI modules: dock, modal, notification, ... — optional)
src/infrastructure (3. Adapters: Supabase SSR, HTTP, Upstash Redis, Security — sibling of modules)
  ↓ imports
src/core           (1-2. Kernel + foundation: kernel, error, primitives, hooks, utils, tokens, events, result)
```

Inside `src/core`, from the bottom: `utils`, `tokens`, `result`, `events` (server-safe, no React) → `hooks` → `primitives` → `kernel`, `error` → `provider.tsx`.

### Layer Dependency Invariants (lint: `eslint.config.mjs`, `npm run check:architecture`):

1. `src/core` **MUST NOT** import from `@/modules/**`, `@/features/**`, `@/app/**`, or `@/infrastructure/**`.
2. Server-safe core entries (`utils`, `tokens`, `result`, `events`) **MUST NOT** import React, `next/*` or client layers.
3. A module **MUST NOT** import features, app, infrastructure or another module. Peers are read through `useModule(id)` / `useModuleState(id, …)`, only when listed in the module's `uses`; a missing peer means the module runs without it.
4. `src/infrastructure` **MUST NOT** import features, app, modules, or Core's client layers (`kernel`, `hooks`, `primitives`, `error`, `provider`).
5. `src/features` communicate across domains exclusively via `@/core/events` (`globalEvents`), never through direct feature-to-feature tight coupling.
6. No root barrel, no deep imports. Public entries: `@/core/{kernel,error,hooks,primitives,utils,tokens,events,result,provider}` and `@/modules`, `@/modules/<id>`.
7. No import cycles between source files, and no `any` in core or modules without a written reason (`@typescript-eslint/no-explicit-any` is an error there).
8. In downstream projects (`.framework-manifest.json` present), `src/core` is immutable on project branches (its tree hash is recorded in the manifest). `src/modules` belongs to the project: edit, replace or remove modules freely; `framework:sync` merges upstream module changes like any other code.

### Extension Points (how features extend Core without editing it)

| Mechanism                                                        | Use                                                                     |
| :--------------------------------------------------------------- | :---------------------------------------------------------------------- |
| `declare module "@/core/kernel" { interface PageConfig { … } }`  | Page vocabulary: `usePage({ auth: … })`                                 |
| `declare module "@/core/kernel" { interface CoreModules { … } }` | Typing of a module's runtime (`useModule`, `page.modules`)              |
| `declare module "@/core/kernel" { interface RegistrySchema … }`  | Value types of registry entries                                         |
| `declare module "@/core/events" { interface FrameworkEventMap }` | Events; the owner of an event defines it (`AUTH_EVENTS`, `DOCK_EVENTS`) |
| `CoreProvider` `registryEntries`, `providers`, `slots`           | Composition from the app layer                                          |

Augmentation stays the single typing mechanism: the page vocabulary is extended by features, which sit above the app-level composition and cannot import a factory created there. Types stay optional (`page.modules.dock?`), and `useIsModuleInstalled(id)` answers whether a module is installed. A module that reads a peer declares it with `definePeer(id, inert)` and lists it in `uses`; the reader supplies the inert runtime because an uninstalled module's code is not in the bundle. A `usePage` key for a module that is not installed is ignored without a warning: the kernel cannot know the id of a module whose code is absent, and feature keys such as `auth` are legitimate.

### Events, State and Commands

- **Read a peer's state:** `useModuleState`. **Command a module:** its actions. **Announce a fact (or reach a module from outside React):** `globalEvents`.
- `@/core/events` holds only cross-cutting facts (`API_UNAUTHORIZED`, `API_ERROR`, `APP_ERROR`, `STATE_CHANGE`). Module- or feature-specific events live with their owner and augment `FrameworkEventMap`.

---

### Module File Pattern (enforced by `tests/architecture.test.js`)

Every module root uses the same slots. A slot that does not apply is omitted, never created empty.

| File           | Holds                                                                                  |
| :------------- | :------------------------------------------------------------------------------------- |
| `types.ts`     | All types and interfaces                                                               |
| `context.tsx`  | `Context`, `Provider`, `useX` hooks                                                    |
| `hooks.ts`     | Extra hooks, including the `use<Component>Model` logic behind each overlay component   |
| `state.ts`     | State factory, initial state, pure reducers                                            |
| `utils.ts`     | Pure helpers                                                                           |
| `constants.ts` | Constants                                                                              |
| `overlay.tsx`  | All visual components: JSX only, calling `use*Model` hooks (no state, effects or refs) |
| `module.tsx`   | `defineModule`, `defineX` builder, `declare module` augmentation                       |
| `index.ts`     | Exports only                                                                           |

Extras (`hooks.ts`, `motion.ts`, `store.ts`, or a topic file/dir declared in the test) must be a single cohesive concern, not a few-line fragment.

**Large modules (Dock).** A module too big for the root slots keeps its domain code in sub-directories (`runtime/`, `cards/`, `hud/`, `routing/`, `status/`, `surface/`), but those directories do not own types, constants, utils or barrels: they read them from the root `types.ts`, `constants.ts`, `utils.ts`, `motion.ts`, `context.ts`, `state.ts` and `hooks.ts`. Two rules are enforced by `tests/architecture.test.js`:

- Root leaf files (`types`, `constants`, `utils`, `motion`, `context`, `state`, `hooks`) never import a sub-directory or a composition file.
- Sub-directories never import the composition files (`module`, `provider`, `overlay`, `index`).

## 2. The 10 Inviolable Rules

### Rule 1: Core Isolation

Core accepts domain data exclusively via component props, hooks, or registry adapters.

- ❌ `import { useAccount } from "@/features/account"` inside `src/modules/dock/cards.tsx`
- ✅ `<DockCardHeader title={account.displayName} icon={account.avatarUrl} />`

### Rule 2: Feature Barrel Export

Every feature in `src/features/` must export its public client surface via an `index.ts` file.

- ❌ Direct deep client import: `import { ProfileForm } from "@/features/account/components/profile-form"`
- ✅ Barrel import: `import { ProfileForm } from "@/features/account"`

### Rule 3: Server-Only Segregation

Any file querying the database, reading secret keys, or handling cookies MUST start with `import "server-only";` at line 1 and reside under a `server/` directory. Server files must NEVER be re-exported from `index.ts`.

- ❌ Re-exporting `server/profile.ts` from `src/features/account/index.ts`
- ✅ Direct server import: `import { getPublicAccount } from "@/features/account/server"`

### Rule 4: Motion Token Singularity

Never hardcode inline animation durations (`duration: 0.3`) or custom bezier curves inside components. Use universal tokens from `@/core/tokens` .

- ❌ `<motion.div transition={{ duration: 0.35, ease: "easeInOut" }} />`
- ✅ `<motion.div transition={SPRING_GENTLE} />` (GPU transforms only: `scale`, `translate3d`)

Enforced by lint (`no-restricted-syntax` in `eslint.config.mjs`): a literal `duration`, `delay` or `ease` in a `transition` object or `transition={…}` prop fails, except in `@/core/tokens` and module `motion` files, where presets are defined. For CSS transitions, use the token classes from `globals.css` (`duration-instant/micro/fast/base/moderate/slow/cinematic`, `ease-out-expo/quart/quint`, `ease-in-out-cubic`, `ease-in-cubic`, `ease-out-back`); raw `duration-<ms>`, `delay-<ms>`, `ease-in`, `ease-out` and `ease-in-out` fail lint.

### Rule 5: Z-Index Token Contract

Never use arbitrary Tailwind utility classes like `z-50`, `z-[99]`, or `z-[9999]`.

- ❌ `<div className="fixed inset-0 z-50 bg-black/80">`
- ✅ `<div className="fixed inset-0 bg-black/80" style={{ zIndex: Z_INDEX.NAV_BACKDROP }}>`

Enforced by lint: `z-[…]` and `z-30` or higher (app-level layers) fail, as does a literal `zIndex` in a style object. `z-0` / `z-10` / `z-20` stay allowed for local stacking inside a component.

### Rule 6: Result Pattern Returns

Server Actions (`"use server"`) must NEVER throw unhandled errors across the network boundary. Return `Result<T, E>` using `ok(data)` and `err(message)` from `@/core/result`.

- ❌ `if (!id) throw new Error("Invalid ID");`
- ✅ `if (!id) return err("Invalid ID"); return ok({ success: true });`

### Rule 7: Declarative Chrome

Never handcraft fixed `<header>` or `<nav>` bars inside individual page views. Configure page chrome declaratively with `usePage({ title, dock: { ... } })` or register routes in `src/app/registry.tsx` (`type: "dock"`).

### Rule 8: Decoupled Realtime & Events

Individual UI components must not open direct Supabase Realtime channel subscriptions. Realtime events belong in a dedicated listener (e.g. `SocialRealtimeSync`), which emits `globalEvents`.

### Rule 9: Zero Direct Admin DB Access

Never use `createAdminSupabaseClient()` to bypass Row-Level Security for standard queries. Standard queries must use `createServerSupabaseClient()`. Admin client is strictly restricted to user deletion / system tasks.

### Rule 10: Pre-Flight Verification

Never declare any coding task complete without running:

```bash
npm run type-check && npm test
```

Both must exit with code 0.

---

## 3. Where Does This Code Go? (Decision Tree)

```
What are you adding?
├─ Reusable unstyled UI primitive (Button, Select, Input) -> src/core/primitives/
├─ First-party UI module (Dock, Modal, Ambient, Toast)   -> src/modules/<module>/
├─ Universal React hook (hotkey, storage, media query)    -> src/core/hooks/use-<name>.ts (+ export in hooks/index.ts)
├─ Design token (colors, motion, z-index)                 -> src/core/tokens/
├─ Font choice (per project)                              -> src/app/fonts/
├─ Domain capability (Billing, Projects, Feed)            -> src/features/<feature>/
│   ├─ Client components/surfaces                        -> src/features/<feature>/components/
│   ├─ Client store & provider                           -> src/features/<feature>/client.ts & provider.tsx
│   ├─ Server actions ("use server")                     -> src/features/<feature>/server/actions.ts
│   ├─ DB queries (import "server-only";)                -> src/features/<feature>/server/<name>.ts
│   └─ Public client barrel                              -> src/features/<feature>/index.ts
├─ External platform adapter (Redis, Supabase, Security) -> src/infrastructure/<adapter>/
└─ Route shell, page view, or API endpoint               -> src/app/
```
