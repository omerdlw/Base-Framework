import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { makeTempDir, node, removeDir, write } from "../support/fixture.ts";

const SCRIPT = path.resolve("scripts/check-architecture.mjs");
const dirs: any[] = [];
afterEach(() => dirs.splice(0).forEach(removeDir));

function project(files) {
  const dir = makeTempDir("arch");
  dirs.push(dir as any);
  fs.mkdirSync(path.join(dir, "src/core"), { recursive: true });
  fs.mkdirSync(path.join(dir, "src/modules"), { recursive: true });
  for (const [file, content] of Object.entries(files))
    write(dir, file, content);
  return dir;
}

const check = (dir) => node(dir, SCRIPT);

describe("check-architecture", () => {
  test("passes a clean tree", () => {
    const dir = project({
      "src/core/a.ts": 'import { b } from "./b";\nexport const a = b;\n',
      "src/core/b.ts": "export const b = 1;\n",
    });

    const run = check(dir);

    assert.equal(run.code, 0, run.stderr);
    assert.match(run.stdout, /2 files, no cycles/);
  });

  test("reports an import cycle with every file in it", () => {
    const dir = project({
      "src/core/a.ts": 'import { b } from "./b";\nexport const a = () => b;\n',
      "src/core/b.ts": 'import { a } from "./a";\nexport const b = () => a;\n',
    });

    const run = check(dir);

    assert.equal(run.code, 1);
    assert.match(run.stderr, /Import cycle/);
    assert.match(run.stderr, /src\/core\/a\.ts/);
    assert.match(run.stderr, /src\/core\/b\.ts/);
  });

  test("detects cycles through alias imports and index files", () => {
    const dir = project({
      "src/core/kernel/index.ts": 'export { x } from "@/core/kernel/x";\n',
      "src/core/kernel/x.ts":
        'import { y } from "@/core/kernel";\nexport const x = y;\n',
    });

    const run = check(dir);

    assert.equal(run.code, 1);
    assert.match(run.stderr, /Import cycle/);
  });

  test("type-only imports do not count as cycles", () => {
    const dir = project({
      "src/core/a.ts": 'import type { B } from "./b";\nexport type A = B;\n',
      "src/core/b.ts":
        'import { a } from "./a";\nexport type B = typeof a;\nexport const x = 1;\n',
    });

    assert.equal(check(dir).code, 0);
  });

  test("a module reading a peer must list it in uses", () => {
    const dir = project({
      "src/modules/dock/module.tsx":
        'export const m = { id: "dock", uses: [] };\n',
      "src/modules/dock/hooks.ts": 'const modal = useModule("modal");\n',
    });

    const run = check(dir);

    assert.equal(run.code, 1);
    assert.match(
      run.stderr,
      /Module "dock" reads "modal" but does not list it/,
    );
  });

  test("a declared peer passes", () => {
    const dir = project({
      "src/modules/dock/module.tsx":
        'export const m = { id: "dock", uses: ["modal"] };\n',
      "src/modules/dock/hooks.ts": 'const modal = useModule("modal");\n',
    });

    assert.equal(check(dir).code, 0);
  });

  test("a module may read itself", () => {
    const dir = project({
      "src/modules/dock/module.tsx": 'export const m = { id: "dock" };\n',
      "src/modules/dock/hooks.ts": 'const self = useModuleState("dock");\n',
    });

    assert.equal(check(dir).code, 0);
  });

  test("peer ids must be string literals so they can be checked", () => {
    const dir = project({
      "src/modules/dock/module.tsx": 'export const m = { id: "dock" };\n',
      "src/modules/dock/hooks.ts": "const x = useModule(peerId);\n",
    });

    const run = check(dir);

    assert.equal(run.code, 1);
    assert.match(run.stderr, /string literal/);
  });
});
