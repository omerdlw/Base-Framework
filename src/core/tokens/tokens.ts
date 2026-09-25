export const Z_INDEX = Object.freeze({
  BACKGROUND: 0,
  UI_ELEMENT: 10,
  DOCK_BACKDROP: 40,
  MODAL_BACKDROP: 90,
  MODAL: 100,
  DOCK: 100,
  NOTIFICATION: 110,
  SELECT: 120,
  LOADING: 150,
  ERROR_OVERLAY: 200,
  CONTEXT_MENU: 220,
  TOOLTIP: 250,
} as const);

export const SURFACE_CLASSES = Object.freeze({
  description: "text-white/70",
  icon: "bg-white/10 text-white",
  surface: "bg-black/60 ring-1 ring-inset ring-white/10",
  title: "text-white",
} as const);

export const ACTION_TONE_CLASS =
  "bg-primary/10 text-primary hover:bg-primary hover:text-black";
