import type { NextResponse } from "next/server";

export interface ContentSecurityPolicyOptions {
  scriptSrc?: string[];

  styleSrc?: string[];

  imgSrc?: string[];

  connectSrc?: string[];

  fontSrc?: string[];

  frameSrc?: string[];

  objectSrc?: string[];

  mediaSrc?: string[];

  workerSrc?: string[];

  formAction?: string[];

  frameAncestors?: string[];

  upgradeInsecureRequests?: boolean;
}

export function buildContentSecurityPolicy(
  overrides: ContentSecurityPolicyOptions = {},
): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": overrides.scriptSrc ?? ["'self'"],
    "style-src": overrides.styleSrc ?? ["'self'", "'unsafe-inline'"],
    "img-src": overrides.imgSrc ?? ["'self'", "data:", "blob:", "https:"],
    "font-src": overrides.fontSrc ?? ["'self'"],
    "connect-src": overrides.connectSrc ?? ["'self'"],
    "frame-src": overrides.frameSrc ?? ["'none'"],
    "object-src": overrides.objectSrc ?? ["'none'"],
    "media-src": overrides.mediaSrc ?? ["'self'"],
    "worker-src": overrides.workerSrc ?? ["'self'", "blob:"],
    "form-action": overrides.formAction ?? ["'self'"],
    "frame-ancestors": overrides.frameAncestors ?? ["'none'"],
  };

  const parts = Object.entries(directives).map(
    ([key, values]) => `${key} ${values.join(" ")}`,
  );

  if (overrides.upgradeInsecureRequests !== false) {
    parts.push("upgrade-insecure-requests");
  }

  return parts.join("; ");
}

export interface SecurityHeaderOptions {
  csp?: ContentSecurityPolicyOptions | false;

  hsts?: boolean;

  frameOptions?: "DENY" | "SAMEORIGIN";

  permissionsPolicy?: string;
}

export function applySecurityHeaders(
  response: NextResponse,
  options: SecurityHeaderOptions = {},
): NextResponse {
  if (!response?.headers) return response;

  const {
    csp,
    hsts = true,
    frameOptions = "DENY",
    permissionsPolicy = "camera=(), microphone=(), geolocation=()",
  } = options;

  response.headers.set("X-Frame-Options", frameOptions);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", permissionsPolicy);

  if (hsts) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  if (csp !== undefined && csp !== false) {
    response.headers.set(
      "Content-Security-Policy",
      buildContentSecurityPolicy(csp),
    );
  }

  return response;
}
