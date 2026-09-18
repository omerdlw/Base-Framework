import type { CSSProperties, ReactNode } from "react";

export type BackgroundPreset = string;

export interface VideoOptions {
  autoplay?: boolean;
  className?: string;
  corp?: number;
  fit?: string;
  loop?: boolean;
  muted?: boolean;
  objectFit?: string;
  playbackRate?: number;
  videoClassName?: string;
  width?: string | number | null;
  [key: string]: unknown;
}

export interface FadeEdges {
  left?: number | string;
  right?: number | string;
}

export interface BackgroundAnimationConfig {
  animate?: Record<string, unknown>;
  exit?: {
    transition?: {
      duration?: number;
      ease?: unknown;
    };
    [key: string]: unknown;
  };
  exitDurationFactor?: number;
  initial?: Record<string, unknown>;
  transition?: {
    delay?: number;
    duration?: number;
    ease?: unknown;
  };
  [key: string]: unknown;
}

export interface BackgroundNoiseStyle {
  mixBlendMode?: string;
  opacity?: number;
  [key: string]: unknown;
}

export interface BackgroundState {
  animation?: BackgroundAnimationConfig | null;
  className?: string;
  color?: string;
  fadeEdges?: FadeEdges | number | string | boolean | null;
  fit?: string | null;
  image?: string | null;
  imageStyle?: CSSProperties & Record<string, unknown>;
  isPlaying?: boolean;
  leftGradient?: number;
  noiseStyle?: BackgroundNoiseStyle;
  overlay?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  position?: string;
  preset?: string;
  rightGradient?: number;
  video?: string | null;
  videoClassName?: string;
  videoElement?: HTMLVideoElement | null;
  videoOptions?: VideoOptions;
  videoStyle?: CSSProperties & Record<string, unknown>;
  width?: string | number | null;
}

export interface BackgroundStateComputed extends BackgroundState {
  hasBackground: boolean;
  isVideo: boolean;
}

export interface BackgroundActions {
  resetBackground: () => void;
  setBackground: (patch: Partial<BackgroundState>) => void;
  setVideoElement: (element: HTMLVideoElement | null) => void;
  setVideoMuted: (muted: boolean) => void;
  setVideoPlaying: (isPlaying: boolean) => void;
  toggleLoop: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

export interface BackgroundProviderProps {
  children?: ReactNode;
}

export interface DefinedBackground {
  config: Partial<BackgroundState>;
  use: (
    overrides?: Partial<BackgroundState>,
    options?: Record<string, unknown>,
  ) => void;
}
