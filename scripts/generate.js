#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function toPascalCase(input) {
  return input
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

function toKebabCase(input) {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9/]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function writeScaffoldFile(filePath, content, dryRun) {
  const relPath = path.relative(ROOT_DIR, filePath);
  if (fs.existsSync(filePath)) {
    console.warn(`  [skip] ${relPath} already exists.`);
    return false;
  }
  if (dryRun) {
    console.log(`  [dry-run] Would create ${relPath}`);
    return true;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`  [created] ${relPath}`);
  return true;
}

function generateFeature(rawName, dryRun) {
  const featureSlug = toKebabCase(rawName).replace(/\//g, "-");
  const pascalName = toPascalCase(featureSlug);
  const featureDir = path.join(ROOT_DIR, "src", "features", featureSlug);

  console.log(`\nScaffolding feature "${featureSlug}" (${pascalName})...`);

  const typesContent = `export interface ${pascalName}Item {
  readonly createdAt: string;
  readonly id: string;
  readonly title: string;
}

export interface Create${pascalName}Input {
  readonly title: string;
}
`;

  const actionsContent = `"use server";

import { createSafeAction, err, ok, type Result } from "@/core/result";
import type { Create${pascalName}Input, ${pascalName}Item } from "./types";

export const create${pascalName}Action = createSafeAction(
  async (input: Create${pascalName}Input): Promise<Result<${pascalName}Item>> => {
    const title = input.title?.trim();
    if (!title) {
      return err("Title is required", "VALIDATION_ERROR");
    }

    return ok({
      createdAt: new Date().toISOString(),
      id: crypto.randomUUID(),
      title,
    });
  },
);
`;

  const componentContent = `"use client";

import type { ${pascalName}Item } from "../types";

export interface ${pascalName}ViewProps {
  items?: readonly ${pascalName}Item[];
  title?: string;
}

export function ${pascalName}View({
  items = [],
  title = "${pascalName}",
}: ${pascalName}ViewProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-main">{title}</h2>
        <span className="text-xs text-muted">{items.length} items</span>
      </header>
    </section>
  );
}
`;

  const barrelContent = `export type { Create${pascalName}Input, ${pascalName}Item } from "./types";
export { create${pascalName}Action } from "./actions";
export { ${pascalName}View, type ${pascalName}ViewProps } from "./components/${pascalName}View";
`;

  writeScaffoldFile(path.join(featureDir, "types.ts"), typesContent, dryRun);
  writeScaffoldFile(path.join(featureDir, "actions.ts"), actionsContent, dryRun);
  writeScaffoldFile(
    path.join(featureDir, "components", `${pascalName}View.tsx`),
    componentContent,
    dryRun,
  );
  writeScaffoldFile(path.join(featureDir, "index.ts"), barrelContent, dryRun);

  console.log(`\nDone! Feature "${featureSlug}" is ready at src/features/${featureSlug}\n`);
}

function generatePage(rawRoute, dryRun) {
  const cleanRoute = rawRoute
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => toKebabCase(segment))
    .join("/");

  if (!cleanRoute) {
    console.error("Error: Please provide a valid route path (e.g., dashboard or settings/billing).");
    process.exit(1);
  }

  const pageId = cleanRoute.replace(/\//g, "-");
  const pascalName = toPascalCase(pageId);
  const pageDir = path.join(ROOT_DIR, "src", "app", cleanRoute);

  console.log(`\nScaffolding page "/${cleanRoute}" (${pascalName})...`);

  const clientComponentContent = `"use client";

import { usePageConfig } from "@/core/orchestration";

export function ${pascalName}PageClient() {
  usePageConfig({
    id: "${pageId}",
    title: "${pascalName}",
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-main">${pascalName}</h1>
        <p className="text-sm text-muted">
          Route surface registered with Base Framework page orchestration.
        </p>
      </header>
    </main>
  );
}
`;

  const pageContent = `import type { Metadata } from "next";
import { ${pascalName}PageClient } from "./_components/${pascalName}PageClient";

export const metadata: Metadata = {
  title: "${pascalName}",
};

export default function ${pascalName}Page() {
  return <${pascalName}PageClient />;
}
`;

  writeScaffoldFile(
    path.join(pageDir, "_components", `${pascalName}PageClient.tsx`),
    clientComponentContent,
    dryRun,
  );
  writeScaffoldFile(path.join(pageDir, "page.tsx"), pageContent, dryRun);

  console.log(`\nDone! Page "/${cleanRoute}" is ready at src/app/${cleanRoute}/page.tsx\n`);
}

function printUsage() {
  console.log(`
Base Framework Code Generator

Usage:
  npm run generate feature <name> [--dry-run]
  npm run generate page <route> [--dry-run]

Examples:
  npm run generate feature billing
  npm run generate page dashboard
  npm run generate page settings/notifications
`);
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const positional = args.filter((arg) => !arg.startsWith("--"));

  const [kind, target] = positional;

  if (!kind || !target) {
    printUsage();
    process.exit(kind ? 1 : 0);
  }

  if (kind === "feature") {
    generateFeature(target, dryRun);
    return;
  }

  if (kind === "page") {
    generatePage(target, dryRun);
    return;
  }

  console.error(`Unknown generator target "${kind}". Expected "feature" or "page".`);
  printUsage();
  process.exit(1);
}

main();
