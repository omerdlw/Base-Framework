import type { CSSProperties, ReactNode } from "react";

export type YouTubeVideoQuality =
  | "auto"
  | "2160p"
  | "1440p"
  | "1080p"
  | "720p"
  | "480p"
  | "360p";

export type YouTubeVideoCodec = "auto" | "hevc" | "av1" | "h264" | "vp9";

export interface VideoOptions {
  autoplay?: boolean;
  className?: string;
  codec?: YouTubeVideoCodec;
  corp?: number;
  endTime?: number;
  fit?: string;
  forceIframe?: boolean;
  loop?: boolean;
  muted?: boolean;
  objectFit?: string;
  playbackRate?: number;
  quality?: YouTubeVideoQuality;
  showPoster?: boolean;
  showSpinner?: boolean;
  startTime?: number;
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
  rightGradient?: number;
  video?: string | null;
  videoClassName?: string;
  videoElement?: HTMLVideoElement | null;
  videoOptions?: VideoOptions;
  videoStyle?: CSSProperties & Record<string, unknown>;
  width?: string | number | null;
  youtube?: string | null;
}

export interface BackgroundStateComputed extends BackgroundState {
  hasBackground: boolean;
  isVideo: boolean;
  isYouTube: boolean;
  youtubeVideoId: string | null;
}

export interface BackgroundActions {
  resetBackground: () => void;
  setBackground: (patch: Partial<BackgroundState> | string) => void;
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
  id: string;
  use: (
    overrides?: Partial<BackgroundState> | string,
    options?: Record<string, unknown>,
  ) => BackgroundStateComputed & BackgroundActions;
}
