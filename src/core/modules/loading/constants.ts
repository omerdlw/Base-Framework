import type { LoadingState } from "./types";

export const DEFAULT_LOADING_STATE: LoadingState = Object.freeze({
  isLoading: false,
  skeleton: null,
  minDuration: 0,
  showOverlay: true,
});
