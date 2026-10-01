# Dock — `@/modules/dock`

## Purpose

The dock is the framework's navigation chrome. Instead of a fixed header or nav bar ([Rule 7](../architecture-and-rules.md#rule-7-declarative-chrome)), every page is represented by a **card** in a floating stack at the bottom of the screen. The top card shows the current route (title, description, icon, banner, contextual actions). Collapsed cards behind it show where you came from, and expanding the stack turns it into a navigator.

That same card is the stage for everything else that needs the user's attention. The dock picks **one** thing to show at a time, a _scene_, in priority order:

| Attention     | Shown as                                                              | Typical source                                                                                      |
| :------------ | :-------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| **Surface**   | The card grows into a sheet with a header, body, steps and extensions | `openSurface(...)`, `useSurface`, surface flows                                                     |
| **Status**    | Overlay card: errors, offline, navigation guard confirmation, 404     | `globalEvents` (`APP_ERROR`, `API_ERROR`, `DOCK_EVENTS.STATUS_SET`, `DOCK_GUARD`, `DOCK_NOT_FOUND`) |
| **HUD**       | Transient heads-up card (selection mode, progress, undo)              | `useHud`, `defineHud`, `useDockHud`                                                                 |
| **Operation** | Progress / result of a long-running task                              | `useDockOperations` (internal)                                                                      |
| **Route**     | The page card, optionally with a media card for video backgrounds     | registry (`usePage({ dock })`, `registry.tsx`)                                                      |

Navigation also goes through the dock (`navigate()`). It runs guards, records scroll/focus continuity so "back" restores position, tracks navigation transactions (timeouts, supersession), and prefetches on hover intent.

## Public API

The barrel (`index.ts`) exports only the API that pages, features and `CoreProvider` use. Everything else is internal; see [Migration](#migration-symbols-removed-from-the-barrel).

| Export                                                                                      | Kind           | Description                                                                                                                                                           |
| :------------------------------------------------------------------------------------------ | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dock` (default)                                                                            | component      | The dock renderer. Mounted by `CoreProvider`.                                                                                                                         |
| `dockModule`                                                                                | module         | The `defineModule` definition: install it in `CoreProvider` to get the provider, the dock and `usePage({ dock })`.                                                    |
| `DockProvider`                                                                              | component      | Dock state machine, surfaces, HUD, status, navigation, breadcrumbs.                                                                                                   |
| `useDockConfig(configOrTitle?)`                                                             | hook           | Register this route's card and get `{ activeItem, navigate, openSurface, setHud, … }`.                                                                                |
| `useDockRegistration`, `useDockBanner`                                                      | hooks          | Register a card (or just a banner) outside `usePage`.                                                                                                                 |
| `defineSurface(def)`, `useSurface(defOrId?)`                                                | builder / hook | Declare a surface; `useSurface(def)` returns `[open, { close, closeAll, isOpen }]` (also as properties).                                                              |
| `defineStepSurface(def)`, `useSurfaceStep()`                                                | builder / hook | Multi-step surfaces; `useSurfaceStep` gives `next`, `prev`, `goTo`, `push` and `close` inside a step.                                                                 |
| `createSurfaceFlowBuilder(def)`, `createSurfaceEntryDefinition`, `createInlineSurfaceEntry` | factories      | Surface entry factories (`factory(props)` → entry, `factory.open(openSurface, props)`).                                                                               |
| `useSurfaceFlow(flowDef)`                                                                   | hook           | URL-restorable, promise-based multi-screen flow with a snapshot and an optional return handshake.                                                                     |
| `defineHud(def)`, `useHud(def?)`                                                            | builder / hook | Declare a HUD card; `useHud(def)` returns `{ show, hide, clear }`.                                                                                                    |
| `useDockHud(descriptor)`                                                                    | hook           | Show a HUD while the component is mounted.                                                                                                                            |
| `defineDockAction(def)`                                                                     | builder        | Contextual toolbar action (`.use()` registers it while mounted).                                                                                                      |
| `useDockContextActions(actions)`                                                            | hook           | Register contextual actions directly.                                                                                                                                 |
| `defineBreadcrumb(def)`                                                                     | builder        | Override a breadcrumb title or icon for a path.                                                                                                                       |
| `useDock`, `useDockActions`, `useDockState`, `useDockSelector(selector)`                    | hooks          | Full context, actions only, state only, or a memoized slice.                                                                                                          |
| `useDockHeight`, `useDockDimensions`                                                        | hooks          | Live dock geometry (also published as the CSS var `--dock-h`).                                                                                                        |
| `useSurfaceReturn()`                                                                        | hook           | Consume a surface flow's return handoff on the page it returns to.                                                                                                    |
| `DockSurfaceAction`, `DockSurfaceExtension`, `DockSurfaceHeaderButton`                      | components     | Place content in a surface's action slot, extension shelf, or header.                                                                                                 |
| `useSurfaceHeader`, `useSurfaceAction`, `useSurfaceId`, `useSurfaceDimensions`              | hooks          | Surface context from inside surface content.                                                                                                                          |
| `DockCardBanner`, `DockCardHeader`, `DockIcon`, `DockTitle`, `DockDescription`              | components     | Card building blocks for custom surface content.                                                                                                                      |
| `useDockGuard`, `createDockGuardRegistry`                                                   | guards         | Block navigation (e.g. unsaved changes) with a confirmation status. Each `DockProvider` has its own registry; `useDockActions().registerGuard` adds one imperatively. |
| `createErrorStatus`, `createGuardStatus`, `ErrorActions`, `GuardActions`                    | status         | Build custom status overlays and action rows.                                                                                                                         |
| `DOCK_EVENTS`, `DOCK_HUD_PRIORITY`, `DOCK_HUD_RENDER_MODE`, `DOCK_HUD_VARIANT`              | constants      | Event names and HUD enums.                                                                                                                                            |
| `useDockActionClass`, `isValidBannerUrl`, `dockTheme`                                       | hooks / utils  | Styling and validation for custom actions and banners.                                                                                                                |
| `DOCK_FADE_TRANSITION`, `dockFadeVariants`, `dockListItemVariants`, `textCrossfadeVariants` | motion         | The presets surface content should use (Rule 4).                                                                                                                      |
| types                                                                                       | —              | `DockItem`, `SurfaceDescriptor` / `SurfaceEntry`, `SurfaceStep`, `DockHudDescriptor`, `DockActions`, `DockState`, …                                                   |

## Usage

```tsx
// 1. Declare the route card (most pages do this through usePage)
const page = usePage({
  dock: {
    title: "Settings",
    description: "Account & privacy",
    icon: "solar:settings-bold",
    actions: [saveAction], // context actions while the page is mounted
    guard: { when: hasUnsavedChanges }, // navigation guard
    surfaces: { invite: InviteForm }, // opened by key
  },
});
page.modules.dock?.surface("invite", { teamId });
```

```tsx
// 2. Open a surface: the top card becomes a sheet and resolves when it closes
const { openSurface } = useDockActions();
const result = await openSurface({
  component: InviteForm,
  props: { teamId },
  title: "Invite teammate",
  icon: "solar:user-plus-bold",
});
if (result?.success) toast("Invite sent");
```

```tsx
// 3. Reusable surface with a hook binding
const EditBio = defineSurface({
  id: "edit-bio",
  component: BioEditor,
  title: "Edit bio",
});
const [openEditBio, { isOpen }] = useSurface(EditBio);
```

```tsx
// 4. Inside a surface: header button, extension shelf and animated list
function InviteForm({ close }) {
  return (
    <>
      <DockSurfaceHeaderButton icon="solar:question-circle-bold" onClick={openHelp} />
      <DockSurfaceExtension id="invite-tabs" align="center"><Tabs … /></DockSurfaceExtension>
      <motion.ul variants={dockFadeVariants} initial="hidden" animate="visible">…</motion.ul>
    </>
  );
}
```

```tsx
// 5. Contextual action shown on the route card
const Share = defineDockAction({
  key: "share",
  icon: "solar:share-bold",
  tooltip: "Share",
  order: 10,
});
Share.use(() => navigator.share({ url: location.href }));
```

```tsx
// 6. Guard unsaved changes
useDockGuard({ when: isDirty, message: "Discard your changes?" });
```

## File responsibilities

`src/modules/dock/` follows the [module template](./README.md#canonical-module-template) at its root. Each large concern lives in a sub-folder with its own `index.ts`, and relative imports stay inside the dock module.

### Root

| File           | Responsibility                                                                                                                                                                                                                                                                                        |
| :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`     | Public barrel (see above).                                                                                                                                                                                                                                                                            |
| `types/`       | All dock contracts, one file per area: `items`, `surface` / `surface-api`, `hud`, `status`, `routing`, `navigation`, `guards`, `actions`, `components`, `builders`, `page`, `state`; `index.ts` re-exports them. The single deliberate `any` is `DockComponent` (user components with unknown props). |
| `context.ts`   | `DockContext`, `EMPTY_DOCK_STATE`, and the state hooks over the store (`useDockState`, `useDockSelector`, `useDockActions`, `useDockHeight`).                                                                                                                                                         |
| `hooks.ts`     | Public hooks: `useDockRegistration`, `useDockBanner`, `useDockConfig`, `useDockDimensions`, `useSurfaceReturn`.                                                                                                                                                                                       |
| `peers.ts`     | Peer readers for background, loading and notification (`definePeer`).                                                                                                                                                                                                                                 |
| `constants.ts` | Event names, lifecycle and phase enums, card dimensions, attention priorities, timeouts, class maps.                                                                                                                                                                                                  |
| `provider.tsx` | `DockProvider`: composes the route bridge, expansion, operations and HUD hooks with the surface stack, continuity and commands. `DockContext` carries only stable references (actions, scheduler, store, view bridge); state is published to the store.                                               |
| `page.ts`      | Page integration: `selectPageDock` (the `dock` slice, titled by the page `title`), `toDockEntries` (the card at `path` or the route), `validateDockEntry`, `mergeDockEntries`, `openPageSurface`.                                                                                                     |
| `module.tsx`   | `dockModule`: registry type `dock` (path keys, route lifecycle, merged by priority), the page hook (guard, context actions, `page.modules.dock`) and the overlay.                                                                                                                                     |
| `view.tsx`     | `Dock`: renders the card stack for the current scene, the breadcrumbs companion card, the backdrop, and height publishing.                                                                                                                                                                            |
| `behavior.ts`  | Keyboard shortcuts, focus trap and restore, route-reset behaviour (no interval polling; enforced by a test).                                                                                                                                                                                          |
| `layout.ts`    | Card motion props, element-height measurement (`ResizeObserver`), `--dock-h` publishing, visual-style resolution.                                                                                                                                                                                     |
| `status/`      | Status overlays: `model.tsx` (shape, priorities, factories), `persistence.ts` (survives reloads), `actions.tsx` (retry / confirm rows), `events.tsx` (app events → statuses), `use-dock-status.ts` (`useDockStatus`), `overlay.tsx` (`applyStatusOverlay`).                                           |
| `scheduler.ts` | `createDockScheduler` (frame/timeout scheduler from `@/core/utils`) and its types.                                                                                                                                                                                                                    |

### `state/`: provider internals

| File                          | Responsibility                                                                                                       |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `use-dock.ts`                 | `useDock`: the view controller (expansion, hover, search, guarded `navigate`, layout). Built once, by the dock view. |
| `use-dock-layout.ts`          | Ordering and de-duplication of the displayed cards.                                                                  |
| `attention.ts`                | `resolveDockAttention` / `resolveDockScene`: decides which of surface/status/HUD/operation/route owns the card.      |
| `context-actions.ts`          | `useDockContextActions` and `defineDockAction`.                                                                      |
| `use-command-registry.ts`     | Context-command registry for the provider.                                                                           |
| `operations.ts`               | Operation factory, reducer and active-operation resolution.                                                          |
| `use-dock-route-bridge.ts`    | Shares the view's route snapshot and guarded `navigate` with the provider.                                           |
| `use-dock-expansion.ts`       | The expanded flag (`useState`) and its actions.                                                                      |
| `use-dock-operation-state.ts` | Dock operations, their stable actions and the operation HUD.                                                         |
| `use-dock-display.ts`         | Derives the displayed items: attention → active item (surface, status, HUD), ordering, the active index.             |
| `items.ts`                    | Item pipeline: flatten registry entries, filter, build, resolve the active item, apply surface/status/media.         |
| `index.ts`                    | Internal barrel used by `provider.tsx` and `hooks.ts`.                                                               |

### `surface/`: surfaces

| File                               | Responsibility                                                                                                                                                                        |
| :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `context.tsx`                      | `SurfaceItemContext`, `SurfaceExtensionsContext`, the header-action store, `useSurfaceId` / `Header` / `Action` / `Dimensions`, `DockSurfaceAction`.                                  |
| `extensions.tsx`                   | Extension shelf store and provider, `DockSurfaceExtension`, `DockSurfaceExtensionsBar`, `useIsSurfaceExtensionsVisible`.                                                              |
| `controls.tsx`                     | Surface header controls (back, close, action buttons) and `DockSurfaceHeaderButton`.                                                                                                  |
| `shell.tsx`                        | `DockSurfaceShell`: surface body frame, drag-to-dismiss, step transitions.                                                                                                            |
| `flow.tsx`                         | `SurfaceFlowProvider` and `useSurfaceFlow`.                                                                                                                                           |
| `flow-session.ts`                  | Flow definitions and sessions, `createSurfaceError`.                                                                                                                                  |
| `definition.ts`                    | Definition normalization, `createSurfaceFlowBuilder`, inline entries.                                                                                                                 |
| `view-model.ts`                    | The surface view model applied to the dock item.                                                                                                                                      |
| `builders.ts`                      | `defineSurface`, `defineStepSurface`, `useSurface`, `useSurfaceStep`.                                                                                                                 |
| `machine/transitions.ts`           | Pure transition machine: open/close/close-all/advance events → next state + effects (mount, release, schedule).                                                                       |
| `machine/lifecycle.ts`             | `createSurfaceLifecycleState` (initial surface bookkeeping).                                                                                                                          |
| `machine/state.ts`                 | Stack helpers: resolve entry + payload, find/update entries, create runtime entries.                                                                                                  |
| `machine/effects.ts`               | Side effects: `?surface=` URL sync, history state for flow restore, resource release (`onClose`, promise resolution).                                                                 |
| `machine/use-surface-stack.ts`     | `useSurfaceStack`: the imperative surface API (`openSurface`, steps, close choreography, focus restore).                                                                              |
| `machine/use-surface-flows.ts`     | Flow operations over open surfaces: open / restore / update / complete / cancel.                                                                                                      |
| `machine/use-surface-lifecycle.ts` | Browser-back handling and the unmount cleanup that releases every surface.                                                                                                            |
| `machine/refs.ts`                  | The mutable surface state the sub-hooks share: one `SurfaceRecord` per surface (entry, flow, promise, resolve, `onClose`, URL state, focus origin), a flow index and the payload map. |
| `index.ts`, `machine/index.ts`     | Barrels.                                                                                                                                                                              |

### `cards/`: card rendering

| File               | Responsibility                                                                                      |
| :----------------- | :-------------------------------------------------------------------------------------------------- |
| `item.tsx`         | `DockCardItem`: one card in the stack (position, collapsed ghost shells, measurement, interaction). |
| `item-content.tsx` | Card body variants: standard, loading, surface, stacked surface, and inline action resolution.      |
| `command-bar.tsx`  | `DockCommandBar`: normalizes, sorts and filters toolbar actions.                                    |
| `header.tsx`       | `DockCardHeader`: icon, title, description, banner, context commands.                               |
| `banner.tsx`       | `DockCardBanner` with image preloading and masks.                                                   |
| `icon.tsx`         | `DockIcon` and the icon overlay badge.                                                              |
| `content.tsx`      | `DockTitle`, `DockDescription`, the badge.                                                          |
| `shared.tsx`       | Event helpers and icon rendering shared by the cards.                                               |
| `index.ts`         | Barrel.                                                                                             |

### `hud/`: heads-up display

| File            | Responsibility                                                                                                         |
| :-------------- | :--------------------------------------------------------------------------------------------------------------------- |
| `definition.ts` | HUD descriptors: create, compare, upsert and remove entries, active-HUD resolution, selection-mode and operation HUDs. |
| `builders.ts`   | `defineHud`, `useHud`, `useDockHud`.                                                                                   |
| `registry.ts`   | `useDockHudRegistry`: registered HUDs and the selection mode, for the provider.                                        |
| `view.tsx`      | `DockHudView`, the HUD lifecycle hook.                                                                                 |
| `index.ts`      | Barrel.                                                                                                                |

### `media/`: background video controls

| File           | Responsibility                                                                                 |
| :------------- | :--------------------------------------------------------------------------------------------- |
| `controls.tsx` | `DockMediaControls`: play/pause, mute, volume, playback rate.                                  |
| `scrubber.tsx` | `DockMediaScrubber`: seek bar with a time tooltip.                                             |
| `actions.tsx`  | `applyMediaAction`: attaches the media action to the route card when a video background plays. |
| `index.ts`     | Barrel.                                                                                        |

### `routing/`: navigation support

| File                     | Responsibility                                                                                                    |
| :----------------------- | :---------------------------------------------------------------------------------------------------------------- |
| `use-dock-navigation.ts` | `useDockNavigation`: guarded `navigate`, commit, transaction bookkeeping.                                         |
| `use-location-key.ts`    | Browser location key as an external store.                                                                        |
| `guard-confirmation.ts`  | Emits the navigation-blocked status.                                                                              |
| `guards.ts`              | `createDockGuardRegistry` (one per `DockProvider`) and `useDockGuard`.                                            |
| `use-view-connection.ts` | Publishes the view route snapshot and navigator to the provider.                                                  |
| `define-breadcrumb.ts`   | `defineBreadcrumb`.                                                                                               |
| `transactions.ts`        | Navigation transactions (start, complete, cancel, fail, time out; supersession).                                  |
| `continuity.ts`          | Scroll/focus snapshots per path and surface-flow return handoffs.                                                 |
| `topology.ts`            | Flattened item tree and active-node ancestry.                                                                     |
| `policy.ts`              | `resolveDockRoutePolicy` (can navigate, prefetch, dismiss surfaces, clear transient state) and `formatSlugTitle`. |
| `prefetch.ts`            | `useRoutePrefetch`: intent-delayed `router.prefetch`.                                                             |
| `breadcrumbs.tsx`        | Breadcrumb resolution, `BreadcrumbProvider`, overrides, `DockBreadcrumbsCard`.                                    |
| `index.ts`               | Barrel.                                                                                                           |

### `motion/`: motion presets (all derived from `@/core/tokens`)

| File             | Responsibility                                                                                                              |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `tokens.ts`      | Dock durations, easings, springs, stagger and choreography timings, drag constants, compositor style.                       |
| `transitions.ts` | Named transitions (card, surface body, header swap, HUD, results, media, …).                                                |
| `variants.ts`    | Framer Motion variant sets (fade, list item, header swap, surface controls, …).                                             |
| `factories.ts`   | Parameterized factories (`getDockItemTransition`, `getDockStackAnimateProps`, `getDockCardDelay`, reduced-motion handling). |
| `index.ts`       | Barrel.                                                                                                                     |

### `utils/`: pure helpers

| File         | Responsibility                                                                           |
| :----------- | :--------------------------------------------------------------------------------------- |
| `content.ts` | Component and renderable resolution, searchable text, media time, banner URL validation. |
| `path.ts`    | Path equality and prefix matching, safe internal hrefs, location keys.                   |
| `focus.ts`   | Focusable-element queries, focus and blur, interactive/editable target checks.           |
| `style.ts`   | Style splitting, line clamp, image icon styles, `resolveDockActionClass`.                |
| `items.ts`   | Item identity, measurement keys, ordering, ancestor de-duplication.                      |
| `surface.ts` | HUD/surface descriptor guards, extension normalization, return handshakes.               |
| `index.ts`   | Barrel.                                                                                  |

## Theming

The module contains no Tailwind classes or design styles. Everything comes from `src/config/dock.module.theme.ts` (`dockTheme` spec): about 140 slots grouped by area (`card*`, `banner*`, `header*`, `icon*`, `command*`, `status*`, `surface*`/`control*`, `extensions*`, `media*`/`scrubber*`, `breadcrumbs*`, `action*`, `loading*`), plus optional per-slot `styles` (z-index, banner masks, stack size/radius).

Stays in the module: stack motion (offsets, scale, opacity), measured geometry, per-position stack z-index, compositor hints, and the `skeleton` pulse animation class.

Status cards (errors, offline, 404) take the `status*` slots; `getStatusTheme` only supplies non-class values. `getDockActionClass` became the hook `useDockActionClass()` because it needs the theme; pass it the same options (`variant`, `className`, `tone`, ...).

## Dependencies

- **Uses:** `@/core/kernel` (`defineModule`, `useRegistryEntries`, `useModuleRegistration`, `definePeer` for background, loading and notification), `@/core/events` (status and guard events), `@/core/hooks`, `@/core/utils`, `@/core/tokens`, `@/core/primitives`, `next/navigation`. The dock never imports its peer modules: it lists `background`, `loading` and `notification` in `uses`, reads them through `definePeer` (`dock/peers.ts`), and each peer comes with an inert stand-in that is used when the module is not installed (an uninstalled module's code is not in the bundle, so the reader supplies the stand-in). It owns `DOCK_EVENTS.STATUS_SET` / `STATUS_CLEAR` (any code, including outside React, can raise a status overlay) and reads whether a toast is showing from the notification store instead of listening for an event.
- **Used by:** `src/core/provider.tsx` (installs `dockModule`), `src/features/**` (surfaces, actions, motion presets), `src/app/**` (`usePage({ dock })`, `useDockActions`). The `controls` and `notification` modules locate the dock through the DOM id `dock-card-stack`; the context menu reads the dock's active card through `useModuleState("dock", …)`.

## Migration: symbols removed from the barrel

The barrel previously re-exported about 234 runtime symbols; it now exports 58. The removed ones are internal and still importable from their own files if a downstream project relied on them, for example `import { dockStateReducer } from "@/modules/dock/state/machine"`.

| Previously from `@/modules/dock`                                                                                                                                                                                                                  | Now import from                        |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------- |
| Motion internals (`DOCK_*_TRANSITION`, `DOCK_SURFACE_*`, `dock*Variants`, `getDock*`, …)                                                                                                                                                          | `@/modules/dock/motion`                |
| `DOCK_ATTENTION_*`, `DOCK_LIFECYCLE`, `DOCK_OPERATION_*`, `DOCK_SURFACE_PHASE`, `DOCK_SURFACE_RENDER_MODE`, `DOCK_SURFACE_FLOW_STATUS`, `DOCK_TRANSACTION_STATUS`, `DOCK_CONTINUITY_EVENTS`, `DOCK_SURFACE_RETURN_MAX_ENTRIES`, `SURFACE_CLASSES` | `@/modules/dock/constants`             |
| `createDockTopology`, `createDockTransaction*`, `dock{Continuity,Transaction}Reducer`, `createDockContinuity*`, `resolveDock*`, `useDockContinuity`, `useDockTransactions`, `useRoutePrefetch`, `getDockLocationKey`                              | `@/modules/dock/routing`               |
| `BreadcrumbProvider`, `DockBreadcrumbsCard`, `useBreadcrumb*`, `useDockBreadcrumbs`, `useRegisterBreadcrumbOverride`                                                                                                                              | `@/modules/dock/routing`               |
| `SurfaceExtensionsContext`, `SurfaceExtensionsProvider`, `SurfaceItemContext`, `DockSurfaceExtensionsBar`, `useIsSurfaceExtensionsVisible`, `DockSurfaceControls`, `DockSurfaceShell`                                                             | `@/modules/dock/surface`               |
| `applySurfaceToDockItem`, `createSurfaceFlowDefinition`, `createSurfaceFlowSession`, `updateSurfaceFlowSession`                                                                                                                                   | `@/modules/dock/surface/flow`          |
| `areHudDefinitionsEqual`, `createHudDefinition`, `createDockOperationHud`, `upsertHudEntry`, `isHudDescriptor`                                                                                                                                    | `@/modules/dock` (hud.ts)              |
| `DockMediaControls`, `DockMediaScrubber`, `formatMediaTime`                                                                                                                                                                                       | `@/modules/dock/media`                 |
| `DOCK_BANNER_*`, `resolveDockHeaderKey`                                                                                                                                                                                                           | `@/modules/dock` (cards.tsx)           |
| `createDockMachineState`, `dockStateReducer`                                                                                                                                                                                                      | `@/modules/dock/state`                 |
| `createDockOperation*`, `dockOperationReducer`, `resolveActiveDockOperation`                                                                                                                                                                      | `@/modules/dock/runtime`               |
| `focusDockElement`, `getDockFocusableElements`, `shouldRestoreDockFocus`                                                                                                                                                                          | `@/modules/dock/behavior`              |
| `clearDockGuards`, `getDockGuardCount`                                                                                                                                                                                                            | `@/modules/dock/guards`                |
| `applyStatusOverlay`, `getStatusTheme`, `useDockStatus`                                                                                                                                                                                           | `@/modules/dock/status`                |
| `resolveDockAttention`, `resolveDockScene`                                                                                                                                                                                                        | `@/modules/dock/attention`             |
| `isSameItem`, `isSamePath`, `isValidComponentType`                                                                                                                                                                                                | `@/modules/dock/utils`                 |
| `isImageIconSource`, `clamp`, `toArray`, `isObject`, `isPlainObject`, `normalizePath` (pass-throughs)                                                                                                                                             | `@/core/utils` (their only definition) |

Note that core modules must not deep-import each other (see [README](./README.md#canonical-module-template)). These paths are for `src/features` and `src/app` only.
