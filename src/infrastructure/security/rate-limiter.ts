import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient } from "@/infrastructure/redis";
import { report } from "@omerdlw/base-framework/utils";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const stores = new Map<string, RateLimitRecord>();
const MAX_ENTRIES = 10000;
const ratelimitInstances = new Map<string, Ratelimit>();

function makeRoomForEntry(): void {
  const now = Date.now();
  for (const [key, record] of stores) {
    if (record.resetTime <= now) stores.delete(key);
  }

  while (stores.size >= MAX_ENTRIES) {
    const oldestKey = stores.keys().next().value;
    if (oldestKey === undefined) return;
    stores.delete(oldestKey);
  }
}

export function getClientIp(request?: Request | null): string {
  if (!request) return "127.0.0.1";
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
  success: boolean;
}

export function checkRateLimit(
  key: string,
  { limit = 60, windowMs = 60000 }: RateLimitOptions = {},
): RateLimitResult {
  const now = Date.now();
  let record = stores.get(key);
  stores.delete(key);

  if (!record || record.resetTime <= now) {
    if (stores.size >= MAX_ENTRIES) makeRoomForEntry();
    record = { count: 0, resetTime: now + windowMs };
  }

  record.count += 1;
  stores.set(key, record);

  return {
    limit,
    remaining: Math.max(0, limit - record.count),
    resetTime: record.resetTime,
    retryAfter: Math.max(1, Math.ceil((record.resetTime - now) / 1000)),
    success: record.count <= limit,
  };
}

function getUpstashRatelimit(
  limit: number,
  windowMs: number,
): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) return null;

  const cacheKey = `${limit}:${windowMs}`;
  let limiter = ratelimitInstances.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      analytics: false,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: "bf:ratelimit",
      redis,
    });
    ratelimitInstances.set(cacheKey, limiter);
  }
  return limiter;
}

export async function checkRateLimitAsync(
  key: string,
  options: RateLimitOptions = {},
): Promise<RateLimitResult> {
  const { limit = 60, windowMs = 60000 } = options;

  try {
    const upstashLimiter = getUpstashRatelimit(limit, windowMs);
    if (upstashLimiter) {
      const res = await upstashLimiter.limit(key);
      const now = Date.now();
      const resetTime = res.reset;
      const retryAfter = Math.max(1, Math.ceil((resetTime - now) / 1000));

      return {
        limit: res.limit,
        remaining: res.remaining,
        resetTime,
        retryAfter,
        success: res.success,
      };
    }
  } catch (error) {
    report("RateLimiter Upstash fallback", error, "warn");
  }

  return checkRateLimit(key, options);
}

export function createRateLimitExceededResponse(
  rateLimitResult: RateLimitResult,
  message: string = "Too many requests — please try again later",
): Response {
  return Response.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(rateLimitResult.retryAfter),
        "X-RateLimit-Limit": String(rateLimitResult.limit),
        "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        "X-RateLimit-Reset": String(
          Math.ceil(rateLimitResult.resetTime / 1000),
        ),
      },
    },
  );
}
