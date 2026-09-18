import type { ReactNode } from "react";

export interface LoadingState {
  isLoading: boolean;
  skeleton: ReactNode | null;
  minDuration: number;
  showOverlay: boolean;
}

export interface LoadingStateWithPage extends LoadingState {
  isPageLoading: boolean;
}

export interface LoadingOptions {
  isLoading?: boolean;
  skeleton?: ReactNode | null;
  minDuration?: number;
  showOverlay?: boolean;
  message?: string;
}

export type SkeletonUpdater = (current: ReactNode | null) => ReactNode | null;
export type SkeletonValue = ReactNode | SkeletonUpdater;

export interface LoadingActions {
  startLoading: (options?: LoadingOptions) => void;
  stopLoading: () => void;
  showLoading: (options?: LoadingOptions) => void;
  hideLoading: () => void;
  setIsLoading: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setSkeleton: (skeleton: SkeletonValue) => void;
}

export interface LoadingProviderProps {
  children?: ReactNode;
}

export interface LoadingContentProps {
  skeleton?: ReactNode | null;
}
