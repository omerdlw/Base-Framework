export interface InnertubeFormat {
  approxDurationMs?: string;
  audioChannels?: number;
  audioQuality?: string;
  audioSampleRate?: string;
  averageBitrate?: number;
  bitrate?: number;
  contentLength?: string;
  fps?: number;
  height?: number;
  itag: number;
  mimeType?: string;
  quality?: string;
  qualityLabel?: string;
  url?: string;
  width?: number;
  _clientPriority?: number;
  _clientUserAgent?: string;
}

export interface ResolvedStreamCandidate {
  clientPriority: number;
  codec: "hevc" | "av1" | "h264" | "vp9" | "mp4a" | "opus" | "unknown";
  contentLength: number;
  fps: number;
  height: number;
  itag: number;
  mimeType: string;
  qualityLabel: string;
  url: string;
  userAgent: string;
  width: number;
}

export interface CachedYouTubeData {
  audioStreams: ResolvedStreamCandidate[];
  author: string;
  durationSeconds: number;
  expiresAt: number;
  hlsManifestUrl: string | null;
  muxedStreams: ResolvedStreamCandidate[];
  thumbnailUrl: string;
  title: string;
  usingMuxedForVideo: boolean;
  videoId: string;
  videoStreams: ResolvedStreamCandidate[];
}

export interface CachedMediaBuffer {
  buffer: Uint8Array;
  expiresAt: number;
  mimeType: string;
}

export interface Mp4BoxSlice {
  dataOffset: number;
  end: number;
  offset: number;
  size: number;
}
