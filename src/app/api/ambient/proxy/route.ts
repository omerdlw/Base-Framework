/**
 * Validates that a URL is safe to proxy — rejects non-http(s) protocols
 * and blocks all private/loopback/link-local/cloud-metadata address ranges
 * to prevent Server-Side Request Forgery (SSRF) attacks.
 */
function isSafeUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  // Only allow public HTTP(S)
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block explicit "localhost" and zero-address
  if (hostname === "localhost" || hostname === "0.0.0.0") {
    return false;
  }

  // Block IPv6 loopback / link-local / ULA
  // Brackets are stripped by URL parser, e.g. "[::1]" → "::1"
  if (
    hostname === "::1" ||
    hostname.startsWith("fe80:") ||
    hostname.startsWith("fc00:") ||
    hostname.startsWith("fd")
  ) {
    return false;
  }

  // Parse dotted-decimal IPv4
  const parts = hostname.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const [a, b, c] = parts.map(Number);

    if (
      a === 127 || // 127.0.0.0/8  — loopback
      a === 10 || // 10.0.0.0/8   — private
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 — private
      (a === 192 && b === 168) || // 192.168.0.0/16 — private
      (a === 169 && b === 254) || // 169.254.0.0/16 — link-local / AWS metadata
      (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10  — shared address space
      a === 0 // 0.x.x.x        — "this" network
    ) {
      return false;
    }

    // Block class D (multicast) and class E (reserved)
    if (a >= 224) return false;

    // Explicit cloud-metadata IPs (belt-and-suspenders)
    if (a === 169 && b === 254 && c === 169) return false; // AWS/GCP/Azure metadata
  }

  return true;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  if (!isSafeUrl(targetUrl)) {
    return new Response("URL not allowed", { status: 400 });
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!upstreamResponse.ok) {
      return new Response("Failed to fetch upstream image", {
        status: upstreamResponse.status,
      });
    }

    const contentType =
      upstreamResponse.headers.get("content-type") || "image/jpeg";

    return new Response(upstreamResponse.body, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(message, {
      status: 500,
    });
  }
}
