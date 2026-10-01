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
  write,
} from "../support/fixture.ts";

const dirs: any[] = [];
afterEach(() => dirs.splice(0).forEach(removeDir));

function scaffolded() {
  const upstream = createFrameworkFixture();
  const project = cloneFixture(upstream);
  dirs.push(upstream as any, project);
  assert.equal(node(project, "scripts/scaffold.js", "Tvizzie").code, 0);
  const pkg = readJson(project, "package.json");
  pkg.scripts = { ...pkg.scripts, test: "node -e 0", typecheck: "node -e 0" };
  write(project, "package.json", JSON.stringify(pkg, null, 2));
  git(project, "add", "-A");
  git(project, "commit", "-q", "-m", "scaffold");
  git(project, "remote", "add", "upstream", upstream);
  return { project, upstream };
}

function release(upstream, tag, edits) {
  edits();
  git(upstream, "add", "-A");
  git(upstream, "commit", "-q", "-m", `release ${tag}`);
  git(upstream, "tag", tag);
}

describe("framework:sync", () => {
  test("merges a new upstream release onto a sync branch", () => {
    const { project, upstream } = scaffolded();
    release(upstream, "v1.1.0", () =>
      write(upstream, "src/core/engine.txt", "engine v2\n"),
    );

    const run = node(project, "scripts/sync.js", "--tag=v1.1.0");

    assert.equal(run.code, 0, run.stdout + run.stderr);
    assert.equal(
      git(project, "rev-parse", "--abbrev-ref", "HEAD"),
      "sync/upstream-v1.1.0",
    );
    assert.equal(read(project, "src/core/engine.txt"), "engine v2\n");
    const manifest = readJson(project, ".framework-manifest.json");
    assert.equal(manifest.upstreamTag, "v1.1.0");
    assert.equal(
      manifest.coreTreeHash,
      git(project, "rev-parse", "HEAD:src/core"),
    );
  });

  test("files the project pruned stay gone after the merge", () => {
    const { project, upstream } = scaffolded();
    release(upstream, "v1.1.0", () => {
      write(upstream, "src/docs/README.md", "docs v2\n");
      write(upstream, "src/docs/new-guide.md", "new\n");
      write(upstream, "tests/unit.test.js", "// v2\n");
      write(upstream, "AGENTS.md", "agent guide v2\n");
      write(upstream, "scripts/scaffold.js", "// scaffold v2\n");
    });

    const run = node(project, "scripts/sync.js", "--tag=v1.1.0");

    assert.equal(run.code, 0, run.stdout + run.stderr);
    for (const gone of [
      "src/docs",
      "tests",
      "AGENTS.md",
      "scripts/scaffold.js",
    ]) {
      assert.equal(exists(project, gone), false, gone);
    }
  });

  test("project edits to modules survive and merge with upstream changes", () => {
    const { project, upstream } = scaffolded();
    write(project, "src/modules/dock.txt", "dock v1\nproject customisation\n");
    git(project, "add", "-A");
    git(project, "commit", "-q", "-m", "customise dock");
    release(upstream, "v1.1.0", () =>
      write(upstream, "src/modules/dock.txt", "upstream header\ndock v1\n"),
    );

    const run = node(project, "scripts/sync.js", "--tag=v1.1.0");

    assert.equal(run.code, 0, run.stdout + run.stderr);
    const merged = read(project, "src/modules/dock.txt");
    assert.match(merged, /upstream header/);
    assert.match(merged, /project customisation/);
  });

  test("a conflicting module edit stops for manual resolution", () => {
    const { project, upstream } = scaffolded();
    write(project, "src/modules/dock.txt", "project version\n");
    git(project, "add", "-A");
    git(project, "commit", "-q", "-m", "customise dock");
    release(upstream, "v1.1.0", () =>
      write(upstream, "src/modules/dock.txt", "upstream version\n"),
    );

    const run = node(project, "scripts/sync.js", "--tag=v1.1.0");

    assert.equal(run.code, 1);
    assert.match(
      run.stderr,
      /MERGE CONFLICTS DETECTED[\s\S]*src\/modules\/dock\.txt/,
    );
  });

  test("--check reports an update without changing anything", () => {
    const { project, upstream } = scaffolded();
    release(upstream, "v1.1.0", () =>
      write(upstream, "src/core/engine.txt", "engine v2\n"),
    );

    const run = node(project, "scripts/sync.js", "--check", "--tag=v1.1.0");

    assert.equal(run.code, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /Update available: v1\.0\.0 -> v1\.1\.0/);
    assert.equal(git(project, "rev-parse", "--abbrev-ref", "HEAD"), "main");
    assert.equal(read(project, "src/core/engine.txt"), "engine v1\n");
  });

  test("an up-to-date project has nothing to do", () => {
    const { project } = scaffolded();

    const run = node(project, "scripts/sync.js", "--tag=v1.0.0");

    assert.equal(run.code, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /Already up-to-date/);
  });

  test("a dirty working tree is refused", () => {
    const { project, upstream } = scaffolded();
    release(upstream, "v1.1.0", () =>
      write(upstream, "src/core/engine.txt", "engine v2\n"),
    );
    fs.appendFileSync(`${project}/README.md`, "uncommitted\n");

    const run = node(project, "scripts/sync.js", "--tag=v1.1.0");

    assert.equal(run.code, 1);
    assert.match(run.stderr, /Working directory is dirty/);
  });

  test("the framework repository itself has nothing to sync", () => {
    const upstream = createFrameworkFixture();
    dirs.push(upstream as any);

    const run = node(upstream, "scripts/sync.js");

    assert.equal(run.code, 0);
    assert.match(run.stdout, /upstream repository/);
  });
});
