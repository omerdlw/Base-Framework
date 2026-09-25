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
  CONTROLS_DOCK_GAP,
  CONTROLS_DOCK_ELEMENT_ID,
  CONTROLS_RAIL_GAP,
  CONTROL_SIDE_NAMES,
} from "./constants";

export {
  getControlsLayout,
  getControlsLayoutSnapshot,
  getDockElement,
  getDockStackElement,
  getViewport,
  hasControls,
  resolveControlsPairs,
} from "./utils";

export { defineControls, useControls } from "./builder";
export { useControlsRegistration } from "@/core/orchestration";

export type * from "./types";
