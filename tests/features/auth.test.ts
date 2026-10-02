import "../support/dom.ts";
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEmail,
  sanitizeNextPath,
  toAuthUser,
  unwrapResult,
} from "../../src/features/auth/utils.ts";
import { getAuthErrorMessage } from "../../src/features/auth/messages.ts";
import { USER_MESSAGES, UserError } from "@omerdlw/base-framework/utils";

import { afterEach as afterEachAuth } from "node:test";
import {
  getOptionalUser,
  requireRecentAuthentication,
  requireUser,
} from "../../src/features/auth/server.ts";
import {
  signedIn,
  installFakeSupabase,
  type FakeSupabase,
} from "../support/supabase.ts";

import {
  deletePasskey,
  getUserIdentities,
  linkIdentity,
  listPasskeys,
  registerPasskey,
  renamePasskey,
  requestEmailAuth,
  signInWithOAuth,
  signInWithPasskey,
  signOut,
  unlinkIdentity,
  verifyEmailOtp,
} from "../../src/features/auth/client.ts";

describe("auth", () => {
  describe("normalizeEmail", () => {
    test("trims and lower-cases", () => {
      assert.equal(normalizeEmail("  Ada@Example.COM "), "ada@example.com");
    });

    test("rejects malformed addresses with a user-facing error", () => {
      for (const bad of [
        "",
        "ada",
        "ada@",
        "@example.com",
        "a b@example.com",
        null,
      ]) {
        assert.throws(
          () => normalizeEmail(bad),
          (error) =>
            error instanceof UserError &&
            error.message === "Enter a valid email address",
          String(bad),
        );
      }
    });
  });

  describe("sanitizeNextPath", () => {
    test("keeps same-site absolute paths", () => {
      assert.equal(
        sanitizeNextPath("/account/settings?tab=1"),
        "/account/settings?tab=1",
      );
    });

    test("blocks open redirects and falls back", () => {
      for (const unsafe of [
        "https://evil.com",
        "//evil.com",
        "/\\evil.com",
        "javascript:alert(1)",
        "account",
        "",
        null,
        "/ok\u0000bad",
      ]) {
        assert.equal(sanitizeNextPath(unsafe), "/account", String(unsafe));
      }
    });

    test("honours a custom fallback", () => {
      assert.equal(sanitizeNextPath("//x", "/home"), "/home");
    });
  });

  describe("toAuthUser", () => {
    test("maps claims to the app's user shape", () => {
      const user = toAuthUser({
        aal: "aal2",
        email: "ada@example.com",
        session_id: "s1",
        sub: "u1",
      });

      assert.deepEqual(
        {
          aal: user!.aal,
          email: user!.email,
          id: user!.id,
          sessionId: user!.sessionId,
        },
        { aal: "aal2", email: "ada@example.com", id: "u1", sessionId: "s1" },
      );
    });

    test("defaults and missing subject", () => {
      assert.equal(toAuthUser({ sub: "u1" })!.aal, "aal1");
      assert.equal(toAuthUser({ sub: "u1" })!.email, null);
      assert.equal(toAuthUser({}), null);
      assert.equal(toAuthUser(null), null);
    });
  });

  describe("unwrapResult", () => {
    test("returns data, rethrows the SDK error, or fails with a user message", () => {
      assert.deepEqual(unwrapResult({ data: { ok: 1 } }, "x"), { ok: 1 });

      const sdkError = Object.assign(new Error("raw"), { code: "otp_expired" });
      assert.throws(
        () => unwrapResult({ error: sdkError }, "x"),
        (e) => e === sdkError,
      );

      assert.throws(
        () => unwrapResult({ data: null }, "Couldn't finish"),
        (e) => e instanceof UserError && e.message === "Couldn't finish",
      );
    });
  });

  describe("getAuthErrorMessage", () => {
    const sdk = (code, extra = {}) =>
      Object.assign(new Error("vendor wording that must not leak"), {
        code,
        ...extra,
      });

    test("maps Supabase codes to plain language", () => {
      assert.match(
        getAuthErrorMessage(sdk("otp_expired")),
        /code has expired/i,
      );
      assert.match(
        getAuthErrorMessage(sdk("over_email_send_rate_limit")),
        /wait/i,
      );
      assert.match(
        getAuthErrorMessage(sdk("email_address_invalid")),
        /valid email/i,
      );
      assert.match(
        getAuthErrorMessage(sdk("manual_linking_disabled")),
        /isn't available/i,
      );
    });

    test("never leaks the vendor message for unknown codes", () => {
      const message = getAuthErrorMessage(
        sdk("something_new", { status: 400 }),
        "Couldn't sign you in",
      );

      assert.equal(message, "Couldn't sign you in");
      assert.doesNotMatch(message, /vendor/);
    });

    test("passkey ceremony failures read naturally", () => {
      const cancelled = Object.assign(
        new Error("The operation either timed out or was not allowed"),
        {
          name: "NotAllowedError",
        },
      );
      const duplicate = Object.assign(new Error("x"), {
        name: "InvalidStateError",
      });

      assert.match(getAuthErrorMessage(cancelled), /cancelled or timed out/i);
      assert.match(getAuthErrorMessage(duplicate), /already has a passkey/i);
    });

    test("falls back to the generic message without a custom fallback", () => {
      assert.equal(getAuthErrorMessage(new Error("x")), USER_MESSAGES.generic);
    });

    test("rate limiting by status is recognised too", () => {
      assert.equal(
        getAuthErrorMessage(Object.assign(new Error("x"), { status: 429 })),
        USER_MESSAGES.rateLimited,
      );
    });
  });
});

describe("auth server helpers", () => {
  let fake: FakeSupabase;
  afterEachAuth(() => fake?.restore());
  const now = () => Math.floor(Date.now() / 1000);

  test("getOptionalUser maps verified claims to a user", async () => {
    fake = installFakeSupabase({ claims: signedIn("u1", { aal: "aal2" }) });

    const user = await getOptionalUser();

    assert.equal(user?.id, "u1");
    assert.equal(user?.aal, "aal2");
    assert.equal(user?.sessionId, "session-u1");
  });

  test("no claims means signed out", async () => {
    fake = installFakeSupabase({ claims: null });

    assert.equal(await getOptionalUser(), null);
  });

  test("a revoked session is signed out even with valid claims", async () => {
    fake = installFakeSupabase({
      claims: signedIn("u1"),
      tables: {
        auth_sessions: { data: { revoked_at: "2026-01-01" }, error: null },
      },
    });

    assert.equal(await getOptionalUser(), null);
  });

  test("if the session lookup fails the user is treated as signed out (fail closed)", async () => {
    fake = installFakeSupabase({
      claims: signedIn("u1"),
      tables: { auth_sessions: { data: null, error: new Error("db down") } },
    });

    assert.equal(await getOptionalUser(), null);
  });

  test("claims without a session id skip the revocation lookup", async () => {
    fake = installFakeSupabase({ claims: { sub: "u1" } });

    assert.equal((await getOptionalUser())?.id, "u1");
    assert.equal(fake.queries.length, 0);
  });

  test("requireUser throws a 401 UserError for anonymous callers", async () => {
    fake = installFakeSupabase({ claims: null });

    await assert.rejects(requireUser(), (error: any) => {
      assert.ok(error instanceof UserError);
      assert.equal(error.status, 401);
      return true;
    });
  });

  test("requireUser can redirect instead of throwing", async () => {
    fake = installFakeSupabase({ claims: null });

    await assert.rejects(
      requireUser({ redirectTo: "/sign-in" }),
      (error: any) => {
        assert.equal(error.redirectTo, "/sign-in");
        return true;
      },
    );
  });

  test("requireRecentAuthentication accepts a fresh sign-in", async () => {
    fake = installFakeSupabase({
      claims: signedIn("u1", { amr: [{ timestamp: now() - 30 }] }),
    });

    assert.equal((await requireRecentAuthentication()).id, "u1");
  });

  test("it uses the most recent authentication method", async () => {
    fake = installFakeSupabase({
      claims: signedIn("u1", {
        amr: [{ timestamp: now() - 99999 }, { timestamp: now() - 10 }],
      }),
    });

    assert.equal((await requireRecentAuthentication()).id, "u1");
  });

  test("a stale or missing authentication timestamp asks the user to sign in again", async () => {
    for (const amr of [[{ timestamp: now() - 7200 }], [], undefined]) {
      fake = installFakeSupabase({ claims: signedIn("u1", { amr }) });

      await assert.rejects(requireRecentAuthentication(), (error: any) => {
        assert.ok(error instanceof UserError);
        assert.equal(error.status, 403);
        assert.match(error.message, /sign in again/i);
        return true;
      });
      fake.restore();
    }
  });

  test("the allowed age is configurable", async () => {
    fake = installFakeSupabase({
      claims: signedIn("u1", { amr: [{ timestamp: now() - 120 }] }),
    });

    await assert.rejects(requireRecentAuthentication(60));
    assert.equal((await requireRecentAuthentication(600)).id, "u1");
  });
});

describe("auth client", () => {
  const sdkError = (code: string) =>
    Object.assign(new Error("vendor wording"), { code });

  describe("requestEmailAuth", () => {
    test("normalises the email and asks Supabase for a one-time code", async () => {
      const calls: any[] = [];
      const client = {
        auth: {
          signInWithOtp: async (args: any) => (
            calls.push(args),
            { error: null }
          ),
        },
      };

      const result = await requestEmailAuth(client, {
        createUser: true,
        email: "  Ada@Example.com ",
      } as any);

      assert.deepEqual(result, { email: "ada@example.com", sent: true });
      assert.equal(calls[0].email, "ada@example.com");
      assert.equal(calls[0].options.shouldCreateUser, true);
      assert.equal(calls[0].options.data, undefined);
    });

    test("sign-in does not create users by default, and metadata is passed only when present", async () => {
      const calls: any[] = [];
      const client = {
        auth: {
          signInWithOtp: async (args: any) => (
            calls.push(args),
            { error: null }
          ),
        },
      };

      await requestEmailAuth(client, { email: "a@b.co" } as any);
      await requestEmailAuth(client, {
        email: "a@b.co",
        metadata: { name: "Ada" },
      } as any);

      assert.equal(calls[0].options.shouldCreateUser, false);
      assert.deepEqual(calls[1].options.data, { name: "Ada" });
    });

    test("an invalid address fails before any request", async () => {
      let called = false;
      const client = {
        auth: { signInWithOtp: async () => ((called = true), { error: null }) },
      };

      await assert.rejects(
        requestEmailAuth(client, { email: "nope" } as any),
        /valid email/,
      );
      assert.equal(called, false);
    });

    test("SDK errors are rethrown untouched so callers can map their code", async () => {
      const error = sdkError("over_email_send_rate_limit");
      const client = { auth: { signInWithOtp: async () => ({ error }) } };

      await assert.rejects(
        requestEmailAuth(client, { email: "a@b.co" } as any),
        (e) => e === error,
      );
    });
  });

  describe("verifyEmailOtp", () => {
    test("returns the session data on success", async () => {
      const calls: any[] = [];
      const client = {
        auth: {
          verifyOtp: async (args: any) => (
            calls.push(args),
            { data: { session: "s" }, error: null }
          ),
        },
      };

      const data = await verifyEmailOtp(client, {
        email: "A@b.co",
        token: 123456,
      } as any);

      assert.deepEqual(data, { session: "s" });
      assert.deepEqual(calls[0], {
        email: "a@b.co",
        token: "123456",
        type: "email",
      });
      assert.equal(calls.length, 1);
    });

    test("falls back to the other code type when the first fails", async () => {
      const types: string[] = [];
      const client = {
        auth: {
          verifyOtp: async ({ type }: any) => {
            types.push(type);
            return type === "signup"
              ? { data: { session: "ok" }, error: null }
              : { data: null, error: sdkError("otp_expired") };
          },
        },
      };

      const data = await verifyEmailOtp(client, {
        email: "a@b.co",
        token: "1",
      } as any);

      assert.deepEqual(types, ["email", "signup"]);
      assert.deepEqual(data, { session: "ok" });
    });

    test("when both attempts fail the first error is reported", async () => {
      const first = sdkError("otp_expired");
      const client = {
        auth: {
          verifyOtp: async ({ type }: any) => ({
            data: null,
            error: type === "email" ? first : sdkError("other"),
          }),
        },
      };

      await assert.rejects(
        verifyEmailOtp(client, { email: "a@b.co", token: "1" } as any),
        (e) => e === first,
      );
    });

    test("signup codes try the email type as their fallback", async () => {
      const types: string[] = [];
      const client = {
        auth: {
          verifyOtp: async ({ type }: any) => (
            types.push(type),
            { data: null, error: sdkError("x") }
          ),
        },
      };

      await assert.rejects(
        verifyEmailOtp(client, {
          email: "a@b.co",
          token: "1",
          type: "signup",
        } as any),
      );

      assert.deepEqual(types, ["signup", "email"]);
    });

    test("a success without data is a friendly failure", async () => {
      const client = {
        auth: { verifyOtp: async () => ({ data: null, error: null }) },
      };

      await assert.rejects(
        verifyEmailOtp(client, { email: "a@b.co", token: "1" } as any),
        (e: any) =>
          e instanceof UserError && /code didn't work/.test(e.message),
      );
    });
  });

  describe("OAuth and identities", () => {
    test("signInWithOAuth passes provider and redirect, and throws a friendly error on empty results", async () => {
      const calls: any[] = [];
      const ok = {
        auth: {
          signInWithOAuth: async (a: any) => (
            calls.push(a),
            { data: { url: "u" }, error: null }
          ),
        },
      };
      const empty = {
        auth: { signInWithOAuth: async () => ({ data: null, error: null }) },
      };

      assert.deepEqual(
        await signInWithOAuth(ok, {
          provider: "github",
          redirectTo: "/cb",
        } as any),
        { url: "u" },
      );
      assert.deepEqual(calls[0], {
        options: { redirectTo: "/cb" },
        provider: "github",
      });
      await assert.rejects(
        signInWithOAuth(empty, { provider: "github" } as any),
        UserError,
      );
    });

    test("linking maps x to twitter and navigates to the provider URL", async () => {
      const calls: any[] = [];
      const assigned: string[] = [];
      const original = window.location.assign;
      (window.location as any).assign = (url: string) => assigned.push(url);
      const client = {
        auth: {
          linkIdentity: async (a: any) => (
            calls.push(a),
            { data: { url: "https://x.com/auth" }, error: null }
          ),
        },
      };

      await linkIdentity(client, { provider: "x", redirectTo: "/back" } as any);
      (window.location as any).assign = original;

      assert.equal(calls[0].provider, "twitter");
      assert.deepEqual(assigned, ["https://x.com/auth"]);
    });

    test("link, unlink and list surface SDK errors", async () => {
      const error = sdkError("manual_linking_disabled");
      const failing = {
        auth: {
          getUserIdentities: async () => ({ data: null, error }),
          linkIdentity: async () => ({ data: null, error }),
          unlinkIdentity: async () => ({ data: null, error }),
        },
      };

      await assert.rejects(
        linkIdentity(failing, { provider: "github" } as any),
        (e) => e === error,
      );
      await assert.rejects(unlinkIdentity(failing, {}), (e) => e === error);
      await assert.rejects(getUserIdentities(failing), (e) => e === error);
    });

    test("getUserIdentities always returns an array", async () => {
      const list = {
        auth: {
          getUserIdentities: async () => ({
            data: { identities: [{ id: 1 }] },
            error: null,
          }),
        },
      };
      const none = {
        auth: { getUserIdentities: async () => ({ data: null, error: null }) },
      };

      assert.deepEqual(await getUserIdentities(list), [{ id: 1 }]);
      assert.deepEqual(await getUserIdentities(none), []);
    });
  });

  describe("passkeys and sign-out", () => {
    test("passkey operations pass through and unwrap results", async () => {
      const client = {
        auth: {
          passkey: {
            delete: async () => ({ error: null }),
            list: async () => ({
              data: { passkeys: [{ id: "p1" }] },
              error: null,
            }),
            update: async (a: any) => ({ data: a, error: null }),
          },
          registerPasskey: async () => ({ data: { id: "new" }, error: null }),
          signInWithPasskey: async () => ({
            data: { session: "s" },
            error: null,
          }),
        },
      };

      assert.deepEqual(await signInWithPasskey(client), { session: "s" });
      assert.deepEqual(await registerPasskey(client), { id: "new" });
      assert.deepEqual(await listPasskeys(client), [{ id: "p1" }]);
      assert.deepEqual(
        await renamePasskey(client, {
          friendlyName: "Laptop",
          passkeyId: "p1",
        } as any),
        {
          friendlyName: "Laptop",
          passkeyId: "p1",
        },
      );
      assert.deepEqual(
        await deletePasskey(client, { passkeyId: "p1" } as any),
        { deleted: true },
      );
    });

    test("listPasskeys accepts a bare array too", async () => {
      const client = {
        auth: {
          passkey: { list: async () => ({ data: [{ id: "a" }], error: null }) },
        },
      };

      assert.deepEqual(await listPasskeys(client), [{ id: "a" }]);
    });

    test("an empty passkey ceremony is a friendly failure", async () => {
      const client = {
        auth: { registerPasskey: async () => ({ data: null, error: null }) },
      };

      await assert.rejects(
        registerPasskey(client),
        (e: any) => e instanceof UserError && /passkey/.test(e.message),
      );
    });

    test("signOut defaults to the local scope and rethrows errors", async () => {
      const scopes: string[] = [];
      const client = {
        auth: {
          signOut: async ({ scope }: any) => (
            scopes.push(scope),
            { error: null }
          ),
        },
      };

      await signOut(client);
      await signOut(client, "global");
      const error = sdkError("session_not_found");

      assert.deepEqual(scopes, ["local", "global"]);
      await assert.rejects(
        signOut({ auth: { signOut: async () => ({ error }) } }),
        (e) => e === error,
      );
    });
  });
});
