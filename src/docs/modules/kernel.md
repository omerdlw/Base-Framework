# Orchestration — `@/core/kernel`

## Purpose

Orchestration is the framework's microkernel. It installs modules, keeps a registry for them, and turns one `usePage(config)` call into each module's registrations and page API. It knows **no module by name**: it never imports `@/core/modules` (`tests/architecture.test.js`), and every module-specific rule (which config key, which registry key, how to merge, what a page can do) lives in the module's own `defineModule` definition.

Three pieces:

1. **Modules.** `defineModule({ id, context, Provider, Backdrop, Overlay, uses, registry, page })` describes a module. `ModuleHost` installs a list of them: it creates the registry for their types, nests their providers (a module comes after the modules it `uses`), renders backdrops before the page and overlays after it (each in the host's error boundary), and provides the page stack. Modules reach each other with `useModule(id)` (the stable `{ actions, store }` runtime, or `null` when not installed) and `useModuleState(id, selector, fallback)`, never by importing each other.
2. **The registry.** A scoped key/value store per host. Each module with a `registry` definition owns the registry type named after its id: key policy (`singleton`, `named`, `path`, `route`), default lifecycle and cleanup delay, value kind, optional `merge` and `validate`. When several sources register the same key, the highest-ranked wins (`static`, e.g. `registry.tsx` < `dynamic`, e.g. `usePage` < `user`, then explicit `priority`), or `merge` combines them. Unregistration honours the lifecycle (`immediate`, `graceful`, `route`, `persistent`).
3. **Pages.** `usePage(config)` runs, for every installed module: `page.select(config)` (the module's slice), `page.entries(slice)` (its registry entries, registered in one batch for the whole page), and `page.use(slice, { set })` (a hook whose result is `page.modules[id]`). The kernel itself only owns `title`, `registry` (page-level metadata), `set` and `reset`.

## Public API

| Export                                                                                                                           | Kind       | Description                                                                                                                                  |
| :------------------------------------------------------------------------------------------------------------------------------- | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `defineModule(definition)`                                                                                                       | extension  | Declares a module (see Purpose). Built-in modules and app modules use the same contract.                                                     |
| `ModuleHost`                                                                                                                     | provider   | Installs modules (read once); `CoreProvider` mounts it.                                                                                      |
| `useModule(id)`, `useModuleState(id, selector, fallback)`                                                                        | hooks      | Another module's runtime or a slice of its state; `null` / `fallback` when it is not installed. Neither re-renders on unrelated changes.     |
| `ModuleBoundary`                                                                                                                 | component  | Wraps module UI in the host's error boundary.                                                                                                |
| `usePage(config, options?)`                                                                                                      | hook       | **Main entry point.** Returns the `PageController`: `config`, `set`, `reset`, `modules`, `Provider`.                                         |
| `usePageController()`                                                                                                            | hooks      | Read the active `PageController` without registering anything.                                                                               |
| `definePeer(id, inert)`                                                                                                          | module     | Declares a peer a module reads: `{ useRuntime, useActions, useState }`, using `inert` when the peer is not installed. List the id in `uses`. |
| `useIsModuleInstalled(id)`                                                                                                       | hook       | Whether a module is installed in the surrounding `ModuleHost`.                                                                               |
| `useModuleRegistration(id, value, options?)`                                                                                     | hook       | Registers one module's slice outside `usePage` (each module exports a named wrapper, e.g. `useLoadingRegistration`).                         |
| `createModulePayload`, `selectModuleSlice`                                                                                       | page       | What `usePage` registers: every module's selected slice plus page metadata.                                                                  |
| `useRegistry(config, metadata?)`, `applyRegistryConfig`, `createRegistryApplyContext`                                            | page       | The registration pipeline under `usePage` (select, stabilize, apply in one batch, clean up per lifecycle).                                   |
| `PageControllerProvider`                                                                                                         | provider   | The page stack (provided by `ModuleHost`); `page.Provider` scopes a controller to a subtree.                                                 |
| `RegistryProvider`, `createRegistryStore(entries, definitions)`, `createModuleRegistryDefinitions`                               | registry   | The store and its context; definitions come from the installed modules.                                                                      |
| `useRegistryValue`, `useRegistryEntries`, `useRegistryActions`                                                                   | hooks      | Subscribe to one key, all entries of a type, a derived slice, or get `register` / `unregister` / `batch`.                                    |
| `createRegistryOperations(definitions)`, `createRegisterOperation`, `createUnregisterOperation`, `createRecordKey`, …            | operations | Pure registry state machine (used by the store and by tests).                                                                                |
| `validateRegistryKey`, `validateRegistryValue`, `validateRegistryMetadata`, `normalizeRegistryMetadata`                          | schema     | Validation (`warn` or `strict`) and metadata normalization.                                                                                  |
| `REGISTRY_SOURCES`, `REGISTRY_LIFECYCLES`, `REGISTRY_VALIDATION_MODES`, …                                                        | constants  | Registry vocabulary.                                                                                                                         |
| `CoreModule`, `CoreModules`, `ModuleId`, `ModuleRuntime`, `PageConfig`, `PageController`, `PageModules`, `RegistryDefinition`, … | types      | Contracts. `CoreModules`, `PageConfig` and `RegistrySchema` are augmented by each module via `declare module "@/core/kernel"`.               |

## Usage

```tsx
"use client";
import { usePage } from "@/core/kernel";

export function DashboardClient() {
  const page = usePage({
    title: "Dashboard",
    dock: { description: "Overview", icon: "solar:chart-2-bold" },
    background: { image: "/images/dashboard.jpg", overlay: true },
    loading: isFetching,
  });

  return (
    <Button onClick={() => page.modules.notification?.toast("Saved")}>
      Save
    </Button>
  );
}
```

```ts
// Static route metadata: src/app/registry.tsx (registry type = module id)
export const APP_REGISTRY_ENTRIES = [
  {
    type: "dock",
    items: { "/": { title: "Home", icon: "solar:home-2-bold", path: "/" } },
  },
];
```

```tsx
// A module of your own (no edits to src/core)
const AnnouncementContext = createContext<ModuleRuntime<State, Actions> | null>(
  null,
);

export const announcementModule = defineModule({
  id: "announcement",
  context: AnnouncementContext,
  Provider: AnnouncementProvider,
  Overlay: AnnouncementBanner,
  registry: {
    keyPolicy: "singleton",
    singletonKey: "current",
    lifecycle: "route",
  },
  page: {
    entries: (slice: AnnouncementConfig) => [{ key: "current", value: slice }],
  },
});

declare module "@/core/kernel" {
  interface CoreModules {
    announcement: typeof announcementModule;
  }
  interface PageConfig {
    announcement?: AnnouncementConfig;
  }
}

// <CoreProvider modules={[...defaultModules, announcementModule]}>
```

## File responsibilities

| File                  | Responsibility                                                                                                   |
| :-------------------- | :--------------------------------------------------------------------------------------------------------------- |
| `index.ts`            | Public barrel.                                                                                                   |
| `types.ts`            | Registry, module, page-config and controller contracts.                                                          |
| `module.tsx`          | `defineModule`, `ModuleHost`, `useModule`, `useModuleState`, `ModuleBoundary`, module sorting and page payloads. |
| `constants.ts`        | Registry sources and ranks, lifecycles, metadata keys, scopes.                                                   |
| `utils.ts`            | Input and scope resolution, config merging, small guards.                                                        |
| `schema.ts`           | Validation and metadata normalization for registry values.                                                       |
| `operations.ts`       | Pure registry state machine bound to a set of definitions (`createRegistryOperations`).                          |
| `runtime.ts`          | Transactions.                                                                                                    |
| `provider.tsx`        | `createRegistryStore` (subscriptions, snapshots, handles), `RegistryProvider`, the subscription hooks.           |
| `handlers.ts`         | `applyRegistryConfig`: module slices → registry entries in one batch, cleanup per lifecycle.                     |
| `hooks.ts`            | `useRegistry` (select, stabilize, apply), `createRegistryApplyContext`, config stabilization.                    |
| `adapters.tsx`        | `useModuleRegistration`.                                                                                         |
| `page-controller.tsx` | `usePage` (producer), `usePageController` (pure consumer), the page stack.                                       |

## Dependencies

- **Uses:** `@/core/utils`, `@/core/hooks` only. It never imports `@/core/modules`, and names no module.
- **Used by:** every core module (`defineModule`, registry hooks, `useModule`), `src/core/provider.tsx` (mounts `ModuleHost`), `src/app/registry.tsx`, and pages and features through `usePage`.
