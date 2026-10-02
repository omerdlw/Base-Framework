import { trimToNull } from "@omerdlw/base-framework/utils";

const DEFAULT_USER_AVATAR = "/default-avatar.svg";

export function getInitial(value: unknown): string {
  const text = trimToNull(value);
  if (!text) return "A";
  const first = text.charAt(0).toUpperCase();
  return /^[A-Z0-9]$/.test(first) ? first : "A";
}

function normalizeAvatarUrl(url: unknown): string | null {
  return trimToNull(url);
}

function resolveAvatarUrlCandidate(
  user: Record<string, any> = {},
): string | null {
  const candidate =
    user.avatarUrl ||
    user.avatar_url ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture;
  return normalizeAvatarUrl(candidate);
}

function createInitialAvatarDataUrl(initial: string): string {
  const normalizedLetter = getInitial(initial);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
<rect width="200" height="200" fill="#18181b" />
<text
x="50%"
y="52%"
text-anchor="middle"
dominant-baseline="middle"
fill="#ffffff"
font-family="ui-sans-serif, system-ui, sans-serif"
font-size="82"
font-weight="600"
>
${normalizedLetter}
</text>
</svg>
`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getUserAvatarFallbackUrl(
  user: Record<string, any> = {},
  fallbackUrl: string = DEFAULT_USER_AVATAR,
): string {
  const fallbackInitial = getInitial(
    user?.displayName ||
      user?.display_name ||
      user?.username ||
      user?.name ||
      "A",
  );

  if (fallbackInitial) {
    return createInitialAvatarDataUrl(fallbackInitial);
  }

  const normalizedFallback = normalizeAvatarUrl(fallbackUrl);
  return normalizedFallback || DEFAULT_USER_AVATAR;
}

export function getUserAvatarUrl(user: Record<string, any> = {}): string {
  const rawAvatarUrl = resolveAvatarUrlCandidate(user);
  if (rawAvatarUrl) return rawAvatarUrl;
  return getUserAvatarFallbackUrl(user);
}

export function applyAvatarFallback(
  event: any,
  fallbackUrl: string = DEFAULT_USER_AVATAR,
): void {
  const target = event?.currentTarget;
  if (!target || typeof target !== "object") return;
  if (target.dataset?.avatarFallbackApplied === "true") return;

  const normalizedFallback =
    normalizeAvatarUrl(fallbackUrl) || DEFAULT_USER_AVATAR;
  if (target.dataset) {
    target.dataset.avatarFallbackApplied = "true";
  }
  target.src = normalizedFallback;
}
