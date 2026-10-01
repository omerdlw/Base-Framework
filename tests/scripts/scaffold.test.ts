import fs from "node:fs";
import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  cloneFixture,
  createFrameworkFixture,
  exists,
  git,
  node,
  read,
  readJson,
  removeDir,
} from "../support/fixture.ts";

const dirs: any[] = [];
afterEach(() => dirs.splice(0).forEach(removeDir));

function fresh() {
  const upstream = createFrameworkFixture();
  const project = cloneFixture(upstream);
  dirs.push(upstream as any, project);
  return project;
}

describe("project:scaffold", () => {
  test("rebrands the identity files from one command", () => {
    const dir = fresh();

    const run = node(dir, "scripts/scaffold.js", "Tvizzie", "tvizzie.com");

    assert.equal(run.code, 0, run.stderr);
    assert.deepEqual(readJson(dir, "project.config.json"), {
      description: "Tvizzie",
      domain: "tvizzie.com",
      name: "Tvizzie",
      slug: "tvizzie",
    });
    assert.equal(readJson(dir, "package.json").name, "tvizzie");
    assert.equal(readJson(dir, "package.json").version, "0.1.0");
    assert.match(read(dir, "supabase/config.toml"), /project_id = "tvizzie"/);
    assert.doesNotMatch(
      read(dir, "wrangler.jsonc"),
      /passwordless-saas-template/,
    );
    assert.equal(
      (read(dir, "wrangler.jsonc").match(/"tvizzie"/g) ?? []).length,
      2,
    );
    assert.match(
      read(dir, "supabase/migrations/001_init.sql"),
      /Tvizzie Initial Schema/,
    );
  });

  test("replaces the demo seed and writes a project README", () => {
    const dir = fresh();

    node(dir, "scripts/scaffold.js", "Tvizzie");

    assert.doesNotMatch(read(dir, "supabase/seed.sql"), /baseframework\.dev/);
    assert.match(read(dir, "README.md"), /^# Tvizzie/);
  });

  test("derives the slug and domain unless told otherwise", () => {
    const dir = fresh();

    node(dir, "scripts/scaffold.js", "My Cool App!");

    const config = readJson(dir, "project.config.json");
    assert.equal(config.slug, "my-cool-app");
    assert.equal(config.domain, "my-cool-app.com");
  });

  test("flags override the derived values", () => {
    const dir = fresh();

    node(
      dir,
      "scripts/scaffold.js",
      "Tvizzie",
      "--slug=tv",
      "--domain=tvizzie.app",
      "--description=Movies, shared",
    );

    assert.deepEqual(readJson(dir, "project.config.json"), {
      description: "Movies, shared",
      domain: "tvizzie.app",
      name: "Tvizzie",
      slug: "tv",
    });
  });

  test("removes framework-only files and the scaffold itself", () => {
    const dir = fresh();

    node(dir, "scripts/scaffold.js", "Tvizzie");

    for (const gone of [
      "src/docs",
      "tests",
      "AGENTS.md",
      "CLAUDE.md",
      "scripts/scaffold.js",
    ]) {
      assert.equal(exists(dir, gone), false, gone);
    }
    for (const kept of [
      "src/core/engine.txt",
      "src/modules/dock.txt",
      "scripts/sync.js",
      "scripts/validate-project.js",
    ]) {
      assert.equal(exists(dir, kept), true, kept);
    }
  });

  test("cleans package.json scripts that no longer apply", () => {
    const dir = fresh();

    node(dir, "scripts/scaffold.js", "Tvizzie");

    const { scripts } = readJson(dir, "package.json");
    assert.equal(scripts["project:scaffold"], undefined);
    assert.equal(scripts["project:rebrand"], undefined);
    assert.equal(scripts.test, "node scripts/check-architecture.mjs");
    assert.equal(scripts["test:coverage"], undefined);
    assert.equal(scripts["type-check"], "tsc --noEmit");
    assert.equal(scripts.typecheck, "tsc --noEmit");
  });

  test("--keep preserves groups and records only what was pruned", () => {
    const dir = fresh();

    node(dir, "scripts/scaffold.js", "Tvizzie", "--keep=docs,tests");

    assert.equal(exists(dir, "src/docs/README.md"), true);
    assert.equal(exists(dir, "tests/unit.test.js"), true);
    assert.equal(exists(dir, "AGENTS.md"), false);
    assert.deepEqual(readJson(dir, ".framework-manifest.json").pruned, [
      "ai",
      "scaffold",
    ]);
    assert.equal(readJson(dir, "package.json").scripts.test, "node -e 0");
    assert.match(
      readJson(dir, "package.json").scripts["type-check"],
      /tests\/tsconfig\.json/,
    );
  });

  test("records the upstream baseline for sync and validation", () => {
    const dir = fresh();

    node(dir, "scripts/scaffold.js", "Tvizzie");

    const manifest = readJson(dir, ".framework-manifest.json");
    assert.equal(manifest.upstreamTag, "v1.0.0");
    assert.equal(manifest.frameworkVersion, "1.0.0");
    assert.equal(manifest.upstreamCommit, git(dir, "rev-parse", "HEAD"));
    assert.equal(manifest.coreTreeHash, git(dir, "rev-parse", "HEAD:src/core"));
    assert.deepEqual(manifest.pruned, ["ai", "docs", "tests", "scaffold"]);
  });

  test("--dry-run prints the plan and changes nothing", () => {
    const dir = fresh();

    const run = node(dir, "scripts/scaffold.js", "Tvizzie", "--dry-run");

    assert.equal(run.code, 0, run.stderr);
    assert.match(run.stdout, /would: remove src\/docs/);
    assert.equal(git(dir, "status", "--porcelain"), "");
    assert.equal(exists(dir, ".framework-manifest.json"), false);
  });

  test("a scaffolded project passes validation", () => {
    const dir = fresh();
    node(dir, "scripts/scaffold.js", "Tvizzie");

    const run = node(dir, "scripts/validate-project.js");

    assert.equal(run.code, 0, run.stdout + run.stderr);
  });

  test("scaffolding twice is refused", () => {
    const dir = fresh();
    node(dir, "scripts/scaffold.js", "Tvizzie", "--keep=scaffold");

    const again = node(dir, "scripts/scaffold.js", "Other");

    assert.equal(again.code, 1);
    assert.match(again.stderr, /already a scaffolded project/);
  });

  test("a name is required and --keep groups are validated", () => {
    const dir = fresh();

    const missing = node(dir, "scripts/scaffold.js");
    const unknown = node(dir, "scripts/scaffold.js", "X", "--keep=nope");

    assert.equal(missing.code, 1);
    assert.match(missing.stderr, /Usage/);
    assert.equal(unknown.code, 1);
    assert.match(unknown.stderr, /Unknown --keep group 'nope'/);
  });
});

describe("project:rebrand and project:prune", () => {
  test("rebrand alone renames without touching files or the baseline", () => {
    const dir = fresh();
    node(dir, "scripts/scaffold.js", "Tvizzie", "--keep=scaffold,docs");
    const manifest = read(dir, ".framework-manifest.json");

    const run = node(
      dir,
      "scripts/scaffold.js",
      "--only=rebrand",
      "Tvizzie 2",
      "--domain=tvizzie.app",
    );

    assert.equal(run.code, 0, run.stderr);
    assert.equal(readJson(dir, "project.config.json").slug, "tvizzie-2");
    assert.equal(readJson(dir, "package.json").name, "tvizzie-2");
    assert.match(read(dir, "supabase/config.toml"), /project_id = "tvizzie-2"/);
    assert.equal(read(dir, ".framework-manifest.json"), manifest);
    assert.equal(exists(dir, "src/docs/README.md"), true);
  });

  test("prune alone removes the chosen groups without a project name", () => {
    const dir = fresh();

    const run = node(
      dir,
      "scripts/scaffold.js",
      "--only=prune",
      "--keep=ai,scaffold",
    );

    assert.equal(run.code, 0, run.stderr);
    assert.equal(exists(dir, "src/docs"), false);
    assert.equal(exists(dir, "tests"), false);
    assert.equal(exists(dir, "AGENTS.md"), true);
    assert.equal(readJson(dir, "project.config.json").name, "Base Framework");
  });
});

describe("validate-project", () => {
  test("rejects edits to the frozen core", () => {
    const dir = fresh();
    node(dir, "scripts/scaffold.js", "Tvizzie");
    fs.appendFileSync(`${dir}/src/core/engine.txt`, "tampered\n");
    const run = node(dir, "scripts/validate-project.js");

    assert.equal(run.code, 1);
    assert.match(
      run.stderr,
      /src\/core differs from the immutable upstream baseline/,
    );
  });

  test("project-owned modules may change", () => {
    const dir = fresh();
    node(dir, "scripts/scaffold.js", "Tvizzie");

    fs.appendFileSync(`${dir}/src/modules/dock.txt`, "customised\n");
    const run = node(dir, "scripts/validate-project.js");

    assert.equal(run.code, 0, run.stdout + run.stderr);
  });

  test("identity drift is reported", () => {
    const dir = fresh();
    node(dir, "scripts/scaffold.js", "Tvizzie");

    fs.writeFileSync(
      `${dir}/supabase/config.toml`,
      'project_id = "template"\n',
    );
    const run = node(dir, "scripts/validate-project.js");

    assert.equal(run.code, 1);
    assert.match(run.stderr, /project_id/);
  });
});
