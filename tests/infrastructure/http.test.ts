import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { requestJson } from "../../src/infrastructure/http/client.ts";
import { EVENT_TYPES, globalEvents } from "@omerdlw/base-framework/events";
import {
  USER_MESSAGES,
  UserError,
  setReportSink,
  toUserMessage,
} from "@omerdlw/base-framework/utils";
import { apiErrorResponse } from "../../src/infrastructure/http/api-error.ts";

describe("http client", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function respondWith(status, body) {
    globalThis.fetch = async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
  }

  function capture(type) {
    const events: any[] = [];
    const off = globalEvents.subscribe(type, (payload) =>
      events.push(payload as any),
    );
    return { events, off };
  }

  describe("requestJson", () => {
    test("returns the parsed payload on success", async () => {
      respondWith(200, { ok: true });
      assert.deepEqual(await requestJson("/api/x"), { ok: true });
    });

    test("sends JSON content-type only when there is a body", async () => {
      let seen;
      globalThis.fetch = async (_path, init) => {
        seen = init.headers;
        return new Response("{}");
      };

      await requestJson("/api/x");
      assert.equal(seen["content-type"], undefined);
      await requestJson("/api/x", { method: "POST", body: "{}" });
      assert.equal(seen["content-type"], "application/json");
    });

    test("throws an HttpError carrying status and payload", async () => {
      respondWith(403, { error: "This account is private" });

      await assert.rejects(
        requestJson("/api/x", { notifyOnError: false }),
        (error) => {
          assert.equal((error as any).status, 403);
          assert.equal((error as any).message, "This account is private");
          assert.equal(toUserMessage(error), "This account is private");
          return true;
        },
      );
    });

    test("5xx payload text never reaches users", async () => {
      respondWith(500, { error: 'relation "x" does not exist' });

      await assert.rejects(
        requestJson("/api/x", { notifyOnError: false }),
        (error) => {
          assert.equal(toUserMessage(error), USER_MESSAGES.server);
          return true;
        },
      );
    });

    test("failures emit API_ERROR with a user-safe message", async () => {
      const { events, off } = capture(EVENT_TYPES.API_ERROR);
      respondWith(500, { error: "driver exploded" });

      await assert.rejects(requestJson("/api/x"));
      off();

      assert.equal(events.length, 1);
      assert.equal((events[0] as any).message, USER_MESSAGES.server);
      assert.equal((events[0] as any).status, 500);
    });

    test("401 emits API_UNAUTHORIZED unless suppressed", async () => {
      const { events, off } = capture(EVENT_TYPES.API_UNAUTHORIZED);
      respondWith(401, { error: "Authentication required" });

      await assert.rejects(requestJson("/api/x"));
      await assert.rejects(
        requestJson("/api/x", { notifyOnUnauthorized: false }),
      );
      off();

      assert.equal(events.length, 1);
    });

    test("notifyOnError: false emits nothing", async () => {
      const { events, off } = capture(EVENT_TYPES.API_ERROR);
      respondWith(500, {});

      await assert.rejects(requestJson("/api/x", { notifyOnError: false }));
      off();

      assert.equal(events.length, 0);
    });

    test("a non-JSON error body still yields an HttpError", async () => {
      globalThis.fetch = async () => new Response("<html>", { status: 502 });

      await assert.rejects(
        requestJson("/api/x", { notifyOnError: false }),
        (error) => {
          assert.equal((error as any).status, 502);
          assert.match((error as any).message, /502/);
          return true;
        },
      );
    });
  });
});

describe("api errors", () => {
  describe("apiErrorResponse", () => {
    test("a UserError keeps its message and status", async () => {
      const res = apiErrorResponse(new UserError("Account not found", 404));

      assert.equal(res.status, 404);
      assert.deepEqual(await res.json(), { error: "Account not found" });
    });

    test("a UserError without a status is a 400", () => {
      assert.equal(apiErrorResponse(new UserError("Nope")).status, 400);
    });

    test("any other error is reported and answered neutrally", async () => {
      const reported: any[] = [];
      const release = setReportSink((scope, error) =>
        reported.push([scope, error] as any),
      );
      const raw = new Error('relation "accounts" does not exist');

      const res = apiErrorResponse(raw);
      release();

      assert.equal(res.status, 500);
      assert.deepEqual(await res.json(), { error: USER_MESSAGES.server });
      assert.equal(reported.length, 1);
      assert.equal(reported[0][1], raw);
    });

    test("status and fallback can be customised for unknown errors", async () => {
      const release = setReportSink(() => {});
      const res = apiErrorResponse(new Error("x"), {
        fallback: "Couldn't save" as any,
        status: 400,
      });
      release();

      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { error: "Couldn't save" });
    });
  });
});
