import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";

export interface AmbientPalette {
  black: string;
  primary: string;
  source?: string | null;
}

export interface OklchColor {
  c: number;
  h: number;
  l: number;
}

export interface AmbientExtractOptions {
  fallbackPalette?: AmbientPalette | null;
  initialPalette?: AmbientPalette | null;
  [key: string]: unknown;
}

export type AmbientImageSource = string | { src: string } | null | undefined;

export type AmbientTarget =
  string | HTMLElement | RefObject<HTMLElement | null> | null | undefined;

export interface AmbientConfig {
  colors?:
    | Record<string, string>
    | ((props: Record<string, unknown>) => Record<string, string>)
    | null;
  image?:
    | AmbientImageSource
    | ((props: Record<string, unknown>) => AmbientImageSource);
  initialPalette?: AmbientPalette | null;
  options?: AmbientExtractOptions | null;
  scope?: AmbientTarget;
  tintGlobals?: boolean;
  transition?: boolean;
  [key: string]: unknown;
}

export interface AmbientDescriptor {
  colors: Record<string, string> | null;
  id: string;
  image: AmbientImageSource;
  initialPalette: AmbientPalette | null;
  options: AmbientExtractOptions;
  props: Record<string, unknown>;
  scope: AmbientTarget;
  transition: boolean;
  [key: string]: unknown;
}

export interface DefinedAmbient {
  config: Partial<AmbientConfig>;
  create: (
    props?: Record<string, unknown>,
    overrides?: Record<string, unknown>,
  ) => AmbientDescriptor;
  id: string;
  use: (
    props?: Record<string, unknown>,
    overrides?: Record<string, unknown>,
  ) => {
    isExtracting: boolean;
    palette: AmbientPalette;
  };
}

export interface AmbientContextValue {
  isExtracting: boolean;
  palette: AmbientPalette;
  setIsExtracting?: Dispatch<SetStateAction<boolean>>;
  setPalette?: Dispatch<SetStateAction<AmbientPalette>>;
}

export interface AmbientProviderProps {
  children?: ReactNode;
  initialPalette?: AmbientPalette | null;
}
