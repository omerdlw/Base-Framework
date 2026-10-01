#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";

const rootDir = process.cwd();
const catalog = JSON.parse(
  fs.readFileSync(path.join(rootDir, "scripts/framework-files.json"), "utf8"),
);
const GROUPS = Object.keys(catalog.groups);

const options = {
  description: "",
  domain: "",
  dryRun: false,
  keep: new Set(),
  keepSeed: false,
  name: "",
  only: null,
  slug: "",
};

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--name=")) options.name = arg.slice(7);
  else if (arg.startsWith("--domain=")) options.domain = arg.slice(9);
  else if (arg.startsWith("--slug=")) options.slug = arg.slice(7);
  else if (arg.startsWith("--description="))
    options.description = arg.slice(14);
  else if (arg.startsWith("--only=")) options.only = arg.slice(7);
  else if (arg.startsWith("--keep="))
    arg
      .slice(7)
      .split(",")
      .filter(Boolean)
      .forEach((group) => options.keep.add(group));
  else if (arg === "--keep-seed") options.keepSeed = true;
  else if (arg === "--dry-run") options.dryRun = true;
  else if (!arg.startsWith("-")) {
    if (!options.name) options.name = arg;
    else if (!options.domain) options.domain = arg;
  }
}

const doRebrand = options.only === null || options.only === "rebrand";
const doPrune = options.only === null || options.only === "prune";
const isFullRun = options.only === null;

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (options.only && !["rebrand", "prune"].includes(options.only)) {
  fail("--only must be 'rebrand' or 'prune'.");
}
for (const group of options.keep) {
  if (!GROUPS.includes(group)) {
    fail(`Unknown --keep group '${group}'. Groups: ${GROUPS.join(", ")}.`);
  }
}
if (doRebrand && !options.name) {
  console.error(
    '❌ Usage: npm run project:scaffold -- "<Project Name>" [domain]',
  );
  console.error(
    "   Options: --domain= --slug= --description= --keep=<groups> --keep-seed --dry-run",
  );
  console.error(`   Groups pruned unless kept: ${GROUPS.join(", ")}`);
  console.error("   Steps alone: --only=rebrand | --only=prune");
  process.exit(1);
}

const slug =
  options.slug ||
  options.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
if (doRebrand && !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  fail(`Cannot derive a valid slug from '${options.name}'. Pass --slug=.`);
}
const domain = options.domain || `${slug}.com`;
const description = options.description || options.name;

const full = (relPath) => path.join(rootDir, relPath);
const exists = (relPath) => fs.existsSync(full(relPath));
const read = (relPath) => fs.readFileSync(full(relPath), "utf8");
const readJson = (relPath) => JSON.parse(read(relPath));

function step(label, work) {
  if (options.dryRun) {
    console.log(`  • would: ${label}`);
    return;
  }
  work();
  console.log(`  ✔ ${label}`);
}

function writeFile(relPath, content) {
  fs.writeFileSync(full(relPath), content, "utf8");
}

function writeJson(relPath, data) {
  writeFile(relPath, JSON.stringify(data, null, 2) + "\n");
}

function git(args) {
  return execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();
}

function formatGeneratedFiles() {
  const files = [
    "README.md",
    "package.json",
    "project.config.json",
    ".framework-manifest.json",
  ].filter(exists);
  try {
    execFileSync("npx", ["--no-install", "prettier", "--write", ...files], {
      cwd: rootDir,
      stdio: "ignore",
    });
  } catch {}
}

let upstreamCommit;
let coreTreeHash;
if (isFullRun) {
  try {
    upstreamCommit = git(["rev-parse", "HEAD"]);
    coreTreeHash = git(["rev-parse", `${upstreamCommit}:src/core`]);
  } catch {
    fail(
      "Scaffolding needs a Git checkout with a committed src/core tree so its immutable baseline can be recorded.",
    );
  }
  if (exists(".framework-manifest.json")) {
    fail(
      "This is already a scaffolded project (.framework-manifest.json exists). Use --only=rebrand or --only=prune.",
    );
  }
}

console.log(
  `\n🚀 ${options.dryRun ? "Planning" : "Scaffolding"} '${options.name || "(prune only)"}'${
    doRebrand ? ` (slug: '${slug}', domain: '${domain}')` : ""
  }...\n`,
);

if (doRebrand) {
  console.log("Rebrand");

  step("write project.config.json", () =>
    writeJson("project.config.json", {
      name: options.name,
      slug,
      domain,
      description,
    }),
  );

  if (exists("package.json")) {
    step("update package.json name and version", () => {
      const pkg = readJson("package.json");
      pkg.name = slug;
      if (isFullRun) pkg.version = "0.1.0";
      writeJson("package.json", pkg);
    });
  }

  if (exists("supabase/config.toml")) {
    step("set supabase project_id", () => {
      const toml = read("supabase/config.toml").replace(
        /^project_id\s*=\s*"[^"]+"/m,
        `project_id = "${slug}"`,
      );
      writeFile("supabase/config.toml", toml);
    });
  }

  if (exists("wrangler.jsonc")) {
    step("set Cloudflare worker names", () => {
      const wrangler = read("wrangler.jsonc")
        .replace(/"name"\s*:\s*"[^"]+"/g, `"name": "${slug}"`)
        .replace(/"service"\s*:\s*"[^"]+"/g, `"service": "${slug}"`);
      writeFile("wrangler.jsonc", wrangler);
    });
  }

  if (isFullRun) {
    for (const migration of exists("supabase/migrations")
      ? fs.readdirSync(full("supabase/migrations"))
      : []) {
      const relPath = `supabase/migrations/${migration}`;
      if (read(relPath).includes("Base Framework")) {
        step(`rename brand in ${relPath} header`, () =>
          writeFile(
            relPath,
            read(relPath).replace(/Base Framework/g, options.name),
          ),
        );
      }
    }
  }

  if (isFullRun && !options.keepSeed && exists("supabase/seed.sql")) {
    step("replace demo seed data with an empty seed", () =>
      writeFile(
        "supabase/seed.sql",
        `-- Seed data for ${options.name}. Runs on \`npm run supabase:reset\`.\n-- Sign-in is passwordless: local OTP codes arrive in Inbucket (http://127.0.0.1:54324).\n`,
      ),
    );
  }

  if (isFullRun && !exists("README.md")) {
    step("write README.md", () =>
      writeFile(
        "README.md",
        `# ${options.name}

${description}

Built on [Base Framework](https://github.com/omerdlw/Base-Framework).

## Getting started

\`\`\`bash
cp .env.example .env.local   # fill in Supabase and Upstash values
npm install
npm run supabase:start
npm run dev
\`\`\`

## Scripts

| Command | Purpose |
| :-- | :-- |
| \`npm run dev\` | Start the dev server |
| \`npm run build\` | Production build |
| \`npm run lint\` / \`npm run type-check\` | Static checks |
| \`npm run check:architecture\` | Layer boundaries and import cycles |
| \`npm run generate\` | Scaffold a feature or page |
| \`npm run framework:sync\` | Pull upstream Base Framework updates |

Project identity lives in \`project.config.json\`.
`,
      ),
    );
  }
  console.log("");
}

const prunedGroups = GROUPS.filter((group) => !options.keep.has(group));

if (doPrune) {
  console.log("Prune (framework-only files)");

  for (const group of prunedGroups) {
    for (const relPath of catalog.groups[group]) {
      if (!exists(relPath)) continue;
      step(`remove ${relPath}  [${group}]`, () =>
        fs.rmSync(full(relPath), { recursive: true, force: true }),
      );
    }
  }

  if (exists("package.json")) {
    step("clean package.json scripts", () => {
      const pkg = readJson("package.json");
      const scripts = pkg.scripts ?? {};
      if (prunedGroups.includes("scaffold")) {
        delete scripts["project:scaffold"];
        delete scripts["project:rebrand"];
        delete scripts["project:prune"];
      }
      if (prunedGroups.includes("tests")) {
        scripts.test = "node scripts/check-architecture.mjs";
        delete scripts["test:coverage"];
        for (const key of ["type-check", "typecheck"]) {
          if (scripts[key]) scripts[key] = "tsc --noEmit";
        }
      }
      pkg.scripts = scripts;
      writeJson("package.json", pkg);
    });
  }
  console.log("");
}

if (isFullRun) {
  let currentTag = "v1.0.0";
  try {
    const tag = execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (tag) currentTag = tag;
  } catch {}

  step(`record upstream baseline (${currentTag})`, () =>
    writeJson(".framework-manifest.json", {
      coreTreeHash,
      frameworkVersion: currentTag.replace(/^v/, ""),
      pruned: prunedGroups,
      upstreamCommit,
      upstreamTag: currentTag,
    }),
  );

  if (!options.dryRun) {
    formatGeneratedFiles();
    console.log("\n🔍 Validating project...");
    try {
      execSync("node scripts/validate-project.js", { stdio: "inherit" });
    } catch {
      fail("Validation failed. Review the errors above.");
    }
  }

  console.log(
    options.dryRun
      ? "\nDry run only: nothing was changed.\n"
      : `
🎉 '${options.name}' is ready.

Next:
  1. git remote rename origin upstream
  2. git remote add origin git@github.com:<your-org>/${slug}.git
  3. cp .env.example .env.local   # then fill it in
  4. npm run check:architecture && npm run type-check && npm run lint
  5. git add -A && git commit -m "chore: initialize ${options.name}" && git push -u origin main
`,
  );
}
