"use client";

import { useAmbientTheme } from "./provider";
import type {
  AmbientConfig,
  AmbientDescriptor,
  AmbientExtractOptions,
  AmbientImageSource,
  AmbientPalette,
  AmbientTarget,
  DefinedAmbient,
} from "./types";

export function defineAmbient(
  definition: Partial<AmbientConfig> = {},
): DefinedAmbient {
  const {
    colors = null,
    image = null,
    initialPalette = null,
    options = {},
    transition = true,
    ...extraConfig
  } = definition;

  const id =
    typeof definition.id === "string" ? definition.id : "ambient-theme";
  const defaultProps = (definition.defaultProps || {}) as Record<
    string,
    unknown
  >;

  const createDescriptor = (
    props: Record<string, unknown> = {},
    overrides: Record<string, unknown> = {},
  ): AmbientDescriptor => {
    const mergedProps = { ...defaultProps, ...props };
    const resolvedImage =
      typeof image === "function"
        ? (image as (props: Record<string, unknown>) => AmbientImageSource)(
            mergedProps,
          )
        : ((overrides.image ?? image) as AmbientImageSource);
    const resolvedColors =
      typeof colors === "function"
        ? (
            colors as (
              props: Record<string, unknown>,
            ) => Record<string, string> | null
          )(mergedProps)
        : ((overrides.colors ?? colors) as Record<string, string> | null);

    return {
      colors: resolvedColors ?? null,
      id: (overrides.id as string) ?? id,
      image: resolvedImage,
      initialPalette:
        ((overrides.initialPalette as AmbientPalette | null) ??
          initialPalette) ||
        null,
      options: {
        ...options,
        ...((overrides.options as AmbientExtractOptions) || {}),
      },
      props: mergedProps,
      scope: ((overrides.scope as AmbientTarget) ?? null) as AmbientTarget,
      transition:
        typeof overrides.transition === "boolean"
          ? overrides.transition
          : transition,
      ...extraConfig,
      ...overrides,
    };
  };

  const useDefinedAmbient = (
    props: Record<string, unknown> = {},
    overrides: Record<string, unknown> = {},
  ) => {
    const config = createDescriptor(props, overrides);
    return useAmbientTheme(config);
  };

  return Object.freeze({
    config: definition,
    create: createDescriptor,
    id,
    use: useDefinedAmbient,
  });
}

export const defineTheme = defineAmbient;
