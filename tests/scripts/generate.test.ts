import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  exists,
  makeTempDir,
  node,
  read,
  removeDir,
  write,
} from "../support/fixture.ts";

const dirs: any[] = [];
afterEach(() => dirs.splice(0).forEach(removeDir));

function workspace() {
  const dir = makeTempDir("generate");
  dirs.push(dir as any);
  write(
    dir,
    "scripts/generate.js",
    fs.readFileSync(path.resolve("scripts/generate.js"), "utf8"),
  );
  return dir;
}

const generate = (dir, ...args) => node(dir, "scripts/generate.js", ...args);

describe("generate feature", () => {
  test("creates the feature with a barrel export", () => {
    const dir = workspace();

    const run = generate(dir, "feature", "billing");

    assert.equal(run.code, 0, run.stderr);
    assert.equal(exists(dir, "src/features/billing/index.ts"), true);
    assert.equal(
      exists(dir, "src/features/billing/components/BillingView.tsx"),
      true,
    );
    assert.match(read(dir, "src/features/billing/index.ts"), /BillingView/);
  });

  test("names are normalised to kebab-case folders and PascalCase symbols", () => {
    const dir = workspace();

    generate(dir, "feature", "userSettings");

    assert.equal(exists(dir, "src/features/user-settings/index.ts"), true);
    assert.equal(
      exists(dir, "src/features/user-settings/components/UserSettingsView.tsx"),
      true,
    );
  });

  test("existing files are never overwritten", () => {
    const dir = workspace();
    generate(dir, "feature", "billing");
    write(dir, "src/features/billing/index.ts", "// mine\n");

    const run = generate(dir, "feature", "billing");

    assert.equal(run.code, 0);
    assert.match(run.stderr, /already exists/);
    assert.equal(read(dir, "src/features/billing/index.ts"), "// mine\n");
  });

  test("--dry-run writes nothing", () => {
    const dir = workspace();

    const run = generate(dir, "feature", "billing", "--dry-run");

    assert.match(run.stdout, /Would create/);
    assert.equal(exists(dir, "src"), false);
  });
});

describe("generate page", () => {
  test("creates a route with a usePage client shell", () => {
    const dir = workspace();

    const run = generate(dir, "page", "dashboard");

    assert.equal(run.code, 0, run.stderr);
    const client = read(
      dir,
      "src/app/dashboard/_components/DashboardPageClient.tsx",
    );
    assert.match(client, /^"use client";/);
    assert.match(client, /usePage\(\{ title: "Dashboard" \}\)/);
    assert.match(
      read(dir, "src/app/dashboard/page.tsx"),
      /DashboardPageClient/,
    );
  });

  test("nested routes keep their path and join names", () => {
    const dir = workspace();

    generate(dir, "page", "/settings/billing-history/");

    assert.equal(
      exists(dir, "src/app/settings/billing-history/page.tsx"),
      true,
    );
    assert.match(
      read(dir, "src/app/settings/billing-history/page.tsx"),
      /SettingsBillingHistoryPage/,
    );
  });

  test("generated markup only uses classes the design provides", () => {
    const dir = workspace();

    generate(dir, "page", "dashboard");

    const client = read(
      dir,
      "src/app/dashboard/_components/DashboardPageClient.tsx",
    );
    assert.doesNotMatch(client, /text-main|text-muted/);
  });
});

describe("generate CLI", () => {
  test("prints usage without arguments", () => {
    const run = generate(workspace());

    assert.equal(run.code, 0);
    assert.match(run.stdout, /Usage:/);
  });

  test("unknown targets and missing names fail", () => {
    const dir = workspace();

    assert.equal(generate(dir, "widget", "x").code, 1);
    assert.equal(generate(dir, "feature").code, 1);
  });
});
