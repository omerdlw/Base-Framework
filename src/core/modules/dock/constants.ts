export { SURFACE_CLASSES } from "@/core/tokens";

export const DOCK_STYLE_SECTIONS = Object.freeze([
  "card",
  "icon",
  "title",
  "description",
] as const);

export const DOCK_EVENTS = Object.freeze({
  DATA_SOURCE_SELECT: "DOCK_DATA_SOURCE_SELECT",
  NAVIGATE_START: "DOCK_NAVIGATE_START",
  NAVIGATE_END: "DOCK_NAVIGATE_END",
  UPDATE_BADGE: "DOCK_UPDATE_BADGE",
  UPDATE_ITEM: "DOCK_UPDATE_ITEM",
  ITEM_HOVER: "DOCK_ITEM_HOVER",
  ITEM_CLICK: "DOCK_ITEM_CLICK",
  ITEM_FOCUS: "DOCK_ITEM_FOCUS",
  UNREGISTER: "DOCK_UNREGISTER",
  NAVIGATE: "DOCK_NAVIGATE",
  REGISTER: "DOCK_REGISTER",
  CLOSE_ALL_SURFACES: "CLOSE_ALL_SURFACES",
  SURFACE_MOUNTED: "SURFACE_MOUNTED",
  CLOSE_SURFACE: "CLOSE_SURFACE",
  OPEN_SURFACE: "OPEN_SURFACE",
  SET_EXPANDED: "SET_EXPANDED",
  SET_COMPACT: "SET_COMPACT",
  COLLAPSE: "DOCK_COLLAPSE",
  EXPAND: "DOCK_EXPAND",
  TOGGLE: "TOGGLE",
} as const);

export const EMPTY_SNAPSHOT = Object.freeze({
  scrollableHeight: 0,
  viewportHeight: 0,
  progress: 0,
  scrollY: 0,
});

export const DOCK_HUD_RENDER_MODE = Object.freeze({
  COMPONENT: "component",
  NODE: "node",
} as const);

export const DOCK_HUD_VARIANT = Object.freeze({
  EXPANDED: "expanded",
  PROGRESS: "progress",
  COMPACT: "compact",
  CUSTOM: "custom",
} as const);

export const DOCK_HUD_PRIORITY = Object.freeze({
  TASK_PROGRESS: 30,
  CONTEXTUAL: 10,
  SELECTION: 20,
  CRITICAL: 50,
  DEFAULT: 0,
  MEDIA: 15,
} as const);

export const DOCK_ATTENTION_KIND = Object.freeze({
  SURFACE: "surface",
  OPERATION: "operation",
  LOADING: "loading",
  STATUS: "status",
  ROUTE: "route",
  HUD: "hud",
} as const);

export const DOCK_ATTENTION_PRIORITY = Object.freeze({
  STATUS_OVERLAY: 300,
  SURFACE: 400,
  OPERATION: 250,
  LOADING: 100,
  STATUS: 75,
  ROUTE: 0,
  HUD: 200,
} as const);

export const DOCK_ATTENTION_PRIORITY_OFFSET_MAX = 99;

export const DOCK_SURFACE_RENDER_MODE = Object.freeze({
  COMPONENT: "component",
  NODE: "node",
} as const);

export const DOCK_SURFACE_FLOW_STATUS = Object.freeze({
  OPEN: "open",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const);

export const DOCK_SURFACE_PHASE = Object.freeze({
  IDLE: "idle",
  DISMISSING_ACTION: "dismissing_action",
  SWAPPING_HEADER: "swapping_header",
  EXPANDING_BODY: "expanding_body",
  OPEN: "open",
  COLLAPSING_BODY: "collapsing_body",
  RESTORING_HEADER: "restoring_header",
} as const);

export const COMPACT_CARD_HORIZONTAL_PADDING = 56;
export const COMPACT_CARD_MIN_WIDTH = 148;
export const COMPACT_CARD_MAX_OFFSET = 72;
export const DOCK_VIEWPORT_GAP = 4;
export const VIEWPORT_MARGIN = 24;

export const DOCK_CARD_DIMENSIONS = Object.freeze({
  expandedY: -(68 + DOCK_VIEWPORT_GAP),
  compactHeight: 38,
  chromeHeight: 20,
  collapsedY: -10,
  extensionShelfY: -42,
  extensionShelfScale: 0.94,
  extensionShelfHeight: 45,
  hudHeight: 52,
  actionGap: 10,
  height: 68,
});

export const DOCK_CARD_LAYOUT = Object.freeze({
  collapsed: Object.freeze({
    offsetY: DOCK_CARD_DIMENSIONS.collapsedY,
    scale: 0.88,
  }),
  expanded: Object.freeze({
    offsetY: DOCK_CARD_DIMENSIONS.expandedY,
    scale: 1,
  }),
  extensionShelfY: DOCK_CARD_DIMENSIONS.extensionShelfY,
  extensionShelfScale: DOCK_CARD_DIMENSIONS.extensionShelfScale,
  extensionShelfHeight: DOCK_CARD_DIMENSIONS.extensionShelfHeight,
  compactHeight: DOCK_CARD_DIMENSIONS.compactHeight,
  chromeHeight: DOCK_CARD_DIMENSIONS.chromeHeight,
  hudHeight: DOCK_CARD_DIMENSIONS.hudHeight,
  actionGap: DOCK_CARD_DIMENSIONS.actionGap,
  baseHeight: DOCK_CARD_DIMENSIONS.height,
});

export const DOCK_TRANSACTION_EVENTS = Object.freeze({
  START: "START",
  COMPLETE: "COMPLETE",
  CANCEL: "CANCEL",
  FAIL: "FAIL",
  TIME_OUT: "TIME_OUT",
} as const);

export const DOCK_TRANSACTION_STATUS = Object.freeze({
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  FAILED: "failed",
  TIMED_OUT: "timed-out",
} as const);

export const DOCK_TRANSACTION_REASON = Object.freeze({
  GUARD: "guard",
  SUPERSEDED: "superseded",
  TIME_OUT: "time-out",
} as const);

export const DOCK_TRANSACTION_TIMEOUT_MS = 15_000;
export const DOCK_PREFETCH_INTENT_DELAY_MS = 90;

export const DOCK_CONTINUITY_EVENTS = Object.freeze({
  CLEAR: "CLEAR",
  CONSUME_RETURN: "CONSUME_RETURN",
  DELIVER_RETURN: "DELIVER_RETURN",
  RECORD: "RECORD",
  REMOVE: "REMOVE",
} as const);

export const DOCK_CONTINUITY_MAX_ENTRIES = 32;
export const DOCK_SURFACE_RETURN_MAX_ENTRIES = 16;

export const DOCK_OPERATION_EVENTS = Object.freeze({
  CANCEL: "CANCEL",
  CLEAR: "CLEAR",
  COMPLETE: "COMPLETE",
  START: "START",
  UPDATE: "UPDATE",
} as const);

export const DOCK_OPERATION_STATUS = Object.freeze({
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  PENDING: "pending",
} as const);

export const DOCK_OPERATION_MAX_ENTRIES = 24;

export const DOCK_FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export const DOCK_FOCUS_RESTORE_BLOCKED_REASONS = Object.freeze([
  "browser-back",
  "dock",
  "unmount",
] as const);

export const DOCK_LIFECYCLE = Object.freeze({
  CLOSING: "closing",
  OPENING: "opening",
  IDLE: "idle",
  OPEN: "open",
} as const);

export const SECTION_TITLES: Record<string, string> = Object.freeze({
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  account: "Account",
  profile: "Account",
  security: "Security",
  settings: "Settings",
});

export const SECTION_ICONS: Record<string, string> = Object.freeze({
  account: "solar:user-bold",
  profile: "solar:user-bold",
  security: "solar:shield-keyhole-bold",
  settings: "solar:settings-bold",
});

export const PLAYBACK_RATES = Object.freeze([1, 1.25, 1.5, 2] as const);

export const DOCK_ACTION_STYLES = Object.freeze({
  base: "center h-10 w-full rounded-[20px] gap-2 px-4 text-xs font-semibold uppercase cursor-pointer select-none transition-colors duration-200",
  muted:
    "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white",
  active:
    "bg-white/10 text-white hover:bg-white/15 focus-visible:bg-white/15",
  action: Object.freeze({
    muted:
      "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 focus-visible:bg-white/10 focus-visible:text-white",
    active:
      "bg-white/10 text-white hover:bg-white/15 focus-visible:bg-white/15",
  }),
  row: "flex w-full items-center gap-2.5",
  icon: 16,
});

export const DOCK_ACTION_MOTION_PROPS = Object.freeze({
  whileTap: {
    scale: 0.98,
  },
});

export const STATUS_PRIORITY: Record<string, number> = Object.freeze({
  GUARD: 120,
  ACCOUNT_DELETE: 115,
  APP_ERROR: 100,
  API_ERROR: 95,
  NOT_FOUND: 97,
  OFFLINE: 90,
  LOGOUT: 110,
  SIGNUP: 110,
  LOGIN: 110,
  ONLINE: 10,
});

export const ERROR_STATUS_TYPES = new Set([
  "GUARD",
  "ACCOUNT_DELETE",
  "APP_ERROR",
  "API_ERROR",
  "NOT_FOUND",
]);


export const OVERLAY_STATUS_STORAGE_KEY = "dock_overlay_status";
export const OVERLAY_STATUS_CLEAR_DURATION = 3000;
export const STATUS_CLEAR_DURATION = 4500;

// Deprecated aliases for backward compatibility
export const AUTH_STATUS_STORAGE_KEY = OVERLAY_STATUS_STORAGE_KEY;
export const AUTH_STATUS_CLEAR_DURATION = OVERLAY_STATUS_CLEAR_DURATION;
export const AUTH_STATUS_TYPES = new Set(["LOGIN", "LOGOUT", "SIGNUP"]);
export const API_ERROR_BATCH_DELAY = 300;
export const DOCK_SPACER_BOTTOM_LOCK_DISTANCE = 40;
export const DOCK_HEIGHT_BUFFER = 16;
export const HEIGHT_EPSILON = 0.5;
export const HORIZONTAL_GESTURE_DOMINANCE_RATIO = 1.15;
export const HORIZONTAL_GESTURE_SUPPRESSION_MS = 260;
export const HORIZONTAL_GESTURE_DELTA_THRESHOLD = 8;
export const BOTTOM_LOCK_ACTIVATION_DISTANCE = 2;
export const COMPACT_MIN_ACTIVATION_DELTA = 4.5;
export const BOTTOM_LOCK_RELEASE_DISTANCE = 40;
export const COMPACT_TOGGLE_COOLDOWN_MS = 300;
export const DOCK_COLLAPSE_TO_COMPACT_DELAY_MS = 700;
export const BEHAVIOR_CHECK_INTERVAL_MS = 350;
export const COMPACT_SCROLL_THRESHOLD = 148;
export const COMPACT_RELEASE_THRESHOLD = 36;
export const COMPACT_ACTIVATION_BUFFER = 88;
export const SCROLL_DIRECTION_EPSILON = 0.5;
export const BEHAVIOR_FOCUS_IDLE_MS = 1400;
export const OVERSCROLL_THRESHOLD = -1;
export const BOTTOM_LOCK_MIN_SCROLLABLE_HEIGHT =
  COMPACT_SCROLL_THRESHOLD + BOTTOM_LOCK_RELEASE_DISTANCE;

export const DOCK_COMPACT_BEHAVIOR = Object.freeze({
  BROWSING: "browsing",
  FOCUSED: "focused",
} as const);

export const MAX_VISIBLE_STACKED_CARDS = 3;
