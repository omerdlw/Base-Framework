const SECOND_MS = 1000;

const MINUTE_MS = 60 * SECOND_MS;

const KIB = 1024;

const MIB = 1024 * KIB;

export const STREAM_CACHE_TTL_MS = 15 * MINUTE_MS;

export const VISITOR_DATA_TTL_MS = 30 * MINUTE_MS;

export const UPSTREAM_SLICE_BYTES = 1.5 * MIB;

export const MAX_VIDEO_RESPONSE_WINDOW_BYTES = 6 * MIB;

export const MAX_FULL_BUFFER_BYTES = 30 * MIB;

export const MIN_SEEKABLE_CONTENT_LENGTH = 64 * KIB;

export const MAX_BUFFER_CACHE_ENTRIES = 8;

export const METADATA_CACHE_CONTROL = "public, max-age=600";

export const MEDIA_CACHE_CONTROL = "private, max-age=3600";

export const THUMBNAIL_CACHE_CONTROL = "public, max-age=86400, s-maxage=86400";

export const ANDROID_USER_AGENT =
  "com.google.android.youtube/20.10.38 (Linux; U; Android 14; en_US) gzip";

export const ANDROID_VR_USER_AGENT =
  "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip";

export const IOS_USER_AGENT =
  "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)";

export const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export const VISIONOS_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)";
