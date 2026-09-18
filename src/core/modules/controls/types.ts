import type { ComponentType, ReactNode } from "react";

export type ControlSide = "left" | "right";

export interface ControlEntry {
  id: string;
  side: ControlSide;
  content: ReactNode;
  order?: number;
  path?: string;
  [key: string]: unknown;
}

export interface ControlSideGeometry {
  bottom?: number;
  height?: number;
  left?: number;
  maxWidth: number;
  right?: number;
}

export interface ControlsLayout {
  bottom: number;
  height: number;
  isHidden?: boolean;
  left: {
    maxWidth: number;
    right: number;
  };
  right: {
    left: number;
    maxWidth: number;
  };
  leftOffset?: number;
  rightOffset?: number;
}

export interface ControlsPairItem {
  content: ReactNode;
  id: string;
}

export interface ResolvedControlsPairs {
  left: ControlsPairItem[];
  right: ControlsPairItem[];
}

export type ControlSlot =
  | ReactNode
  | ComponentType<Record<string, unknown>>
  | ((props: Record<string, unknown>) => ReactNode)
  | null
  | false;

export interface DefineControlsOptions {
  id?: string;
  order?: number;
  path?: string | null;
  left?: ControlSlot;
  right?: ControlSlot;
  defaultProps?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ControlsUseOptions {
  path?: string;
  leftConfig?: Record<string, unknown>;
  rightConfig?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DefinedControls {
  id: string;
  order: number;
  use: (props?: Record<string, unknown>, options?: ControlsUseOptions) => void;
}

export interface ControlsSideProps {
  controls: ControlsPairItem[];
  geometry: ControlSideGeometry;
  side: ControlSide;
}

export interface ViewportDimensions {
  height: number;
  width: number;
}
