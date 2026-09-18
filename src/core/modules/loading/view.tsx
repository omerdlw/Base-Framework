"use client";

import { Z_INDEX } from "@/core/tokens";
import { useIsFullscreenStateActive } from "@/core/primitives/fullscreen-state";
import { Spinner } from "@/core/primitives/spinner";
import { useLoadingState } from "./provider";
import type { LoadingContentProps } from "./types";

export function LoadingContent({ skeleton }: LoadingContentProps) {
  if (skeleton) return skeleton;
  return <Spinner size={50} />;
}

export function LoadingOverlay() {
  const { isLoading, skeleton, showOverlay } = useLoadingState();
  const isFullscreenStateActive = useIsFullscreenStateActive();
  const isVisible = isLoading && showOverlay && !isFullscreenStateActive;
  if (!isVisible) return null;

  return (
    <div
      className="center fixed inset-0 h-screen w-screen"
      aria-label="Loading"
      aria-busy="true"
      role="status"
      style={{
        zIndex: Z_INDEX.LOADING,
      }}
    >
      <LoadingContent skeleton={skeleton} />
    </div>
  );
}

export default LoadingOverlay;
