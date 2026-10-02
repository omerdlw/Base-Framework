import "../support/dom.ts";
import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAccountPatch,
  requireAccountContext,
  toCurrentAccount,
  toPublicAccount,
} from "../../src/features/account/utils/format.ts";
import { getInitial } from "../../src/features/account/utils/avatar.ts";
import {
  formatSessionActivity,
  formatSessionIp,
  parseUserAgent,
} from "../../src/features/account/utils/session-format.ts";
import { UserError } from "@omerdlw/base-framework/utils";
import { updateAccount } from "../../src/features/account/server/profile.ts";

import {
  completeSignUpAction,
  followUserAction,
  unfollowUserAction,
  updateAccountAction,
} from "../../src/features/account/server/actions.ts";
import { revalidated } from "../support/next-cache.mjs";
import {
  signedIn,
  installFakeSupabase,
  type FakeSupabase,
} from "../support/supabase.ts";
import {
  setReportSink as setSink,
  USER_MESSAGES as MESSAGES,
} from "@omerdlw/base-framework/utils";

import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from "../../src/features/account/utils/avatar.ts";
import {
  clearLastKnownAccount,
  resolveAuthStatusDetails,
  saveLastKnownAccount,
} from "../../src/features/account/utils/session.ts";
import {
  getAccountFollowCounts,
  getAccountFollowRelation,
} from "../../src/features/account/server/follows.ts";

describe("account format", () => {
  describe("normalizeAccountPatch", () => {
    const valid = { displayName: "Ada Lovelace", username: "ada" };

    test("applies defaults and trims text", () => {
      const patch = normalizeAccountPatch({
        ...valid,
        displayName: "  Ada  ",
        bio: "  hi ",
      });

      assert.equal(patch.displayName, "Ada");
      assert.equal(patch.bio, "hi");
      assert.equal(patch.avatarUrl, null);
      assert.equal(patch.isPrivate, false);
    });

    test("empty optional fields become null", () => {
      const patch = normalizeAccountPatch({
        ...valid,
        bio: "   ",
        avatarUrl: "",
      });

      assert.equal(patch.bio, null);
      assert.equal(patch.avatarUrl, null);
    });

    test("usernames are lower-cased, de-accented and slugified", () => {
      assert.equal(
        normalizeAccountPatch({ displayName: "x", username: "  Ádá Lovelace " })
          .username,
        "ada-lovelace",
      );
    });

    test("invalid usernames fail with a UserError that says why", () => {
      for (const bad of ["", "ab", "!!", "a".repeat(31)]) {
        assert.throws(
          () => normalizeAccountPatch({ displayName: "x", username: bad }),
          (error) =>
            error instanceof UserError && /3-30 characters/.test(error.message),
          bad,
        );
      }
    });

    test("a missing display name is a UserError", () => {
      assert.throws(
        () => normalizeAccountPatch({ displayName: "  ", username: "ada" }),
        (error) =>
          error instanceof UserError &&
          /Display name is required/.test(error.message),
      );
    });

    test("lengths are capped", () => {
      const patch = normalizeAccountPatch({
        ...valid,
        bio: "b".repeat(900),
        displayName: "n".repeat(200),
      });

      assert.equal(patch.bio!.length, 500);
      assert.equal(patch.displayName.length, 80);
    });

    test("isPrivate accepts true and the form value 'on' only", () => {
      assert.equal(
        normalizeAccountPatch({ ...valid, isPrivate: true }).isPrivate,
        true,
      );
      assert.equal(
        normalizeAccountPatch({ ...valid, isPrivate: "on" }).isPrivate,
        true,
      );
      assert.equal(
        normalizeAccountPatch({ ...valid, isPrivate: "yes" }).isPrivate,
        false,
      );
    });
  });

  describe("account mappers", () => {
    const row = {
      avatar_url: "/a.png",
      bio: "hi",
      display_name: "Ada",
      id: "u1",
      is_private: true,
      username: "ada",
    };

    test("toPublicAccount maps snake_case rows", () => {
      const account = toPublicAccount(row);

      assert.equal(account!.id, "u1");
      assert.equal(account!.displayName, "Ada");
      assert.equal(account!.isPrivate, true);
      assert.equal(toPublicAccount(null), null);
    });

    test("toCurrentAccount carries the email", () => {
      assert.equal(
        toCurrentAccount({ ...row, email: "ada@example.com" })!.email,
        "ada@example.com",
      );
      assert.equal(toCurrentAccount(null), null);
    });

    test("requireAccountContext demands a client and a user id", () => {
      assert.throws(() => requireAccountContext({ client: {} as any }));
      assert.throws(() => requireAccountContext({ userId: "u1" }));
      assert.deepEqual(
        requireAccountContext({ client: 1 as any, userId: "u1" }),
        {
          client: 1,
          userId: "u1",
        },
      );
    });
  });

  describe("getInitial", () => {
    test("uses the first alphanumeric character, else 'A'", () => {
      assert.equal(getInitial("zoe"), "Z");
      assert.equal(getInitial("9lives"), "9");
      assert.equal(getInitial("  "), "A");
      assert.equal(getInitial("éa"), "A");
      assert.equal(getInitial(undefined), "A");
    });
  });

  describe("session formatting", () => {
    test("parseUserAgent recognises common devices", () => {
      const iphone = parseUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      );
      const chrome = parseUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      assert.equal(iphone.device, "mobile");
      assert.equal(iphone.os, "iOS");
      assert.equal(chrome.device, "desktop");
      assert.match(chrome.browser, /Chrome/);
      assert.match(chrome.os, /Windows/);
    });

    test("an unknown user agent still yields a labelled session", () => {
      const parsed = parseUserAgent(null);

      assert.equal(parsed.title, "Unknown session");
      assert.equal(parseUserAgent("curl/8").device, "desktop");
    });

    test("loopback addresses read as Localhost", () => {
      assert.equal(formatSessionIp("::1"), "Localhost");
      assert.equal(formatSessionIp("127.0.0.1"), "Localhost");
      assert.equal(formatSessionIp(" 8.8.8.8 "), "8.8.8.8");
      assert.equal(formatSessionIp(null), null);
    });

    test("activity is phrased relative to now", () => {
      const ago = (seconds) =>
        new Date(Date.now() - seconds * 1000).toISOString();

      assert.equal(formatSessionActivity({ is_current: true }), "Active now");
      assert.equal(
        formatSessionActivity({ last_seen_at: ago(10) }),
        "Active just now",
      );
      assert.equal(
        formatSessionActivity({ last_seen_at: ago(5 * 60) }),
        "Active 5m ago",
      );
      assert.equal(
        formatSessionActivity({ last_seen_at: ago(3 * 3600) }),
        "Active 3h ago",
      );
      assert.equal(
        formatSessionActivity({ last_seen_at: ago(2 * 86400) }),
        "Active 2d ago",
      );
      assert.equal(formatSessionActivity(null), "Active session");
      assert.equal(
        formatSessionActivity({ last_seen_at: "garbage" }),
        "Active session",
      );
    });
  });
});

describe("update account", () => {
  function fakeClient({
    current,
    rpcResult,
    email = { email: "ada@example.com" },
  }: any = {}) {
    const calls = { rpc: [] as any[] };
    const chain = (result) => {
      const node = {
        eq: () => node,
        maybeSingle: async () => result,
        select: () => node,
        single: async () => result,
      };
      return node;
    };
    return {
      calls,
      client: {
        from: (table) =>
          table === "accounts"
            ? chain({ data: current, error: null })
            : chain({ data: email, error: null }),
        rpc: async (name, args) => {
          calls.rpc.push([name, args] as any);
          return rpcResult;
        },
      },
    };
  }

  const current = {
    avatar_url: null,
    background_url: null,
    banner_position: null,
    banner_url: null,
    bio: "old bio",
    display_name: "Ada",
    is_private: false,
    username: "ada",
  };

  describe("updateAccount", () => {
    test("merges the patch over the current row and returns the account", async () => {
      const { client, calls } = fakeClient({
        current,
        rpcResult: {
          data: [{ ...current, bio: "new bio", id: "u1" }],
          error: null,
        },
      } as any);

      const { account } = await updateAccount({
        client: client as any,
        input: { bio: "new bio" },
        userId: "u1",
      });

      const [name, args] = calls.rpc[0];
      assert.equal(name, "update_account");
      assert.equal((args as any).p_bio, "new bio");
      assert.equal((args as any).p_username, "ada");
      assert.equal((args as any).p_display_name, "Ada");
      assert.equal(account!.bio, "new bio");
      assert.equal(account!.email, "ada@example.com");
    });

    test("a taken username becomes a friendly 409", async () => {
      const { client } = fakeClient({
        current,
        rpcResult: {
          data: null,
          error: Object.assign(
            new Error(
              'duplicate key value violates unique constraint "accounts_username_key"',
            ),
            {
              code: "23505",
            },
          ),
        },
      } as any);

      await assert.rejects(
        updateAccount({
          client: client as any,
          input: { username: "grace" },
          userId: "u1",
        }),
        (error) => {
          assert.ok(error instanceof UserError);
          assert.equal(error.status, 409);
          assert.equal(error.message, "That username is already taken");
          return true;
        },
      );
    });

    test("other database errors are rethrown untouched for the server to report", async () => {
      const dbError = Object.assign(new Error("connection reset"), {
        code: "08006",
      });
      const { client } = fakeClient({
        current,
        rpcResult: { data: null, error: dbError },
      } as any);

      await assert.rejects(
        updateAccount({
          client: client as any,
          input: { bio: "x" },
          userId: "u1",
        }),
        (error) => error === dbError && !(error instanceof UserError),
      );
    });

    test("invalid input fails before any write", async () => {
      const { client, calls } = fakeClient({
        current,
        rpcResult: { data: [] as any[], error: null },
      } as any);

      await assert.rejects(
        updateAccount({
          client: client as any,
          input: { username: "!" },
          userId: "u1",
        }),
        UserError,
      );
      assert.equal(calls.rpc.length, 0);
    });

    test("requires a client and a user id", async () => {
      await assert.rejects(
        updateAccount({ client: null as any, input: {}, userId: "u1" }),
      );
    });
  });
});

describe("account server actions", () => {
  let fake: FakeSupabase;
  let release: () => void;
  let reports: any[];

  function arrange(options: Parameters<typeof installFakeSupabase>[0] = {}) {
    fake = installFakeSupabase(options);
    reports = [];
    release = setSink((scope, error) => reports.push([scope, error]));
    revalidated.length = 0;
  }

  afterEach(() => {
    fake?.restore();
    release?.();
  });

  const filters = (table: string) =>
    fake.queries
      .find((q) => q.table === table)!
      .ops.filter(([name]) => name === "eq")
      .map(([, args]) => args);

  describe("followUserAction", () => {
    test("following a public account is accepted immediately", async () => {
      arrange({
        claims: signedIn("me"),
        rpc: {
          get_account_follow_target: {
            data: [{ is_private: false }],
            error: null,
          },
        },
      });

      const result: any = await followUserAction("them", "ada");

      assert.equal(result.success, true);
      assert.equal(result.status, "accepted");
      const upsert = fake.queries.find((q) => q.table === "account_follows")!
        .ops[0];
      assert.equal(upsert[0], "upsert");
      assert.deepEqual(upsert[1][0], {
        follower_id: "me",
        following_id: "them",
        status: "accepted",
      });
      assert.deepEqual(revalidated, ["/account/ada", "/account"]);
    });

    test("following a private account becomes a pending request", async () => {
      arrange({
        claims: signedIn("me"),
        rpc: {
          get_account_follow_target: {
            data: [{ is_private: true }],
            error: null,
          },
        },
      });

      const result: any = await followUserAction("them");

      assert.equal(result.status, "pending");
      assert.deepEqual(revalidated, ["/account"]);
    });

    test("you cannot follow yourself or nobody", async () => {
      arrange({ claims: signedIn("me") });

      for (const target of ["me", ""]) {
        const result: any = await followUserAction(target);
        assert.equal(result.success, false);
        assert.equal(result.error, "Invalid follow target");
      }
      assert.equal(fake.rpcCalls.length, 0);
    });

    test("an unknown account is reported as such", async () => {
      arrange({
        claims: signedIn("me"),
        rpc: { get_account_follow_target: { data: [], error: null } },
      });

      const result: any = await followUserAction("ghost");

      assert.equal(result.error, "Account not found");
      assert.equal(
        fake.queries.some((q) => q.table === "account_follows"),
        false,
      );
    });

    test("a signed-out caller is told to sign in, in plain words", async () => {
      arrange({ claims: null });

      const result: any = await followUserAction("them");

      assert.equal(result.success, false);
      assert.equal(result.error, MESSAGES.unauthorized);
    });

    test("database failures are reported and answered neutrally", async () => {
      arrange({
        claims: signedIn("me"),
        rpc: {
          get_account_follow_target: {
            data: [{ is_private: false }],
            error: null,
          },
        },
        tables: {
          account_follows: {
            data: null,
            error: new Error("deadlock detected"),
          },
        },
      });

      const result: any = await followUserAction("them");

      assert.equal(result.success, false);
      assert.equal(result.code, "FOLLOW_FAILED");
      assert.doesNotMatch(result.error, /deadlock/);
      assert.equal(reports.length, 1);
    });
  });

  describe("unfollowUserAction", () => {
    test("deletes only the caller's own follow", async () => {
      arrange({ claims: signedIn("me") });

      const result: any = await unfollowUserAction("them", "ada");

      assert.equal(result.success, true);
      assert.equal(result.status, null);
      assert.deepEqual(filters("account_follows"), [
        ["follower_id", "me"],
        ["following_id", "them"],
      ]);
      assert.deepEqual(revalidated, ["/account/ada", "/account"]);
    });

    test("self and empty targets are refused, failures are neutral", async () => {
      arrange({
        claims: signedIn("me"),
        tables: { account_follows: { data: null, error: new Error("boom") } },
      });

      assert.equal(
        ((await unfollowUserAction("me")) as any).error,
        "Invalid follow target",
      );
      const failed: any = await unfollowUserAction("them");
      assert.equal(failed.code, "UNFOLLOW_FAILED");
      assert.doesNotMatch(failed.error, /boom/);
    });
  });

  describe("updateAccountAction", () => {
    const current = {
      avatar_url: null,
      background_url: null,
      banner_position: null,
      banner_url: null,
      bio: null,
      display_name: "Ada",
      is_private: false,
      username: "ada",
    };

    test("saves and revalidates the profile and the account page", async () => {
      arrange({
        claims: signedIn("me"),
        rpc: {
          update_account: {
            data: [{ ...current, bio: "hi", id: "me" }],
            error: null,
          },
        },
        tables: { accounts: { data: current, error: null } },
      });

      const result: any = await updateAccountAction({ bio: "hi" });

      assert.equal(result.success, true);
      assert.equal(result.account.bio, "hi");
      assert.deepEqual(revalidated, ["/account/ada", "/account"]);
    });

    test("validation problems reach the user as written", async () => {
      arrange({
        claims: signedIn("me"),
        tables: { accounts: { data: current, error: null } },
      });

      const result: any = await updateAccountAction({ username: "!" });

      assert.equal(result.success, false);
      assert.match(result.error, /3-30 characters/);
      assert.equal(result.account, null);
    });

    test("a taken username is explained", async () => {
      arrange({
        claims: signedIn("me"),
        rpc: {
          update_account: {
            data: null,
            error: Object.assign(new Error("dup"), { code: "23505" }),
          },
        },
        tables: { accounts: { data: current, error: null } },
      });

      const result: any = await updateAccountAction({ username: "grace" });

      assert.equal(result.error, "That username is already taken");
    });

    test("other failures are neutral and reported", async () => {
      arrange({
        claims: signedIn("me"),
        rpc: {
          update_account: { data: null, error: new Error("connection reset") },
        },
        tables: { accounts: { data: current, error: null } },
      });

      const result: any = await updateAccountAction({ bio: "x" });

      assert.equal(result.code, "ACCOUNT_UPDATE_FAILED");
      assert.doesNotMatch(result.error, /connection/);
      assert.equal(reports.length, 1);
    });

    test("a signed-out caller cannot update", async () => {
      arrange({ claims: null });

      const result: any = await updateAccountAction({ bio: "x" });

      assert.equal(result.error, MESSAGES.unauthorized);
    });

    test("completeSignUpAction falls back to the username as display name", async () => {
      arrange({
        claims: signedIn("me"),
        rpc: {
          update_account: { data: [{ ...current, id: "me" }], error: null },
        },
        tables: {
          accounts: {
            data: { ...current, display_name: null, username: null },
            error: null,
          },
        },
      });

      await completeSignUpAction({ username: "ada" });

      const args = fake.rpcCalls[0][1];
      assert.equal(args.p_display_name, "ada");
      assert.equal(args.p_username, "ada");
    });
  });
});

describe("account avatars", () => {
  test("a stored avatar URL wins, from any of the known field names", () => {
    assert.equal(getUserAvatarUrl({ avatarUrl: " /a.png " }), "/a.png");
    assert.equal(getUserAvatarUrl({ avatar_url: "/b.png" }), "/b.png");
    assert.equal(
      getUserAvatarUrl({ user_metadata: { avatar_url: "/c.png" } }),
      "/c.png",
    );
    assert.equal(
      getUserAvatarUrl({ user_metadata: { picture: "/d.png" } }),
      "/d.png",
    );
  });

  test("without one, an initial-based image is generated from the name", () => {
    const url = getUserAvatarUrl({ displayName: "zoe" });
    const svg = decodeURIComponent(
      url.replace("data:image/svg+xml;charset=UTF-8,", ""),
    );

    assert.match(url, /^data:image\/svg\+xml/);
    assert.match(svg, />\s*Z\s*</);
  });

  test("the fallback initial comes from display name, username, then name", () => {
    const initial = (user: any) =>
      decodeURIComponent(getUserAvatarFallbackUrl(user)).match(
        />\s*(\w)\s*</,
      )![1];

    assert.equal(initial({ displayName: "Ada", username: "grace" }), "A");
    assert.equal(initial({ username: "grace" }), "G");
    assert.equal(initial({ name: "Linus" }), "L");
    assert.equal(initial({}), "A");
  });

  test("applyAvatarFallback swaps a broken image once, then stops", () => {
    const target: any = { dataset: {}, src: "/broken.png" };

    applyAvatarFallback({ currentTarget: target }, "/fallback.png");
    target.src = "/broken-again.png";
    applyAvatarFallback({ currentTarget: target }, "/fallback.png");

    assert.equal(target.dataset.avatarFallbackApplied, "true");
    assert.equal(target.src, "/broken-again.png");
  });

  test("applyAvatarFallback tolerates odd events", () => {
    assert.doesNotThrow(() => applyAvatarFallback(null));
    assert.doesNotThrow(() => applyAvatarFallback({ currentTarget: null }));
  });
});

describe("last known account (session cache)", () => {
  beforeEach(() => {
    clearLastKnownAccount();
  });

  test("a saved account personalises the status card", () => {
    saveLastKnownAccount({
      avatar_url: "/me.png",
      display_name: "Ada Lovelace",
      username: "ada",
    });

    const details = resolveAuthStatusDetails({ type: "LOGOUT" });

    assert.equal(details.title, "Ada Lovelace");
    assert.equal(details.description, "@ada");
    assert.equal(details.icon, "/me.png");
  });

  test("a cache for another user is discarded", () => {
    saveLastKnownAccount({ displayName: "Ada", id: "u1", username: "ada" });

    const details = resolveAuthStatusDetails({
      type: "LOGIN",
      user: { id: "u2" },
    });

    assert.equal(details.title, "Account");
    assert.equal(sessionStorage.getItem("dock_last_known_account_v2"), null);
  });

  test("clearing forgets the account", () => {
    saveLastKnownAccount({ displayName: "Ada" });
    clearLastKnownAccount();

    assert.equal(resolveAuthStatusDetails({}).title, "Account");
  });

  test("nothing is stored for empty input", () => {
    saveLastKnownAccount(null);

    assert.equal(sessionStorage.getItem("dock_last_known_account_v2"), null);
  });
});

describe("resolveAuthStatusDetails", () => {
  test("the title falls back from display name to metadata, username, email, then a label", () => {
    assert.equal(
      resolveAuthStatusDetails({ account: { displayName: "Ada" } }).title,
      "Ada",
    );
    assert.equal(
      resolveAuthStatusDetails({
        user: { user_metadata: { full_name: "Ada L" } },
      }).title,
      "Ada L",
    );
    assert.equal(
      resolveAuthStatusDetails({ account: { username: "@ada" } }).title,
      "ada",
    );
    assert.equal(
      resolveAuthStatusDetails({ user: { email: "ada@example.com" } }).title,
      "ada@example.com",
    );
    assert.equal(
      resolveAuthStatusDetails({ fallbackTitle: "Guest" }).title,
      "Guest",
    );
  });

  test("the description is the handle, or the action when the title already is the handle", () => {
    assert.equal(
      resolveAuthStatusDetails({
        account: { displayName: "Ada Lovelace", username: "ada" },
      }).description,
      "@ada",
    );
    assert.equal(
      resolveAuthStatusDetails({ account: { username: "ada" }, type: "LOGOUT" })
        .description,
      "Signed out",
    );
  });

  test("the action wording depends on the status type", () => {
    const description = (type: string) =>
      resolveAuthStatusDetails({ type }).description;

    assert.equal(description("LOGIN"), "Signed in");
    assert.equal(description("LOGOUT"), "Signed out");
    assert.equal(description("ACCOUNT_DELETE"), "Account deleted");
    assert.equal(description("SIGNUP"), "Setting up account");
  });

  test("a custom description is used when there is no handle", () => {
    assert.equal(
      resolveAuthStatusDetails({ defaultDescription: "Hello again" })
        .description,
      "Hello again",
    );
  });

  test("the icon is the avatar when there is one, else a sign-in or sign-out glyph", () => {
    assert.equal(
      resolveAuthStatusDetails({ account: { avatarUrl: "/a.png" } }).icon,
      "/a.png",
    );
    assert.equal(
      resolveAuthStatusDetails({ type: "LOGIN" }).icon,
      "solar:login-2-bold",
    );
    assert.equal(
      resolveAuthStatusDetails({ type: "LOGOUT" }).icon,
      "solar:logout-2-bold",
    );
    assert.equal(
      resolveAuthStatusDetails({ type: "ACCOUNT_DELETE" }).icon,
      "solar:logout-2-bold",
    );
    assert.equal(
      resolveAuthStatusDetails({
        account: { avatarUrl: "not an image source" },
      }).icon,
      "solar:login-2-bold",
    );
  });
});

describe("account follow queries", () => {
  let fake: FakeSupabase;
  afterEach(() => fake?.restore());
  const clientFor = async (tables: any) => {
    fake = installFakeSupabase({ tables });
    return (globalThis as any).__bfSupabase.server();
  };

  test("the relation is empty for anonymous viewers and for yourself", async () => {
    const client = await clientFor({});

    assert.deepEqual(
      await getAccountFollowRelation({ client, targetId: "t", viewerId: null }),
      {
        isFollower: false,
        status: null,
      },
    );
    assert.deepEqual(
      await getAccountFollowRelation({ client, targetId: "t", viewerId: "t" }),
      {
        isFollower: false,
        status: null,
      },
    );
    assert.equal(fake.queries.length, 0);
  });

  test("only an accepted follow makes a follower", async () => {
    for (const [status, isFollower] of [
      ["accepted", true],
      ["pending", false],
      [undefined, false],
    ] as const) {
      const client = await clientFor({
        account_follows: { data: status ? { status } : null, error: null },
      });

      const relation = await getAccountFollowRelation({
        client,
        targetId: "t",
        viewerId: "v",
      });

      assert.deepEqual(relation, { isFollower, status: status ?? null });
      fake.restore();
    }
  });

  test("counts are scoped to accepted follows and default to zero", async () => {
    const client = await clientFor({
      account_follows: [
        { count: 12, data: null, error: null },
        { count: 3, data: null, error: null },
      ],
    });

    const counts = await getAccountFollowCounts({ accountId: "a1", client });

    assert.deepEqual(counts, { followersCount: 12, followingCount: 3 });
    fake.restore();
    const empty = await clientFor({
      account_follows: { count: null, data: null, error: null },
    });
    assert.deepEqual(
      await getAccountFollowCounts({ accountId: "a1", client: empty }),
      {
        followersCount: 0,
        followingCount: 0,
      },
    );
    assert.deepEqual(
      await getAccountFollowCounts({ accountId: "", client: empty }),
      {
        followersCount: 0,
        followingCount: 0,
      },
    );
  });
});
