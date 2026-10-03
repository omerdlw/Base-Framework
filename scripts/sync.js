#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, ".framework-manifest.json");

const args = process.argv.slice(2);
const isCheckOnly = args.includes("--check") || args.includes("--dry-run");
const tagArg = args.find((a) => a.startsWith("--tag="))?.split("=")[1];

console.log("🛡️  [framework:sync] Initializing upstream synchronization...\n");

function run(cmd, options = {}) {
  return execSync(cmd, { encoding: "utf8", ...options }).trim();
}

function runGit(args, options = {}) {
  return execFileSync("git", args, { encoding: "utf8", ...options }).trim();
}

function tryGit(args, options = {}) {
  try {
    return runGit(args, options);
  } catch {
    return null;
  }
}

if (!fs.existsSync(manifestPath)) {
  console.log(
    "ℹ️  No .framework-manifest.json found. This appears to be the Base Framework upstream repository.",
  );
  console.log(
    "    'framework:sync' is only intended for downstream projects (e.g. Tvizzie).\n",
  );
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const currentTag = manifest.upstreamTag || `v${manifest.frameworkVersion}`;

const upstreamUrl = tryGit(["remote", "get-url", "upstream"]);
if (!upstreamUrl) {
  console.error("❌ Upstream remote 'upstream' is not configured!");
  console.error(
    "   Add it using: git remote add upstream <base-framework-git-url>",
  );
  process.exit(1);
}

const statusOutput = tryGit(["status", "--porcelain"]);
if (statusOutput) {
  console.error("❌ Working directory is dirty! You have uncommitted changes:");
  console.error(
    statusOutput
      .split("\n")
      .map((l) => `   ${l}`)
      .join("\n"),
  );
  console.error("\n👉 Please commit or stash your changes before syncing.");
  process.exit(1);
}

console.log("📡 Fetching upstream tags...");
try {
  runGit(["fetch", "upstream", "--tags", "--force", "--quiet"]);
} catch (e) {
  console.error("❌ Failed to fetch tags from upstream remote:", e.message);
  process.exit(1);
}

let targetTag = tagArg;
if (!targetTag) {
  const tagsOutput = tryGit(["tag", "-l", "v*", "--sort=-v:refname"]);
  if (tagsOutput) {
    targetTag = tagsOutput.split("\n")[0]?.trim();
  }
}

if (!targetTag) {
  console.error(
    "❌ No upstream framework tags found (expected tags starting with 'v*').",
  );
  process.exit(1);
}

try {
  execFileSync("git", ["check-ref-format", `refs/tags/${targetTag}`], {
    stdio: "ignore",
  });
} catch {
  console.error(`❌ Invalid framework tag: ${targetTag}`);
  process.exit(1);
}

console.log(`📌 Current project framework version: ${currentTag}`);
console.log(`📌 Target upstream framework version:  ${targetTag}`);

const hasImmutableCoreBaseline =
  typeof manifest.upstreamCommit === "string" &&
  /^[a-f0-9]{40,64}$/i.test(manifest.upstreamCommit) &&
  (manifest.coreTreeHash === undefined ||
    (typeof manifest.coreTreeHash === "string" &&
      /^[a-f0-9]{40,64}$/i.test(manifest.coreTreeHash)));

if (currentTag === targetTag && hasImmutableCoreBaseline) {
  console.log("\n✅ Already up-to-date! No synchronization needed.");
  process.exit(0);
}

if (isCheckOnly) {
  if (currentTag === targetTag) {
    console.log(
      "\nℹ️  This project needs immutable-core baseline metadata. Run 'npm run framework:sync' to record it.",
    );
  } else {
    console.log(`\nℹ️  Update available: ${currentTag} -> ${targetTag}`);
  }
  console.log(
    "   Run 'npm run framework:sync' to perform the synchronization.",
  );
  process.exit(0);
}

const syncBranch = `sync/upstream-${targetTag.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
console.log(`\n🔀 Creating sync branch '${syncBranch}'...`);

const existingSyncBranch = tryGit([
  "show-ref",
  "--verify",
  "--quiet",
  `refs/heads/${syncBranch}`,
]);
if (existingSyncBranch !== null) {
  console.error(
    `❌ Sync branch '${syncBranch}' already exists. Review or remove it manually before retrying; it was not modified.`,
  );
  process.exit(1);
}

runGit(["checkout", "-b", syncBranch]);

console.log(`🔄 Merging tag '${targetTag}' into '${syncBranch}'...`);

function pruneFrameworkOnlyFiles() {
  const pruned = Array.isArray(manifest.pruned) ? manifest.pruned : [];
  if (pruned.length === 0) return;
  let catalog;
  try {
    catalog = JSON.parse(
      fs.readFileSync(
        path.join(rootDir, "scripts/framework-files.json"),
        "utf8",
      ),
    );
  } catch {
    return;
  }
  for (const group of pruned) {
    for (const relPath of catalog.groups?.[group] ?? []) {
      tryGit(["rm", "-r", "-f", "-q", "--ignore-unmatch", "--", relPath]);
      fs.rmSync(path.join(rootDir, relPath), { recursive: true, force: true });
    }
  }
}

let mergeSuccess = false;
try {
  runGit(["merge", `refs/tags/${targetTag}`, "--no-commit", "--no-ff"]);
  pruneFrameworkOnlyFiles();
  mergeSuccess = true;
} catch (mergeError) {
  pruneFrameworkOnlyFiles();
  const unmerged = tryGit(["diff", "--name-only", "--diff-filter=U"]);
  if (unmerged) {
    console.error("\n⚠️  MERGE CONFLICTS DETECTED in the following files:");
    console.error(
      unmerged
        .split("\n")
        .map((f) => `   - ${f}`)
        .join("\n"),
    );
    console.error("\n👉 Action required:");
    console.error(
      "   1. Open the conflicted files in your IDE and resolve the conflicts.",
    );
    console.error(
      "   2. Run 'npm test && npm run typecheck' to verify your resolution.",
    );
    console.error(`   3. Finalize the sync:`);
    console.error(
      "      Update frameworkVersion, upstreamTag, upstreamCommit and coreTreeHash in .framework-manifest.json to the validated target tag and its src/core tree.",
    );
    console.error(`      git add .framework-manifest.json`);
    console.error(
      "      git commit -m 'chore(framework): sync to Base Framework <validated-tag>'",
    );
    console.error(
      "   4. Merge the sync branch back into main: git checkout main && git merge " +
        syncBranch,
    );
    console.error("\n   (Or to abort: git merge --abort && git checkout -)\n");
    process.exit(1);
  } else if (tryGit(["rev-parse", "-q", "--verify", "MERGE_HEAD"]) === null) {
    console.error("❌ Merge failed with error:", mergeError.message);
    process.exit(1);
  }
}

console.log("\n🧪 Running post-merge verification tests...");

let verificationPassed = false;
try {
  console.log("   - Running architecture boundary tests (npm test)...");
  run("npm test --silent");
  console.log(
    "   - Running TypeScript compiler verification (npm run typecheck)...",
  );
  run("npm run typecheck");
  verificationPassed = true;
} catch (testError) {
  console.error("\n❌ Post-merge verification failed!");
  console.error(
    "   The framework merge introduced architectural boundary or TypeScript errors.",
  );
  console.error("   The sync branch is left uncommitted for inspection:");
  console.error(`   Branch: ${syncBranch}`);
  console.error(
    "\n   - To debug: review files, resolve errors, run 'npm test', then commit.",
  );
  console.error("   - To abort: git merge --abort && git checkout -\n");
  process.exit(1);
}

if (verificationPassed) {
  const upstreamCommit = runGit([
    "rev-parse",
    `refs/tags/${targetTag}^{commit}`,
  ]);
  const coreTreeHash = tryGit(["rev-parse", `${upstreamCommit}:src/core`], {
    stdio: ["ignore", "pipe", "ignore"],
  });
  manifest.frameworkVersion = targetTag.replace(/^v/, "");
  if (coreTreeHash) {
    manifest.coreTreeHash = coreTreeHash;
  } else {
    delete manifest.coreTreeHash;
  }
  manifest.upstreamCommit = upstreamCommit;
  manifest.upstreamTag = targetTag;
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );
  runGit(["add", ".framework-manifest.json"]);
  runGit([
    "commit",
    "-m",
    `chore(framework): sync to Base Framework ${targetTag}`,
  ]);

  console.log(`\n🎉 Successfully synced to Base Framework ${targetTag}!`);
  console.log(`   Changes are committed on branch '${syncBranch}'.`);
  console.log(`\nNext step to apply to your main branch:`);
  console.log(
    `   git checkout main && git merge ${syncBranch} && git branch -d ${syncBranch}\n`,
  );
}
