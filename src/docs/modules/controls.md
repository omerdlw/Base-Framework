# Controls — `@/modules/controls`

## Purpose

Controls places small floating control rails on the left and right of the dock: a mute toggle, a play/pause button, a "back to top" pill, and so on. Pages register what goes in each rail. The module measures the dock (via the DOM id `dock-card-stack`, so there's no import coupling) and positions both rails so they hug the dock and never overlap it or the viewport edge.

The module is stateless. Entries live in the `controls` registry type, and layout is derived from the DOM with `useSyncExternalStore`.

## Public API

| Export                                                                                       | Kind      | Description                                                                                                                              |
| :------------------------------------------------------------------------------------------- | :-------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `controlsModule`                                                                             | module    | The `defineModule` definition: install it in `CoreProvider` to get the rails and `usePage({ controls })`.                                |
| `Controls` (default)                                                                         | component | Portals both rails next to the dock. The module's overlay; renders nothing without a dock.                                               |
| `useControls(config?, options?)`                                                             | hook      | Registers controls for the current path (a `{ left, right }` slot config or raw `ControlEntry[]`) and returns the live `ControlsLayout`. |
| `useControlsLayout()`                                                                        | hook      | Current rail geometry (`null` until the dock is measured).                                                                               |
| `defineControls(def)`                                                                        | builder   | Reusable control pair with `.use(props?, options?)`. Slots may be nodes, components, or render functions of props.                       |
| `useControlsRegistration`                                                                    | hook      | Registers controls for the current page outside `usePage` (same input as `usePage({ controls })`).                                       |
| `CONTROLS_EDGE_INSET`, `CONTROLS_DOCK_GAP`, `CONTROLS_DOCK_ELEMENT_ID`, `CONTROL_SIDE_NAMES` | constants | Spacing and the dock element id.                                                                                                         |

## Usage

```tsx
usePage({
  controls: {
    left: <MuteButton />,
    right: ({ onTop }) => <BackToTop onClick={onTop} />,
  },
});
```

```tsx
// Reusable pair with default props
const PlayerControls = defineControls({
  id: "player",
  left: MuteButton,
  right: PlaybackRate,
});
PlayerControls.use({ size: "sm" });
```

## File responsibilities

| File                     | Responsibility                                                                                                                               |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`               | Public barrel.                                                                                                                               |
| `types.ts`               | `ControlEntry`, `ControlSlot`, `ControlsLayout`, options.                                                                                    |
| `constants.ts`           | Gaps, insets, the dock element id.                                                                                                           |
| `utils.ts`               | Rail geometry, pairing entries by side, entry validation and page-config normalization.                                                      |
| `builder.ts`             | `useControls`, `defineControls` (slot resolution into registry entries).                                                                     |
| `module.tsx`             | `controlsModule`: registry type `controls` (keys `<path>::<id>`), page slice (`{ left, right }` or entries) and `page.modules.controls.set`. |
| `view.tsx`               | `Controls`, the rail component.                                                                                                              |
| `use-controls-layout.ts` | `useControlsLayout`: measures the dock and tracks it with observers.                                                                         |

`provider.tsx` and `motion.ts` are intentionally absent; see [README](./README.md#why-some-optional-files-are-absent).

## Dependencies

- **Uses:** `@/core/kernel` (`defineModule`, `useModuleRegistration`, `useRegistryEntries`), `@/core/tokens`, `@/core/utils`. It knows the dock only through the DOM id `dock-card-stack`.
- **Used by:** `src/core/provider.tsx` (installs `controlsModule`) and `page.modules.controls`.

## Theming

The module contains no classes or inline styles, except the rail position measured from the dock. Styling comes from `src/config/controls.module.theme.ts` (`controlsTheme` spec): slots `rail`, `railLeft`, `railRight`, `stack`, `stackLeft`, `stackRight`, plus optional per-slot `styles`.
