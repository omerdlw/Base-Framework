import type { CachedMediaBuffer, CachedYouTubeData } from "./types";

export const streamCache = new Map<string, CachedYouTubeData>();

export const mediaBufferCache = new Map<string, CachedMediaBuffer>();

export const pendingBufferDownloads = new Map<
  string,
  Promise<CachedMediaBuffer | null>
>();
