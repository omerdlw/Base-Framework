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
  const forbidden = [
    "@/features",
    "@/app",
    "@/infrastructure",
    "../features",
    "../../features",
    "../app",
    "../../app",
    "../infrastructure",
    "../../infrastructure",
  ];
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
  assert.ok(
    content.includes("export const checkDistributedRateLimit ="),
    "rate-limiter.ts must export checkDistributedRateLimit alias",
  );
});

test("primitives must remain pure without artificial variant styles (primary/secondary/danger)", () => {
  const buttonPath = path.resolve("src/core/primitives/button.tsx");
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

test("core dock status must remain domain-agnostic without account or auth endpoint bleed", () => {
  const statusPath = path.resolve("src/core/modules/dock/status.tsx");
  const content = fs.readFileSync(statusPath, "utf8");
  assert.ok(
    !content.includes("/api/account/me"),
    "Core status module must not fetch domain endpoint '/api/account/me'",
  );
  assert.ok(
    !content.includes("displayName"),
    "Core status module must not inspect user schema column 'displayName'",
  );
  assert.ok(
    !fs.existsSync(path.resolve("src/core/modules/nav")),
    "Legacy src/core/modules/nav directory must not exist after Dock migration",
  );
  const controlsConst = fs.readFileSync(
    path.resolve("src/core/modules/controls/constants.ts"),
    "utf8",
  );
  assert.ok(
    controlsConst.includes("CONTROLS_DOCK_GAP") &&
      controlsConst.includes('CONTROLS_DOCK_ELEMENT_ID = "dock-card-stack"'),
    "Controls module must use CONTROLS_DOCK_GAP and CONTROLS_DOCK_ELEMENT_ID = 'dock-card-stack'",
  );
});

test("core index barrel must expose foundational contracts for downstream projects", () => {
  const coreIndexPath = path.resolve("src/core/index.ts");
  const content = fs.readFileSync(coreIndexPath, "utf8");
  const requiredExports = [
    'export * from "./tokens"',
    'export * from "./primitives"',
    'export * from "./provider"',
    'export * from "./result"',
    "usePage",
    "RegistryProvider",
    "createRouteRegistry",
  ];
  for (const exp of requiredExports) {
    assert.ok(
      content.includes(exp),
      `Core barrel index.ts is missing required contract export: '${exp}'`,
    );
  }
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

test("src/core/events.ts must remain domain-agnostic without AUTH_* domain leaks", () => {
  const eventsPath = path.resolve("src/core/events.ts");
  const content = fs.readFileSync(eventsPath, "utf8");
  assert.ok(
    !content.includes("AUTH_SIGN_IN") &&
      !content.includes("AUTH_ACCOUNT_DELETE_START"),
    "src/core/events.ts must not contain hardcoded AUTH_* domain events",
  );
});

test("src/core/orchestration must remain a pure microkernel without importing from @/core/modules", () => {
  scanDir(
    path.resolve("src/core/orchestration"),
    (file) => /\.(ts|tsx)$/.test(file),
    (fullPath, content) => {
      assert.ok(
        !content.includes("@/core/modules") && !content.includes("../modules"),
        `Microkernel violation: '${fullPath}' must not import from @/core/modules (causes circular dependencies)`,
      );
    },
  );
});

test("src/core/orchestration/page-controller.tsx must provide an SSR-safe scoped store and runtime bridge", () => {
  const controllerPath = path.resolve(
    "src/core/orchestration/page-controller.tsx",
  );
  const content = fs.readFileSync(controllerPath, "utf8");
  assert.ok(
    content.includes("export function createPageControllerStore("),
    "page-controller.tsx must export createPageControllerStore for SSR-safe scoped stores",
  );
  assert.ok(
    content.includes("PageRuntimeBridgeContext"),
    "page-controller.tsx must use PageRuntimeBridgeContext for module decoupling",
  );
});

test("src/core/modules must maintain zero horizontal cross-module coupling", () => {
  scanDir(
    path.resolve("src/core/modules"),
    (file) => /\.(ts|tsx)$/.test(file),
    (fullPath, content) => {
      if (path.resolve(fullPath) === path.resolve("src/core/modules/index.ts")) {
        return;
      }
      assert.ok(
        !content.includes("@/core/modules/") && !content.includes('from "../'),
        `Cross-module coupling violation: '${fullPath}' imports directly from a sibling module in src/core/modules. Use PageRuntimeBridge or globalEvents instead.`,
      );
    },
  );
});

test("CoreProvider in src/core/provider.tsx must support modular feature toggles (CoreModulesConfig)", () => {
  const providerPath = path.resolve("src/core/provider.tsx");
  const content = fs.readFileSync(providerPath, "utf8");
  assert.ok(
    content.includes("export interface CoreModulesConfig") &&
      content.includes("modules?: CoreModulesConfig"),
    "src/core/provider.tsx must export CoreModulesConfig and accept modules prop on CoreProvider",
  );
});

test("core v2 foundation exports createStore, createScheduler, useStore, RegistrySchema, and isolated SurfaceViewModel", () => {
  const utilsContent = fs.readFileSync(
    path.resolve("src/core/utils.ts"),
    "utf8",
  );
  assert.ok(
    utilsContent.includes("export function createStore") &&
      utilsContent.includes("export function createScheduler"),
    "src/core/utils.ts must export createStore and createScheduler primitives",
  );

  const hooksContent = fs.readFileSync(
    path.resolve("src/core/hooks.ts"),
    "utf8",
  );
  assert.ok(
    hooksContent.includes("export function useStore"),
    "src/core/hooks.ts must export universal useStore selector hook",
  );

  const orchTypesContent = fs.readFileSync(
    path.resolve("src/core/orchestration/types.ts"),
    "utf8",
  );
  assert.ok(
    orchTypesContent.includes("export interface RegistrySchema"),
    "src/core/orchestration/types.ts must export typed RegistrySchema",
  );

  const surfaceFlowContent = fs.readFileSync(
    path.resolve("src/core/modules/dock/surface-flow.tsx"),
    "utf8",
  );
  assert.ok(
    surfaceFlowContent.includes("export function resolveSurfaceViewModel") &&
      surfaceFlowContent.includes("export function createSurfaceFlowBuilder") &&
      !surfaceFlowContent.includes("export function defineSurface("),
    "src/core/modules/dock/surface-flow.tsx must export createSurfaceFlowBuilder and resolveSurfaceViewModel without duplicate defineSurface symbol collision",
  );
});



