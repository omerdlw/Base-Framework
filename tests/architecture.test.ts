import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("layer boundaries", () => {
  function scanDir(
    dir: string,
    filter: (file: string, fullPath: string) => boolean,
    onFile: (fullPath: string, content: string) => void,
  ) {
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
        if (
          !/\.ts$/.test(file) ||
          file.endsWith(".d.ts") ||
          file === "index.ts"
        )
          return false;
        return fullPath.includes("/server/") || file === "server.ts";
      },
      (fullPath, content) => {
        const fileName = path.basename(fullPath);
        if (fileName === "actions.ts") {
          assert.ok(
            content.includes('"use server"') ||
              content.includes("'use server'"),
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

  test("infrastructure modules must have index.ts barrel exports and enforce server boundaries", () => {
    const infraDir = path.resolve("src/infrastructure");
    const redisIndex = path.join(infraDir, "redis", "index.ts");
    assert.ok(
      fs.existsSync(redisIndex),
      "src/infrastructure/redis is missing index.ts barrel export",
    );

    const redisClient = path.join(infraDir, "redis", "client.ts");
    const content = fs.readFileSync(redisClient, "utf8");
    assert.ok(
      content.includes('"server-only"') || content.includes("'server-only'"),
      "Redis client must import 'server-only'",
    );
  });

  test("rate limiter must provide distributed and in-memory export contracts", () => {
    const rateLimiterPath = path.resolve(
      "src/infrastructure/security/rate-limiter.ts",
    );
    const content = fs.readFileSync(rateLimiterPath, "utf8");
    assert.ok(
      content.includes("export function checkRateLimit("),
      "rate-limiter.ts must export checkRateLimit",
    );
    assert.ok(
      content.includes("export async function checkRateLimitAsync("),
      "rate-limiter.ts must export checkRateLimitAsync",
    );
  });

  test("primitives must remain pure without artificial variant styles (primary/secondary/danger)", () => {
    const buttonPath = path.resolve("src/features/shell/primitives/button.tsx");
    const content = fs.readFileSync(buttonPath, "utf8");
    assert.ok(
      !content.includes('"primary"') && !content.includes("'primary'"),
      "Button primitive must not define opinionated 'primary' variant",
    );
    assert.ok(
      !content.includes('"secondary"') && !content.includes("'secondary'"),
      "Button primitive must not define opinionated 'secondary' variant",
    );
    assert.ok(
      !content.includes('"danger"') && !content.includes("'danger'"),
      "Button primitive must not define opinionated 'danger' variant",
    );
  });

  test("features must use AUTH_EVENTS from @/features/auth instead of EVENT_TYPES.AUTH_*", () => {
    scanDir(
      path.resolve("src/features"),
      (file) => /\.(ts|tsx)$/.test(file),
      (fullPath, content) => {
        assert.ok(
          !content.includes("EVENT_TYPES.AUTH_"),
          `Feature file '${fullPath}' must not reference EVENT_TYPES.AUTH_*. Use AUTH_EVENTS from @/features/auth.`,
        );
      },
    );
  });

  test("src/features must not import from @/app", () => {
    const forbidden = ["@/app", "../app", "../../app"];
    scanDir(
      path.resolve("src/features"),
      (file) => /\.(ts|tsx)$/.test(file),
      (fullPath, content) => {
        for (const pattern of forbidden) {
          assert.ok(
            !content.includes(pattern),
            `Architecture violation: feature '${fullPath}' imports from application layer '${pattern}'`,
          );
        }
      },
    );
  });

  test("core engine is external: src/core and src/modules must not exist in repository", () => {
    assert.ok(
      !fs.existsSync(path.resolve("src/core")),
      "src/core directory must not exist: core engine is provided by @omerdlw/base-framework",
    );
    assert.ok(
      !fs.existsSync(path.resolve("src/modules")),
      "src/modules directory must not exist: UI modules are provided by @omerdlw/base-framework",
    );
  });

  test("code in src/ must consume engine via @omerdlw/base-framework, never @/core or @/modules", () => {
    const forbidden = ["@/core", "@/modules"];
    scanDir(
      path.resolve("src"),
      (file) => /\.(ts|tsx)$/.test(file),
      (fullPath, content) => {
        for (const pattern of forbidden) {
          assert.ok(
            !content.includes(pattern),
            `Architecture violation: '${fullPath}' imports legacy path '${pattern}'. Use @omerdlw/base-framework/* instead.`,
          );
        }
      },
    );
  });
});
