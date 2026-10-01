"use client";

import { memo, type CSSProperties } from "react";
import { cn } from "@/core/utils";
import { Spinner } from "@/core/primitives";
import { AnimatePresence, motion, type Transition } from "motion/react";
import { EASING_CURVES } from "@/core/tokens";
import { type ResolvedTheme } from "../theme";
import {
  type BackgroundActions,
  type BackgroundThemeSlot,
  type YouTubeBackgroundPlayerProps,
} from "./types";
import {
  useNativeVideoModel,
  useYouTubeBackgroundPlayerModel,
  useBackgroundOverlayModel,
} from "./hooks";
import { DEFAULT_COLOR } from "./constants";
import { generateBaseGradient, generateEdgeGradient } from "./utils";

type Theme = ResolvedTheme<BackgroundThemeSlot>;

export function NativeVideo({
  corp,
  isLoop,
  isMuted,
  isPlaying,
  playbackRate,
  setVideoElement,
  setVideoPlaying,
  shouldAutoPlay,
  src,
  style,
  className,
}: {
  className: string;
  corp: number;
  isLoop: boolean;
  isMuted: boolean;
  isPlaying?: boolean;
  playbackRate: number;
  setVideoElement: BackgroundActions["setVideoElement"];
  setVideoPlaying: BackgroundActions["setVideoPlaying"];
  shouldAutoPlay: boolean;
  src: string | undefined;
  style: CSSProperties;
}) {
  const { videoRef, handleEnded, handleTimeUpdate, handleLoadedData } =
    useNativeVideoModel({
      corp,
      isLoop,
      isMuted,
      isPlaying,
      playbackRate,
      setVideoElement,
      setVideoPlaying,
      shouldAutoPlay,
      src,
      style,
      className,
    });
  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      preload="auto"
      muted={isMuted}
      loop={isLoop}
      playsInline
      style={style}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      onLoadedData={handleLoadedData}
    />
  );
}

export const BackgroundGradients = memo(function BackgroundGradients({
  count = 0,
  direction,
  color = DEFAULT_COLOR,
  theme,
}: {
  theme: Theme;
  count?: number;
  direction: "left" | "right";
  color?: string;
}) {
  if (!count || count <= 0) return null;
  const opacity = Math.min(1, Math.max(0.2, count * 0.25));
  return (
    <div
      className={cn(
        theme.slots.gradient,
        direction === "left"
          ? theme.slots.gradientLeft
          : theme.slots.gradientRight,
      )}
      style={{
        ...theme.styles.gradient,
        opacity,
        background: generateBaseGradient(direction, color),
      }}
    />
  );
});

export const EdgeGradient = memo(function EdgeGradient({
  direction,
  percent = 0,
  opacity = 0,
  color,
  theme,
}: {
  theme: Theme;
  direction: "left" | "right";
  percent?: number;
  opacity?: number;
  color?: string;
}) {
  if (opacity <= 0) return null;
  return (
    <div
      className={cn(
        theme.slots.edge,
        direction === "left" ? theme.slots.edgeLeft : theme.slots.edgeRight,
      )}
      style={{
        width: `${Math.max(30, percent * 1.15)}%`,
        opacity,
        background: generateEdgeGradient(direction, color || DEFAULT_COLOR),
      }}
    />
  );
});

export const NoiseOverlay = memo(function NoiseOverlay({
  opacity,
  blendMode,
  inlineStyle,
  maskImage,
  isFixed,
  theme,
}: {
  theme: Theme;
  opacity?: number;
  blendMode?: string;
  inlineStyle?: CSSProperties;
  maskImage?: string;
  isFixed?: boolean;
}) {
  return (
    <div
      className={cn(
        theme.slots.noise,
        isFixed ? theme.slots.noiseFixed : theme.slots.noiseAbsolute,
      )}
      style={{
        ...theme.styles.noise,
        ...(typeof opacity === "number" ? { opacity } : {}),
        ...(typeof blendMode === "string" && blendMode.trim()
          ? { mixBlendMode: blendMode as CSSProperties["mixBlendMode"] }
          : {}),
        ...(maskImage ? { maskImage, WebkitMaskImage: maskImage } : {}),
        ...inlineStyle,
      }}
    />
  );
});

export const SolidOverlay = memo(function SolidOverlay({
  opacity = 0,
  color,
  transitionStyle,
  maskImage,
  theme,
}: {
  theme: Theme;
  opacity?: number;
  color?: string;
  transitionStyle?: CSSProperties;
  maskImage?: string;
}) {
  return (
    <div
      className={theme.slots.solid}
      style={{
        opacity,
        backgroundColor: color,
        ...(maskImage ? { maskImage, WebkitMaskImage: maskImage } : {}),
        ...transitionStyle,
      }}
    />
  );
});

export const YouTubeBackgroundPlayer = memo(function YouTubeBackgroundPlayer({
  codec = "auto",
  corp = 0,
  endTime = 0,
  forceIframe = false,
  isLoop = false,
  isMuted = true,
  isPlaying = true,
  playbackRate = 1,
  posterUrl = null,
  quality = "1080p",
  setVideoElement,
  setVideoPlaying,
  shouldAutoPlay = true,
  showPoster = false,
  showSpinner = true,
  startTime = 0,
  theme,
  videoClasses,
  videoId,
  videoStyle,
}: YouTubeBackgroundPlayerProps) {
  const {
    useIframeFallback,
    isFrameReady,
    setIsBuffering,
    videoRef,
    audioRef,
    iframeHostRef,
    videoStreamUrl,
    audioStreamUrl,
    resolvedPoster,
    syncCompanionAudio,
    handleEnded,
    handleTimeUpdate,
    handlePlay,
    handlePlaying,
    handlePause,
    handleSeeked,
    handleCanPlay,
    handleLoadedMetadata,
    handleLoadedData,
    handleError,
    isCovered,
    showSpinnerOverlay,
  } = useYouTubeBackgroundPlayerModel({
    codec,
    corp,
    endTime,
    forceIframe,
    isLoop,
    isMuted,
    isPlaying,
    playbackRate,
    posterUrl,
    quality,
    setVideoElement,
    setVideoPlaying,
    shouldAutoPlay,
    showPoster,
    showSpinner,
    startTime,
    theme,
    videoClasses,
    videoId,
    videoStyle,
  });
  return (
    <div className={theme.slots.ytRoot}>
      <div
        className={cn(
          theme.slots.ytCover,
          isCovered ? theme.slots.visible : theme.slots.hidden,
        )}
      />

      <div
        className={cn(
          theme.slots.ytSpinner,
          showSpinnerOverlay ? theme.slots.visible : theme.slots.hidden,
        )}
      >
        {showSpinner ? (
          <Spinner size={30} className={theme.slots.ytSpinnerIcon} />
        ) : null}
      </div>

      {resolvedPoster ? (
        <div
          className={cn(
            theme.slots.ytPoster,
            isCovered ? theme.slots.visible : theme.slots.hidden,
          )}
          style={{
            backgroundImage: `url(${resolvedPoster})`,
            ...videoStyle,
          }}
        />
      ) : null}

      {useIframeFallback && !isPlaying ? (
        <div className={theme.slots.ytBlackout} />
      ) : null}

      {useIframeFallback ? (
        <div
          className={cn(
            theme.slots.ytFrame,
            isFrameReady ? theme.slots.visible : theme.slots.hidden,
          )}
          style={videoStyle}
        >
          <div ref={iframeHostRef} className={theme.slots.ytIframeHost} />
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={videoStreamUrl}
            className={cn(
              videoClasses,
              theme.slots.ytVideo,
              isFrameReady ? theme.slots.visible : theme.slots.hidden,
            )}
            preload="auto"
            muted={isMuted}
            loop={isLoop}
            playsInline
            style={videoStyle}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onPlay={handlePlay}
            onWaiting={() => {
              setIsBuffering(true);
              syncCompanionAudio(false);
            }}
            onPlaying={handlePlaying}
            onPause={handlePause}
            onSeeking={() => setIsBuffering(true)}
            onSeeked={handleSeeked}
            onCanPlay={handleCanPlay}
            onLoadedMetadata={handleLoadedMetadata}
            onLoadedData={handleLoadedData}
            onError={handleError}
          />
          <audio
            ref={audioRef}
            src={audioStreamUrl}
            preload="auto"
            onCanPlay={() => syncCompanionAudio(true)}
          />
        </>
      )}
    </div>
  );
});

export function BackgroundOverlay() {
  const {
    className,
    hasBackground,
    image,
    isPlaying,
    isVideo,
    overlay,
    overlayColor,
    overlayOpacity,
    position,
    video,
    videoStyle,
    width,
    setVideoElement,
    setVideoPlaying,
    options,
    corp,
    isMuted,
    playbackRate,
    youtubeConfig,
    startTime,
    endTime,
    backgroundKey,
    motionConfig,
    baseStyle,
    leftGradient,
    rightGradient,
    noiseOpacity,
    noiseBlendMode,
    noiseInlineStyle,
    overlayTransitionStyle,
    resolvedWidth,
    classNames,
    hasCustomWidth,
    gradientSettings,
    maskImage,
    wrapperPositionClass,
    videoClasses,
    sharedVideoStyle,
    exitDurationFactor,
    exitTransition,
    theme,
  } = useBackgroundOverlayModel();
  return (
    <AnimatePresence mode="sync">
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
              duration:
                exitTransition?.duration ??
                (motionConfig.transition.duration ?? 0.6) * exitDurationFactor,
              ease: exitTransition?.ease ?? EASING_CURVES.IN_CUBIC,
            } as Transition,
          }}
          className={theme.slots.root}
          style={{
            willChange: "transform, opacity, filter",
            ...theme.styles.root,
          }}
        >
          {isVideo ? (
            <div
              className={cn(
                theme.slots.videoFrame,
                wrapperPositionClass,
                classNames.width ||
                  (resolvedWidth ? "" : theme.slots.videoFrameFull),
              )}
              style={{
                ...theme.styles.videoFrame,
                ...(resolvedWidth ? { width: resolvedWidth } : {}),
              }}
            >
              {youtubeConfig ? (
                <YouTubeBackgroundPlayer
                  videoId={youtubeConfig.videoId}
                  startTime={startTime}
                  endTime={endTime}
                  corp={corp}
                  isPlaying={isPlaying}
                  isMuted={isMuted}
                  isLoop={options.isLoop}
                  shouldAutoPlay={options.shouldAutoPlay}
                  showPoster={options.showPoster}
                  showSpinner={options.showSpinner}
                  playbackRate={playbackRate}
                  quality={options.quality}
                  codec={options.codec}
                  forceIframe={options.forceIframe}
                  posterUrl={options.showPoster ? image || null : null}
                  theme={theme}
                  videoClasses={videoClasses}
                  videoStyle={sharedVideoStyle}
                  setVideoElement={setVideoElement}
                  setVideoPlaying={setVideoPlaying}
                />
              ) : (
                <NativeVideo
                  src={video || undefined}
                  className={videoClasses}
                  style={sharedVideoStyle}
                  corp={corp}
                  isLoop={options.isLoop}
                  isMuted={isMuted}
                  isPlaying={isPlaying}
                  playbackRate={playbackRate}
                  shouldAutoPlay={options.shouldAutoPlay}
                  setVideoElement={setVideoElement}
                  setVideoPlaying={setVideoPlaying}
                />
              )}

              <EdgeGradient
                theme={theme}
                direction="left"
                percent={gradientSettings.leftPercent}
                opacity={gradientSettings.leftOpacity}
                color={overlayColor}
              />
              <EdgeGradient
                theme={theme}
                direction="right"
                percent={gradientSettings.rightPercent}
                opacity={gradientSettings.rightOpacity}
                color={overlayColor}
              />

              {hasCustomWidth && (
                <NoiseOverlay
                  theme={theme}
                  opacity={noiseOpacity}
                  blendMode={noiseBlendMode}
                  inlineStyle={noiseInlineStyle as CSSProperties}
                  maskImage={maskImage}
                />
              )}

              {hasCustomWidth && overlay && (
                <SolidOverlay
                  theme={theme}
                  opacity={overlayOpacity}
                  color={overlayColor}
                  transitionStyle={overlayTransitionStyle}
                  maskImage={maskImage}
                />
              )}
            </div>
          ) : (
            <div
              className={theme.slots.image}
              style={{
                backgroundImage: image ? `url(${image})` : undefined,
                backgroundPosition: position,
                ...baseStyle,
              }}
            />
          )}

          {(!isVideo || !hasCustomWidth) && (
            <>
              <BackgroundGradients
                theme={theme}
                count={leftGradient}
                direction="left"
                color={overlayColor}
              />
              <BackgroundGradients
                theme={theme}
                count={rightGradient}
                direction="right"
                color={overlayColor}
              />
              <NoiseOverlay
                theme={theme}
                isFixed
                opacity={noiseOpacity}
                blendMode={noiseBlendMode}
                inlineStyle={noiseInlineStyle as CSSProperties}
              />
              {overlay && (
                <SolidOverlay
                  theme={theme}
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
