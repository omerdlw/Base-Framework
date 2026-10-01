import { YOUTUBE_ID_REGEX } from "./constants";
import type {
  CachedYouTubeData,
  InnertubeFormat,
  ResolvedStreamCandidate,
} from "./types";

export function extractVideoId(
  input: string | null | undefined,
): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  const prefixedMatch = trimmed.match(/^(?:youtube|yt):([a-zA-Z0-9_-]{11})$/i);
  if (prefixedMatch) return prefixedMatch[1];

  try {
    const parsed = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`,
    );
    const host = parsed.hostname
      .replace(/^(www\.|m\.|music\.)/i, "")
      .toLowerCase();

    if (host === "youtu.be") {
      const seg = parsed.pathname.split("/").filter(Boolean)[0];
      if (seg && YOUTUBE_ID_REGEX.test(seg)) return seg;
    }

    if (
      host === "youtube.com" ||
      host === "youtube-nocookie.com" ||
      host.endsWith(".youtube.com")
    ) {
      const vParam =
        parsed.searchParams.get("v") || parsed.searchParams.get("vi");
      if (vParam && YOUTUBE_ID_REGEX.test(vParam)) return vParam;

      const segments = parsed.pathname.split("/").filter(Boolean);
      if (
        segments.length >= 2 &&
        ["embed", "shorts", "live", "v", "e", "watch"].includes(
          segments[0].toLowerCase(),
        )
      ) {
        const candidate = segments[1];
        if (candidate && YOUTUBE_ID_REGEX.test(candidate)) return candidate;
      }
    }
  } catch {}

  const fallbackMatch = trimmed.match(
    /(?:v=|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/,
  );
  return fallbackMatch ? fallbackMatch[1] : null;
}

function detectCodec(
  mimeType = "",
): "hevc" | "av1" | "h264" | "vp9" | "mp4a" | "opus" | "unknown" {
  const lower = mimeType.toLowerCase();
  if (
    lower.includes("hev1") ||
    lower.includes("hvc1") ||
    lower.includes("hevc")
  ) {
    return "hevc";
  }
  if (lower.includes("av01")) return "av1";
  if (lower.includes("avc1") || lower.includes("h264")) return "h264";
  if (lower.includes("vp09") || lower.includes("vp9")) return "vp9";
  if (lower.includes("mp4a")) return "mp4a";
  if (lower.includes("opus") || lower.includes("vorbis")) return "opus";
  return "unknown";
}

export function parseQualityHeight(
  qualityLabel = "",
  fallbackHeight = 0,
  fallbackWidth = 0,
): number {
  const match = qualityLabel.match(/(\d{3,4})p/i);
  if (match) return parseInt(match[1], 10);
  const longEdge = Math.max(fallbackWidth, fallbackHeight);
  if (longEdge >= 1880 && longEdge <= 1960) return 1080;
  if (longEdge >= 1240 && longEdge <= 1320) return 720;
  if (longEdge >= 2520 && longEdge <= 2600) return 1440;
  if (longEdge >= 3800 && longEdge <= 3880) return 2160;
  return fallbackHeight;
}

export function normalizeCandidate(
  fmt: InnertubeFormat,
  fallbackUserAgent: string,
): ResolvedStreamCandidate | null {
  if (!fmt || !fmt.url || !fmt.mimeType) return null;
  const cleanMime = fmt.mimeType.split(";")[0].trim() || "video/mp4";
  const width = Number(fmt.width) || 0;
  const rawHeight = Number(fmt.height) || 0;
  const normalizedHeight = parseQualityHeight(
    fmt.qualityLabel || "",
    rawHeight,
    width,
  );
  const label = fmt.qualityLabel || `${normalizedHeight || rawHeight}p`;
  return {
    clientPriority: fmt._clientPriority ?? 1,
    codec: detectCodec(fmt.mimeType),
    contentLength: Number(fmt.contentLength) || 0,
    fps: Number(fmt.fps) || 30,
    height: normalizedHeight,
    itag: Number(fmt.itag) || 0,
    mimeType: cleanMime,
    qualityLabel: label,
    url: fmt.url,
    userAgent: fmt._clientUserAgent || fallbackUserAgent,
    width,
  };
}

export function selectBestVideoCandidate(
  data: CachedYouTubeData,
  _targetQuality = "1080p",
  preferredCodec = "auto",
): ResolvedStreamCandidate | null {
  const candidates = data.videoStreams;
  if (!candidates.length) {
    return null;
  }

  const tier1080 = candidates.filter((c) => c.height === 1080);
  const tier720 = candidates.filter((c) => c.height === 720);
  const pool =
    tier1080.length > 0 ? tier1080 : tier720.length > 0 ? tier720 : candidates;

  const scoreCandidate = (c: ResolvedStreamCandidate): number => {
    let score = c.clientPriority * 500;

    if (c.height === 1080) score += 2000;
    else if (c.height === 720) score += 1000;

    if (preferredCodec && preferredCodec !== "auto") {
      if (c.codec === preferredCodec.toLowerCase()) {
        score += 500;
      }
    } else {
      if (c.codec === "h264") score += 240;
      else if (c.codec === "hevc") score += 220;
      else if (c.codec === "av1") score += 180;
      else if (c.codec === "vp9") score += 150;
    }

    if (c.mimeType === "video/mp4") score += 60;
    if (c.fps >= 60) score += 20;

    return score;
  };

  return (
    [...pool].sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0] || null
  );
}
