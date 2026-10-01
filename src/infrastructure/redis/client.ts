import "server-only";

import { Redis } from "@upstash/redis";
import {
  getUpstashRedisConfig,
  requireUpstashRedisConfig,
  type UpstashRedisConfig,
} from "@/infrastructure/env";

let redisClient: Redis | null = null;

export function createRedisClient(config?: UpstashRedisConfig): Redis {
  const resolvedConfig = config || requireUpstashRedisConfig();
  return new Redis({
    token: resolvedConfig.token,
    url: resolvedConfig.url,
  });
}

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const config = getUpstashRedisConfig();
  if (!config) return null;

  redisClient = createRedisClient(config);
  return redisClient;
}

export function requireRedisClient(): Redis {
  const client = getRedisClient();
  if (!client) {
    throw new Error(
      "Upstash Redis is required but not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  }
  return client;
}
