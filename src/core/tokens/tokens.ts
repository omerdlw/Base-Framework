export const Z_INDEX = Object.freeze({
  BACKGROUND: 0,
  UI_ELEMENT: 10,
  NAV_BACKDROP: 40,
  MODAL_BACKDROP: 90,
  MODAL: 100,
  NAV: 100,
  NOTIFICATION: 110,
  DROPDOWN: 110,
  SELECT: 120,
  LOADING: 150,
  ERROR_OVERLAY: 200,
  TOOLTIP: 250,
  DEBUG_OVERLAY: 9999,
} as const);

export const SEMANTIC_SURFACE_CLASSES = Object.freeze({
  error: Object.freeze({
    description: "text-error",
    icon: "ring-1 ring-inset ring-error/10 bg-error/10 text-error",
    surface: "bg-error/10 ring-1 ring-inset ring-error/50",
    title: "text-error",
  }),
  info: Object.freeze({
    description: "text-info",
    icon: "ring-1 ring-inset ring-info/10 bg-info/10 text-info",
    surface: "bg-info/10 ring-1 ring-inset ring-info/50",
    title: "text-info",
  }),
  success: Object.freeze({
    description: "text-success",
    icon: "ring-1 ring-inset ring-success/10 bg-success/10 text-success",
    surface: "bg-success/10 ring-1 ring-inset ring-success/50",
    title: "text-success",
  }),
  warning: Object.freeze({
    description: "text-warning",
    icon: "ring-1 ring-inset ring-warning/10 bg-warning/10 text-warning",
    surface: "bg-warning/20 ring-1 ring-inset ring-warning/50",
    title: "text-warning",
  }),
} as const);

export const DESTRUCTIVE_ACTION_TONE_CLASS =
  "ring-1 ring-inset ring-error/10 bg-error/10 text-error hover:bg-error hover:text-white hover:ring-error";
export const INFO_ACTION_TONE_CLASS =
  "ring-1 ring-inset ring-info/10 bg-info/10 text-info hover:bg-info hover:text-white hover:ring-info";
export const SUCCESS_ACTION_TONE_CLASS =
  "ring-1 ring-inset ring-success/10 bg-success/10 text-success hover:bg-success hover:text-white hover:ring-success";
export const WARNING_ACTION_TONE_CLASS =
  "ring-1 ring-inset ring-warning/10 bg-warning/10 text-warning hover:bg-warning hover:text-white hover:ring-warning";
