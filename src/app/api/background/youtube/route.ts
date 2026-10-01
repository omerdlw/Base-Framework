import { mediaBufferCache } from "./_lib/cache";
import {
  MAX_VIDEO_RESPONSE_WINDOW_BYTES,
  METADATA_CACHE_CONTROL,
} from "./_lib/constants";
import { extractVideoId, selectBestVideoCandidate } from "./_lib/formats";
import { extractVisionOsFmp4Video } from "./_lib/mp4";
import { resolveYouTubeData } from "./_lib/resolve";
import {
  proxySlicedMediaStream,
  serveBufferedMediaStream,
  serveThumbnail,
} from "./_lib/streaming";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const rawInput =
    searchParams.get("id") ||
    searchParams.get("url") ||
    searchParams.get("v") ||
    "";
  const streamType = (searchParams.get("stream") || "video").toLowerCase();
  const quality = searchParams.get("quality") || "1080p";
  const codec = searchParams.get("codec") || "auto";

  const videoId = extractVideoId(rawInput);
  if (!videoId) {
    return Response.json(
      { error: "Invalid YouTube video URL or ID" },
      { status: 400 },
    );
  }

  if (streamType === "thumbnail" || streamType === "poster") {
    return serveThumbnail(videoId);
  }

  const resolved = await resolveYouTubeData(videoId);
  if (!resolved) {
    return Response.json(
      { error: "Unable to extract YouTube media streams", videoId },
      { status: 502 },
    );
  }

  if (streamType === "meta" || streamType === "json") {
    const bestVideo = selectBestVideoCandidate(resolved, quality, codec);
    const bestAudio = resolved.audioStreams[0] || null;
    return Response.json(
      {
        author: resolved.author,
        duration: resolved.durationSeconds,
        hasAudioStream: Boolean(bestAudio || resolved.usingMuxedForVideo),
        hasMuxedStream: resolved.muxedStreams.length > 0,
        hasVideoStream: Boolean(bestVideo),
        hlsManifestUrl: resolved.hlsManifestUrl,
        qualities: Array.from(
          new Set(
            (resolved.videoStreams.length
              ? resolved.videoStreams
              : resolved.muxedStreams
            ).map((s) => s.qualityLabel),
          ),
        ),
        selectedVideo: bestVideo
          ? {
              codec: bestVideo.codec,
              fps: bestVideo.fps,
              height: bestVideo.height,
              itag: bestVideo.itag,
              mimeType: bestVideo.mimeType,
              qualityLabel: bestVideo.qualityLabel,
              usingMuxedForVideo: resolved.usingMuxedForVideo,
            }
          : null,
        thumbnailUrl: `/api/background/youtube?id=${videoId}&stream=thumbnail`,
        title: resolved.title,
        videoId,
      },
      {
        headers: {
          "Cache-Control": METADATA_CACHE_CONTROL,
        },
      },
    );
  }

  if (streamType === "audio") {
    if (resolved.usingMuxedForVideo) {
      return new Response(null, { status: 204 });
    }

    const audioCandidate = resolved.audioStreams[0] || resolved.muxedStreams[0];
    if (!audioCandidate) {
      return Response.json({ error: "No audio stream found" }, { status: 404 });
    }
    return serveBufferedMediaStream(
      request,
      `audio:${videoId}`,
      audioCandidate,
    );
  }

  if (streamType === "muxed" || resolved.usingMuxedForVideo) {
    const muxedCandidate =
      selectBestVideoCandidate(resolved, quality, codec) ||
      resolved.muxedStreams[0];
    if (!muxedCandidate) {
      return Response.json({ error: "No muxed stream found" }, { status: 404 });
    }
    if (!mediaBufferCache.has(`muxed:${videoId}`)) {
      await extractVisionOsFmp4Video(
        videoId,
        resolved.muxedStreams[1] || resolved.muxedStreams[0],
      );
    }
    return serveBufferedMediaStream(
      request,
      `muxed:${videoId}`,
      muxedCandidate,
    );
  }

  let videoCandidate = selectBestVideoCandidate(resolved, quality, codec);
  if (!videoCandidate) {
    const visionFallback = await extractVisionOsFmp4Video(
      videoId,
      resolved.muxedStreams[0] || null,
    );
    videoCandidate = visionFallback?.candidate || null;
  }
  if (!videoCandidate) {
    return Response.json(
      { error: "No 1080p/720p video stream found" },
      { status: 404 },
    );
  }

  if (
    videoCandidate.url.startsWith("visionos-fmp4://") ||
    mediaBufferCache.has(`video:${videoId}`)
  ) {
    if (!mediaBufferCache.has(`video:${videoId}`)) {
      await extractVisionOsFmp4Video(videoId, resolved.muxedStreams[0] || null);
    }
    return serveBufferedMediaStream(
      request,
      `video:${videoId}`,
      videoCandidate,
    );
  }

  return proxySlicedMediaStream(
    request,
    videoCandidate,
    MAX_VIDEO_RESPONSE_WINDOW_BYTES,
  );
}

export async function HEAD(request: Request): Promise<Response> {
  return GET(request);
}
