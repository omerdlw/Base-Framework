"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useRequiredContext } from "@/core/hooks";
import {
  useBackgroundRegistration,
  useBackgroundValue,
} from "@/core/orchestration";
import { DEFAULT_BACKGROUND } from "./constants";
import type {
  BackgroundActions,
  BackgroundProviderProps,
  BackgroundState,
  BackgroundStateComputed,
} from "./types";
import {
  mergeBackgroundState,
  normalizeBackgroundInput,
  syncVideoLoopDirect,
  syncVideoMutedDirect,
  triggerVideoPlaybackDirect,
} from "./utils";
import { extractYouTubeVideoId } from "./youtube";

interface BackgroundContextValue {
  actions: BackgroundActions;
  state: BackgroundStateComputed;
}

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

function useSafePathname(): string | null {
  try {
    return usePathname();
  } catch {
    return null;
  }
}

interface ScopedOverride {
  patch: Partial<BackgroundState> | null;
  pathname: string | null;
}

export function BackgroundProvider({ children }: BackgroundProviderProps) {
  const pathname = useSafePathname();
  const registryBackground =
    useBackgroundValue() as Partial<BackgroundState> | null;

  const [scopedOverride, setScopedOverride] = useState<ScopedOverride>({
    patch: null,
    pathname,
  });

  const activePatch =
    scopedOverride.pathname === pathname ? scopedOverride.patch : null;

  const background = useMemo<BackgroundState>(() => {
    const base = registryBackground
      ? mergeBackgroundState(DEFAULT_BACKGROUND, registryBackground)
      : DEFAULT_BACKGROUND;
    return activePatch ? mergeBackgroundState(base, activePatch) : base;
  }, [activePatch, registryBackground]);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const updatePatch = useCallback(
    (updater: (current: BackgroundState) => Partial<BackgroundState>) => {
      setScopedOverride((prev) => {
        const currentPatch = prev.pathname === pathname ? prev.patch : null;
        const base = registryBackground
          ? mergeBackgroundState(DEFAULT_BACKGROUND, registryBackground)
          : DEFAULT_BACKGROUND;
        const current = currentPatch
          ? mergeBackgroundState(base, currentPatch)
          : base;
        const rawNext = updater(current);
        if (!rawNext || Object.keys(rawNext).length === 0) {
          return prev;
        }
        const normalizedNext = normalizeBackgroundInput(rawNext);
        const mergedPatch: Partial<BackgroundState> = {
          ...(currentPatch || {}),
          ...normalizedNext,
          ...(currentPatch?.videoOptions || normalizedNext.videoOptions
            ? {
                videoOptions: {
                  ...(currentPatch?.videoOptions || {}),
                  ...(normalizedNext.videoOptions || {}),
                },
              }
            : {}),
        };
        return {
          patch: mergedPatch,
          pathname,
        };
      });
    },
    [pathname, registryBackground],
  );

  const setBackground = useCallback(
    (nextBackground: Partial<BackgroundState> | string) => {
      updatePatch(() => normalizeBackgroundInput(nextBackground));
    },
    [updatePatch],
  );

  const setVideoPlaying = useCallback(
    (isPlaying: boolean) => {
      updatePatch((cur) =>
        cur.isPlaying === isPlaying ? {} : { isPlaying },
      );
    },
    [updatePatch],
  );

  const setVideoElement = useCallback(
    (videoElement: HTMLVideoElement | null) => {
      videoElementRef.current = videoElement;
      updatePatch((cur) =>
        cur.videoElement === videoElement ? {} : { videoElement },
      );
    },
    [updatePatch],
  );

  const toggleVideo = useCallback(() => {
    const videoEl = videoElementRef.current || background.videoElement;
    const domIsActuallyPlaying = videoEl
      ? !videoEl.paused && !videoEl.ended
      : Boolean(background.isPlaying);
    const nextPlaying = !domIsActuallyPlaying;
    const configuredMuted = Boolean(background.videoOptions?.muted);

    triggerVideoPlaybackDirect(videoEl, nextPlaying, configuredMuted);

    updatePatch(() => ({ isPlaying: nextPlaying }));
  }, [background, updatePatch]);

  const toggleMute = useCallback(() => {
    const videoEl = videoElementRef.current || background.videoElement;
    const nextMuted = !background.videoOptions?.muted;
    syncVideoMutedDirect(videoEl, nextMuted);
    updatePatch((cur) => ({
      isPlaying: nextMuted ? cur.isPlaying : true,
      videoOptions: { ...cur.videoOptions, muted: nextMuted },
    }));
  }, [background, updatePatch]);

  const setVideoMuted = useCallback(
    (muted: boolean) => {
      const nextMuted = Boolean(muted);
      const videoEl = videoElementRef.current || background.videoElement;
      syncVideoMutedDirect(videoEl, nextMuted);
      updatePatch((cur) => {
        if (cur.videoOptions?.muted === nextMuted) return {};
        return {
          videoOptions: { ...cur.videoOptions, muted: nextMuted },
        };
      });
    },
    [background, updatePatch],
  );

  const toggleLoop = useCallback(() => {
    const videoEl = videoElementRef.current || background.videoElement;
    const nextLoop = !background.videoOptions?.loop;
    syncVideoLoopDirect(videoEl, nextLoop);
    updatePatch((cur) => ({
      videoOptions: { ...cur.videoOptions, loop: nextLoop },
    }));
  }, [background, updatePatch]);

  const resetBackground = useCallback(() => {
    setScopedOverride({ patch: null, pathname });
  }, [pathname]);

  const state = useMemo<BackgroundStateComputed>(() => {
    const youtubeVideoId = extractYouTubeVideoId(
      background.video || background.youtube,
      { allowBareId: Boolean(background.youtube && !background.video) },
    );
    const isYouTube = Boolean(youtubeVideoId);
    const isVideo = Boolean(background.video || isYouTube);

    return {
      ...background,
      hasBackground: Boolean(
        background.image ||
          isVideo ||
          background.color ||
          background.overlay ||
          (background.noiseStyle &&
            (background.noiseStyle.opacity === undefined ||
              (background.noiseStyle.opacity ?? 0) > 0)),
      ),
      isVideo,
      isYouTube,
      youtubeVideoId,
    };
  }, [background]);

  const actions = useMemo<BackgroundActions>(
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
      resetBackground,
      setBackground,
      setVideoElement,
      setVideoMuted,
      setVideoPlaying,
      toggleLoop,
      toggleMute,
      toggleVideo,
    ],
  );

  const value = useMemo<BackgroundContextValue>(
    () => ({ actions, state }),
    [actions, state],
  );

  return <BackgroundContext value={value}>{children}</BackgroundContext>;
}

export function useBackgroundState(): BackgroundStateComputed {
  return useRequiredContext(
    BackgroundContext,
    "useBackgroundState",
    "BackgroundProvider",
  ).state;
}

export function useBackgroundActions(): BackgroundActions {
  return useRequiredContext(
    BackgroundContext,
    "useBackgroundActions",
    "BackgroundProvider",
  ).actions;
}

export function useBackground(
  config?: Partial<BackgroundState> | string | null,
  options?: Record<string, unknown>,
): BackgroundStateComputed & BackgroundActions {
  const normalizedConfig = useMemo(() => {
    if (!config) return null;
    return normalizeBackgroundInput(config);
  }, [config]);

  useBackgroundRegistration(normalizedConfig, options);

  const { actions, state } = useRequiredContext(
    BackgroundContext,
    "useBackground",
    "BackgroundProvider",
  );

  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
}

