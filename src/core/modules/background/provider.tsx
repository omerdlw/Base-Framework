"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useIsomorphicLayoutEffect } from "@/core/hooks";
import { useBackgroundValue } from "@/core/orchestration";
import { DEFAULT_BACKGROUND } from "./constants";
import type {
  BackgroundActions,
  BackgroundProviderProps,
  BackgroundState,
  BackgroundStateComputed,
} from "./types";
import { mergeBackgroundState } from "./utils";

const BackgroundActionsContext = createContext<BackgroundActions | null>(null);
const BackgroundStateContext = createContext<BackgroundStateComputed | null>(
  null,
);

function useSafePathname(): string | null {
  try {
    return usePathname();
  } catch {
    return null;
  }
}

export function BackgroundProvider({ children }: BackgroundProviderProps) {
  const [background, setBackgroundState] =
    useState<BackgroundState>(DEFAULT_BACKGROUND);
  const registryBackground =
    useBackgroundValue() as Partial<BackgroundState> | null;
  const pathname = useSafePathname();
  const previousPathnameRef = useRef<string | null>(pathname);

  const setBackground = useCallback(
    (nextBackground: Partial<BackgroundState>) => {
      setBackgroundState((prevState) =>
        mergeBackgroundState(prevState, nextBackground),
      );
    },
    [],
  );

  const setVideoPlaying = useCallback((isPlaying: boolean) => {
    setBackgroundState((prevState) =>
      prevState.isPlaying === isPlaying
        ? prevState
        : { ...prevState, isPlaying },
    );
  }, []);

  const setVideoElement = useCallback(
    (videoElement: HTMLVideoElement | null) => {
      setBackgroundState((prevState) =>
        prevState.videoElement === videoElement
          ? prevState
          : { ...prevState, videoElement },
      );
    },
    [],
  );

  const toggleVideo = useCallback(() => {
    setBackgroundState((prevState) => ({
      ...prevState,
      isPlaying: !prevState.isPlaying,
    }));
  }, []);

  const toggleMute = useCallback(() => {
    setBackgroundState((prevState) => {
      const nextMuted = !prevState.videoOptions?.muted;
      if (prevState.videoElement) {
        prevState.videoElement.muted = nextMuted;
      }
      return {
        ...prevState,
        isPlaying: nextMuted ? prevState.isPlaying : true,
        videoOptions: { ...prevState.videoOptions, muted: nextMuted },
      };
    });
  }, []);

  const setVideoMuted = useCallback((muted: boolean) => {
    setBackgroundState((prevState) => {
      const nextMuted = Boolean(muted);
      if (prevState.videoOptions?.muted === nextMuted) return prevState;

      if (prevState.videoElement) {
        prevState.videoElement.muted = nextMuted;
      }
      return {
        ...prevState,
        videoOptions: { ...prevState.videoOptions, muted: nextMuted },
      };
    });
  }, []);

  const toggleLoop = useCallback(() => {
    setBackgroundState((prevState) => {
      const nextLoop = !prevState.videoOptions?.loop;
      if (prevState.videoElement) {
        prevState.videoElement.loop = nextLoop;
      }
      return {
        ...prevState,
        videoOptions: { ...prevState.videoOptions, loop: nextLoop },
      };
    });
  }, []);

  const resetBackground = useCallback(() => {
    setBackgroundState(DEFAULT_BACKGROUND);
  }, []);

  const setBackgroundFromRegistry = useCallback(
    (registryConfig: Partial<BackgroundState>) => {
      setBackgroundState((prevState) => {
        const isSameVideo = Boolean(
          prevState.video && prevState.video === registryConfig?.video,
        );
        const isSameImage = Boolean(
          prevState.image && prevState.image === registryConfig?.image,
        );
        const isSameMedia = isSameVideo || isSameImage;

        return mergeBackgroundState(
          isSameMedia ? prevState : DEFAULT_BACKGROUND,
          registryConfig,
        );
      });
    },
    [],
  );

  useIsomorphicLayoutEffect(() => {
    if (registryBackground) {
      setBackgroundFromRegistry(registryBackground);
      return;
    }
    resetBackground();
  }, [registryBackground, resetBackground, setBackgroundFromRegistry]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    if (!registryBackground) {
      resetBackground();
    }
  }, [pathname, registryBackground, resetBackground]);

  const stateValue = useMemo<BackgroundStateComputed>(
    () => ({
      ...background,
      hasBackground: Boolean(
        background.image ||
        background.video ||
        background.color ||
        background.overlay ||
        (background.noiseStyle &&
          (background.noiseStyle.opacity === undefined ||
            (background.noiseStyle.opacity ?? 0) > 0)),
      ),
      isVideo: Boolean(background.video),
    }),
    [background],
  );

  const actionsValue = useMemo<BackgroundActions>(
    () => ({
      resetBackground,
      setBackground,
      setVideoElement,
      setVideoMuted,
      setVideoPlaying,
      toggleLoop,
      toggleMute,
      toggleVideo,
    }),
    [
      setVideoPlaying,
      setVideoElement,
      setVideoMuted,
      resetBackground,
      setBackground,
      toggleVideo,
      toggleMute,
      toggleLoop,
    ],
  );

  return (
    <BackgroundActionsContext value={actionsValue}>
      <BackgroundStateContext value={stateValue}>
        {children}
      </BackgroundStateContext>
    </BackgroundActionsContext>
  );
}

export function useBackgroundState(): BackgroundStateComputed {
  const context = use(BackgroundStateContext);
  if (!context) {
    throw new Error("useBackgroundState must be within BackgroundProvider");
  }
  return context;
}

export function useBackgroundActions(): BackgroundActions {
  const context = use(BackgroundActionsContext);
  if (!context) {
    throw new Error("useBackgroundActions must be within BackgroundProvider");
  }
  return context;
}

export function useOptionalBackgroundActions(): BackgroundActions | null {
  return use(BackgroundActionsContext);
}
