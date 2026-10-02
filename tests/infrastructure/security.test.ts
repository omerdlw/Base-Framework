import { afterEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  checkRateLimitAsync,
  createRateLimitExceededResponse,
  getClientIp,
} from "../../src/infrastructure/security/rate-limiter.ts";
import {
  assertSameOrigin,
  isSafeUrl,
} from "../../src/infrastructure/security/url-safety.ts";
import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
} from "../../src/infrastructure/security/headers.ts";

import { UserError } from "@omerdlw/base-framework/utils";

afterEach(() => mock.timers.reset());

describe("rate limiter", () => {
  let keyCounter = 0;
  const uniqueKey = (label) => `${label}:${++keyCounter}:${Date.now()}`;

  describe("checkRateLimit (in-memory)", () => {
    test("allows requests up to the limit, then rejects", () => {
      const key = uniqueKey("limit");
      const results = Array.from({ length: 4 }, () =>
        checkRateLimit(key, { limit: 3, windowMs: 60_000 }),
      );

      assert.deepEqual(
        results.map((r) => r.success),
        [true, true, true, false],
      );
      assert.deepEqual(
        results.map((r) => r.remaining),
        [2, 1, 0, 0],
      );
    });

    test("keys are counted independently", () => {
      const a = uniqueKey("a");
      const b = uniqueKey("b");
      checkRateLimit(a, { limit: 1 });

      assert.equal(checkRateLimit(a, { limit: 1 }).success, false);
      assert.equal(checkRateLimit(b, { limit: 1 }).success, true);
    });

    test("a new window starts after it expires", () => {
      mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
      const key = uniqueKey("window");
      checkRateLimit(key, { limit: 1, windowMs: 20 });
      assert.equal(
        checkRateLimit(key, { limit: 1, windowMs: 20 }).success,
        false,
      );

      mock.timers.tick(40);

      assert.equal(
        checkRateLimit(key, { limit: 1, windowMs: 20 }).success,
        true,
      );
    });

    test("retryAfter is at least one second and matches the reset time", () => {
      const result = checkRateLimit(uniqueKey("retry"), {
        limit: 1,
        windowMs: 5_000,
      });

      assert.ok(result.retryAfter >= 1 && result.retryAfter <= 5);
      assert.ok(result.resetTime > Date.now());
    });
  });

  describe("checkRateLimitAsync", () => {
    test("falls back to the in-memory limiter without Redis configured", async () => {
      const key = uniqueKey("async");
      const first = await checkRateLimitAsync(key, { limit: 1 });
      const second = await checkRateLimitAsync(key, { limit: 1 });

      assert.equal(first.success, true);
      assert.equal(second.success, false);
    });
  });

  describe("createRateLimitExceededResponse", () => {
    test("answers 429 with retry headers and a user-safe message", async () => {
      const response = createRateLimitExceededResponse({
        limit: 5,
        remaining: 0,
        resetTime: Date.now() + 30_000,
        retryAfter: 30,
        success: false,
      });

      assert.equal(response.status, 429);
      assert.equal(response.headers.get("Retry-After"), "30");
      assert.equal(response.headers.get("X-RateLimit-Limit"), "5");
      assert.equal(response.headers.get("X-RateLimit-Remaining"), "0");
      assert.match((await response.json()).error, /try again later/i);
    });
  });

  describe("getClientIp", () => {
    const request = (headers) => new Request("http://localhost/", { headers });

    test("prefers Cloudflare's header, then x-real-ip, then x-forwarded-for", () => {
      assert.equal(
        getClientIp(
          request({ "cf-connecting-ip": "1.1.1.1", "x-real-ip": "2.2.2.2" }),
        ),
        "1.1.1.1",
      );
      assert.equal(getClientIp(request({ "x-real-ip": "2.2.2.2" })), "2.2.2.2");
      assert.equal(
        getClientIp(request({ "x-forwarded-for": "3.3.3.3, 4.4.4.4" })),
        "3.3.3.3",
      );
    });

    test("falls back to loopback", () => {
      assert.equal(getClientIp(request({})), "127.0.0.1");
      assert.equal(getClientIp(null), "127.0.0.1");
    });
  });
});

describe("url safety", () => {
  const request = (headers, url = "https://app.example.com/api/x") =>
    new Request(url, { method: "POST", headers });

  describe("assertSameOrigin", () => {
    test("accepts a matching Origin header", () => {
      assert.doesNotThrow(() =>
        assertSameOrigin(request({ origin: "https://app.example.com" })),
      );
    });

    test("accepts same-origin fetch metadata when Origin is absent", () => {
      assert.doesNotThrow(() =>
        assertSameOrigin(request({ "sec-fetch-site": "same-origin" })),
      );
    });

    test("rejects other origins, cross-site fetches and bare requests", () => {
      for (const headers of [
        { origin: "https://evil.example.com" },
        { origin: "https://app.example.com.evil.com" },
        { "sec-fetch-site": "cross-site" },
        {},
      ]) {
        assert.throws(
          () => assertSameOrigin(request(headers)),
          /Cross-site request rejected/,
        );
      }
    });

    test("rejects a malformed Origin header", () => {
      assert.throws(() => assertSameOrigin(request({ origin: "not a url" })));
    });
  });

  describe("isSafeUrl", () => {
    test("allows public http(s) URLs", () => {
      for (const url of [
        "https://example.com/a.png",
        "http://cdn.example.org:8080/x",
        "https://8.8.8.8/",
      ]) {
        assert.equal(isSafeUrl(url), true, url);
      }
    });

    test("rejects non-http protocols and unparseable input", () => {
      for (const url of [
        "file:///etc/passwd",
        "ftp://example.com",
        "javascript:1",
        "nope",
        "",
      ]) {
        assert.equal(isSafeUrl(url), false, url);
      }
    });

    test("rejects loopback, private, link-local and metadata addresses", () => {
      for (const url of [
        "http://localhost/",
        "http://0.0.0.0/",
        "http://127.0.0.1/",
        "http://10.1.2.3/",
        "http://172.16.0.1/",
        "http://172.31.255.255/",
        "http://192.168.1.1/",
        "http://169.254.169.254/latest/meta-data",
        "http://100.64.0.1/",
        "http://224.0.0.1/",
        "http://[::1]/",
        "http://[fe80::1]/",
        "http://[fd00::1]/",
      ]) {
        assert.equal(isSafeUrl(url), false, url);
      }
    });

    test("does not mistake public neighbours of private ranges", () => {
      assert.equal(isSafeUrl("http://172.15.0.1/"), true);
      assert.equal(isSafeUrl("http://172.32.0.1/"), true);
    });
  });
});

describe("security headers", () => {
  const response = () => ({ headers: new Headers() });

  describe("buildContentSecurityPolicy", () => {
    test("defaults lock everything to self and forbid framing", () => {
      const csp = buildContentSecurityPolicy();

      assert.match(csp, /default-src 'self'/);
      assert.match(csp, /object-src 'none'/);
      assert.match(csp, /frame-ancestors 'none'/);
      assert.match(csp, /upgrade-insecure-requests$/);
    });

    test("overrides replace a directive's sources", () => {
      const csp = buildContentSecurityPolicy({
        connectSrc: ["'self'", "https://api.example.com"],
      });

      assert.match(csp, /connect-src 'self' https:\/\/api\.example\.com/);
    });

    test("upgrade-insecure-requests can be turned off", () => {
      assert.doesNotMatch(
        buildContentSecurityPolicy({ upgradeInsecureRequests: false }),
        /upgrade-insecure-requests/,
      );
    });
  });

  describe("applySecurityHeaders", () => {
    test("sets the baseline hardening headers", () => {
      const res = applySecurityHeaders(response() as any);

      assert.equal(res.headers.get("X-Frame-Options"), "DENY");
      assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
      assert.equal(
        res.headers.get("Referrer-Policy"),
        "strict-origin-when-cross-origin",
      );
      assert.match(
        res.headers.get("Strict-Transport-Security") as any,
        /max-age=63072000/,
      );
      assert.equal(res.headers.get("Content-Security-Policy"), null);
    });

    test("options change frame policy, HSTS and CSP", () => {
      const res = applySecurityHeaders(response() as any, {
        csp: {},
        frameOptions: "SAMEORIGIN",
        hsts: false,
      });

      assert.equal(res.headers.get("X-Frame-Options"), "SAMEORIGIN");
      assert.equal(res.headers.get("Strict-Transport-Security"), null);
      assert.ok(res.headers.get("Content-Security-Policy"));
    });

    test("csp: false leaves the policy unset", () => {
      assert.equal(
        applySecurityHeaders(response() as any, { csp: false }).headers.get(
          "Content-Security-Policy",
        ),
        null,
      );
    });

    test("returns inputs without headers untouched", () => {
      assert.equal(applySecurityHeaders(null as any), null);
    });
  });
});

describe("cross-site rejection", () => {
  test("is a user-facing 403, not an internal error", () => {
    const request = new Request("https://app.example.com/api/x", {
      headers: { origin: "https://evil.example.com" },
      method: "POST",
    });

    assert.throws(
      () => assertSameOrigin(request),
      (error: any) => error instanceof UserError && error.status === 403,
    );
  });
});
