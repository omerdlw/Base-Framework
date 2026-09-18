"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from "motion/react";

import { PLAYBACK_RATES } from "./constants";
import {
  getNavActionMotionProps,
  getNavMediaVolumeFillTransition,
  getNavMediaVolumeThumbAnimateProps,
  getNavMediaVolumeThumbPositionTransition,
  NAV_BUTTON_TRANSITION,
  NAV_SCRUBBER_TOOLTIP_TRANSITION,
  NAV_SCRUBBER_TOOLTIP_SPRING,
  navScrubberTooltipVariants,
  navSoundwaveBarVariants,
} from "./motion";
import { clamp, formatMediaTime } from "./utils";
import {
  useBackgroundActions,
  useBackgroundState,
} from "@/core/modules/background";
import { cn } from "@/core/utils";
import { Button } from "@/core/primitives";
import Iconify from "@/core/primitives/icon";

const ButtonComponent = Button as any;
const IconifyComponent = Iconify as any;

export { formatMediaTime };

function resolveActionNode(
  action: any,
  mediaAction: any,
  showMediaAction: boolean,
) {
  const MediaAction = mediaAction;

  if (React.isValidElement(action)) {
    return (
      <div className="flex flex-col gap-2.5">
        {action}
        {showMediaAction && <MediaAction />}
      </div>
    );
  }
  if (typeof action === "function") {
    const ActionComponent = action;
    return (
      <div className="flex flex-col gap-2.5">
        <ActionComponent />
        {showMediaAction && <MediaAction />}
      </div>
    );
  }
  return showMediaAction ? <MediaAction /> : null;
}

export function applyMediaAction(
  item: any,
  isVideo: boolean,
  toggleBackgroundVideo: () => void,
  mediaAction: any,
) {
  if (!item || !isVideo) return item;

  const showMediaAction = Boolean(mediaAction) && item.mediaAction !== false;
  return {
    ...item,
    action: resolveActionNode(item.action, mediaAction, showMediaAction),
    onClick: (event: any) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      toggleBackgroundVideo();
    },
  };
}

export const NavSoundwave = memo(function NavSoundwave({
  isPlaying = false,
  className = "",
  barCount = 4,
}: {
  isPlaying?: boolean;
  className?: string;
  barCount?: number;
}) {
  const safeBarCount = clamp(Math.floor(Number(barCount) || 0), 1, 12);

  return (
    <div
      className={cn("flex h-3.5 items-end justify-center gap-0.5", className)}
      aria-hidden="true"
    >
      {Array.from({ length: safeBarCount }).map((_, index) => (
        <motion.span
          key={index}
          custom={index}
          variants={navSoundwaveBarVariants}
          animate={isPlaying ? "playing" : "paused"}
          className="h-full w-0.5 origin-bottom rounded-full bg-white/70"
        />
      ))}
    </div>
  );
});

export const NavMediaControls = memo(function NavMediaControls({
  className = "",
}: {
  className?: string;
}) {
  const { videoElement, videoOptions } = useBackgroundState();
  const { toggleLoop, setVideoMuted } = useBackgroundActions();

  const [playbackRate, setPlaybackRate] = useState<number>(
    videoElement?.playbackRate || 1,
  );
  const [volume, setVolume] = useState<number>(() =>
    Number(videoElement?.volume ?? 1),
  );
  const [isMuted, setIsMuted] = useState<boolean>(() =>
    Boolean(videoElement?.muted),
  );
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [isPipSupported, setIsPipSupported] = useState(false);

  const isDraggingRef = useRef(false);
  const volumeTrackRef = useRef<HTMLDivElement | null>(null);
  const volumeFillRef = useRef<HTMLDivElement | null>(null);
  const volumeThumbRef = useRef<HTMLDivElement | null>(null);
  const volumeDragCleanupRef = useRef<(() => void) | null>(null);

  const isLoop = Boolean(videoOptions?.loop);

  useEffect(() => {
    return () => {
      volumeDragCleanupRef.current?.();
      volumeDragCleanupRef.current = null;
      isDraggingRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      "pictureInPictureEnabled" in document
    ) {
      setIsPipSupported(Boolean(document.pictureInPictureEnabled));
    }
  }, []);

  useEffect(() => {
    if (!videoElement) {
      setPlaybackRate(1);
      setVolume(1);
      setIsMuted(false);
      setIsPipActive(false);
      return undefined;
    }

    const syncMediaPlaybackState = () => {
      const nextRate = Number(videoElement.playbackRate);
      setPlaybackRate(Number.isFinite(nextRate) && nextRate > 0 ? nextRate : 1);

      if (isDraggingRef.current) return;

      const currentVol = Number(videoElement.volume) || 0;
      const currentMute = Boolean(videoElement.muted);

      setVolume(currentVol);
      setIsMuted(currentMute);

      const effective = currentMute ? 0 : currentVol;
      const effectivePercent = `${effective * 100}%`;

      if (volumeFillRef.current)
        volumeFillRef.current.style.width = effectivePercent;
      if (volumeThumbRef.current)
        volumeThumbRef.current.style.left = effectivePercent;
    };

    const handleEnterPip = () => setIsPipActive(true);
    const handleLeavePip = () => setIsPipActive(false);

    syncMediaPlaybackState();

    videoElement.addEventListener("ratechange", syncMediaPlaybackState);
    videoElement.addEventListener("volumechange", syncMediaPlaybackState);
    videoElement.addEventListener("enterpictureinpicture", handleEnterPip);
    videoElement.addEventListener("leavepictureinpicture", handleLeavePip);

    return () => {
      videoElement.removeEventListener("ratechange", syncMediaPlaybackState);
      videoElement.removeEventListener("volumechange", syncMediaPlaybackState);
      videoElement.removeEventListener("enterpictureinpicture", handleEnterPip);
      videoElement.removeEventListener("leavepictureinpicture", handleLeavePip);
    };
  }, [videoElement]);

  const handleCycleSpeed = useCallback(() => {
    if (!videoElement) return;
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate as any);
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
    videoElement.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }, [playbackRate, videoElement]);

  const updateVolumeFromPosition = useCallback(
    (clientX: number) => {
      if (!videoElement || !volumeTrackRef.current) return;

      const rect = volumeTrackRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const offsetX = clamp(clientX - rect.left, 0, rect.width);
      const fraction = offsetX / rect.width;
      const nextVolume = Math.round(fraction * 100) / 100;
      const fractionPercent = `${fraction * 100}%`;

      if (volumeFillRef.current)
        volumeFillRef.current.style.width = fractionPercent;
      if (volumeThumbRef.current)
        volumeThumbRef.current.style.left = fractionPercent;

      videoElement.volume = nextVolume;
      const nextMuted = nextVolume === 0;
      videoElement.muted = nextMuted;

      setVideoMuted?.(nextMuted);
      setVolume(nextVolume);
      setIsMuted(nextMuted);
    },
    [setVideoMuted, videoElement],
  );

  const handleVolumePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      volumeDragCleanupRef.current?.();
      isDraggingRef.current = true;
      setIsDraggingVolume(true);

      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {}

      updateVolumeFromPosition(event.clientX);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!isDraggingRef.current) return;
        updateVolumeFromPosition(moveEvent.clientX);
      };

      const handlePointerUp = () => {
        isDraggingRef.current = false;
        setIsDraggingVolume(false);

        if (videoElement) {
          setVolume(Number(videoElement.volume) || 0);
          setIsMuted(Boolean(videoElement.muted));
        }
        removePointerListeners();
      };

      const removePointerListeners = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        if (volumeDragCleanupRef.current === removePointerListeners) {
          volumeDragCleanupRef.current = null;
        }
      };

      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);

      volumeDragCleanupRef.current = removePointerListeners;
    },
    [updateVolumeFromPosition, videoElement],
  );

  const handleToggleMute = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!videoElement) return;

      if (isMuted || volume === 0) {
        const restoredVolume = volume === 0 ? 0.7 : volume;
        videoElement.volume = restoredVolume;
        videoElement.muted = false;

        setVideoMuted?.(false);
        setVolume(restoredVolume);
        setIsMuted(false);

        const restoredPercent = `${restoredVolume * 100}%`;
        if (volumeFillRef.current)
          volumeFillRef.current.style.width = restoredPercent;
        if (volumeThumbRef.current)
          volumeThumbRef.current.style.left = restoredPercent;
      } else {
        videoElement.muted = true;
        setVideoMuted?.(true);
        setIsMuted(true);

        if (volumeFillRef.current) volumeFillRef.current.style.width = "0%";
        if (volumeThumbRef.current) volumeThumbRef.current.style.left = "0%";
      }
    },
    [isMuted, setVideoMuted, videoElement, volume],
  );

  const handleTogglePip = useCallback(async () => {
    if (!videoElement) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoElement.requestPictureInPicture();
      }
    } catch {}
  }, [videoElement]);

  const handleSkipBackward = useCallback(() => {
    if (!videoElement) return;
    const current = Number(videoElement.currentTime) || 0;
    videoElement.currentTime = Math.max(0, current - 10);
  }, [videoElement]);

  const handleSkipForward = useCallback(() => {
    if (!videoElement) return;
    const current = Number(videoElement.currentTime) || 0;
    const duration = Number(videoElement.duration) || 0;
    videoElement.currentTime =
      duration > 0 ? Math.min(duration, current + 10) : current + 10;
  }, [videoElement]);

  const effectiveVolume = isMuted ? 0 : volume;
  const volumeIcon =
    effectiveVolume === 0
      ? "solar:volume-cross-bold"
      : effectiveVolume < 0.5
        ? "solar:volume-small-bold"
        : "solar:volume-loud-bold";

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-2 select-none",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <motion.button
          {...getNavActionMotionProps()}
          type="button"
          onClick={handleCycleSpeed}
          className={cn(
            "flex h-8 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-semibold tabular-nums ring-1 ring-inset select-none",
            playbackRate !== 1
              ? "bg-white/10 text-white ring-white/10 hover:bg-white/15"
              : "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10",
          )}
          aria-label={`Playback speed ${playbackRate}x`}
          title={`Playback speed: ${playbackRate}x`}
        >
          <span>{playbackRate}x</span>
        </motion.button>

        <motion.button
          {...getNavActionMotionProps()}
          type="button"
          onClick={handleSkipBackward}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10 select-none"
          aria-label="Rewind 10 seconds"
          title="Rewind 10 seconds"
        >
          <IconifyComponent
            icon="solar:rewind-10-seconds-back-bold"
            size={16}
          />
        </motion.button>

        <motion.button
          {...getNavActionMotionProps()}
          type="button"
          onClick={handleSkipForward}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10 select-none"
          aria-label="Forward 10 seconds"
          title="Forward 10 seconds"
        >
          <IconifyComponent
            icon="solar:rewind-10-seconds-forward-bold"
            size={16}
          />
        </motion.button>
      </div>

      <div className="flex items-center gap-1.5">
        <motion.div
          {...getNavActionMotionProps({ disabled: isDraggingVolume })}
          className={cn(
            "group flex h-8 items-center gap-1.5 rounded-full px-2.5 ring-1 select-none ring-inset",
            isDraggingVolume
              ? "bg-white/10 ring-white/10"
              : "bg-white/5 ring-white/5 hover:bg-white/10 hover:ring-white/10",
          )}
        >
          <ButtonComponent
            type="button"
            onClick={handleToggleMute}
            className="flex size-5 cursor-pointer items-center justify-center p-0 text-white/70 hover:text-white"
            aria-label={isMuted ? "Unmute" : "Mute"}
            title={
              isMuted
                ? "Unmute"
                : `Volume: ${Math.round(effectiveVolume * 100)}%`
            }
          >
            <IconifyComponent icon={volumeIcon} size={16} />
          </ButtonComponent>

          <div
            ref={volumeTrackRef}
            role="slider"
            aria-label="Volume slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(effectiveVolume * 100)}
            tabIndex={0}
            onPointerDown={handleVolumePointerDown}
            onKeyDown={(event) => {
              if (!videoElement) return;
              if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                const next = Math.max(0, volume - 0.05);
                videoElement.volume = next;
                const nextMuted = next === 0;
                videoElement.muted = nextMuted;
                setVideoMuted?.(nextMuted);
              } else if (
                event.key === "ArrowRight" ||
                event.key === "ArrowUp"
              ) {
                event.preventDefault();
                const next = Math.min(1, volume + 0.05);
                videoElement.volume = next;
                videoElement.muted = false;
                setVideoMuted?.(false);
              }
            }}
            className="group/track relative flex h-6 w-16 cursor-pointer touch-none items-center select-none sm:w-20"
          >
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                ref={volumeFillRef}
                className="h-full origin-left rounded-full bg-white"
                style={{
                  width: `${effectiveVolume * 100}%`,
                  transition: getNavMediaVolumeFillTransition({
                    isDragging: isDraggingVolume,
                  }),
                }}
              />
            </div>
            <motion.div
              ref={volumeThumbRef}
              className={cn(
                "pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md ring-2 ring-black",
                isDraggingVolume
                  ? "opacity-100"
                  : "opacity-0 group-hover/track:opacity-100",
              )}
              animate={getNavMediaVolumeThumbAnimateProps({
                isDragging: isDraggingVolume,
              })}
              transition={NAV_BUTTON_TRANSITION}
              style={{
                left: `${effectiveVolume * 100}%`,
                transition: getNavMediaVolumeThumbPositionTransition({
                  isDragging: isDraggingVolume,
                }),
              }}
            />
          </div>
        </motion.div>

        {isPipSupported && (
          <motion.button
            {...getNavActionMotionProps()}
            type="button"
            onClick={handleTogglePip}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-full ring-1 ring-inset select-none",
              isPipActive
                ? "bg-white/10 text-white ring-white/10 hover:bg-white/15"
                : "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10",
            )}
            aria-label={
              isPipActive
                ? "Exit Picture-in-Picture"
                : "Enter Picture-in-Picture"
            }
            title={
              isPipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"
            }
          >
            <IconifyComponent icon="solar:pip-bold" size={16} />
          </motion.button>
        )}

        <motion.button
          {...getNavActionMotionProps()}
          type="button"
          onClick={toggleLoop}
          className={cn(
            "flex size-8 cursor-pointer items-center justify-center rounded-full ring-1 ring-inset select-none",
            isLoop
              ? "bg-white/10 text-white ring-white/10 hover:bg-white/15"
              : "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10",
          )}
          aria-label={isLoop ? "Disable loop" : "Enable loop"}
          title={isLoop ? "Loop: On" : "Loop: Off"}
        >
          <IconifyComponent icon="solar:repeat-bold" size={16} />
        </motion.button>
      </div>
    </div>
  );
});

export const NavMediaScrubber = memo(function NavMediaScrubber({
  className = "",
  showTimeOnHover = true,
}: {
  className?: string;
  showTimeOnHover?: boolean;
}) {
  const { isVideo, isPlaying, videoElement } = useBackgroundState();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);

  const hoverX = useMotionValue(0);
  const smoothHoverX = useSpring(hoverX, NAV_SCRUBBER_TOOLTIP_SPRING);

  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const rAFRef = useRef<number | null>(null);

  useEffect(() => {
    if (!videoElement) {
      if (progressBarRef.current)
        progressBarRef.current.style.transform = "scaleX(0)";
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const publishProgress = () => {
      const current = Math.max(0, Number(videoElement.currentTime) || 0);
      const total = Math.max(0, Number(videoElement.duration) || 0);
      const ratio = total > 0 ? clamp(current / total, 0, 1) : 0;

      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${ratio})`;
      }

      setCurrentTime((prev) =>
        Math.abs(prev - current) >= 1 ? Math.floor(current) : prev,
      );
      setDuration((prev) => (prev === total ? prev : total));
    };

    const runProgressLoop = () => {
      publishProgress();
      rAFRef.current = requestAnimationFrame(runProgressLoop);
    };

    publishProgress();

    if (isPlaying) {
      rAFRef.current = requestAnimationFrame(runProgressLoop);
    } else if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
    }

    videoElement.addEventListener("timeupdate", publishProgress);
    videoElement.addEventListener("durationchange", publishProgress);
    videoElement.addEventListener("loadedmetadata", publishProgress);

    return () => {
      if (rAFRef.current !== null) cancelAnimationFrame(rAFRef.current);
      videoElement.removeEventListener("timeupdate", publishProgress);
      videoElement.removeEventListener("durationchange", publishProgress);
      videoElement.removeEventListener("loadedmetadata", publishProgress);
    };
  }, [isPlaying, videoElement]);

  const seekToTime = useCallback(
    (targetTime: number) => {
      if (!videoElement || duration <= 0) return;
      const nextTime = clamp(targetTime, 0, duration);
      videoElement.currentTime = nextTime;
      setCurrentTime(Math.floor(nextTime));

      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${nextTime / duration})`;
      }
    },
    [duration, videoElement],
  );

  const handleSeek = useCallback(
    (event: any) => {
      if (!videoElement || !scrubberRef.current || !duration) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const clientX = event.clientX ?? event.touches?.[0]?.clientX ?? 0;
      const offsetX = clamp(clientX - rect.left, 0, rect.width);
      const percentage = rect.width > 0 ? offsetX / rect.width : 0;

      seekToTime(percentage * duration);
    },
    [duration, seekToTime, videoElement],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const keyTargets: Record<string, number> = {
        ArrowLeft: currentTime - 5,
        ArrowRight: currentTime + 5,
        Home: 0,
        End: duration,
      };
      if (!(event.key in keyTargets)) return;

      event.preventDefault();
      event.stopPropagation();
      seekToTime(keyTargets[event.key]);
    },
    [currentTime, duration, seekToTime],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!scrubberRef.current || !duration) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const clientX = event.clientX ?? 0;
      const offsetX = clamp(clientX - rect.left, 0, rect.width);
      const percentage = rect.width > 0 ? offsetX / rect.width : 0;

      hoverX.set(offsetX);
      setHoverTime(percentage * duration);
    },
    [duration, hoverX],
  );

  if (!isVideo || !videoElement) return null;

  return (
    <div
      ref={scrubberRef}
      role="slider"
      aria-label="Media playback scrubber"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={`${formatMediaTime(currentTime)} of ${formatMediaTime(duration)}`}
      tabIndex={0}
      className={cn(
        "group absolute inset-x-0 top-0 z-30 h-3 cursor-pointer touch-none overflow-hidden rounded-t-[30px] select-none",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        e.stopPropagation();
        handleSeek(e);
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[2.5px] w-full bg-white/10 group-hover:h-1">
        <div
          ref={progressBarRef}
          className="h-full w-full origin-left bg-white/70 group-hover:bg-white"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      <AnimatePresence>
        {isHovered && showTimeOnHover && duration > 0 && (
          <motion.div
            variants={navScrubberTooltipVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={NAV_SCRUBBER_TOOLTIP_TRANSITION}
            className="pointer-events-none absolute top-3 -translate-x-1/2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs text-white ring-1 ring-white/10 ring-inset"
            style={{ left: smoothHoverX }}
          >
            {formatMediaTime(hoverTime)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
