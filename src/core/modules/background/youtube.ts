const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export interface YouTubeUrlConfig {
  endTime: number;
  listId: string | null;
  rawUrl: string;
  startTime: number;
  videoId: string;
}

export interface YouTubeProxyController {
  getCurrentTime: () => number;
  getDuration: () => number;
  getLoop: () => boolean;
  getMuted: () => boolean;
  getPaused: () => boolean;
  getPlaybackRate: () => number;
  getVolume: () => number;
  pause: () => void;
  play: () => Promise<void>;
  seekTo: (seconds: number) => void;
  setLoop: (loop: boolean) => void;
  setMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
}

export function parseYouTubeTimeParam(
  value?: string | number | null,
): number {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) return 0;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.max(0, parseFloat(trimmed));
  }

  const hmsMatch = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s?)?$/);
  if (hmsMatch && (hmsMatch[1] || hmsMatch[2] || hmsMatch[3])) {
    const hours = parseInt(hmsMatch[1] || "0", 10);
    const minutes = parseInt(hmsMatch[2] || "0", 10);
    const seconds = parseFloat(hmsMatch[3] || "0");
    return Math.max(0, hours * 3600 + minutes * 60 + seconds);
  }

  return 0;
}

export function extractYouTubeVideoId(
  input?: string | null,
  options: { allowBareId?: boolean } = {},
): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (options.allowBareId && YOUTUBE_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const prefixed = trimmed.match(/^(?:youtube|yt):([a-zA-Z0-9_-]{11})$/i);
  if (prefixed) return prefixed[1];

  try {
    const candidateUrl =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : trimmed.startsWith("//")
          ? `https:${trimmed}`
          : /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(
                trimmed,
              )
            ? `https://${trimmed}`
            : null;

    if (candidateUrl) {
      const parsed = new URL(candidateUrl);
      const host = parsed.hostname
        .replace(/^(www\.|m\.|music\.)/i, "")
        .toLowerCase();

      if (host === "youtu.be") {
        const seg = parsed.pathname.split("/").filter(Boolean)[0];
        if (seg && YOUTUBE_ID_PATTERN.test(seg)) return seg;
      }

      if (
        host === "youtube.com" ||
        host === "youtube-nocookie.com" ||
        host.endsWith(".youtube.com")
      ) {
        const vParam =
          parsed.searchParams.get("v") || parsed.searchParams.get("vi");
        if (vParam && YOUTUBE_ID_PATTERN.test(vParam)) return vParam;

        const segments = parsed.pathname.split("/").filter(Boolean);
        if (
          segments.length >= 2 &&
          ["embed", "shorts", "live", "v", "e", "watch"].includes(
            segments[0].toLowerCase(),
          )
        ) {
          const candidate = segments[1];
          if (candidate && YOUTUBE_ID_PATTERN.test(candidate)) return candidate;
        }
      }
    }
  } catch {
  }

  const regexMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/i,
  );
  return regexMatch ? regexMatch[1] : null;
}

export function isYouTubeUrl(input?: string | null): boolean {
  return Boolean(extractYouTubeVideoId(input));
}

export function isDirectVideoUrl(input?: string | null): boolean {
  if (!input || typeof input !== "string") return false;
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (isYouTubeUrl(trimmed)) return true;
  if (
    trimmed.startsWith("/api/background/youtube") ||
    trimmed.startsWith("blob:")
  ) {
    return true;
  }
  const cleanPath = trimmed.split("?")[0].split("#")[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v|ogg|ogv|m3u8)$/i.test(cleanPath);
}

export function parseYouTubeUrlConfig(
  input?: string | null,
  options: { allowBareId?: boolean } = {},
): YouTubeUrlConfig | null {
  const videoId = extractYouTubeVideoId(input, options);
  if (!videoId || !input) return null;

  let startTime = 0;
  let endTime = 0;
  let listId: string | null = null;

  try {
    const trimmed = input.trim();
    const candidateUrl =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : trimmed.startsWith("//")
          ? `https:${trimmed}`
          : `https://${trimmed}`;
    const parsed = new URL(candidateUrl);
    startTime = parseYouTubeTimeParam(
      parsed.searchParams.get("t") || parsed.searchParams.get("start"),
    );
    endTime = parseYouTubeTimeParam(parsed.searchParams.get("end"));
    listId = parsed.searchParams.get("list") || null;
  } catch {
  }

  return {
    endTime,
    listId,
    rawUrl: input,
    startTime,
    videoId,
  };
}

export function getYouTubeStreamUrl(
  videoId: string,
  options: {
    codec?: string;
    quality?: string;
    stream?: "video" | "audio" | "muxed" | "thumbnail" | "meta";
  } = {},
): string {
  const params = new URLSearchParams();
  params.set("id", videoId);
  params.set("stream", options.stream || "video");
  if (options.quality) params.set("quality", options.quality);
  if (options.codec) params.set("codec", options.codec);
  return `/api/background/youtube?${params.toString()}`;
}

export function getYouTubeThumbnailUrl(
  videoId: string,
  proxied = true,
): string {
  if (proxied) {
    return `/api/background/youtube?id=${encodeURIComponent(videoId)}&stream=thumbnail`;
  }
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`;
}

export function createYouTubeVideoElementProxy(
  controller: YouTubeProxyController,
): HTMLVideoElement {
  const proxyVideo = document.createElement("video");

  Object.defineProperties(proxyVideo, {
    currentTime: {
      configurable: true,
      get: () => controller.getCurrentTime(),
      set: (value: number) => {
        controller.seekTo(Number(value) || 0);
        proxyVideo.dispatchEvent(new Event("timeupdate"));
      },
    },
    duration: {
      configurable: true,
      get: () => controller.getDuration(),
    },
    loop: {
      configurable: true,
      get: () => controller.getLoop(),
      set: (value: boolean) => {
        controller.setLoop(Boolean(value));
      },
    },
    muted: {
      configurable: true,
      get: () => controller.getMuted(),
      set: (value: boolean) => {
        controller.setMuted(Boolean(value));
        proxyVideo.dispatchEvent(new Event("volumechange"));
      },
    },
    pause: {
      configurable: true,
      value: () => {
        controller.pause();
        proxyVideo.dispatchEvent(new Event("pause"));
      },
    },
    paused: {
      configurable: true,
      get: () => controller.getPaused(),
    },
    play: {
      configurable: true,
      value: () =>
        controller.play().then(() => {
          proxyVideo.dispatchEvent(new Event("play"));
          proxyVideo.dispatchEvent(new Event("playing"));
        }),
    },
    playbackRate: {
      configurable: true,
      get: () => controller.getPlaybackRate(),
      set: (value: number) => {
        controller.setPlaybackRate(Number(value) || 1);
        proxyVideo.dispatchEvent(new Event("ratechange"));
      },
    },
    volume: {
      configurable: true,
      get: () => controller.getVolume(),
      set: (value: number) => {
        const clamped = Math.max(0, Math.min(1, Number(value) || 0));
        controller.setVolume(clamped);
        proxyVideo.dispatchEvent(new Event("volumechange"));
      },
    },
  });

  return proxyVideo;
}
