# Modal — `@/modules/modal`

## Purpose

Modal renders stacked dialogs: centered cards, bottom sheets, and side or top panels. Its API is promise-based: `openModal(input, options?)` resolves with the value the modal passes to `close(result)`, so a confirm dialog reads like a function call. Modals can be opened by definition (`defineModal`), by component, or by a registered type key. The last form is how `usePage({ modal })` and `src/app/registry.tsx` expose route-specific modals.

Positions can be responsive (`{ mobile: "bottom", desktop: "center" }`), focus is trapped inside the top-most modal, and body scroll is locked for the stack. Two chromes are available: `"panel"` (header, close button, padding) and `"bare"` (your component owns everything).

## Public API

| Export                                  | Kind       | Description                                                                                                                           |
| :-------------------------------------- | :--------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `modalModule`                           | module     | The `defineModule` definition: install it in `CoreProvider` to get the provider, the lazily loaded renderer and `usePage({ modal })`. |
| `ModalProvider`                         | component  | Modal stack state and actions. Mounted by the module host.                                                                            |
| `Modal`, `ModalContainer`               | components | Stack renderer and a single modal panel.                                                                                              |
| `useModal()`                            | hook       | State + actions (`openModal`, `closeModal`, `closeAllModals`).                                                                        |
| `useModal(definition)`                  | hook       | Binding for one definition: `[open, controls]`, also with `.open`, `.close`, `.closeAll`, `.isOpen`.                                  |
| `useModalActions()` / `useModalState()` | hooks      | Split access.                                                                                                                         |
| `defineModal(def)`                      | builder    | Reusable modal: `{ component, title (or fn of data), position, chrome, defaultData }` with `.use()`.                                  |
| `useModalRegistration`                  | hook       | Registers modals by id for the current page outside `usePage` (same input as `usePage({ modal })`).                                   |
| `MODAL_POSITIONS`, `MODAL_CHROME`       | constants  | Position and chrome values.                                                                                                           |

## Usage

```tsx
const ConfirmDelete = defineModal({
  component: ConfirmDialog, // receives `data` and `close(result)` via props
  title: (data) => `Delete ${data.name}?`,
  position: { mobile: "bottom", desktop: "center" },
});

function DeleteButton({ post }) {
  const [openConfirm] = useModal(ConfirmDelete);
  return (
    <Button
      onClick={async () => {
        if (await openConfirm({ name: post.title })) await deletePost(post.id);
      }}
    >
      Delete
    </Button>
  );
}
```

```tsx
// Route-level modals, opened by key
const page = usePage({ modal: { share: ShareModal } });
await page.modules.modal?.open("share", { url });
```

## File responsibilities

| File            | Responsibility                                                                                                                                                          |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`      | Public barrel.                                                                                                                                                          |
| `types.ts`      | Positions, chrome, entries, state, actions, definitions, hook bindings.                                                                                                 |
| `constants.ts`  | Position classes, breakpoints, chrome styles, focusable selector, scroll-lock event.                                                                                    |
| `utils.ts`      | Stack state, modal identity, responsive position resolution, focus trap.                                                                                                |
| `builder.ts`    | `defineModal`.                                                                                                                                                          |
| `module.tsx`    | `modalModule`: registry type `modal` (named, components, immediate), page slice, `page.modules.modal` (actions plus `open` and `set`), and the `next/dynamic` renderer. |
| `provider.tsx`  | Stack, open/close promises, `useModal` overloads.                                                                                                                       |
| `view.tsx`      | Stack renderer (`Modal`), layers, layer switcher, backdrop.                                                                                                             |
| `container.tsx` | `ModalContainer`: header / body / footer layout.                                                                                                                        |
| `motion.ts`     | Backdrop, panel and content variants per position.                                                                                                                      |

## Dependencies

- **Uses:** `@/core/kernel` (`defineModule`, `useModuleRegistration`, `useRegistryEntries`, `ModuleBoundary`), `@/core/tokens` (`Z_INDEX.MODAL*`, springs), `@/core/utils` (`acquireGlobalScrollLock`), `@/core/primitives`.
- **Used by:** `src/core/provider.tsx` (installs `modalModule`), `page.modules.modal`, and features.

## Theming

The module contains no classes or inline styles, except the layer `z-index` (`Z_INDEX.MODAL`; stacked modals order by DOM). Styling comes from `src/config/modal.module.theme.ts` (`modalTheme` spec). Slot groups: `backdrop`/`dim`; `layer*`/`position*` (dialog wrapper + alignment); `frame*`; `panel*`/`radius*`/`chrome*`/`side*` (panel surface and per-position shape); `switcher*`; `container`/`body`/`slot*`/`sticky*`/`footerEnd*`/`title`/`headerActions`/`closeButton` (`ModalContainer`). Animations stay in `motion.ts`.
