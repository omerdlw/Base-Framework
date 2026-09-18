import type { LoadingOptions, LoadingState } from "./types";

export function normalizeLoadingOptions(
  options: LoadingOptions = {},
): Omit<LoadingState, "isLoading"> {
  const minDuration = Number(options?.minDuration);
  return {
    minDuration:
      Number.isFinite(minDuration) && minDuration > 0 ? minDuration : 0,
    showOverlay: options?.showOverlay !== false,
    skeleton: options?.skeleton ?? null,
  };
}
