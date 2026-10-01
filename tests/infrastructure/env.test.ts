import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  getSupabasePublicConfig,
  getUpstashRedisConfig,
  isSupabaseConfigured,
  isUpstashRedisConfigured,
  requireSupabasePublicConfig,
  requireSupabaseSecretKey,
  requireUpstashRedisConfig,
} from "../../src/infrastructure/env.ts";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];
const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

const clear = () => KEYS.forEach((key) => delete process.env[key]);

describe("Supabase env", () => {
  test("needs both the URL and the publishable key", () => {
    clear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";

    assert.equal(getSupabasePublicConfig(), null);
    assert.equal(isSupabaseConfigured(), false);

    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = " key ";
    assert.deepEqual(getSupabasePublicConfig(), {
      publishableKey: "key",
      url: "http://127.0.0.1:54321",
    });
    assert.equal(isSupabaseConfigured(), true);
  });

  test("require* explains how to fix a missing configuration", () => {
    clear();

    assert.throws(() => requireSupabasePublicConfig(), /\.env\.example/);
    assert.throws(() => requireSupabaseSecretKey(), /SUPABASE_SECRET_KEY/);
  });

  test("the secret key is returned trimmed when present", () => {
    clear();
    process.env.SUPABASE_SECRET_KEY = "  secret ";

    assert.equal(requireSupabaseSecretKey(), "secret");
  });
});

describe("Upstash env", () => {
  test("is optional: absent means in-memory rate limiting", () => {
    clear();

    assert.equal(getUpstashRedisConfig(), null);
    assert.equal(isUpstashRedisConfigured(), false);
    assert.throws(() => requireUpstashRedisConfig());
  });

  test("needs both the URL and the token", () => {
    clear();
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    assert.equal(getUpstashRedisConfig(), null);

    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
    assert.deepEqual(requireUpstashRedisConfig(), {
      token: "tok",
      url: "https://x.upstash.io",
    });
  });
});
