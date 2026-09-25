export function assertSameOrigin(request: Request): void {
  try {
    const requestOrigin = new URL(request.url).origin;
    const originHeader = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");

    if (originHeader) {
      const headerOrigin = new URL(originHeader).origin;
      if (headerOrigin === requestOrigin) return;
    } else if (fetchSite === "same-origin") {
      return;
    }
  } catch {}

  throw new Error("Cross-site request rejected");
}

export function isSafeUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === "localhost" || hostname === "0.0.0.0") {
    return false;
  }

  if (
    hostname === "::1" ||
    hostname.startsWith("fe80:") ||
    hostname.startsWith("fc00:") ||
    hostname.startsWith("fd")
  ) {
    return false;
  }

  const parts = hostname.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const [a, b, c] = parts.map(Number);

    if (
      a === 127 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a === 0
    ) {
      return false;
    }

    if (a >= 224) return false;

    if (a === 169 && b === 254 && c === 169) return false;
  }

  return true;
}
