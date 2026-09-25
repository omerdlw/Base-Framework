"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useCallback,
  memo,
  type CSSProperties,
} from "react";
import { AnimatePresence, motion } from "motion/react";

import { Z_INDEX } from "@/core/tokens";
import { cn } from "@/core/utils";
import {
  DEFAULT_COLOR,
  DEFAULT_NOISE_OPACITY,
  FIT_TO_OBJECT_CLASS_MAP,
  NOISE_IMAGE_URL,
} from "./constants";
import {
  BACKGROUND_ANIMATE_PRESENCE_MODE,
  BACKGROUND_EXIT_EASE,
  BACKGROUND_OVERLAY_TRANSITION_PROPERTY,
  BACKGROUND_WILL_CHANGE,
  getBackgroundMotionConfig,
  toCssDelay,
  toCssDuration,
  toCssEasing,
} from "./motion";
import {
  applyVideoPlaybackState,
  extractWidthClasses,
  generateBaseGradient,
  generateEdgeGradient,
  getEdgeFadeMask,
  getVisualStyle,
  resolveGradientSettings,
  resolveVideoClasses,
} from "./utils";
import { useBackgroundActions, useBackgroundState } from "./provider";
import { parseYouTubeUrlConfig } from "./youtube";
import { YouTubeBackgroundPlayer } from "./youtube-player";

const BackgroundGradients = memo(function BackgroundGradients({
  count = 0,
  direction,
  color = DEFAULT_COLOR,
}: {
  count?: number;
  direction: "left" | "right";
  color?: string;
}) {
  if (!count || count <= 0) return null;
  const opacity = Math.min(1, Math.max(0.2, count * 0.25));
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-y-0 z-0",
        direction === "left" ? "left-0" : "right-0",
      )}
      style={{
        width: "50vw",
        opacity,
        background: generateBaseGradient(direction, color),
      }}
    />
  );
});

const EdgeGradient = memo(function EdgeGradient({
  direction,
  percent = 0,
  opacity = 0,
  color,
}: {
  direction: "left" | "right";
  percent?: number;
  opacity?: number;
  color?: string;
}) {
  if (opacity <= 0) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 z-10",
        direction === "left" ? "left-0" : "right-0",
      )}
      style={{
        width: `${Math.max(30, percent * 1.15)}%`,
        opacity,
        background: generateEdgeGradient(direction, color || DEFAULT_COLOR),
      }}
    />
  );
});

const NoiseOverlay = memo(function NoiseOverlay({
  opacity,
  blendMode,
  inlineStyle,
  maskImage,
  isFixed,
}: {
  opacity?: number;
  blendMode?: string;
  inlineStyle?: CSSProperties;
  maskImage?: string;
  isFixed?: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none transform-gpu",
        isFixed ? "fixed inset-0 h-screen w-screen" : "absolute inset-0",
      )}
      style={{
        opacity: typeof opacity === "number" ? opacity : DEFAULT_NOISE_OPACITY,
        mixBlendMode: (typeof blendMode === "string" && blendMode.trim()
          ? blendMode
          : "overlay") as CSSProperties["mixBlendMode"],
        backgroundImage: NOISE_IMAGE_URL,
        backgroundRepeat: "repeat",
        ...(maskImage ? { maskImage, WebkitMaskImage: maskImage } : {}),
        ...inlineStyle,
      }}
    />
  );
});

const SolidOverlay = memo(function SolidOverlay({
  opacity = 0,
  color,
  transitionStyle,
  maskImage,
}: {
  opacity?: number;
  color?: string;
  transitionStyle?: CSSProperties;
  maskImage?: string;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 transition-all duration-300 ease-in-out"
      style={{
        opacity,
        backgroundColor: color,
        ...(maskImage ? { maskImage, WebkitMaskImage: maskImage } : {}),
        ...transitionStyle,
      }}
    />
  );
});

export function BackgroundOverlay() {
  const {
    hasBackground,
    leftGradient: configuredLeftGradient,
    overlayOpacity,
    overlayColor,
    rightGradient: configuredRightGradient,
    videoStyle,
    videoClassName,
    className,
    width,
    fit,
    fadeEdges,
    imageStyle,
    videoOptions,
    animation,
    isPlaying,
    noiseStyle,
    position,
    isVideo,
    isYouTube,
    overlay,
    image,
    video,
    youtube,
  } = useBackgroundState();

  const { setVideoPlaying, setVideoElement } = useBackgroundActions();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isMuted = videoOptions?.muted ?? true;
  const shouldAutoPlay = videoOptions?.autoplay ?? true;
  const isLoop = videoOptions?.loop ?? false;
  const playbackRate = videoOptions?.playbackRate ?? 1;
  const corp = videoOptions?.corp ?? 0;
  const quality = (videoOptions?.quality as string) || "1080p";
  const codec = (videoOptions?.codec as string) || "auto";
  const forceIframe = Boolean(videoOptions?.forceIframe);
  const showPoster = Boolean(videoOptions?.showPoster);
  const showSpinner = videoOptions?.showSpinner !== false;

  const youtubeConfig = useMemo(
    () =>
      isYouTube
        ? parseYouTubeUrlConfig(video || youtube, {
            allowBareId: Boolean(youtube && !video),
          })
        : null,
    [isYouTube, video, youtube],
  );

  const startTime =
    typeof videoOptions?.startTime === "number"
      ? videoOptions.startTime
      : youtubeConfig?.startTime ?? 0;
  const endTime =
    typeof videoOptions?.endTime === "number"
      ? videoOptions.endTime
      : youtubeConfig?.endTime ?? 0;

  const backgroundKey = isVideo
    ? youtubeConfig
      ? `youtube:${youtubeConfig.videoId}`
      : video
    : image;

  const motionConfig = useMemo(
    () => getBackgroundMotionConfig(animation),
    [animation],
  );
  const {
    baseStyle,
    leftGradient: styleLeftGradient,
    rightGradient: styleRightGradient,
  } = useMemo(() => {
    const currentStyle = (isVideo ? videoStyle : imageStyle) || {};
    return getVisualStyle(currentStyle as Record<string, unknown>);
  }, [imageStyle, isVideo, videoStyle]);

  const leftGradient = configuredLeftGradient ?? styleLeftGradient;
  const rightGradient = configuredRightGradient ?? styleRightGradient;
  const {
    opacity: noiseOpacity,
    mixBlendMode: noiseBlendMode,
    ...noiseInlineStyle
  } = noiseStyle || {};

  const overlayTransitionStyle = useMemo<CSSProperties>(
    () => ({
      transitionDuration: toCssDuration(motionConfig.transition?.duration),
      transitionTimingFunction: toCssEasing(motionConfig.transition?.ease),
      transitionDelay: toCssDelay(motionConfig.transition?.delay),
      transitionProperty: BACKGROUND_OVERLAY_TRANSITION_PROPERTY,
    }),
    [motionConfig.transition],
  );

  const exitDurationFactor = Number.isFinite(motionConfig.exitDurationFactor)
    ? Math.max(0, motionConfig.exitDurationFactor)
    : 0.6;
  const resolvedExitDuration =
    motionConfig.exit?.transition?.duration ??
    (motionConfig.transition?.duration ?? 0.6) * exitDurationFactor;

  const rawWidth = width ?? videoOptions?.width ?? videoStyle?.width;
  const resolvedWidth =
    rawWidth !== undefined && rawWidth !== null && rawWidth !== ""
      ? typeof rawWidth === "number"
        ? `${rawWidth}px`
        : String(rawWidth)
      : undefined;

  const rawFit = fit ?? videoOptions?.fit ?? videoOptions?.objectFit;
  const fitClass = rawFit
    ? (FIT_TO_OBJECT_CLASS_MAP as Record<string, string>)[rawFit] || ""
    : "";

  const { customClasses, mappedClasses } = useMemo(
    () =>
      resolveVideoClasses(
        videoClassName,
        className,
        videoOptions?.videoClassName,
        videoOptions?.className,
        videoStyle?.className,
      ),
    [
      videoClassName,
      className,
      videoOptions?.videoClassName,
      videoOptions?.className,
      videoStyle?.className,
    ],
  );

  const { widthClasses, nonWidthClasses } = useMemo(
    () => extractWidthClasses(customClasses),
    [customClasses],
  );
  const hasCustomWidth = Boolean(resolvedWidth || widthClasses?.trim());

  const gradientSettings = useMemo(
    () =>
      resolveGradientSettings({
        fadeEdges,
        hasWidth: hasCustomWidth,
        leftGradient,
        rightGradient,
      }),
    [fadeEdges, leftGradient, rightGradient, hasCustomWidth],
  );

  const resolvedMaskImage = useMemo(
    () =>
      gradientSettings.enabled
        ? getEdgeFadeMask({
            color: overlayColor || DEFAULT_COLOR,
            leftPercent: gradientSettings.leftPercent,
            rightPercent: gradientSettings.rightPercent,
          })
        : undefined,
    [gradientSettings, overlayColor],
  );

  const wrapperPositionClass =
    position === "left"
      ? "left-0 ml-0 mr-auto"
      : position === "right"
        ? "right-0 mr-0 ml-auto"
        : "inset-x-0 mx-auto";
  const videoClasses = cn(
    "h-full w-full object-cover",
    fitClass,
    mappedClasses,
    nonWidthClasses,
  );
  const resolvedObjectPosition =
    (baseStyle as Record<string, any>)?.objectPosition ||
    (typeof position === "string" && position ? position : undefined);

  const handleEnded = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    if (videoElement.loop) {
      videoElement.currentTime = 0;
      videoElement
        .play()
        .catch((error) => console.warn("Loop play failed", error));
      return;
    }
    videoElement.pause();
    setVideoPlaying(false);
  }, [setVideoPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const videoElement = videoRef.current;
    if (
      videoElement &&
      videoElement.duration &&
      corp > 0 &&
      videoElement.currentTime >= videoElement.duration - corp
    ) {
      handleEnded();
    }
  }, [corp, handleEnded]);

  useEffect(() => {
    if (isYouTube) return undefined;
    if (!isVideo || !videoRef.current) {
      setVideoElement(null);
      return undefined;
    }
    const videoElement = videoRef.current;
    setVideoElement(videoElement);

    return () => {
      try {
        videoElement.pause();
      } catch {}
    };
  }, [isYouTube, isVideo, video, setVideoElement]);

  useEffect(() => {
    if (isYouTube || !isVideo || !videoRef.current) return;
    applyVideoPlaybackState({
      isPlaying,
      playbackRate,
      setVideoPlaying,
      videoElement: videoRef.current,
    });
  }, [isYouTube, isVideo, isPlaying, playbackRate, setVideoPlaying]);

  useEffect(() => () => setVideoElement(null), [setVideoElement]);

  const sharedVideoStyle = useMemo<CSSProperties>(
    () => ({
      ...(resolvedObjectPosition
        ? { objectPosition: resolvedObjectPosition }
        : {}),
      ...(resolvedMaskImage
        ? {
            WebkitMaskImage: resolvedMaskImage,
            maskImage: resolvedMaskImage,
          }
        : {}),
      ...(baseStyle as CSSProperties),
      filter: (baseStyle as Record<string, any>)?.filter || undefined,
    }),
    [baseStyle, resolvedMaskImage, resolvedObjectPosition],
  );

  return (
    <AnimatePresence mode={BACKGROUND_ANIMATE_PRESENCE_MODE}>
      {hasBackground && (
        <motion.div
          key={backgroundKey}
          initial={motionConfig.initial}
          animate={motionConfig.animate}
          transition={motionConfig.transition}
          exit={{
            ...motionConfig.exit,
            transition: {
              ...motionConfig.transition,
              delay: 0,
              duration: resolvedExitDuration,
              ease:
                (motionConfig.exit as any)?.transition?.ease ??
                BACKGROUND_EXIT_EASE,
            },
          }}
          className="pointer-events-none fixed inset-0 transform-gpu"
          style={{
            willChange: BACKGROUND_WILL_CHANGE,
            zIndex: Z_INDEX.BACKGROUND,
          }}
        >
          {isVideo ? (
            <div
              className={cn(
                "pointer-events-none absolute inset-y-0 overflow-hidden",
                wrapperPositionClass,
                widthClasses || (resolvedWidth ? "" : "w-full"),
              )}
              style={{
                ...(resolvedWidth ? { width: resolvedWidth } : {}),
                maxWidth: "100%",
              }}
            >
              {isYouTube && youtubeConfig ? (
                <YouTubeBackgroundPlayer
                  videoId={youtubeConfig.videoId}
                  startTime={startTime}
                  endTime={endTime}
                  corp={corp}
                  isPlaying={isPlaying}
                  isMuted={isMuted}
                  isLoop={isLoop}
                  shouldAutoPlay={shouldAutoPlay}
                  showPoster={showPoster}
                  showSpinner={showSpinner}
                  playbackRate={playbackRate}
                  quality={quality}
                  codec={codec}
                  forceIframe={forceIframe}
                  posterUrl={showPoster ? (image || null) : null}
                  videoClasses={videoClasses}
                  videoStyle={sharedVideoStyle}
                  setVideoElement={setVideoElement}
                  setVideoPlaying={setVideoPlaying}
                />
              ) : (
                <video
                  ref={videoRef}
                  src={video || undefined}
                  className={videoClasses}
                  preload="auto"
                  muted={isMuted}
                  loop={isLoop}
                  playsInline
                  style={sharedVideoStyle}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleEnded}
                  onLoadedData={() => {
                    const videoElement = videoRef.current;
                    if (!videoElement) return;
                    videoElement.playbackRate = playbackRate;
                    if (isMuted && shouldAutoPlay) {
                      videoElement.muted = true;
                      videoElement
                        .play()
                        .then(() => setVideoPlaying(true))
                        .catch((error) =>
                          console.warn("Autoplay prevented on load", error),
                        );
                    }
                  }}
                />
              )}

              <EdgeGradient
                direction="left"
                percent={gradientSettings.leftPercent}
                opacity={gradientSettings.leftOpacity}
                color={overlayColor}
              />
              <EdgeGradient
                direction="right"
                percent={gradientSettings.rightPercent}
                opacity={gradientSettings.rightOpacity}
                color={overlayColor}
              />

              {hasCustomWidth && (
                <NoiseOverlay
                  opacity={noiseOpacity}
                  blendMode={noiseBlendMode}
                  inlineStyle={noiseInlineStyle as CSSProperties}
                  maskImage={resolvedMaskImage}
                />
              )}

              {hasCustomWidth && overlay && (
                <SolidOverlay
                  opacity={overlayOpacity}
                  color={overlayColor}
                  transitionStyle={overlayTransitionStyle}
                  maskImage={resolvedMaskImage}
                />
              )}
            </div>
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-no-repeat"
              style={{
                backgroundImage: image ? `url(${image})` : undefined,
                backgroundPosition: position,
                ...(baseStyle as CSSProperties),
                filter: (baseStyle as Record<string, any>)?.filter || undefined,
              }}
            />
          )}

          {(!isVideo || !hasCustomWidth) && (
            <>
              <BackgroundGradients
                count={leftGradient}
                direction="left"
                color={overlayColor}
              />
              <BackgroundGradients
                count={rightGradient}
                direction="right"
                color={overlayColor}
              />
              <NoiseOverlay
                isFixed
                opacity={noiseOpacity}
                blendMode={noiseBlendMode}
                inlineStyle={noiseInlineStyle as CSSProperties}
              />
              {overlay && (
                <SolidOverlay
                  opacity={overlayOpacity}
                  color={overlayColor}
                  transitionStyle={overlayTransitionStyle}
                />
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BackgroundOverlay;
