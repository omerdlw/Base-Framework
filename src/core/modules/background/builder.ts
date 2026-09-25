"use client";

import { useBackground } from "./provider";
import type { BackgroundState, DefinedBackground } from "./types";

export function defineBackground(
  definition: (Partial<BackgroundState> & { id?: string }) | string = {},
): DefinedBackground {
  const normalizedDef =
    typeof definition === "string" ? { image: definition } : definition || {};
  const { id = "background", ...mergedConfig } = normalizedDef;

  return Object.freeze({
    config: mergedConfig,
    id,
    use: function useDefinedBackground(overrides = {}, options = {}) {
      const resolvedOverrides =
        typeof overrides === "string" ? { image: overrides } : overrides;
      return useBackground({ ...mergedConfig, ...resolvedOverrides }, options);
    },
  });
}
