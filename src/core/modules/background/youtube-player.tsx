"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { cn } from "@/core/utils";
import { Spinner } from "@/core/primitives/spinner";
import { applyVideoPlaybackState } from "./utils";
import {
  createYouTubeVideoElementProxy,
  getYouTubeStreamUrl,
  getYouTubeThumbnailUrl,
} from "./youtube";

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: Record<string, unknown>,
      ) => any;
      PlayerState?: {
        BUFFERING: number;
        CUED: number;
        ENDED: number;
        PAUSED: number;
        PLAYING: number;
        UNSTARTED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<any> | null = null;

function loadYouTubeIframeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve(window.YT);
    };

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return ytApiPromise;
}

export interface YouTubeBackgroundPlayerProps {
  codec?: string;
  corp?: number;
  endTime?: number;
  forceIframe?: boolean;
  isLoop?: boolean;
  isMuted?: boolean;
  isPlaying?: boolean;
  playbackRate?: number;
  posterUrl?: string | null;
  quality?: string;
  setVideoElement: (element: HTMLVideoElement | null) => void;
  setVideoPlaying: (playing: boolean) => void;
  shouldAutoPlay?: boolean;
  showPoster?: boolean;
  showSpinner?: boolean;
  startTime?: number;
  videoClasses: string;
  videoId: string;
  videoStyle: CSSProperties;
}

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
  videoClasses,
  videoId,
  videoStyle,
}: YouTubeBackgroundPlayerProps) {
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(
    Boolean(forceIframe),
  );
  const [isFrameReady, setIsFrameReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const hasLoadedVideoRef = useRef(false);
  const errorRetryCountRef = useRef(0);
  const lastAudioSeekAtRef = useRef(0);

  const stateRef = useRef({
    corp,
    endTime,
    isLoop,
    isMuted,
    isPlaying,
    playbackRate,
    shouldAutoPlay,
    startTime,
  });
  stateRef.current = {
    corp,
    endTime,
    isLoop,
    isMuted,
    isPlaying,
    playbackRate,
    shouldAutoPlay,
    startTime,
  };

  useEffect(() => {
    setUseIframeFallback(Boolean(forceIframe));
    setIsFrameReady(false);
    setIsBuffering(true);
    hasLoadedVideoRef.current = false;
    errorRetryCountRef.current = 0;
  }, [forceIframe, videoId]);

  const videoStreamUrl = useMemo(
    () =>
      getYouTubeStreamUrl(videoId, {
        codec,
        quality,
        stream: "video",
      }),
    [codec, quality, videoId],
  );

  const audioStreamUrl = useMemo(
    () =>
      getYouTubeStreamUrl(videoId, {
        stream: "audio",
      }),
    [videoId],
  );

  const resolvedPoster = useMemo(
    () =>
      showPoster ? posterUrl || getYouTubeThumbnailUrl(videoId, true) : null,
    [posterUrl, showPoster, videoId],
  );

  const syncCompanionAudio = useCallback((forceSeek = false) => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    try {
      const targetRate = Number(video.playbackRate) || 1;
      if (audio.playbackRate !== targetRate) {
        audio.playbackRate = targetRate;
      }

      if (
        audio.readyState < 2 ||
        !Number.isFinite(audio.duration) ||
        audio.duration <= 0
      ) {
        return;
      }

      const targetVol = Math.max(0, Math.min(1, Number(video.volume) ?? 1));
      if (Math.abs(audio.volume - targetVol) > 0.005) {
        audio.volume = targetVol;
      }

      const effectivelyMuted = Boolean(video.muted) || targetVol === 0;
      if (audio.muted !== effectivelyMuted) {
        audio.muted = effectivelyMuted;
      }

      if (video.paused || video.ended || video.seeking) {
        if (!audio.paused) {
          audio.pause();
        }
        return;
      }

      const now = performance.now();
      const drift = Math.abs(audio.currentTime - video.currentTime);
      const maxDrift = effectivelyMuted ? 0.5 : 0.35;

      if (
        forceSeek ||
        (drift > maxDrift && now - lastAudioSeekAtRef.current > 1500)
      ) {
        lastAudioSeekAtRef.current = now;
        audio.currentTime = video.currentTime;
      }

      if (audio.paused) {
        audio.play().catch(() => {});
      }
    } catch {}
  }, []);

  const handleEnded = useCallback(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    if (video.loop || stateRef.current.isLoop) {
      const resetTime = Math.max(0, stateRef.current.startTime || 0);
      video.currentTime = resetTime;
      if (audio && audio.readyState >= 2) audio.currentTime = resetTime;
      video
        .play()
        .then(() => {
          setVideoPlaying(true);
          syncCompanionAudio(true);
        })
        .catch(() => {});
      return;
    }

    video.pause();
    if (audio && !audio.paused) audio.pause();
    setVideoPlaying(false);
  }, [setVideoPlaying, syncCompanionAudio]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const duration = Number(video.duration) || 0;
    const { corp: activeCorp, endTime: activeEndTime } = stateRef.current;

    const effectiveEnd =
      activeEndTime > 0
        ? activeEndTime
        : activeCorp > 0 && duration > 0
          ? duration - activeCorp
          : 0;

    if (effectiveEnd > 0 && video.currentTime >= effectiveEnd) {
      handleEnded();
    }
  }, [handleEnded]);

  useEffect(() => {
    if (useIframeFallback) return undefined;
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) {
      setVideoElement(null);
      return undefined;
    }

    setVideoElement(video);

    const onSyncEvent = () => syncCompanionAudio(false);
    const onSeekSyncEvent = () => syncCompanionAudio(true);

    const syncEvents = [
      "play",
      "playing",
      "pause",
      "waiting",
      "volumechange",
      "ratechange",
    ];
    for (const evt of syncEvents) {
      video.addEventListener(evt, onSyncEvent);
    }
    video.addEventListener("seeked", onSeekSyncEvent);

    const syncTimer = window.setInterval(() => {
      syncCompanionAudio(false);
    }, 1000);

    return () => {
      window.clearInterval(syncTimer);
      for (const evt of syncEvents) {
        video.removeEventListener(evt, onSyncEvent);
      }
      video.removeEventListener("seeked", onSeekSyncEvent);
      try {
        video.pause();
        audio?.pause();
      } catch {}
    };
  }, [setVideoElement, syncCompanionAudio, useIframeFallback, videoStreamUrl]);

  useEffect(() => {
    if (useIframeFallback) return;
    const video = videoRef.current;
    if (!video) return;

    applyVideoPlaybackState({
      isPlaying,
      playbackRate,
      setVideoPlaying,
      videoElement: video,
    });
    syncCompanionAudio();
  }, [
    isPlaying,
    playbackRate,
    setVideoPlaying,
    syncCompanionAudio,
    useIframeFallback,
  ]);

  useEffect(() => {
    if (useIframeFallback) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.muted !== isMuted) {
      video.muted = isMuted;
      if (!isMuted && video.volume === 0) {
        video.volume = 0.8;
      }
    }
    syncCompanionAudio(true);
  }, [isMuted, syncCompanionAudio, useIframeFallback]);

  useEffect(() => {
    if (!useIframeFallback) return undefined;
    let isDisposed = false;
    let progressInterval: number | null = null;
    let proxyElement: HTMLVideoElement | null = null;

    const internalState = {
      currentTime: startTime || 0,
      duration: 0,
      loop: Boolean(isLoop),
      muted: Boolean(isMuted),
      paused: !shouldAutoPlay,
      playbackRate: Number(playbackRate) || 1,
      volume: isMuted ? 0 : 0.8,
    };

    loadYouTubeIframeApi().then((YT) => {
      if (isDisposed || !YT?.Player || !iframeHostRef.current) return;

      iframeHostRef.current.innerHTML = "";
      const mountTarget = document.createElement("div");
      iframeHostRef.current.appendChild(mountTarget);

      proxyElement = createYouTubeVideoElementProxy({
        getCurrentTime: () => internalState.currentTime,
        getDuration: () => internalState.duration,
        getLoop: () => internalState.loop,
        getMuted: () => internalState.muted,
        getPaused: () => internalState.paused,
        getPlaybackRate: () => internalState.playbackRate,
        getVolume: () => internalState.volume,
        pause: () => {
          internalState.paused = true;
          ytPlayerRef.current?.pauseVideo?.();
          setVideoPlaying(false);
        },
        play: async () => {
          internalState.paused = false;
          ytPlayerRef.current?.playVideo?.();
          setVideoPlaying(true);
        },
        seekTo: (seconds: number) => {
          internalState.currentTime = seconds;
          ytPlayerRef.current?.seekTo?.(seconds, true);
          if (!internalState.paused) {
            ytPlayerRef.current?.playVideo?.();
          }
        },
        setLoop: (nextLoop: boolean) => {
          internalState.loop = nextLoop;
        },
        setMuted: (nextMuted: boolean) => {
          internalState.muted = nextMuted;
          if (nextMuted) {
            ytPlayerRef.current?.mute?.();
          } else {
            ytPlayerRef.current?.unMute?.();
            if (internalState.volume === 0) {
              internalState.volume = 0.7;
              ytPlayerRef.current?.setVolume?.(70);
            }
          }
        },
        setPlaybackRate: (nextRate: number) => {
          internalState.playbackRate = nextRate;
          ytPlayerRef.current?.setPlaybackRate?.(nextRate);
        },
        setVolume: (nextVol: number) => {
          internalState.volume = nextVol;
          ytPlayerRef.current?.setVolume?.(Math.round(nextVol * 100));
          if (nextVol > 0 && internalState.muted) {
            internalState.muted = false;
            ytPlayerRef.current?.unMute?.();
          } else if (nextVol === 0 && !internalState.muted) {
            internalState.muted = true;
            ytPlayerRef.current?.mute?.();
          }
        },
      });

      const player = new YT.Player(mountTarget, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        playerVars: {
          autoplay: stateRef.current.shouldAutoPlay ? 1 : 0,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
          loop: stateRef.current.isLoop ? 1 : 0,
          modestbranding: 1,
          mute: stateRef.current.isMuted ? 1 : 0,
          origin:
            typeof window !== "undefined" ? window.location.origin : undefined,
          playlist: videoId,
          playsinline: 1,
          rel: 0,
          start: Math.floor(stateRef.current.startTime || 0),
        },
        events: {
          onReady: (event: any) => {
            if (isDisposed) return;
            ytPlayerRef.current = event.target;
            const totalDuration = Number(event.target?.getDuration?.()) || 0;
            internalState.duration = totalDuration;

            if (stateRef.current.playbackRate !== 1) {
              event.target?.setPlaybackRate?.(stateRef.current.playbackRate);
            }

            if (stateRef.current.isMuted) {
              event.target?.mute?.();
            } else {
              event.target?.unMute?.();
              event.target?.setVolume?.(80);
            }

            if (stateRef.current.shouldAutoPlay && stateRef.current.isPlaying) {
              event.target?.setPlaybackQualityRange?.("hd1080", "hd1080");
              event.target?.setPlaybackQuality?.("hd1080");
              event.target?.playVideo?.();
              internalState.paused = false;
              setVideoPlaying(true);
            }

            if (proxyElement) {
              setVideoElement(proxyElement);
              proxyElement.dispatchEvent(new Event("loadedmetadata"));
              proxyElement.dispatchEvent(new Event("durationchange"));
            }

            progressInterval = window.setInterval(() => {
              const p = ytPlayerRef.current;
              if (!p || typeof p.getCurrentTime !== "function") return;
              const cur = Number(p.getCurrentTime()) || 0;
              const dur = Number(p.getDuration()) || internalState.duration;
              internalState.currentTime = cur;
              if (dur > 0 && dur !== internalState.duration) {
                internalState.duration = dur;
                proxyElement?.dispatchEvent(new Event("durationchange"));
              }

              const {
                corp: activeCorp,
                endTime: activeEndTime,
                isLoop: activeLoop,
                startTime: activeStartTime,
              } = stateRef.current;

              const safetyEnd =
                activeEndTime > 0
                  ? activeEndTime
                  : dur > 0
                    ? dur - Math.max(activeCorp, 0.4)
                    : 0;

              if (safetyEnd > 0 && cur >= safetyEnd) {
                if (internalState.loop || activeLoop) {
                  const restartAt = Math.max(0, activeStartTime || 0);
                  p.seekTo(restartAt, true);
                  p.playVideo?.();
                  internalState.currentTime = restartAt;
                } else {
                  p.pauseVideo?.();
                  internalState.paused = true;
                  setVideoPlaying(false);
                }
              }

              proxyElement?.dispatchEvent(new Event("timeupdate"));
            }, 200);
          },
          onStateChange: (event: any) => {
            if (isDisposed) return;
            const YTState = window.YT?.PlayerState;
            if (event.data === YTState?.PLAYING || event.data === 1) {
              event.target?.setPlaybackQualityRange?.("hd1080", "hd1080");
              event.target?.setPlaybackQuality?.("hd1080");
              internalState.paused = false;
              setIsFrameReady(true);
              setIsBuffering(false);
              setVideoPlaying(true);
              proxyElement?.dispatchEvent(new Event("play"));
              proxyElement?.dispatchEvent(new Event("playing"));
            } else if (event.data === YTState?.BUFFERING || event.data === 3) {
              setIsBuffering(true);
            } else if (event.data === YTState?.PAUSED || event.data === 2) {
              internalState.paused = true;
              setIsBuffering(false);
              setVideoPlaying(false);
              proxyElement?.dispatchEvent(new Event("pause"));
            } else if (event.data === YTState?.ENDED || event.data === 0) {
              if (internalState.loop || stateRef.current.isLoop) {
                const restartAt = Math.max(0, stateRef.current.startTime || 0);
                ytPlayerRef.current?.seekTo?.(restartAt, true);
                ytPlayerRef.current?.playVideo?.();
              } else {
                internalState.paused = true;
                setVideoPlaying(false);
                proxyElement?.dispatchEvent(new Event("ended"));
              }
            }
          },
        },
      });

      ytPlayerRef.current = player;
    });

    return () => {
      isDisposed = true;
      if (progressInterval !== null) {
        window.clearInterval(progressInterval);
      }
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {}
      ytPlayerRef.current = null;
      setVideoElement(null);
    };
  }, [
    isLoop,
    isMuted,
    playbackRate,
    setVideoElement,
    setVideoPlaying,
    shouldAutoPlay,
    startTime,
    useIframeFallback,
    videoId,
  ]);

  useEffect(() => {
    if (!useIframeFallback || !ytPlayerRef.current) return;
    const player = ytPlayerRef.current;
    try {
      if (isPlaying) {
        player.playVideo?.();
      } else {
        player.pauseVideo?.();
      }
      if (isMuted) {
        player.mute?.();
      } else {
        player.unMute?.();
      }
      if (playbackRate && typeof player.setPlaybackRate === "function") {
        player.setPlaybackRate(playbackRate);
      }
    } catch {}
  }, [isMuted, isPlaying, playbackRate, useIframeFallback]);

  const showSpinnerOverlay = showSpinner && (!isFrameReady || isBuffering);
  const showBlackOverlay = !isFrameReady || (useIframeFallback && !isPlaying);
  const showPosterOverlay = Boolean(
    showPoster &&
    resolvedPoster &&
    (!isFrameReady || (useIframeFallback && !isPlaying)),
  );

  return (
    <div className="pointer-events-none relative h-full w-full overflow-hidden">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 bg-black transition-opacity duration-700 ease-out",
          showBlackOverlay ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300 ease-out",
          showSpinnerOverlay ? "opacity-100" : "opacity-0",
        )}
      >
        {showSpinner ? <Spinner size={30} className="text-white" /> : null}
      </div>

      {resolvedPoster ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-10 bg-cover bg-center bg-no-repeat transition-opacity duration-500",
            showPosterOverlay ? "opacity-100" : "opacity-0",
          )}
          style={{
            backgroundImage: `url(${resolvedPoster})`,
            ...videoStyle,
          }}
        />
      ) : null}

      {useIframeFallback && !isPlaying ? (
        <div className="pointer-events-none absolute inset-0 z-10 bg-black" />
      ) : null}

      {!useIframeFallback ? (
        <>
          <video
            ref={videoRef}
            src={videoStreamUrl}
            className={cn(
              videoClasses,
              "transition-opacity duration-500",
              isFrameReady ? "opacity-100" : "opacity-0",
            )}
            preload="auto"
            muted={isMuted}
            loop={isLoop}
            playsInline
            style={videoStyle}
            onTimeUpdate={() => {
              const video = videoRef.current;
              if (video && video.currentTime > 0 && video.readyState >= 2) {
                setIsFrameReady(true);
                setIsBuffering(false);
              }
              handleTimeUpdate();
            }}
            onEnded={handleEnded}
            onPlay={() => {
              const video = videoRef.current;
              hasLoadedVideoRef.current = true;
              if (video && !stateRef.current.isMuted && video.muted) {
                video.muted = false;
                if (video.volume === 0) video.volume = 0.8;
              }
              if (!video || video.readyState < 2) {
                setIsBuffering(true);
              }
              setVideoPlaying(true);
              syncCompanionAudio(false);
            }}
            onWaiting={() => {
              setIsBuffering(true);
              syncCompanionAudio(false);
            }}
            onPlaying={() => {
              hasLoadedVideoRef.current = true;
              setIsFrameReady(true);
              setIsBuffering(false);
              setVideoPlaying(true);
              syncCompanionAudio(false);
            }}
            onPause={() => {
              const video = videoRef.current;
              syncCompanionAudio(false);
              setIsBuffering(false);
              if (
                video &&
                !video.seeking &&
                !video.ended &&
                !stateRef.current.isPlaying
              ) {
                setVideoPlaying(false);
              }
            }}
            onSeeking={() => {
              setIsBuffering(true);
            }}
            onSeeked={() => {
              const video = videoRef.current;
              if (!video) return;
              setIsFrameReady(true);
              if (
                video.readyState >= 2 &&
                (!stateRef.current.isPlaying || !video.paused)
              ) {
                setIsBuffering(false);
              }
              syncCompanionAudio(true);
              if (stateRef.current.isPlaying && video.paused) {
                video
                  .play()
                  .then(() => {
                    setVideoPlaying(true);
                    syncCompanionAudio(true);
                  })
                  .catch(() => {});
              }
            }}
            onCanPlay={() => {
              const video = videoRef.current;
              if (!video) return;
              hasLoadedVideoRef.current = true;
              if (!stateRef.current.isPlaying) {
                setIsFrameReady(true);
                setIsBuffering(false);
              } else if (video.paused) {
                video.muted = Boolean(stateRef.current.isMuted);
                if (!video.muted && video.volume === 0) {
                  video.volume = 0.8;
                }
                video
                  .play()
                  .then(() => {
                    setVideoPlaying(true);
                    syncCompanionAudio(false);
                  })
                  .catch((err: { name?: string } | undefined) => {
                    if (err?.name === "NotAllowedError") {
                      video.muted = true;
                      video
                        .play()
                        .then(() => {
                          setVideoPlaying(true);
                          syncCompanionAudio(false);
                          const unlockAudio = () => {
                            if (!stateRef.current.isMuted && videoRef.current) {
                              videoRef.current.muted = false;
                              if (videoRef.current.volume === 0) {
                                videoRef.current.volume = 0.8;
                              }
                            }
                            window.removeEventListener(
                              "pointerdown",
                              unlockAudio,
                            );
                            window.removeEventListener("keydown", unlockAudio);
                          };
                          window.addEventListener("pointerdown", unlockAudio, {
                            once: true,
                          });
                          window.addEventListener("keydown", unlockAudio, {
                            once: true,
                          });
                        })
                        .catch(() => {});
                    }
                  });
              }
            }}
            onLoadedMetadata={() => {
              const video = videoRef.current;
              if (!video) return;
              hasLoadedVideoRef.current = true;
              if (startTime > 0 && video.currentTime < startTime) {
                video.currentTime = startTime;
                if (audioRef.current) audioRef.current.currentTime = startTime;
              }
            }}
            onLoadedData={() => {
              const video = videoRef.current;
              if (!video) return;
              hasLoadedVideoRef.current = true;
              video.playbackRate = playbackRate;
              video.muted = Boolean(stateRef.current.isMuted);
              if (!video.muted && video.volume === 0) {
                video.volume = 0.8;
              }
              if (startTime > 0 && video.currentTime < startTime) {
                video.currentTime = startTime;
              }
              if (!stateRef.current.isPlaying) {
                setIsFrameReady(true);
                setIsBuffering(false);
              } else if (video.paused) {
                video
                  .play()
                  .then(() => {
                    setVideoPlaying(true);
                    syncCompanionAudio(true);
                  })
                  .catch((err: { name?: string } | undefined) => {
                    if (err?.name === "NotAllowedError") {
                      video.muted = true;
                      video
                        .play()
                        .then(() => {
                          setVideoPlaying(true);
                          syncCompanionAudio(true);
                        })
                        .catch(() => {});
                    }
                  });
              }
            }}
            onError={() => {
              const video = videoRef.current;
              if (hasLoadedVideoRef.current && video) {
                const resumeTime = video.currentTime || 0;
                window.setTimeout(() => {
                  try {
                    video.load();
                    video.currentTime = resumeTime;
                    if (stateRef.current.isPlaying) {
                      video.play().catch(() => {});
                    }
                  } catch {}
                }, 150);
                return;
              }

              errorRetryCountRef.current += 1;
              if (errorRetryCountRef.current <= 1 && video) {
                window.setTimeout(() => {
                  try {
                    video.load();
                  } catch {}
                }, 200);
                return;
              }

              setUseIframeFallback(true);
            }}
          />
          <audio
            ref={audioRef}
            src={audioStreamUrl}
            preload="auto"
            onCanPlay={() => {
              syncCompanionAudio(true);
            }}
          />
        </>
      ) : (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500",
            isFrameReady ? "opacity-100" : "opacity-0",
          )}
          style={videoStyle}
        >
          <div
            ref={iframeHostRef}
            className="pointer-events-none absolute top-1/2 left-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 scale-[1.35] [&>div]:h-full [&>div]:w-full [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
          />
        </div>
      )}
    </div>
  );
});
