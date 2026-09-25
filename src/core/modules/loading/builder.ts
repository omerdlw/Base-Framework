"use client";

import { useLoading } from "./provider";
import type { DefinedLoading, LoadingOptions } from "./types";

export function defineLoading(
  definition: (LoadingOptions & { id?: string }) | string = {},
): DefinedLoading {
  const normalizedDef: LoadingOptions & { id?: string } =
    typeof definition === "string"
      ? { isLoading: true, message: definition }
      : definition || {};
  const { id = "loading", ...config } = normalizedDef;

  return Object.freeze({
    config,
    id,
    use: function useDefinedLoading(overrides = {}, options = {}) {
      const resolvedOverrides =
        typeof overrides === "boolean"
          ? { isLoading: overrides }
          : typeof overrides === "string"
            ? { isLoading: true, message: overrides }
            : overrides;
      return useLoading({ ...config, ...resolvedOverrides }, options);
    },
  });
}
