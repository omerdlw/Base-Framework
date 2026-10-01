# Core Engine & UI Modules

> **Location:** `src/core/`
> **Key Principle:** Zero external imports. Zero coupling between sibling modules. Pure composability.

---

## 1. Orchestration Microkernel (`src/core/kernel`)

The kernel (`@/core/kernel`) installs modules and coordinates page chrome without importing or naming any module. Each module describes itself with `defineModule` (provider, overlays, registry type, page slice, page API); the app installs the ones it uses:

```tsx
<CoreProvider modules={defaultModules} registryEntries={APP_REGISTRY_ENTRIES}>
```

Listing modules individually (`[dockModule, notificationModule]`) ships only those. Modules reach each other through `useModule(id)` / `useModuleState(id, …)`.

### Declarative Page Registration (`usePage`)

Pages register their chrome declaratively inside client components:

```tsx
"use client";

import { usePage } from "@/core/kernel";

export function DashboardClient() {
  const page = usePage({
    title: "Dashboard",
    dock: {
      description: "Overview & Analytics",
      icon: "solar:chart-2-bold",
    },
    background: {
      overlay: true,
      overlayOpacity: 0.25,
    },
  });

  return <main className="relative z-10 p-8">...</main>;
}
```

### Registry Architecture (`src/app/registry.tsx`)

Global routes and static metadata are registered centrally in `registry.tsx`, keyed by registry type (the module id, e.g. `"dock"`). Each page's own module APIs are on `page.modules` (`page.modules.dock?.surface(...)`, `page.modules.notification?.toast(...)`).

---

## 2. Interactive Platform Modules (`src/modules/`)

| Module             | Purpose & Core Exports                                                                                                                    |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **`dock`**         | Floating navigation bar, command registry (`registerDockCommand`), surface state machine, media controller, breadcrumbs, and ghost cards. |
| **`ambient`**      | Dynamic background color glow and reactive atmosphere provider.                                                                           |
| **`background`**   | Pure image and YouTube stream background manager (`defineBackground`).                                                                    |
| **`controls`**     | Viewport control actions (fullscreen toggle, sound, shortcuts).                                                                           |
| **`modal`**        | Declarative modal backdrop and surface stack renderer.                                                                                    |
| **`notification`** | Toast notification engine (`useToast()`) with auto-dismiss and stack animation.                                                           |
| **`loading`**      | SSR-safe top loading bar and loading spinner provider.                                                                                    |
| **`error`** (core) | Graceful React crash recovery, part of `@/core` (`@/core/error`).                                                                         |

---

## 3. The 19 Pure UI Primitives (`src/core/primitives/`)

`Button`, `Input`, `Textarea`, `Checkbox`, `Switch`, `Select`, `Badge`, `Avatar`, `Progress`, `Separator`, `Skeleton`, `Tooltip`, `Icon`, `Spinner`, `Loader`, `AdaptiveImage`, `BackdropHero`, `FullscreenState`.

### Primitive Invariant:

Primitives are structural, accessible building blocks. They **MUST NOT** include artificial stylistic variants (e.g. `variant="primary" | "secondary"`). Styling is applied via clean Tailwind utility composition (`className`).

---

## 4. Motion System & Design Tokens (`src/core/tokens/`)

- **GPU Compositor Only:** Transitions strictly animate `scale`, `opacity`, and `translate3d`. Direct animation of layout dimensions (`height`, `top`) is forbidden.
- **Universal Springs:** `SPRING_GENTLE`, `SPRING_SNAPPY`, `SPRING_BOUNCY`.
- **Duration scale (`DURATION_TOKENS`):** `INSTANT` 0.08, `MICRO` 0.18, `FAST` 0.28, `BASE` 0.36, `MODERATE` 0.44, `SLOW` 0.58, `CINEMATIC` 0.86 (seconds). The same steps exist as `duration-*` classes in `globals.css`. Every module (dock, modal, notification, context-menu, background) takes its durations from this scale; only dock-specific choreography (`HEADER`, `ACTION_DISMISS`, `COLLAPSE`) stays local to the dock.
- **Shared motion (`MOTION_EASINGS`, `MOTION_TIERS`):** entrances use `ENTER` / `ENTER_EMPHASIZED`, exits use `EXIT`. `MOTION_TIERS` (`MICRO`/`FAST`/`STANDARD`/`SURFACE`) sets distance, scale and duration per step; dock and modal both use it.
- **Z-Index (`@/core/tokens`):** global layers, bottom to top: `BACKGROUND` 0, `DOCK_BACKDROP` 100, `DOCK` 110, `NOTIFICATION` 120, `MODAL_BACKDROP` 130, `MODAL` 140, `SELECT` 150, `LOADING` 160, `ERROR_OVERLAY` 170, `CONTEXT_MENU_BACKDROP` 180, `CONTEXT_MENU` 190, `TOOLTIP` 200. Only the order matters, but every global layer must stay above the local range (`z-0/10/20` utilities and the local `DOCK_*`/`MODAL_*` values, max 30), otherwise page content covers it. Stacked modals share `Z_INDEX.MODAL` and stack by DOM order. The `DOCK_CARD_*`, `DOCK_SURFACE_*`, `MODAL_FRAME` and `MODAL_STICKY_HEADER` values are local to their own stacking context.

---

## 5. Universal Utilities & Foundation

- **Result Pattern (`@/core/result`):** Monadic result container (`ok(val)`, `err(msg)`, `unwrap()`, `createSafeAction()`).
- **Event Bus (`@/core/events`):** Decoupled cross-feature pub/sub bus (`globalEvents.emit()`, `globalEvents.on()`).
- **Provider Composer (`@/core/kernel`):** `Compose` component and `composeProviders` utility for flattening nested React provider trees.
- **Universal Hooks (`@/core/hooks`):** `useServerAction` (with automatic toasts), `useHotkey`, `useMediaQuery`, `useControllableState`, `useIntersectionObserver`.
