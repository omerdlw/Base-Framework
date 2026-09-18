import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function scanDir(dir, filter, onFile) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath, filter, onFile);
    } else if (filter(file, fullPath)) {
      onFile(fullPath, fs.readFileSync(fullPath, "utf8"));
    }
  }
}

test("src/core must not import from @/features, @/app, or @/infrastructure", () => {
  const forbidden = ["@/features", "@/app", "@/infrastructure"];
  scanDir(
    path.resolve("src/core"),
    (file) => /\.(ts|tsx)$/.test(file),
    (fullPath, content) => {
      for (const pattern of forbidden) {
        assert.ok(
          !content.includes(pattern),
          `Architecture violation: ${fullPath} imports from forbidden layer '${pattern}'`,
        );
      }
    },
  );
});

test("src/infrastructure must not import from @/features or @/app", () => {
  const forbidden = ["@/features", "@/app"];
  scanDir(
    path.resolve("src/infrastructure"),
    (file) => /\.(ts|tsx)$/.test(file),
    (fullPath, content) => {
      for (const pattern of forbidden) {
        assert.ok(
          !content.includes(pattern),
          `Architecture violation: ${fullPath} imports from forbidden layer '${pattern}'`,
        );
      }
    },
  );
});

test("all features must have index.ts barrel export", () => {
  const featuresDir = path.resolve("src/features");
  const features = fs.readdirSync(featuresDir).filter((f) => {
    return fs.statSync(path.join(featuresDir, f)).isDirectory();
  });
  for (const feature of features) {
    const indexPath = path.join(featuresDir, feature, "index.ts");
    assert.ok(
      fs.existsSync(indexPath),
      `Feature '${feature}' is missing index.ts barrel export`,
    );
  }
});

test("server domain files must enforce server boundary", () => {
  scanDir(
    path.resolve("src/features"),
    (file, fullPath) => {
      if (!/\.ts$/.test(file) || file.endsWith(".d.ts") || file === "index.ts")
        return false;
      return fullPath.includes("/server/") || file === "server.ts";
    },
    (fullPath, content) => {
      const fileName = path.basename(fullPath);
      if (fileName === "actions.ts") {
        assert.ok(
          content.includes('"use server"') || content.includes("'use server'"),
          `Server actions file '${fullPath}' must include "use server" directive`,
        );
      } else {
        assert.ok(
          content.includes('"server-only"') ||
            content.includes("'server-only'"),
          `Server file '${fullPath}' must import "server-only"`,
        );
      }
    },
  );
});
