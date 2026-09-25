#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const configPath = path.join(rootDir, "project.config.json");
const manifestPath = path.join(rootDir, ".framework-manifest.json");

const isDownstream = fs.existsSync(manifestPath);

console.log("🔍 Validating project identity and configuration consistency...");

const errors = [];

if (!fs.existsSync(configPath)) {
  if (isDownstream) {
    errors.push("Missing 'project.config.json' in downstream project root.");
  }
} else {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (!config.name || typeof config.name !== "string") {
      errors.push("project.config.json: 'name' is required (e.g. 'Tvizzie').");
    }
    if (!config.slug || !/^[a-z0-9-_]+$/.test(config.slug)) {
      errors.push(
        "project.config.json: 'slug' is required and must be kebab-case/alphanumeric.",
      );
    }
    if (!config.domain || typeof config.domain !== "string") {
      errors.push(
        "project.config.json: 'domain' is required (e.g. 'tvizzie.com').",
      );
    }

    if (isDownstream && config.slug) {
      const slug = config.slug;

      const pkgPath = path.join(rootDir, "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.name !== slug) {
          errors.push(
            `package.json 'name' is '${pkg.name}', expected '${slug}'.`,
          );
        }
      }

      const supabaseConfigPath = path.join(rootDir, "supabase", "config.toml");
      if (fs.existsSync(supabaseConfigPath)) {
        const supabaseToml = fs.readFileSync(supabaseConfigPath, "utf8");
        const match = supabaseToml.match(/^project_id\s*=\s*"([^"]+)"/m);
        if (!match || match[1] !== slug) {
          errors.push(
            `supabase/config.toml 'project_id' is '${match ? match[1] : "missing"}', expected '${slug}'.`,
          );
        }
      }

      const wranglerPath = path.join(rootDir, "wrangler.jsonc");
      if (fs.existsSync(wranglerPath)) {
        const wranglerContent = fs.readFileSync(wranglerPath, "utf8");
        try {
          const nameMatch = wranglerContent.match(/"name"\s*:\s*"([^"]+)"/);
          if (!nameMatch || nameMatch[1] !== slug) {
            errors.push(
              `wrangler.jsonc 'name' is '${nameMatch ? nameMatch[1] : "missing"}', expected '${slug}'.`,
            );
          }
        } catch (e) {
          errors.push(`Failed to parse wrangler.jsonc: ${e.message}`);
        }
      }

      const filesToCheck = [
        "package.json",
        "supabase/config.toml",
        "wrangler.jsonc",
        "src/app/layout.tsx",
      ];

      for (const relPath of filesToCheck) {
        const filePath = path.join(rootDir, relPath);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf8");
          if (content.includes("passwordless-saas-template")) {
            errors.push(
              `${relPath} still contains legacy placeholder 'passwordless-saas-template'.`,
            );
          }
          if (
            relPath === "supabase/config.toml" &&
            content.includes('project_id = "template"')
          ) {
            errors.push(
              `${relPath} still contains default 'project_id = "template"'.`,
            );
          }
        }
      }
    }
  } catch (err) {
    errors.push(`Failed to read project.config.json: ${err.message}`);
  }
}

if (errors.length > 0) {
  console.error("\n❌ Project Identity Validation Failed:");
  for (const err of errors) {
    console.error(`   - ${err}`);
  }
  process.exit(1);
}

console.log("✅ Project identity and configuration are consistent.");
process.exit(0);
