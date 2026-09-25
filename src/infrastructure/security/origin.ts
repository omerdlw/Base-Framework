export interface CorsConfig {
  methods?: string[];

  headers?: string[];

  credentials?: boolean;

  maxAge?: number;
}

export function assertAllowedOrigin(
  request: Request,
  allowlist: string[],
): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (allowlist.some((allowed) => allowed === origin)) return;
  throw new Error(`Origin "${origin}" is not allowed`);
}

export function buildCorsHeaders(
  requestOrOrigin: Request | string,
  config: CorsConfig = {},
): Record<string, string> {
  const origin =
    typeof requestOrOrigin === "string"
      ? requestOrOrigin
      : (requestOrOrigin.headers.get("origin") ?? "*");

  const {
    methods = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    headers = ["Content-Type", "Authorization"],
    credentials = false,
    maxAge = 86400,
  } = config;

  const result: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": headers.join(", "),
    "Access-Control-Max-Age": String(maxAge),
  };

  if (credentials) {
    result["Access-Control-Allow-Credentials"] = "true";
  }

  return result;
}

export function applyCorsHeaders(
  response: { headers: { set(key: string, value: string): void } },
  requestOrOrigin: Request | string,
  config: CorsConfig = {},
): void {
  const corsHeaders = buildCorsHeaders(requestOrOrigin, config);
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
}
