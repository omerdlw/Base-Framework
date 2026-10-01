# Context Menu — `@/modules/context-menu`

## Purpose

Context Menu replaces the browser's right-click menu with a themed, keyboard-accessible menu. Menus are **declared, not mounted**. A page or feature registers a `ContextMenuConfig` (items, header, matching rules) and the single global renderer (`ContextMenuGlobal`) picks the best match when the user right-clicks.

Matching is scored by path (`path` / `paths` / `pathMatcher`), DOM `target` selectors, `when` / `enabled` predicates and `priority`. So a card-level menu can override the page menu, which overrides the global `"*"` menu. Items and headers may be functions of the open context (pathname, clicked element, and the payload passed to `bind`).

## Public API

| Export                                              | Kind      | Description                                                                                                                                        |
| :-------------------------------------------------- | :-------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contextMenuModule`                                 | module    | The `defineModule` definition: install it in `CoreProvider` to get the provider, the global listener and renderer, and `usePage({ contextMenu })`. |
| `ContextMenuProvider`                               | component | Stable `open` / `close` / `bind` actions plus a menu state store (read via `useContextMenuState`). Mounted by the module host.                     |
| `useContextMenu(config?, options?)`                 | hook      | Registers a config and returns state + actions. Its `bind(payload?)` returns `{ onContextMenu }` for a trigger element.                            |
| `useContextMenuActions()` / `useContextMenuState()` | hooks     | Split access to actions (`openMenu`, `closeMenu`, `bind`) and state (`isOpen`, `items`, `position`, …).                                            |
| `useContextMenuListener()`                          | hook      | Global `contextmenu` event wiring (used by `ContextMenuGlobal`).                                                                                   |
| `defineContextMenu(def)`                            | builder   | Reusable menu with `.use(options?)`.                                                                                                               |
| `useContextMenuRegistration`                        | hook      | Registers a menu for the current route outside `usePage` (same input as `usePage({ contextMenu })`).                                               |
| `CONTEXT_MENU_VISIBILITY_EVENT`                     | constant  | `window` event fired when the menu opens or closes (`detail.isOpen`).                                                                              |

## Usage

```tsx
// Page-level menu, registered declaratively
usePage({
  contextMenu: {
    items: [
      {
        key: "copy-link",
        label: "Copy link",
        icon: "solar:link-bold",
        onSelect: () => navigator.clipboard.writeText(location.href),
      },
      "separator",
      { key: "report", label: "Report", danger: true, onSelect: openReport },
    ],
  },
});
```

```tsx
// Per-element menu with a payload
const menu = useContextMenu({
  target: "[data-post]",
  header: (ctx) => ({ title: ctx.payload.title }),
  items: (ctx) => [
    {
      key: "delete",
      label: "Delete",
      danger: true,
      onSelect: () => deletePost(ctx.payload.id),
    },
  ],
});
return (
  <article data-post {...menu.bind(post)}>
    …
  </article>
);
```

## File responsibilities

| File           | Responsibility                                                                                                                                                        |
| :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`     | Public barrel.                                                                                                                                                        |
| `types.ts`     | Config, item, header, state and context contracts.                                                                                                                    |
| `constants.ts` | Registry keys, margins, the visibility event name.                                                                                                                    |
| `utils.ts`     | Value resolution (`resolveAsBoolean` / `resolveAsValue`), node-text extraction, safe invocation, page metadata, menu positioning.                                     |
| `resolver.ts`  | Candidate normalization and scoring, `prepareMenu` (`onOpen` + item resolution).                                                                                      |
| `items.ts`     | Item and header resolution, keyboard navigation.                                                                                                                      |
| `builder.ts`   | `defineContextMenu`.                                                                                                                                                  |
| `module.tsx`   | `contextMenuModule`: registry type `contextMenu` (route keys plus `current-page` and `*`, immediate), page slice and `page.modules.contextMenu` (actions plus `set`). |
| `provider.tsx` | Menu state, `bind()`, open/close lifecycle, `onOpen` context enrichment.                                                                                              |
| `view.tsx`     | `ContextMenuGlobal` (listener + portal renderer), menu content, dismissal.                                                                                            |
| `parts.tsx`    | Header, header icon and item components.                                                                                                                              |
| `listener.ts`  | `useContextMenuListener`: the global `contextmenu` event.                                                                                                             |
| `motion.ts`    | Pop/content/item variants.                                                                                                                                            |

## Dependencies

- **Uses:** `@/core/kernel` (`defineModule`, `useModuleRegistration`, `useRegistryEntries`, and the dock's registry entry for page info), `@/core/utils`, `@/core/hooks`, `@/core/primitives`, `@/core/tokens` (`Z_INDEX.CONTEXT_MENU`).
- **Used by:** `src/core/provider.tsx` (installs `contextMenuModule`) and `page.modules.contextMenu`.

## Theming

The module contains no classes or inline styles, except the menu's pointer-following position (`left`/`top`/`position: fixed`). Styling comes from `src/config/context-menu.module.theme.ts` (`contextMenuTheme` spec): slots `overlay`, `content`, `header`, `headerIcon`, `headerText`, `headerEyebrow`, `headerTitle`, `headerDescription`, `separator`, `item`, `itemIcon`, `itemLabel`, `itemShortcut`, plus optional per-slot `styles`. A menu's own `classNames` (and an item's `className`) still layer on top of the theme.
