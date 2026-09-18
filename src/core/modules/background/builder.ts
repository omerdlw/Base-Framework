"use client";

import { useBackgroundRegistration } from "@/core/orchestration";
import { BACKGROUND_PRESETS } from "./constants";
import type { BackgroundState, DefinedBackground } from "./types";

export function defineBackground(
  definition: Partial<BackgroundState> = {},
): DefinedBackground {
  const { preset = null, ...customConfig } = definition;

  const resolvedPreset =
    typeof preset === "string"
      ? (BACKGROUND_PRESETS as Record<string, Partial<BackgroundState>>)[
          preset
        ] || {}
      : preset && typeof preset === "object"
        ? preset
        : {};

  const mergedConfig: Partial<BackgroundState> = {
    ...resolvedPreset,
    ...customConfig,
  };

  return Object.freeze({
    config: mergedConfig,
    use: function useDefinedBackground(overrides = {}, options = {}) {
      useBackgroundRegistration({ ...mergedConfig, ...overrides }, options);
    },
  });
}
