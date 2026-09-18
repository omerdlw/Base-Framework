"use client";

export type * from "./types";

export {
  ContextMenuContent,
  ContextMenuGlobal,
  ContextMenuHeader,
  ContextMenuHeaderIcon,
  ContextMenuItem,
  ContextMenuRenderer,
  default as ContextMenuGlobalDefault,
} from "./view";
export { default } from "./view";

export {
  ContextMenuActionsContext,
  ContextMenuContext,
  ContextMenuProvider,
  ContextMenuStateContext,
  useContextMenu,
  useContextMenuActions,
  useContextMenuListener,
  useContextMenuState,
} from "./provider";

export {
  CONTEXT_MENU_LAYOUT,
  CONTEXT_MENU_VISIBILITY_EVENT,
  CURRENT_PAGE_KEY,
  GLOBAL_MENU_KEY,
  INITIAL_POSITION,
  MENU_SCREEN_MARGIN,
} from "./constants";

export {
  createInitialMenuState,
  emitContextMenuVisibility,
  extractNodeText,
  isImageIconSource,
  isObject,
  isScrollLockKey,
  joinClassNames,
  resolveAsBoolean,
  resolveAsValue,
  resolveContextMenuPageMeta,
  resolveNextOpenState,
  safeInvoke,
  toArray,
} from "./utils";

export {
  getContextMenuMetrics,
  positionMenu,
  resolveContextMenu,
  resolveMenuHeader,
  resolveMenuItems,
} from "./resolver";

export {
  CONTEXT_MENU_CONTENT_VARIANTS,
  CONTEXT_MENU_ITEM_TAP,
  CONTEXT_MENU_ITEM_VARIANTS,
  CONTEXT_MENU_MICRO_SPRING,
  CONTEXT_MENU_POP_VARIANTS,
  menuContentVariants,
  menuItemVariants,
  menuPopVariants,
} from "./motion";

export { defineContextMenu } from "./builder";
