import { mediaBufferCache, pendingBufferDownloads } from "./cache";
import {
  MAX_BUFFER_CACHE_ENTRIES,
  MAX_FULL_BUFFER_BYTES,
  MEDIA_CACHE_CONTROL,
  STREAM_CACHE_TTL_MS,
  THUMBNAIL_CACHE_CONTROL,
  UPSTREAM_SLICE_BYTES,
} from "./constants";
import type { CachedMediaBuffer, ResolvedStreamCandidate } from "./types";

export async function serveThumbnail(videoId: string): Promise<Response> {
  const qualities = ["maxresdefault.jpg", "sddefault.jpg", "hqdefault.jpg"];
  for (const variant of qualities) {
    try {
      const res = await fetch(`https://i.ytimg.com/vi/${videoId}/${variant}`);
      if (res.ok && res.body) {
        return new Response(res.body, {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": THUMBNAIL_CACHE_CONTROL,
            "Content-Type": res.headers.get("content-type") || "image/jpeg",
          },
        });
      }
    } catch {}
  }
  return new Response("Thumbnail not found", { status: 404 });
}

export async function getOrDownloadFullMediaBuffer(
  cacheKey: string,
  candidate: ResolvedStreamCandidate,
): Promise<CachedMediaBuffer | null> {
  const now = Date.now();
  const existing = mediaBufferCache.get(cacheKey);
  if (existing && existing.expiresAt > now) {
    return existing;
  }

  const inflight = pendingBufferDownloads.get(cacheKey);
  if (inflight) return inflight;

  const downloadPromise = (async (): Promise<CachedMediaBuffer | null> => {
    try {
      let totalSize = candidate.contentLength;

      if (totalSize > MAX_FULL_BUFFER_BYTES) {
        return null;
      }

      const initialOpenRes = await fetch(candidate.url, {
        headers: {
          "User-Agent": candidate.userAgent,
          Range: "bytes=0-",
        },
        cache: "no-store",
      });

      if (initialOpenRes.ok || initialOpenRes.status === 206) {
        const initialBytes = new Uint8Array(await initialOpenRes.arrayBuffer());
        if (
          initialBytes.byteLength > 0 &&
          (totalSize <= 0 || initialBytes.byteLength >= totalSize)
        ) {
          if (mediaBufferCache.size >= MAX_BUFFER_CACHE_ENTRIES) {
            const oldestKey = mediaBufferCache.keys().next().value;
            if (oldestKey) mediaBufferCache.delete(oldestKey);
          }

          const entry: CachedMediaBuffer = {
            buffer: initialBytes,
            expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
            mimeType: candidate.mimeType,
          };
          mediaBufferCache.set(cacheKey, entry);
          return entry;
        }

        if (totalSize > 0 && initialBytes.byteLength > 0) {
          const fullBuffer = new Uint8Array(totalSize);
          fullBuffer.set(
            initialBytes.subarray(
              0,
              Math.min(initialBytes.byteLength, totalSize),
            ),
            0,
          );
          let offset = initialBytes.byteLength;

          while (offset < totalSize) {
            const sliceEnd = Math.min(
              totalSize - 1,
              offset + UPSTREAM_SLICE_BYTES - 1,
            );
            const res = await fetch(candidate.url, {
              headers: {
                "User-Agent": candidate.userAgent,
                Range: `bytes=${offset}-${sliceEnd}`,
              },
              cache: "no-store",
            });

            if (!res.ok && res.status !== 206) {
              return null;
            }

            const chunk = new Uint8Array(await res.arrayBuffer());
            if (chunk.byteLength === 0) break;

            fullBuffer.set(
              chunk.subarray(0, Math.min(chunk.byteLength, totalSize - offset)),
              offset,
            );
            offset += chunk.byteLength;
          }

          if (offset >= totalSize) {
            if (mediaBufferCache.size >= MAX_BUFFER_CACHE_ENTRIES) {
              const oldestKey = mediaBufferCache.keys().next().value;
              if (oldestKey) mediaBufferCache.delete(oldestKey);
            }

            const entry: CachedMediaBuffer = {
              buffer: fullBuffer,
              expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
              mimeType: candidate.mimeType,
            };
            mediaBufferCache.set(cacheKey, entry);
            return entry;
          }
        }
      }

      if (totalSize <= 0) {
        return null;
      }

      const fullBuffer = new Uint8Array(totalSize);
      let offset = 0;

      while (offset < totalSize) {
        const sliceEnd = Math.min(
          totalSize - 1,
          offset + UPSTREAM_SLICE_BYTES - 1,
        );
        const res = await fetch(candidate.url, {
          headers: {
            "User-Agent": candidate.userAgent,
            Range: `bytes=${offset}-${sliceEnd}`,
          },
          cache: "no-store",
        });

        if (!res.ok && res.status !== 206) {
          return null;
        }

        const chunk = new Uint8Array(await res.arrayBuffer());
        if (chunk.byteLength === 0) break;

        fullBuffer.set(
          chunk.subarray(0, Math.min(chunk.byteLength, totalSize - offset)),
          offset,
        );
        offset += chunk.byteLength;
      }

      if (offset < totalSize) {
        return null;
      }

      if (mediaBufferCache.size >= MAX_BUFFER_CACHE_ENTRIES) {
        const oldestKey = mediaBufferCache.keys().next().value;
        if (oldestKey) mediaBufferCache.delete(oldestKey);
      }

      const entry: CachedMediaBuffer = {
        buffer: fullBuffer,
        expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
        mimeType: candidate.mimeType,
      };
      mediaBufferCache.set(cacheKey, entry);
      return entry;
    } catch {
      return null;
    } finally {
      pendingBufferDownloads.delete(cacheKey);
    }
  })();

  pendingBufferDownloads.set(cacheKey, downloadPromise);
  return downloadPromise;
}

export async function serveBufferedMediaStream(
  request: Request,
  cacheKey: string,
  candidate: ResolvedStreamCandidate,
): Promise<Response> {
  const cachedMedia = await getOrDownloadFullMediaBuffer(cacheKey, candidate);
  if (cachedMedia) {
    const totalSize = cachedMedia.buffer.byteLength;
    const rangeHeader = request.headers.get("range");
    let start = 0;
    let end = totalSize - 1;

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        start = parseInt(match[1], 10);
        if (match[2]) {
          end = Math.min(totalSize - 1, parseInt(match[2], 10));
        }
      }
    }

    if (start >= totalSize || start > end) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${totalSize}` },
      });
    }

    const slice = cachedMedia.buffer.subarray(start, end + 1);
    return new Response(request.method === "HEAD" ? null : Buffer.from(slice), {
      status: rangeHeader ? 206 : 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": MEDIA_CACHE_CONTROL,
        "Content-Length": String(slice.byteLength),
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Content-Type": cachedMedia.mimeType,
      },
    });
  }

  return proxySlicedMediaStream(request, candidate, UPSTREAM_SLICE_BYTES);
}

export async function proxySlicedMediaStream(
  request: Request,
  candidate: ResolvedStreamCandidate,
  maxWindowBytes: number,
): Promise<Response> {
  const rangeHeader = request.headers.get("range");
  const totalSize = candidate.contentLength;

  let start = 0;
  let end =
    totalSize > 0
      ? Math.min(totalSize - 1, maxWindowBytes - 1)
      : maxWindowBytes - 1;

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      start = parseInt(match[1], 10);
      if (match[2]) {
        const requestedEnd = parseInt(match[2], 10);
        end =
          totalSize > 0
            ? Math.min(totalSize - 1, requestedEnd, start + maxWindowBytes - 1)
            : Math.min(requestedEnd, start + maxWindowBytes - 1);
      } else if (totalSize > 0) {
        end = Math.min(totalSize - 1, start + maxWindowBytes - 1);
      } else {
        end = start + maxWindowBytes - 1;
      }
    }
  }

  if (totalSize > 0 && (start >= totalSize || start > end)) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${totalSize}`,
      },
    });
  }

  const responseLength = end - start + 1;
  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", candidate.mimeType);
  responseHeaders.set("Accept-Ranges", "bytes");
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Cache-Control", MEDIA_CACHE_CONTROL);
  responseHeaders.set("Content-Length", String(responseLength));
  if (totalSize > 0) {
    responseHeaders.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
  }

  if (request.method === "HEAD") {
    return new Response(null, { status: 206, headers: responseHeaders });
  }

  const firstSliceEnd = Math.min(end, start + UPSTREAM_SLICE_BYTES - 1);
  const firstUpstream = await fetch(candidate.url, {
    headers: {
      "User-Agent": candidate.userAgent,
      Range: `bytes=${start}-${firstSliceEnd}`,
    },
    cache: "no-store",
  });

  if (!firstUpstream.ok && firstUpstream.status !== 206) {
    return new Response(`Upstream stream error: ${firstUpstream.status}`, {
      status: firstUpstream.status,
    });
  }

  let cursor = firstSliceEnd + 1;
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const firstChunk = new Uint8Array(await firstUpstream.arrayBuffer());
        if (!cancelled && firstChunk.byteLength > 0) {
          controller.enqueue(firstChunk);
        }
        if (cursor > end || firstChunk.byteLength === 0) {
          if (!cancelled) controller.close();
        }
      } catch (err) {
        if (!cancelled) controller.error(err);
      }
    },
    async pull(controller) {
      if (cancelled || cursor > end) {
        if (!cancelled) controller.close();
        return;
      }

      const nextSliceEnd = Math.min(end, cursor + UPSTREAM_SLICE_BYTES - 1);
      try {
        const res = await fetch(candidate.url, {
          headers: {
            "User-Agent": candidate.userAgent,
            Range: `bytes=${cursor}-${nextSliceEnd}`,
          },
          cache: "no-store",
        });

        if (!res.ok && res.status !== 206) {
          controller.close();
          return;
        }

        const chunk = new Uint8Array(await res.arrayBuffer());
        cursor = nextSliceEnd + 1;

        if (!cancelled && chunk.byteLength > 0) {
          controller.enqueue(chunk);
        }

        if (cursor > end || chunk.byteLength === 0) {
          if (!cancelled) controller.close();
        }
      } catch {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    status: 206,
    headers: responseHeaders,
  });
}
