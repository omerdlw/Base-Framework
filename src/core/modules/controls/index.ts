"use client";

export {
  Controls,
  ControlsSide,
  useControlsLayout,
  default as ControlsDefault,
} from "./view";
export { default } from "./view";

export {
  CONTROLS_EDGE_INSET,
  CONTROLS_NAV_GAP,
  CONTROLS_NAV_ELEMENT_ID,
  CONTROLS_RAIL_GAP,
  CONTROL_SIDE_NAMES,
} from "./constants";

export {
  getControlsLayout,
  getControlsLayoutSnapshot,
  getNavElement,
  getNavStackElement,
  getViewport,
  hasControls,
  resolveControlsPairs,
} from "./utils";

export { defineControls } from "./builder";
export { useControls } from "@/core/orchestration";

export type * from "./types";
