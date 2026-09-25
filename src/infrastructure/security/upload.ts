export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

export const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/aac",
  "audio/flac",
] as const;

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
] as const;

export const FILE_SIZE_LIMITS = {
  AVATAR: 5 * 1024 * 1024,
  BANNER: 10 * 1024 * 1024,
  IMAGE: 20 * 1024 * 1024,
  DOCUMENT: 25 * 1024 * 1024,
  AUDIO: 100 * 1024 * 1024,
  VIDEO: 500 * 1024 * 1024,
} as const;

export function assertSafeMimeType(
  contentType: string | null | undefined,
  allowed: readonly string[],
): void {
  const type = (contentType ?? "").split(";")[0].trim().toLowerCase();

  if (!type || !allowed.includes(type)) {
    throw new Error(
      `File type "${type || "(none)"}" is not allowed. ` +
      `Allowed types: ${allowed.join(", ")}`,
    );
  }
}

export function assertSafeFileSize(
  bytes: number,
  maxBytes: number,
  label = "File",
): void {
  if (bytes > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
    throw new Error(`${label} exceeds the maximum allowed size of ${maxMb} MB`);
  }
}

export function assertSafeUpload(
  contentType: string | null | undefined,
  bytes: number,
  allowed: readonly string[],
  maxBytes: number,
  label = "File",
): void {
  assertSafeMimeType(contentType, allowed);
  assertSafeFileSize(bytes, maxBytes, label);
}
