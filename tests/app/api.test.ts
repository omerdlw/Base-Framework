import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  DELETE as deleteAccount,
  GET as getAccount,
  PATCH as patchAccount,
} from "../../src/app/api/account/me/route.ts";
import { POST as recordEvent } from "../../src/app/api/auth/events/route.ts";
import { GET as listSessions } from "../../src/app/api/auth/sessions/route.ts";
import { DELETE as revokeSession } from "../../src/app/api/auth/sessions/[sessionId]/route.ts";
import { POST as revokeOthers } from "../../src/app/api/auth/sessions/others/route.ts";
import {
  DELETE as deleteNotifications,
  GET as getNotifications,
  PATCH as patchNotifications,
} from "../../src/app/api/notifications/route.ts";
import {
  DELETE as deleteFollow,
  GET as getFollows,
  PATCH as patchFollows,
  POST as postFollow,
} from "../../src/app/api/social/follows/route.ts";
import {
  apiRequest,
  signedIn,
  installFakeSupabase,
  type FakeSupabase,
} from "../support/supabase.ts";
import { setReportSink, USER_MESSAGES } from "../../src/core/utils/index.ts";

let fake: FakeSupabase;
let reported: any[];
let release: () => void;
let counter = 0;
const uid = (label: string) => `${label}-${++counter}-${Date.now()}`;

function setup(options: Parameters<typeof installFakeSupabase>[0] = {}) {
  fake = installFakeSupabase(options);
  reported = [];
  release = setReportSink((scope, error) => reported.push([scope, error]));
}

afterEach(() => {
  fake?.restore();
  release?.();
});

const body = async (response: Response) => response.json();
const opsOf = (table: string) =>
  fake.queries
    .filter((q) => q.table === table)
    .flatMap((q) => q.ops.map(([name]) => name));
const firstQuery = (table: string) =>
  fake.queries.find((q) => q.table === table)!;
const arg = (query: any, op: string) =>
  query.ops.find(([name]: any) => name === op)?.[1];

describe("api: authentication", () => {
  test("every protected route answers 401 for an anonymous caller", async () => {
    setup({ claims: null });

    for (const response of [
      await getNotifications(apiRequest("/api/notifications")),
      await patchNotifications(
        apiRequest("/api/notifications", { body: {}, method: "PATCH" }),
      ),
      await getAccount(),
      await listSessions(),
      await revokeOthers(
        apiRequest("/api/auth/sessions/others", { method: "POST" }) as any,
      ),
      await recordEvent(
        apiRequest("/api/auth/events", {
          body: { event: "auth.signed_in" },
          method: "POST",
        }) as any,
      ),
    ]) {
      assert.equal(response.status, 401);
    }
  });

  test("a revoked session is treated as signed out", async () => {
    setup({
      claims: signedIn("u1"),
      tables: {
        auth_sessions: { data: { revoked_at: "2026-01-01" }, error: null },
      },
    });

    const response = await getNotifications(apiRequest("/api/notifications"));

    assert.equal(response.status, 401);
  });
});

describe("api: cross-site protection", () => {
  const hostile = { origin: "https://evil.example.com" };

  test("mutations from another origin are rejected with 403 before any work", async () => {
    setup({ claims: signedIn("u1") });

    const responses = await Promise.all([
      patchNotifications(
        apiRequest("/api/notifications", {
          ...hostile,
          body: { action: "mark-all-read" },
          method: "PATCH",
        }),
      ),
      deleteNotifications(
        apiRequest("/api/notifications?action=delete-all", {
          ...hostile,
          method: "DELETE",
        }),
      ),
      patchAccount(
        apiRequest("/api/account/me", {
          ...hostile,
          body: {},
          method: "PATCH",
        }),
      ),
      deleteAccount(
        apiRequest("/api/account/me", {
          ...hostile,
          body: { confirmation: "DELETE" },
          method: "DELETE",
        }),
      ),
      revokeOthers(
        apiRequest("/api/auth/sessions/others", {
          ...hostile,
          method: "POST",
        }) as any,
      ),
      patchFollows(
        apiRequest("/api/social/follows", {
          ...hostile,
          body: {},
          method: "PATCH",
        }),
      ),
    ]);

    for (const response of responses) assert.equal(response.status, 403);
    assert.equal(fake.queries.length, 0);
    assert.equal(fake.adminDeletes.length, 0);
    assert.equal(fake.rpcCalls.length, 0);
  });

  test("a request without Origin and without same-origin fetch metadata is rejected too", async () => {
    setup({ claims: signedIn("u1") });

    const response = await patchNotifications(
      apiRequest("/api/notifications", {
        body: { action: "mark-all-read" },
        method: "PATCH",
        origin: null,
      }),
    );

    assert.equal(response.status, 403);
  });

  test("same-origin fetch metadata is accepted when Origin is absent", async () => {
    setup({ claims: signedIn("u1") });

    const response = await patchNotifications(
      apiRequest("/api/notifications", {
        body: { action: "mark-all-read" },
        headers: { "sec-fetch-site": "same-origin" },
        method: "PATCH",
        origin: null,
      }),
    );

    assert.equal(response.status, 200);
  });
});

describe("api: notifications", () => {
  test("lists the caller's notifications, newest first", async () => {
    const id = uid("list");
    setup({
      claims: signedIn(id),
      tables: { notifications: { data: [{ id: "n1" }], error: null } },
    });

    const response = await getNotifications(apiRequest("/api/notifications"));

    assert.equal(response.status, 200);
    assert.deepEqual(await body(response), { data: [{ id: "n1" }] });
    const query = firstQuery("notifications");
    assert.deepEqual(arg(query, "eq"), ["user_id", id]);
    assert.deepEqual(arg(query, "order"), ["created_at", { ascending: false }]);
  });

  test("the page size is clamped between 1 and 100 and defaults to 50", async () => {
    setup({ claims: signedIn(uid("limit")) });
    const limits: number[] = [];
    for (const raw of ["500", "-5", "0", "abc", "7"]) {
      fake.queries.length = 0;
      await getNotifications(
        apiRequest(`/api/notifications?limitCount=${raw}`),
      );
      limits.push(arg(firstQuery("notifications"), "limit")[0]);
    }

    assert.deepEqual(limits, [100, 1, 50, 50, 7]);
  });

  test("unread-count returns a number, zero when there are none", async () => {
    setup({
      claims: signedIn(uid("count")),
      tables: { notifications: { count: 4, data: null, error: null } },
    });
    assert.deepEqual(
      await body(
        await getNotifications(
          apiRequest("/api/notifications?resource=unread-count"),
        ),
      ),
      { data: 4 },
    );

    fake.restore();
    setup({
      claims: signedIn(uid("count")),
      tables: { notifications: { count: null, data: null, error: null } },
    });
    assert.deepEqual(
      await body(
        await getNotifications(
          apiRequest("/api/notifications?resource=unread-count"),
        ),
      ),
      { data: 0 },
    );
  });

  test("database failures are reported and never leaked", async () => {
    setup({
      claims: signedIn(uid("fail")),
      tables: {
        notifications: {
          data: null,
          error: new Error('relation "public.notifications" does not exist'),
        },
      },
    });

    const response = await getNotifications(apiRequest("/api/notifications"));
    const payload = await body(response);

    assert.equal(response.status, 500);
    assert.equal(payload.error, USER_MESSAGES.server);
    assert.doesNotMatch(JSON.stringify(payload), /relation|public\./);
    assert.equal(reported.length, 1);
  });

  test("mark-read updates only the caller's notification", async () => {
    const id = uid("read");
    setup({ claims: signedIn(id) });

    const response = await patchNotifications(
      apiRequest("/api/notifications", {
        body: { action: "mark-read", notificationId: "n9" },
        method: "PATCH",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await body(response), { success: true });
    const query = firstQuery("notifications");
    assert.equal(arg(query, "update")[0].read, true);
    const filters = query.ops
      .filter(([name]) => name === "eq")
      .map(([, args]) => args);
    assert.deepEqual(filters, [
      ["user_id", id],
      ["id", "n9"],
    ]);
  });

  test("mark-all-read only touches unread rows of the caller", async () => {
    const id = uid("readall");
    setup({ claims: signedIn(id) });

    await patchNotifications(
      apiRequest("/api/notifications", {
        body: { action: "mark-all-read" },
        method: "PATCH",
      }),
    );

    const filters = firstQuery("notifications")
      .ops.filter(([n]) => n === "eq")
      .map(([, a]) => a);
    assert.deepEqual(filters, [
      ["user_id", id],
      ["read", false],
    ]);
  });

  test("unknown or incomplete actions are a 400 that says why", async () => {
    setup({ claims: signedIn(uid("bad")) });

    for (const payload of [
      {},
      { action: "explode" },
      { action: "mark-read" },
    ]) {
      const response = await patchNotifications(
        apiRequest("/api/notifications", { body: payload, method: "PATCH" }),
      );
      assert.equal(response.status, 400);
      assert.equal(
        (await body(response)).error,
        "Invalid notification patch action",
      );
    }
    assert.equal(opsOf("notifications").includes("update"), false);
  });

  test("a malformed JSON body is handled like an empty one", async () => {
    setup({ claims: signedIn(uid("json")) });
    const request = new Request("https://app.example.com/api/notifications", {
      body: "{not json",
      headers: { origin: "https://app.example.com" },
      method: "PATCH",
    });

    assert.equal((await patchNotifications(request)).status, 400);
  });

  test("delete removes one or all of the caller's notifications", async () => {
    const id = uid("del");
    setup({ claims: signedIn(id) });

    const one = await deleteNotifications(
      apiRequest("/api/notifications?action=delete&notificationId=n3", {
        method: "DELETE",
      }),
    );
    const all = await deleteNotifications(
      apiRequest("/api/notifications?action=delete-all", { method: "DELETE" }),
    );
    const bad = await deleteNotifications(
      apiRequest("/api/notifications?action=delete", { method: "DELETE" }),
    );

    assert.equal(one.status, 200);
    assert.equal(all.status, 200);
    assert.equal(bad.status, 400);
    assert.equal((await body(bad)).error, "Invalid notification delete action");
  });

  test("the 61st write in a minute is rate limited with retry headers", async () => {
    const id = uid("rate");
    setup({ claims: signedIn(id) });
    const send = () =>
      patchNotifications(
        apiRequest("/api/notifications", {
          body: { action: "mark-all-read" },
          method: "PATCH",
        }),
      );

    for (let i = 0; i < 60; i++) assert.equal((await send()).status, 200);
    const limited = await send();

    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("Retry-After")) >= 1);
    assert.equal(limited.headers.get("X-RateLimit-Remaining"), "0");
  });

  test("limits are per user, not global", async () => {
    setup({ claims: signedIn(uid("a")) });
    const busy = signedIn(uid("busy"));
    fake.restore();
    setup({ claims: busy });
    for (let i = 0; i < 61; i++) {
      await patchNotifications(
        apiRequest("/api/notifications", {
          body: { action: "mark-all-read" },
          method: "PATCH",
        }),
      );
    }
    fake.restore();
    setup({ claims: signedIn(uid("fresh")) });

    const response = await patchNotifications(
      apiRequest("/api/notifications", {
        body: { action: "mark-all-read" },
        method: "PATCH",
      }),
    );

    assert.equal(response.status, 200);
  });
});

describe("api: sessions", () => {
  test("lists active sessions and flags the current one", async () => {
    setup({
      claims: signedIn("u1", { session_id: "s-current" }),
      tables: {
        auth_sessions: {
          data: [
            { ip_address: "1.1.1.1", session_id: "s-current" },
            { ip_address: "2.2.2.2", session_id: "s-other" },
          ],
          error: null,
        },
      },
    });

    const payload = await body(await listSessions());

    assert.deepEqual(
      payload.sessions.map((s: any) => [s.session_id, s.is_current]),
      [
        ["s-current", true],
        ["s-other", false],
      ],
    );
  });

  test("a failure loading sessions gives a plain message", async () => {
    setup({
      claims: signedIn("u1"),
      tables: {
        auth_sessions: [
          { data: null, error: null },
          { data: null, error: new Error("pg: deadlock detected") },
        ],
      },
    });

    const response = await listSessions();

    assert.equal(response.status, 500);
    assert.equal((await body(response)).error, "Sessions could not be loaded");
  });

  test("revoking another session calls the database function with its id", async () => {
    setup({ claims: signedIn("u1", { session_id: "s-current" }) });

    const response = await revokeSession(
      apiRequest("/api/auth/sessions/s-other", { method: "DELETE" }) as any,
      { params: Promise.resolve({ sessionId: "s-other" }) },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(fake.rpcCalls, [
      ["revoke_auth_session", { p_session_id: "s-other" }],
    ]);
  });

  test("the current session cannot be revoked this way", async () => {
    setup({ claims: signedIn("u1", { session_id: "s-current" }) });

    const response = await revokeSession(
      apiRequest("/api/auth/sessions/s-current", { method: "DELETE" }) as any,
      { params: Promise.resolve({ sessionId: "s-current" }) },
    );

    assert.equal(response.status, 400);
    assert.match((await body(response)).error, /local sign-out/);
    assert.equal(fake.rpcCalls.length, 0);
  });

  test("a database error while revoking is neutral", async () => {
    setup({
      claims: signedIn("u1", { session_id: "s-current" }),
      rpc: {
        revoke_auth_session: {
          data: null,
          error: new Error("permission denied for function"),
        },
      },
    });

    const response = await revokeSession(
      apiRequest("/api/auth/sessions/s-x", { method: "DELETE" }) as any,
      { params: Promise.resolve({ sessionId: "s-x" }) },
    );

    assert.equal(response.status, 500);
    assert.doesNotMatch(
      JSON.stringify(await body(response)),
      /permission denied/,
    );
  });

  test("revoking all other sessions passes the current session id", async () => {
    setup({ claims: signedIn("u1", { session_id: "s-current" }) });

    const response = await revokeOthers(
      apiRequest("/api/auth/sessions/others", { method: "POST" }) as any,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(fake.rpcCalls, [
      ["revoke_other_auth_sessions", { p_current_session_id: "s-current" }],
    ]);
  });

  test("a token without a session id cannot revoke others", async () => {
    setup({ claims: { aal: "aal1", sub: "u1" } });

    const response = await revokeOthers(
      apiRequest("/api/auth/sessions/others", { method: "POST" }) as any,
    );

    assert.equal(response.status, 400);
    assert.equal((await body(response)).error, "Active session required");
  });
});

describe("api: auth events", () => {
  const send = (event: unknown) =>
    recordEvent(
      apiRequest("/api/auth/events", {
        body: { event },
        method: "POST",
      }) as any,
    );

  test("only known security events are accepted", async () => {
    setup({ claims: signedIn("u1") });

    for (const event of [
      "auth.signed_in",
      "auth.signed_out",
      "passkey.registered",
      "passkey.deleted",
    ]) {
      assert.equal((await send(event)).status, 200, event);
    }
    const rejected = await send("admin.escalate");

    assert.equal(rejected.status, 400);
    assert.equal((await body(rejected)).error, "Unsupported security event");
  });
});

describe("api: account", () => {
  test("returns the caller's account with their email", async () => {
    setup({
      claims: signedIn("u1"),
      tables: {
        account_emails: { data: { email: "ada@example.com" }, error: null },
        accounts: {
          data: { display_name: "Ada", id: "u1", username: "ada" },
          error: null,
        },
      },
    });

    const payload = await body(await getAccount());

    assert.equal(payload.account.username, "ada");
    assert.equal(payload.account.email, "ada@example.com");
  });

  test("a taken username comes back as a friendly conflict", async () => {
    setup({
      claims: signedIn("u1"),
      rpc: {
        update_account: {
          data: null,
          error: Object.assign(new Error("duplicate key"), { code: "23505" }),
        },
      },
      tables: {
        accounts: {
          data: { display_name: "Ada", id: "u1", username: "ada" },
          error: null,
        },
      },
    });

    const response = await patchAccount(
      apiRequest("/api/account/me", {
        body: { username: "grace" },
        method: "PATCH",
      }),
    );

    assert.equal(response.status, 409);
    assert.equal(
      (await body(response)).error,
      "That username is already taken",
    );
  });

  test("invalid input is explained, not stack-traced", async () => {
    setup({
      claims: signedIn("u1"),
      tables: {
        accounts: {
          data: { display_name: "Ada", id: "u1", username: "ada" },
          error: null,
        },
      },
    });

    const response = await patchAccount(
      apiRequest("/api/account/me", {
        body: { username: "!" },
        method: "PATCH",
      }),
    );

    assert.equal(response.status, 400);
    assert.match((await body(response)).error, /3-30 characters/);
  });

  test("deleting requires the typed confirmation", async () => {
    setup({
      claims: signedIn("u1", {
        amr: [{ timestamp: Math.floor(Date.now() / 1000) }],
      }),
    });

    for (const confirmation of [undefined, "delete", "yes"]) {
      const response = await deleteAccount(
        apiRequest("/api/account/me", {
          body: { confirmation },
          method: "DELETE",
        }),
      );
      assert.equal(response.status, 400);
      assert.match((await body(response)).error, /Type "DELETE"/);
    }
    assert.equal(fake.adminDeletes.length, 0);
  });

  test("deleting needs a recent sign-in", async () => {
    setup({
      claims: signedIn("u1", {
        amr: [{ timestamp: Math.floor(Date.now() / 1000) - 3600 }],
      }),
    });

    const response = await deleteAccount(
      apiRequest("/api/account/me", {
        body: { confirmation: "DELETE" },
        method: "DELETE",
      }),
    );

    assert.equal(response.status, 403);
    assert.match((await body(response)).error, /sign in again/i);
    assert.equal(fake.adminDeletes.length, 0);
  });

  test("a confirmed, recently authenticated deletion removes the user", async () => {
    setup({
      claims: signedIn("u1", {
        amr: [{ timestamp: Math.floor(Date.now() / 1000) - 5 }],
      }),
    });

    const response = await deleteAccount(
      apiRequest("/api/account/me", {
        body: { confirmation: "DELETE" },
        method: "DELETE",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await body(response), { deleted: true });
    assert.deepEqual(fake.adminDeletes, ["u1"]);
  });

  test("an admin API failure does not leak its message", async () => {
    setup({
      adminDeleteError: new Error(
        "GoTrue: user is referenced by 4 foreign keys",
      ),
      claims: signedIn("u1", {
        amr: [{ timestamp: Math.floor(Date.now() / 1000) }],
      }),
    });

    const response = await deleteAccount(
      apiRequest("/api/account/me", {
        body: { confirmation: "DELETE" },
        method: "DELETE",
      }),
    );

    assert.doesNotMatch(
      JSON.stringify(await body(response)),
      /GoTrue|foreign keys/,
    );
    assert.equal(reported.length, 1);
  });
});

describe("api: follows", () => {
  const patch = (payload: unknown) =>
    patchFollows(
      apiRequest("/api/social/follows", { body: payload, method: "PATCH" }),
    );

  test("anonymous callers get 401", async () => {
    setup({ claims: null });

    assert.equal(
      (await patch({ action: "accept", requesterId: "x" })).status,
      401,
    );
  });

  test("a requester id is required", async () => {
    setup({ claims: signedIn(uid("follow")) });

    const response = await patch({ action: "accept" });

    assert.equal(response.status, 400);
    assert.equal((await body(response)).error, "Requester ID is required");
  });

  test("an unknown action is rejected", async () => {
    setup({ claims: signedIn(uid("follow")) });

    const response = await patch({ action: "explode", requesterId: "r1" });

    assert.equal(response.status, 400);
    assert.equal((await body(response)).error, "Invalid follow patch action");
  });

  test("accepting only affects requests addressed to the caller", async () => {
    const id = uid("owner");
    setup({ claims: signedIn(id) });

    const response = await patch({ action: "accept", requesterId: "r1" });

    assert.deepEqual(await body(response), {
      status: "accepted",
      success: true,
    });
    const query = firstQuery("account_follows");
    assert.equal(arg(query, "update")[0].status, "accepted");
    const filters = query.ops.filter(([n]) => n === "eq").map(([, a]) => a);
    assert.deepEqual(filters, [
      ["following_id", id],
      ["follower_id", "r1"],
    ]);
  });

  test("rejecting deletes only requests addressed to the caller", async () => {
    const id = uid("owner");
    setup({ claims: signedIn(id) });

    const response = await patch({ action: "reject", requesterId: "r1" });

    assert.deepEqual(await body(response), { status: null, success: true });
    const query = firstQuery("account_follows");
    assert.equal(query.ops[0][0], "delete");
    const filters = query.ops.filter(([n]) => n === "eq").map(([, a]) => a);
    assert.deepEqual(filters, [
      ["following_id", id],
      ["follower_id", "r1"],
    ]);
  });

  test("a database failure stays neutral", async () => {
    setup({
      claims: signedIn(uid("owner")),
      tables: {
        account_follows: {
          data: null,
          error: new Error("fk violation account_follows_pkey"),
        },
      },
    });

    const response = await patch({ action: "accept", requesterId: "r1" });

    assert.equal(response.status, 500);
    assert.doesNotMatch(
      JSON.stringify(await body(response)),
      /fk violation|pkey/,
    );
  });
});

describe("api: follows (read)", () => {
  const get = (query: string) =>
    getFollows(apiRequest(`/api/social/follows?${query}`));
  const rows = [
    { created_at: "2026-02-01", follower_id: "f1", following_id: "g1" },
    { created_at: "2026-01-01", follower_id: "f2", following_id: "g2" },
  ];
  const profiles = [
    { avatar_url: "/a.png", display_name: "Ada", id: "f1", username: "ada" },
  ];

  test("an anonymous caller sees an empty inbox and no pending count", async () => {
    setup({ claims: null });

    assert.deepEqual(await body(await get("resource=inbox-count")), {
      count: 0,
    });
    assert.deepEqual(await body(await get("resource=inbox")), { data: [] });
    assert.deepEqual(await body(await get("followingId=x")), { status: null });
  });

  test("the inbox count only counts pending requests addressed to the caller", async () => {
    const id = uid("inbox");
    setup({
      claims: signedIn(id),
      tables: { account_follows: { count: 3, data: null, error: null } },
    });

    const payload = await body(await get("resource=inbox-count"));

    assert.deepEqual(payload, { count: 3 });
    const filters = firstQuery("account_follows")
      .ops.filter(([n]) => n === "eq")
      .map(([, a]) => a);
    assert.deepEqual(filters, [
      ["following_id", id],
      ["status", "pending"],
    ]);
  });

  test("requests are joined with profiles, with sensible fallbacks", async () => {
    setup({
      claims: signedIn(uid("inbox")),
      tables: {
        account_follows: { data: rows, error: null },
        accounts: { data: profiles, error: null },
      },
    });

    const { data } = await body(await get("resource=requests"));

    assert.deepEqual(data[0], {
      avatarUrl: "/a.png",
      bannerUrl: null,
      createdAt: "2026-02-01",
      displayName: "Ada",
      id: "f1",
      username: "ada",
    });
    assert.equal(data[1].displayName, "Anonymous User");
    assert.equal(data[1].username, null);
  });

  test("followers of a public account are listed", async () => {
    setup({
      claims: signedIn(uid("viewer")),
      tables: {
        account_follows: { data: rows, error: null },
        accounts: [
          { data: { is_private: false }, error: null },
          { data: profiles, error: null },
        ],
      },
    });

    const response = await get("resource=followers&userId=target");

    assert.equal(response.status, 200);
    assert.equal((await body(response)).data.length, 2);
  });

  test("a private account's followers are hidden from strangers and anonymous callers", async () => {
    for (const claims of [signedIn(uid("stranger")), null]) {
      setup({
        claims,
        tables: {
          account_follows: [
            { data: null, error: null },
            { data: rows, error: null },
          ],
          accounts: { data: { is_private: true }, error: null },
        },
      });

      const response = await get("resource=followers&userId=target");
      const payload = await body(response);

      assert.equal(response.status, 403);
      assert.equal(payload.error, "This account is private");
      assert.equal(payload.data, undefined);
      fake.restore();
    }
  });

  test("an accepted follower may see a private account's lists", async () => {
    setup({
      claims: signedIn(uid("friend")),
      tables: {
        account_follows: [
          { data: { status: "accepted" }, error: null },
          { data: rows, error: null },
        ],
        accounts: [
          { data: { is_private: true }, error: null },
          { data: profiles, error: null },
        ],
      },
    });

    const response = await get("resource=following&userId=target");

    assert.equal(response.status, 200);
  });

  test("you can always see your own lists", async () => {
    const id = uid("self");
    setup({
      claims: signedIn(id),
      tables: { account_follows: { data: [], error: null } },
    });

    const response = await get(`resource=followers&userId=${id}`);

    assert.equal(response.status, 200);
    assert.deepEqual(await body(response), { data: [] });
  });

  test("the follow status of a target is returned for signed-in callers", async () => {
    setup({
      claims: signedIn(uid("viewer")),
      tables: { account_follows: { data: { status: "pending" }, error: null } },
    });

    assert.deepEqual(await body(await get("followingId=t1")), {
      status: "pending",
    });
  });

  test("failures never leak internals", async () => {
    setup({
      claims: signedIn(uid("viewer")),
      tables: {
        account_follows: {
          data: null,
          error: new Error("column follower_id does not exist"),
        },
      },
    });

    const response = await get("resource=inbox");

    assert.equal(response.status, 500);
    assert.doesNotMatch(JSON.stringify(await body(response)), /column/);
  });
});

describe("api: follows (write)", () => {
  const post = (payload: unknown) =>
    postFollow(
      apiRequest("/api/social/follows", { body: payload, method: "POST" }),
    );
  const del = (payload: unknown) =>
    deleteFollow(
      apiRequest("/api/social/follows", { body: payload, method: "DELETE" }),
    );

  test("following a public account is accepted, a private one is pending", async () => {
    setup({
      claims: signedIn(uid("me")),
      rpc: {
        get_account_follow_target: {
          data: [{ is_private: false }],
          error: null,
        },
      },
    });
    assert.deepEqual(await body(await post({ followingId: "t1" })), {
      status: "accepted",
    });
    fake.restore();

    setup({
      claims: signedIn(uid("me")),
      rpc: {
        get_account_follow_target: {
          data: [{ is_private: true }],
          error: null,
        },
      },
    });
    assert.deepEqual(await body(await post({ targetUserId: "t2" })), {
      status: "pending",
    });
  });

  test("invalid targets are rejected before touching the database", async () => {
    const id = uid("me");
    setup({ claims: signedIn(id) });

    for (const payload of [{}, { followingId: id }]) {
      const response = await post(payload);
      assert.equal(response.status, 400);
      assert.equal((await body(response)).error, "Invalid follow target");
    }
    assert.equal(fake.rpcCalls.length, 0);
  });

  test("an unknown account is a 404", async () => {
    setup({
      claims: signedIn(uid("me")),
      rpc: { get_account_follow_target: { data: [], error: null } },
    });

    const response = await post({ followingId: "ghost" });

    assert.equal(response.status, 404);
    assert.equal((await body(response)).error, "Account not found");
  });

  test("unfollowing deletes only the caller's own follow", async () => {
    const id = uid("me");
    setup({ claims: signedIn(id) });

    const response = await del({ followingId: "t1" });

    assert.deepEqual(await body(response), { status: null, success: true });
    const filters = firstQuery("account_follows")
      .ops.filter(([n]) => n === "eq")
      .map(([, a]) => a);
    assert.deepEqual(filters, [
      ["follower_id", id],
      ["following_id", "t1"],
    ]);
  });

  test("removing a follower deletes follows addressed to the caller, never someone else's", async () => {
    const id = uid("me");
    setup({ claims: signedIn(id) });

    const response = await del({ action: "remove-follower", followerId: "f1" });

    assert.equal(response.status, 200);
    const filters = firstQuery("account_follows")
      .ops.filter(([n]) => n === "eq")
      .map(([, a]) => a);
    assert.deepEqual(filters, [
      ["following_id", id],
      ["follower_id", "f1"],
    ]);
  });

  test("removing yourself as a follower is refused", async () => {
    const id = uid("me");
    setup({ claims: signedIn(id) });

    const response = await del({ action: "remove-follower", followerId: id });

    assert.equal(response.status, 400);
  });

  test("mutations are rate limited per user", async () => {
    const id = uid("busy");
    setup({ claims: signedIn(id) });

    for (let i = 0; i < 45; i++)
      assert.equal((await del({ followingId: "t1" })).status, 200);
    const limited = await del({ followingId: "t1" });

    assert.equal(limited.status, 429);
  });
});
