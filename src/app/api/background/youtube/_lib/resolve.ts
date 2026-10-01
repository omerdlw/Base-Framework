import { streamCache } from "./cache";
import { ANDROID_USER_AGENT, STREAM_CACHE_TTL_MS } from "./constants";
import { normalizeCandidate } from "./formats";
import { fetchInnertubePlayer } from "./innertube";
import { extractVisionOsFmp4Video } from "./mp4";
import { getOrDownloadFullMediaBuffer } from "./streaming";
import type {
  CachedYouTubeData,
  InnertubeFormat,
  ResolvedStreamCandidate,
} from "./types";

const pendingResolutions = new Map<string, Promise<CachedYouTubeData | null>>();

export async function resolveYouTubeData(
  videoId: string,
): Promise<CachedYouTubeData | null> {
  const now = Date.now();
  const cached = streamCache.get(videoId);
  if (cached && cached.expiresAt > now) {
    return cached;
  }

  const inflight = pendingResolutions.get(videoId);
  if (inflight) {
    return inflight;
  }

  const resolutionPromise = (async (): Promise<CachedYouTubeData | null> => {
    try {
      const [vrResult, androidResult, iosResult] = await Promise.all([
        fetchInnertubePlayer(videoId, "ANDROID_VR"),
        fetchInnertubePlayer(videoId, "ANDROID"),
        fetchInnertubePlayer(videoId, "IOS"),
      ]);

      if (!vrResult && !androidResult && !iosResult) {
        return null;
      }

      const combinedAdaptive: InnertubeFormat[] = [
        ...(vrResult?.adaptiveFormats || []),
        ...(androidResult?.adaptiveFormats || []),
        ...(iosResult?.adaptiveFormats || []),
      ];
      const combinedMuxed: InnertubeFormat[] = [
        ...(androidResult?.formats || []),
        ...(vrResult?.formats || []),
        ...(iosResult?.formats || []),
      ];

      let videoStreams: ResolvedStreamCandidate[] = [];
      let audioStreams: ResolvedStreamCandidate[] = [];
      const muxedStreams: ResolvedStreamCandidate[] = [];

      const seenVideoKey = new Set<string>();
      const seenAudioKey = new Set<string>();

      for (const fmt of combinedAdaptive) {
        const candidate = normalizeCandidate(
          fmt,
          fmt._clientUserAgent || ANDROID_USER_AGENT,
        );
        if (!candidate) continue;

        if (candidate.mimeType.startsWith("video/")) {
          if (candidate.height !== 1080 && candidate.height !== 720) {
            continue;
          }
          const key = `${candidate.itag}-${candidate.height}-${candidate.codec}`;
          if (!seenVideoKey.has(key)) {
            seenVideoKey.add(key);
            videoStreams.push(candidate);
          }
        } else if (candidate.mimeType.startsWith("audio/")) {
          const key = `${candidate.itag}-${candidate.mimeType}`;
          if (!seenAudioKey.has(key)) {
            seenAudioKey.add(key);
            audioStreams.push(candidate);
          }
        }
      }

      for (const fmt of combinedMuxed) {
        const candidate = normalizeCandidate(
          fmt,
          fmt._clientUserAgent || ANDROID_USER_AGENT,
        );
        if (candidate && candidate.mimeType.startsWith("video/")) {
          muxedStreams.push(candidate);
        }
      }

      videoStreams.sort((a, b) => {
        if (b.clientPriority !== a.clientPriority) {
          return b.clientPriority - a.clientPriority;
        }
        if (b.height !== a.height) return b.height - a.height;
        const codecScore = (c: ResolvedStreamCandidate["codec"]) => {
          if (c === "h264") return 5;
          if (c === "hevc") return 4;
          if (c === "av1") return 3;
          if (c === "vp9") return 2;
          return 1;
        };
        return codecScore(b.codec) - codecScore(a.codec);
      });

      audioStreams.sort((a, b) => {
        if (b.clientPriority !== a.clientPriority) {
          return b.clientPriority - a.clientPriority;
        }
        const isMp4A = a.mimeType === "audio/mp4" ? 1 : 0;
        const isMp4B = b.mimeType === "audio/mp4" ? 1 : 0;
        if (isMp4B !== isMp4A) return isMp4B - isMp4A;
        return b.contentLength - a.contentLength;
      });

      muxedStreams.sort((a, b) => b.height - a.height);

      let usingMuxedForVideo = false;
      const visionResult = await extractVisionOsFmp4Video(
        videoId,
        muxedStreams[0] || null,
      );

      if (visionResult) {
        videoStreams = [visionResult.candidate];
        if (visionResult.isSingleFileMuxedWithAudio) {
          usingMuxedForVideo = true;
          muxedStreams.unshift(visionResult.candidate);
        }
      }

      if (!usingMuxedForVideo) {
        const hasUnrestrictedVrAdaptive = Boolean(
          vrResult?.adaptiveFormats?.length &&
          videoStreams.some((v) => v.clientPriority === 10),
        );
        if (!hasUnrestrictedVrAdaptive && muxedStreams.length > 0) {
          audioStreams = [...muxedStreams];
        }
        if (audioStreams[0]) {
          await getOrDownloadFullMediaBuffer(
            `audio:${videoId}`,
            audioStreams[0],
          );
        }
      }

      const primaryMeta = vrResult || androidResult || iosResult;

      const resolved: CachedYouTubeData = {
        audioStreams,
        author: primaryMeta?.author || "",
        durationSeconds: primaryMeta?.durationSeconds || 0,
        expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
        hlsManifestUrl:
          iosResult?.hlsManifestUrl ||
          androidResult?.hlsManifestUrl ||
          vrResult?.hlsManifestUrl ||
          null,
        muxedStreams,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        title: primaryMeta?.title || "",
        usingMuxedForVideo,
        videoId,
        videoStreams,
      };

      streamCache.set(videoId, resolved);
      return resolved;
    } finally {
      pendingResolutions.delete(videoId);
    }
  })();

  pendingResolutions.set(videoId, resolutionPromise);
  return resolutionPromise;
}
