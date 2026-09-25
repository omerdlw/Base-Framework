import { isSafeUrl } from "@/infrastructure/security/http";

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
