#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const rawArgs = process.argv.slice(2);
let projectName = "";
let customSlug = "";
let customDomain = "";

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg.startsWith("--name=")) {
    projectName = arg.slice(7);
  } else if (arg.startsWith("--domain=")) {
    customDomain = arg.slice(9);
  } else if (arg.startsWith("--slug=")) {
    customSlug = arg.slice(7);
  } else if (!arg.startsWith("-")) {
    if (!projectName) {
      projectName = arg;
    } else if (!customDomain) {
      customDomain = arg;
    }
  }
}

if (!projectName) {
  console.error("❌ Usage: node scripts/scaffold.js <ProjectName> [domain]");
  console.error(
    "   Or:   node scripts/scaffold.js --name=<ProjectName> [--domain=<domain>] [--slug=<slug>]",
  );
  console.error("   Example: npm run project:scaffold Tvizzie tvizzie.com");
  process.exit(1);
}

const slug =
  customSlug ||
  projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const domain = customDomain || `${slug}.com`;
const rootDir = process.cwd();

console.log(
  `\n🚀 Scaffolding project '${projectName}' (slug: '${slug}', domain: '${domain}')...\n`,
);

const configPath = path.join(rootDir, "project.config.json");
const configData = {
  name: projectName,
  slug,
  domain,
};
fs.writeFileSync(
  configPath,
  JSON.stringify(configData, null, 2) + "\n",
  "utf8",
);
console.log("  ✔ Generated project.config.json");

const pkgPath = path.join(rootDir, "package.json");
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.name = slug;
  pkg.version = "0.1.0";
  if (pkg.scripts) {
    pkg.scripts["graph:status"] =
      `codebase-memory-mcp cli index_status --project ${slug}`;
    pkg.scripts["graph:update"] =
      `codebase-memory-mcp cli index_repository --repo-path . --name ${slug} --persistence true && graphify extract . --code-only && graphify cluster-only . --no-label`;
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log("  ✔ Updated package.json identity & AI scripts");
}

const supabaseConfigPath = path.join(rootDir, "supabase", "config.toml");
if (fs.existsSync(supabaseConfigPath)) {
  let toml = fs.readFileSync(supabaseConfigPath, "utf8");
  toml = toml.replace(/^project_id\s*=\s*"[^"]+"/m, `project_id = "${slug}"`);
  fs.writeFileSync(supabaseConfigPath, toml, "utf8");
  console.log("  ✔ Updated supabase/config.toml project_id");
}

const wranglerPath = path.join(rootDir, "wrangler.jsonc");
if (fs.existsSync(wranglerPath)) {
  let wrangler = fs.readFileSync(wranglerPath, "utf8");
  wrangler = wrangler.replace(/"name"\s*:\s*"[^"]+"/g, `"name": "${slug}"`);
  wrangler = wrangler.replace(
    /"service"\s*:\s*"[^"]+"/g,
    `"service": "${slug}"`,
  );
  fs.writeFileSync(wranglerPath, wrangler, "utf8");
  console.log("  ✔ Updated wrangler.jsonc Cloudflare configuration");
}

const layoutPath = path.join(rootDir, "src", "app", "layout.tsx");
if (fs.existsSync(layoutPath)) {
  let layout = fs.readFileSync(layoutPath, "utf8");
  layout = layout.replace(
    /description:\s*"[^"]*"/,
    `description: "${projectName}"`,
  );
  layout = layout.replace(/default:\s*"[^"]*"/, `default: "${projectName}"`);
  fs.writeFileSync(layoutPath, layout, "utf8");
  console.log("  ✔ Updated src/app/layout.tsx default metadata");
}

const manifestPath = path.join(rootDir, ".framework-manifest.json");
let currentTag = "v1.0.0";
try {
  const tagOutput = execSync("git describe --tags --abbrev=0 2>/dev/null", {
    encoding: "utf8",
  }).trim();
  if (tagOutput) currentTag = tagOutput;
} catch {
  // Fallback to default v1.0.0
}
const manifest = {
  frameworkVersion: currentTag.replace(/^v/, ""),
  upstreamTag: currentTag,
};
fs.writeFileSync(
  manifestPath,
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8",
);
console.log(`  ✔ Created .framework-manifest.json locked to ${currentTag}`);

const graphifyOut = path.join(rootDir, "graphify-out");
if (fs.existsSync(graphifyOut)) {
  fs.rmSync(graphifyOut, { recursive: true, force: true });
  console.log("  ✔ Cleaned stale graphify-out/ cache");
}

const codebaseMemory = path.join(rootDir, ".codebase-memory");
if (fs.existsSync(codebaseMemory)) {
  fs.rmSync(codebaseMemory, { recursive: true, force: true });
  console.log("  ✔ Cleaned stale .codebase-memory/ cache");
}

console.log("  ℹ Rebuilding local AI Knowledge Graph for new project...");
try {
  execSync("npm run graph:update", { stdio: "ignore" });
  console.log("  ✔ Generated fresh project-isolated AI Knowledge Graph");
} catch {
  console.log(
    "  ⚠️  graph:update could not run immediately (optional tooling). Run manually later.",
  );
}

console.log("\n🔍 Running project validation check...");
try {
  execSync("node scripts/validate-project.js", { stdio: "inherit" });
} catch {
  console.error("❌ Validation check failed. Please review errors above.");
  process.exit(1);
}

console.log(`
🎉 Successfully scaffolded '${projectName}'!

Next Steps for Git Repositories:
  1. Set Base Framework as upstream:
     git remote rename origin upstream
  2. Add your project repository as origin:
     git remote add origin git@github.com:<your-org>/${slug}.git
  3. Commit and push:
     git add -A
     git commit -m "chore(scaffold): initialize ${projectName} on Base Framework ${currentTag}"
     git push -u origin main
`);
