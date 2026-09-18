# Motion & Styling Architecture

Base Framework features a synchronized motion system combining deterministic JavaScript scheduling, Motion (Framer Motion v13) GPU hardware acceleration, Tailwind CSS v4 with OKLCH semantic palettes, and a strict Z-index layering contract.

---

## 1. Motion Design Principles & GPU Acceleration

Motion in Base Framework is designed to feel physical, fluid, and predictable (modeled after macOS Dock and iOS sheet interactions).

### 1.1 GPU-Only Composite Properties

Layout reflow properties (`top`, `left`, `margin`, `padding`) trigger expensive CPU recalculations and frame drops. All spatial animations must strictly animate compositor properties:

- `transform: translate3d(0, y, 0) scale(s)`
- `opacity`

### 1.2 Pixel Snapping (Subpixel Anti-Shimmering)

In [`src/core/modules/nav/motion.ts`](file:///Users/omerdlw/Documents/Base%20Framework/src/core/modules/nav/motion.ts), position calculations use integer pixel rounding (`Math.round(y)`). This prevents subpixel font rendering blurriness and shimmering on high-DPI displays while moving.

### 1.3 The Compositor Style Contract (`NAV_COMPOSITOR_STYLE`)

Components animated via Motion include compositor stabilization styles:

```typescript
export const NAV_COMPOSITOR_STYLE: React.CSSProperties = Object.freeze({
  WebkitFontSmoothing: "antialiased",
  backfaceVisibility: "hidden",
  transform: "translateZ(0)",
});
```

- **No `contain: paint`:** Removed across interactive cards to prevent rendering seam flashes in Chromium on Windows.
- **No Compound Blur:** To prevent GPU texture thrashing in the compositor, elements nested within backdrop-blur surfaces avoid secondary CSS `filter: blur(...)` animations.

---

## 2. Motion Tokens & Timing Synchronization

Base Framework enforces a **Single Source of Truth** for all motion constants in [`src/core/modules/nav/motion.ts`](file:///Users/omerdlw/Documents/Base%20Framework/src/core/modules/nav/motion.ts).

### 2.1 Deterministic Scheduler Synchronization

The JavaScript state machine scheduler (`scheduler.ts`) tracks transition durations in milliseconds (`NAV_SURFACE_CHOREOGRAPHY_TIMINGS`). Framer Motion tween durations must match these millisecond values precisely:

| Phase / Action             | JS Scheduler Timing (`ms`) | Motion Transition Constant          | Tween Duration (`s`) | Curve / Easing                           |
| :------------------------- | :------------------------- | :---------------------------------- | :------------------- | :--------------------------------------- |
| **Action Button Dismiss**  | `ACTION_DISMISS_MS: 260`   | `NAV_ACTION_DISMISS_TRANSITION`     | 0.26s                | `[0.32, 0.72, 0, 1]`                     |
| **Surface Body Enter**     | `BODY_ENTER_MS: 840`       | `NAV_SURFACE_BODY_ENTER_TRANSITION` | 0.84s                | `[0.16, 1, 0.3, 1]` (`APPLE_FLUID`)      |
| **Surface Body Exit**      | `BODY_EXIT_MS: 320`        | `NAV_SURFACE_BODY_EXIT_TRANSITION`  | 0.32s                | `[0.32, 0.72, 0, 1]`                     |
| **Header Swap**            | `HEADER_SWAP_MS: 520`      | `NAV_HEADER_SWAP_TRANSITION`        | 0.52s                | `[0.16, 1, 0.3, 1]`                      |
| **Surface Resize / Morph** | `RESIZE_MS: 580`           | `NAV_SURFACE_RESIZE_TRANSITION`     | 0.58s                | `[0.32, 0.12, 0.18, 1]` (`FLUID_RESIZE`) |
| **Compact Dock Restore**   | `RESTORE_MS: 400`          | `NAV_COMPACT_STACK_EXIT_TRANSITION` | 0.40s                | `[0.16, 1, 0.3, 1]`                      |

### 2.2 Standard Motion Tiers (`NAV_TIERS`)

- **`MICRO` (0.24s / 4px):** Checkbox toggles, hover ticks, micro button presses.
- **`FAST` (0.44s / 9px):** Tab indicators, dropdown reveals, tooltip pop-ins.
- **`STANDARD` (0.66s / 18px):** Navigation card swaps, modal transitions.
- **`SURFACE` (0.96s / 28px):** Full task surface expands and major layout shifts.

### 2.3 Reduced Motion Invariant

When the user's OS specifies reduced motion (`prefers-reduced-motion: reduce`), `getPrefersReducedMotion()` replaces tweens with `NAV_REDUCED_MOTION_TRANSITION` (`duration: 0.01`), ensuring full accessibility compliance.

---

## 3. Tailwind CSS v4 Configuration

The platform uses **Tailwind CSS v4** configured directly inside [`src/app/globals.css`](file:///Users/omerdlw/Documents/Base%20Framework/src/app/globals.css):

```css
@import "tailwindcss";

@theme {
  --color-black: var(--black);
  --color-white: var(--white);
  --color-primary: var(--primary);

  /* Semantic OKLCH Gamut Tokens */
  --color-error: oklch(0.513 0.168 17);
  --color-warning: oklch(0.588 0.183 91);
  --color-success: oklch(0.484 0.164 145);
  --color-info: oklch(0.493 0.172 252);

  --font-zuume: var(--font-zuume);
}

@layer base {
  :root {
    --white: #fcfcfb;
    --black: #101010;
    --primary: #0b0b0b;
  }

  html,
  body {
    overscroll-behavior: none;
    color-scheme: dark;
  }
}
```

### 3.1 OKLCH Color Palette

All feedback and tone states are expressed in **OKLCH**, providing uniform perceptual brightness and predictable chroma across dark mode surfaces.

### 3.2 Custom Framework Utilities

- `.center`: Flexbox shorthand (`display: flex; align-items: center; justify-content: center;`).
- `.skeleton-block`: Hardware-composited placeholder block with `background-color: rgb(252 252 251 / 0.05)`.
- Global scrollbar suppression: All native webkit and standard scrollbars are suppressed (`scrollbar-width: none`).

---

## 4. Typography & Fonts

Configured in [`src/core/tokens/fonts.ts`](file:///Users/omerdlw/Documents/Base%20Framework/src/core/tokens/fonts.ts):

- **Geist Sans (`--font-geist-sans`):** Primary UI typeface (variable font, weights 100–900).
- **Zuume Bold (`--font-zuume`):** Display typeface for oversized hero counters, numbers, and branded headings.
- **Hydration Invariant:** Applied in `src/app/layout.tsx` on `<body>` with `suppressHydrationWarning`.

---

## 5. The Layering & Z-Index Contract

Defined in [`src/core/tokens/tokens.ts`](file:///Users/omerdlw/Documents/Base%20Framework/src/core/tokens/tokens.ts#L1-L15):

```typescript
export const Z_INDEX = Object.freeze({
  BACKGROUND: 0, // Video / image / ambient canvas
  UI_ELEMENT: 10, // Standard in-page content & cards
  NAV_BACKDROP: 40, // Darkening scrim behind expanded dock
  MODAL_BACKDROP: 90, // Modal dark scrim
  MODAL: 100, // Floating modal dialogs
  NAV: 100, // Dock navigation stack & controls rails
  NOTIFICATION: 110, // Toast notification alerts
  DROPDOWN: 110, // Popover select menus
  SELECT: 120, // Select dropdown lists
  LOADING: 150, // Blocking page loading overlay
  ERROR_OVERLAY: 200, // Fatal error crash screen
  TOOLTIP: 250, // Hover action tooltips
  DEBUG_OVERLAY: 9999, // Internal development inspector
} as const);
```

> [!CAUTION]
> **Z-Index Rule for AI Agents & Developers:**  
> Never use arbitrary Tailwind classes like `z-50`, `z-[99]`, or `z-[9999]`.  
> Always bind elements to the canonical token: `style={{ zIndex: Z_INDEX.MODAL }}` or `style={{ zIndex: Z_INDEX.NAV }}`.
