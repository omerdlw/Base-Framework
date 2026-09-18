import { REGISTRY_KEYS } from "@/core/orchestration";
import type { ContextMenuLayout, ContextMenuPosition } from "./types";

export const CURRENT_PAGE_KEY: string = REGISTRY_KEYS.CONTEXT_MENU_CURRENT;
export const GLOBAL_MENU_KEY = "*";
export const MENU_SCREEN_MARGIN = 10;

export const CONTEXT_MENU_LAYOUT: ContextMenuLayout = Object.freeze({
  wrapperRadius: 24,
  wrapperPadding: 10,
});

export const CONTEXT_MENU_VISIBILITY_EVENT = "context-menu:visibility";
export const INITIAL_POSITION: ContextMenuPosition = Object.freeze({
  x: 0,
  y: 0,
});
