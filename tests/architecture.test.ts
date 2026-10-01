import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("layer boundaries", () => {
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
    const statusDir = path.resolve("src/modules/dock/status");
    const content = fs
      .readdirSync(statusDir)
      .map((file) => fs.readFileSync(path.join(statusDir, file), "utf8"))
      .join("\n");
    assert.ok(
      !content.includes("/api/account/me"),
      "Core status module must not fetch domain endpoint '/api/account/me'",
    );
    assert.ok(
      !content.includes("displayName"),
      "Core status module must not inspect user schema column 'displayName'",
    );
    assert.ok(
      !fs.existsSync(path.resolve("src/modules/nav")),
      "Legacy src/modules/nav directory must not exist after Dock migration",
    );
    const controlsConst = fs.readFileSync(
      path.resolve("src/modules/controls/constants.ts"),
      "utf8",
    );
    assert.ok(
      controlsConst.includes("CONTROLS_DOCK_GAP") &&
        controlsConst.includes('CONTROLS_DOCK_ELEMENT_ID = "dock-card-stack"'),
      "Controls module must use CONTROLS_DOCK_GAP and CONTROLS_DOCK_ELEMENT_ID = 'dock-card-stack'",
    );
  });

  test("core has no root barrel and its kernel entry exposes the foundational contracts", () => {
    assert.ok(
      !fs.existsSync(path.resolve("src/core/index.ts")),
      "src/core/index.ts must not exist: import Core through its entry points (@/core/kernel, @/core/utils, ...)",
    );
    const kernelIndex = fs.readFileSync(
      path.resolve("src/core/kernel/index.ts"),
      "utf8",
    );
    for (const exp of [
      "usePage",
      "defineModule",
      "ModuleHost",
      "useModule",
      "useIsModuleInstalled",
      "RegistryProvider",
      "Compose",
    ]) {
      assert.ok(
        kernelIndex.includes(exp),
        `Kernel barrel index.ts is missing required contract export: '${exp}'`,
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

  test("src/core/kernel must remain a pure microkernel without importing from @/modules", () => {
    scanDir(
      path.resolve("src/core/kernel"),
      (file) => /\.(ts|tsx)$/.test(file),
      (fullPath, content) => {
        assert.ok(
          !content.includes("@/modules") && !content.includes("../modules"),
          `Microkernel violation: '${fullPath}' must not import from @/modules (causes circular dependencies)`,
        );
      },
    );
  });

  test("src/core/kernel/page-controller.tsx must provide an SSR-safe scoped store", () => {
    const controllerPath = path.resolve("src/core/kernel/page-controller.tsx");
    const content = fs.readFileSync(controllerPath, "utf8");
    assert.ok(
      content.includes("function createPageControllerStore("),
      "page-controller.tsx must export createPageControllerStore for SSR-safe scoped stores",
    );
  });

  test("src/modules must maintain zero horizontal cross-module coupling", () => {
    const modulesRoot = path.resolve("src/modules");
    const moduleNameOf = (absPath) =>
      path.relative(modulesRoot, absPath).split(path.sep)[0];

    scanDir(
      modulesRoot,
      (file) => /\.(ts|tsx)$/.test(file),
      (fullPath, content) => {
        if (path.resolve(fullPath) === path.resolve("src/modules/index.ts")) {
          return;
        }
        const violation = `Cross-module coupling violation: '${fullPath}' imports directly from a sibling module in src/modules. Use useModule(id) / useModuleState(id) or globalEvents instead.`;
        assert.ok(!content.includes("@/modules/"), violation);

        const ownModule = moduleNameOf(fullPath);
        for (const [, specifier] of content.matchAll(
          /(?:from\s+|import\s*\(\s*)["'](\.{1,2}\/[^"']*)["']/g,
        )) {
          const target = path.resolve(path.dirname(fullPath), specifier);
          assert.ok(
            target === path.join(modulesRoot, "theme") ||
              (target.startsWith(modulesRoot + path.sep) &&
                moduleNameOf(target) === ownModule),
            `${violation} (offending import: "${specifier}")`,
          );
        }
      },
    );
  });

  test("CoreProvider in src/core/provider.tsx installs an explicit list of modules", () => {
    const providerPath = path.resolve("src/core/provider.tsx");
    const content = fs.readFileSync(providerPath, "utf8");
    assert.ok(
      content.includes("modules: readonly AnyCoreModule[]") &&
        !content.includes('from "./modules"'),
      "src/core/provider.tsx must take the modules to install and not import the module barrel",
    );
  });

  test("core v2 foundation exports createStore, createScheduler, useStore, RegistrySchema, and isolated SurfaceViewModel", () => {
    const storeContent = fs.readFileSync(
      path.resolve("src/core/utils/store.ts"),
      "utf8",
    );
    const schedulerContent = fs.readFileSync(
      path.resolve("src/core/utils/scheduler.ts"),
      "utf8",
    );
    const utilsBarrel = fs.readFileSync(
      path.resolve("src/core/utils/index.ts"),
      "utf8",
    );
    assert.ok(
      storeContent.includes("export function createStore") &&
        schedulerContent.includes("export function createScheduler") &&
        /\bcreateStore\b/.test(utilsBarrel) &&
        /\bcreateScheduler\b/.test(utilsBarrel),
      "src/core/utils must export createStore and createScheduler primitives through its barrel",
    );

    const hooksContent = fs.readFileSync(
      path.resolve("src/core/hooks/use-store.ts"),
      "utf8",
    );
    const hooksBarrel = fs.readFileSync(
      path.resolve("src/core/hooks/index.ts"),
      "utf8",
    );
    assert.ok(
      hooksContent.includes("export function useStore") &&
        /\buseStore\b/.test(hooksBarrel),
      "src/core/hooks must export universal useStore selector hook through its barrel",
    );

    const orchTypesContent = fs.readFileSync(
      path.resolve("src/core/kernel/types.ts"),
      "utf8",
    );
    assert.ok(
      orchTypesContent.includes("export interface RegistrySchema"),
      "src/core/kernel/types.ts must export typed RegistrySchema",
    );

    const surfaceViewModelContent = fs.readFileSync(
      path.resolve("src/modules/dock/surface/view-model.ts"),
      "utf8",
    );
    const surfaceDefinitionContent = fs.readFileSync(
      path.resolve("src/modules/dock/surface/definition.ts"),
      "utf8",
    );
    assert.ok(
      surfaceViewModelContent.includes("function resolveSurfaceViewModel") &&
        surfaceDefinitionContent.includes(
          "export function createSurfaceFlowBuilder",
        ) &&
        surfaceDefinitionContent.split("export function defineSurface(")
          .length === 2,
      "src/modules/dock/surface must export createSurfaceFlowBuilder and exactly one defineSurface (definition.ts) and resolveSurfaceViewModel (view-model.ts)",
    );
  });

  test("every core module follows the canonical module template and is documented", () => {
    const modulesRoot = path.resolve("src/modules");
    const requiredFiles = ["index", "types", "constants", "utils"];
    const moduleNames = fs
      .readdirSync(modulesRoot)
      .filter((name) =>
        fs.statSync(path.join(modulesRoot, name)).isDirectory(),
      );

    for (const name of moduleNames) {
      const moduleDir = path.join(modulesRoot, name);
      for (const base of requiredFiles) {
        const exists = [".ts", ".tsx", "/index.ts"].some((suffix) =>
          fs.existsSync(path.join(moduleDir, base + suffix)),
        );
        assert.ok(
          exists,
          `src/modules/${name} must provide ${base}.ts (canonical module template, see src/docs/modules/README.md)`,
        );
      }
      assert.ok(
        fs.existsSync(path.resolve(`src/docs/modules/${name}.md`)),
        `src/modules/${name} must be documented in src/docs/modules/${name}.md`,
      );
    }
  });

  test("modules follow the fixed file pattern (types, context, state, utils, constants, overlay, module, index)", () => {
    const modulesDir = path.resolve("src/modules");
    const slots = new Set([
      "types",
      "context",
      "state",
      "utils",
      "constants",
      "overlay",
      "module",
      "index",
    ]);
    const extras = new Set(["hooks", "motion", "store"]);
    const moduleExtras = {
      background: ["youtube"],
      "context-menu": ["resolver"],
      dock: [
        "provider",
        "runtime",
        "cards",
        "hud",
        "routing",
        "status",
        "surface",
      ],
    };
    const pending = new Set();
    const violations: any[] = [];

    for (const name of fs.readdirSync(modulesDir)) {
      const dir = path.join(modulesDir, name);
      if (!fs.statSync(dir).isDirectory() || pending.has(name)) continue;
      const allowed = new Set(moduleExtras[name] ?? []);
      for (const entry of fs.readdirSync(dir)) {
        const base = entry.replace(/\.(tsx?|md)$/, "");
        if (!slots.has(base) && !extras.has(base) && !allowed.has(base)) {
          violations.push(`src/modules/${name}/${entry}` as any);
        }
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Unexpected files at module root (use a pattern slot or declare an extra):\n${violations.join("\n")}`,
    );
  });

  test("dock layering: leaf root files never import dirs, dirs never import composition files or self-contained slots", () => {
    const dockDir = path.resolve("src/modules/dock");
    const leaves = new Set([
      "types",
      "constants",
      "utils",
      "motion",
      "context",
      "state",
      "hooks",
    ]);
    const composition = new Set(["module", "provider", "overlay", "index"]);
    const forbiddenDirFiles = new Set([
      "types",
      "constants",
      "utils",
      "index",
      "overlay",
    ]);
    const violations: any[] = [];

    scanDir(
      dockDir,
      (file) => /\.tsx?$/.test(file),
      (fullPath, content) => {
        const rel = path.relative(dockDir, fullPath);
        const inDir = rel.includes(path.sep);
        const base = rel.replace(/\.tsx?$/, "");
        if (inDir && forbiddenDirFiles.has(path.basename(base))) {
          violations.push(
            `${rel}: dock dirs must take types/constants/utils from the root` as any,
          );
        }
        for (const match of content.matchAll(/from\s+"(\.[^"]*)"/g)) {
          const target = path
            .normalize(path.join(path.dirname(rel), match[1]))
            .split(path.sep);
          if (
            !inDir &&
            leaves.has(base) &&
            target[0] !== ".." &&
            (target.length > 1 || composition.has(target[0]))
          ) {
            violations.push(
              `${rel} -> ${match[1]}: root leaf must not import dirs or composition files` as any,
            );
          }
          if (inDir && target.length === 1 && composition.has(target[0])) {
            violations.push(
              `${rel} -> ${match[1]}: dirs must not import composition files` as any,
            );
          }
        }
      },
    );

    assert.deepEqual(violations, [], violations.join("\n"));
  });

  test("module UI lives only in overlay.tsx, and overlay.tsx defines no state, effects or refs", () => {
    const modulesDir = path.resolve("src/modules");
    const hookCall =
      /\b(useState|useEffect|useLayoutEffect|useInsertionEffect|useRef|useCallback|useMemo|useReducer|useSyncExternalStore)\(/;
    const component = /^(?:export\s+)?function\s+([A-Z]\w*)\s*[(<]/gm;
    const memoComponent =
      /^(?:export\s+)?const\s+([A-Z]\w*)\s*=\s*(?:memo|forwardRef)\(/gm;
    const violations: any[] = [];

    scanDir(
      modulesDir,
      (file) => file.endsWith(".tsx"),
      (fullPath, content) => {
        const rel = path.relative(modulesDir, fullPath);
        const isOverlay = path.basename(fullPath) === "overlay.tsx";
        if (isOverlay) {
          const hit = content.match(hookCall);
          if (hit)
            violations.push(
              `${rel}: overlay must not call ${hit[1]} (move it into a use*Model hook)` as any,
            );
          return;
        }
        for (const re of [component, memoComponent]) {
          re.lastIndex = 0;
          for (const match of content.matchAll(re)) {
            if (/Provider$/.test(match[1])) continue;
            violations.push(
              `${rel}: component ${match[1]} belongs in overlay.tsx` as any,
            );
          }
        }
      },
    );

    for (const name of fs.readdirSync(modulesDir)) {
      const dir = path.join(modulesDir, name, "overlay");
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        violations.push(
          `src/modules/${name}/overlay must be the single file overlay.tsx` as any,
        );
      }
    }

    assert.deepEqual(violations, [], violations.join("\n"));
  });
});

describe("source contracts", () => {
  test("orchestration microkernel exposes defineModule as its extension API", () => {
    const moduleContent = fs.readFileSync(
      path.resolve("src/core/kernel/module.tsx"),
      "utf8",
    );
    assert.ok(
      moduleContent.includes("export function defineModule<"),
      "orchestration/module.tsx must export defineModule",
    );
  });

  test("core primitives barrel exports foundational pure primitives including Select", () => {
    const primitivesIndex = fs.readFileSync(
      path.resolve("src/core/primitives/index.ts"),
      "utf8",
    );
    for (const name of [
      "Badge",
      "Separator",
      "Skeleton",
      "Switch",
      "Checkbox",
      "Avatar",
      "Progress",
      "Select",
    ]) {
      assert.ok(
        primitivesIndex.includes(name),
        `src/core/primitives/index.ts must export ${name}`,
      );
    }
  });

  test("core hooks module exports universal state, media, hotkey, storage, intersection, and server action hooks", () => {
    const hooksDir = path.resolve("src/core/hooks");
    const hooksContent = fs
      .readdirSync(hooksDir)
      .map((file) => fs.readFileSync(path.join(hooksDir, file), "utf8"))
      .join("\n");
    for (const hookName of [
      "export function useServerAction",
      "export function useAsyncAction",
      "export function useMediaQuery",
      "export function useControllableState",
      "export function useHotkey",
      "export function useStorageState",
      "export function useLocalStorage",
      "export function useSessionStorage",
      "export function useIntersectionObserver",
    ]) {
      assert.ok(
        hooksContent.includes(hookName),
        `src/core/hooks/ must contain ${hookName}`,
      );
    }
  });

  test("Z_INDEX tokens use SELECT and CONTEXT_MENU and do not include DROPDOWN or DEBUG_OVERLAY", () => {
    const tokensContent = fs.readFileSync(
      path.resolve("src/core/tokens/tokens.ts"),
      "utf8",
    );
    assert.ok(tokensContent.includes("SELECT:"), "Z_INDEX must include SELECT");
    assert.ok(
      tokensContent.includes("CONTEXT_MENU:"),
      "Z_INDEX must include CONTEXT_MENU",
    );
    assert.ok(
      !tokensContent.includes("DROPDOWN:"),
      "Z_INDEX must not include DROPDOWN",
    );
    assert.ok(
      !tokensContent.includes("DEBUG_OVERLAY:"),
      "Z_INDEX must not include DEBUG_OVERLAY",
    );
  });

  test("core orchestration and dock modules contain zero debug/diagnostic/inspector bloat", () => {
    const orchIndex = fs.readFileSync(
      path.resolve("src/core/kernel/index.ts"),
      "utf8",
    );
    const dockIndex = fs.readFileSync(
      path.resolve("src/modules/dock/index.ts"),
      "utf8",
    );
    assert.ok(
      !orchIndex.includes("Diagnostic"),
      "orchestration must not export Diagnostic APIs",
    );
    assert.ok(
      !orchIndex.includes("Inspector"),
      "orchestration must not export Inspector APIs",
    );
    assert.ok(
      !dockIndex.includes("Diagnostic"),
      "dock module must not export Diagnostic APIs",
    );
    assert.ok(
      !dockIndex.includes("Inspector"),
      "dock module must not export Inspector APIs",
    );
  });

  test("core module providers define at most one React context each", () => {
    const providerFiles = [
      "src/core/kernel/provider.tsx",
      "src/modules/loading/context.tsx",
      "src/modules/background/context.tsx",
      "src/modules/context-menu/context.tsx",
      "src/modules/notification/context.tsx",
      "src/modules/modal/context.tsx",
      "src/modules/ambient/context.tsx",
      "src/modules/dock/provider.tsx",
      "src/modules/dock/routing/breadcrumbs.tsx",
    ];

    for (const relPath of providerFiles) {
      const content = fs.readFileSync(path.resolve(relPath), "utf8");
      const matches = content.match(/createContext\b/g) || [];
      assert.ok(
        matches.length <= 2,
        `${relPath} must define at most 1 React context (found ${matches.length - 1})`,
      );
    }
  });

  test("modules expose ergonomic APIs and background module enforces pure Image URL without presets", () => {
    const bgConstants = fs.readFileSync(
      path.resolve("src/modules/background/constants.ts"),
      "utf8",
    );
    const bgUtils = fs.readFileSync(
      path.resolve("src/modules/background/utils.ts"),
      "utf8",
    );
    const toastContent = fs.readFileSync(
      path.resolve("src/modules/notification/hooks.ts"),
      "utf8",
    );
    const ambientProvider = fs.readFileSync(
      path.resolve("src/modules/ambient/context.tsx"),
      "utf8",
    );
    const loadingProvider = fs.readFileSync(
      path.resolve("src/modules/loading/context.tsx"),
      "utf8",
    );
    const contextMenuProvider = fs.readFileSync(
      path.resolve("src/modules/context-menu/context.tsx"),
      "utf8",
    );

    assert.ok(
      !bgConstants.includes("BACKGROUND_PRESETS") &&
        !bgUtils.includes("preset"),
      "background module must not contain BACKGROUND_PRESETS or preset logic",
    );
    const notifConstants = fs.readFileSync(
      path.resolve("src/modules/notification/constants.ts"),
      "utf8",
    );
    const notifTheme = fs.readFileSync(
      path.resolve("src/config/notification.module.theme.ts"),
      "utf8",
    );
    assert.ok(
      toastContent.includes("Object.assign(") &&
        toastContent.includes("promise") &&
        toastContent.includes("fromResult") &&
        toastContent.includes("dismiss") &&
        !toastContent.includes("TOAST_TYPES") &&
        notifTheme.includes("bg-black/60") &&
        notifTheme.includes("backdrop-blur-lg") &&
        notifTheme.includes("rounded-[20px]") &&
        notifConstants.includes("dock-card-stack"),
      "useToast must be a pure callable toast(message) function with Dock-anchored glass card styling and zero TOAST_TYPES",
    );
    assert.ok(
      !ambientProvider.includes("JSON.stringify"),
      "ambient/provider.tsx must use shallowEqual stabilization instead of JSON.stringify",
    );
    assert.ok(
      loadingProvider.includes("withLoading"),
      "loading/provider.tsx must expose withLoading async wrapper",
    );
    assert.ok(
      contextMenuProvider.includes("onContextMenu:"),
      "context-menu/provider.tsx must expose bind(payload) JSX trigger helper",
    );
  });

  test("dock module enforces resolveDockScene, lightweight ghost cards, and zero interval polling", () => {
    const dockAttention = fs.readFileSync(
      path.resolve("src/modules/dock/state.ts"),
      "utf8",
    );
    const dockBehavior = fs.readFileSync(
      path.resolve("src/modules/dock/hooks.ts"),
      "utf8",
    );
    const dockLayout = fs.readFileSync(
      path.resolve("src/modules/dock/hooks.ts"),
      "utf8",
    );
    const dockCards = fs.readFileSync(
      path.resolve("src/modules/dock/overlay.tsx"),
      "utf8",
    );
    assert.ok(
      dockAttention.includes("export function resolveDockScene"),
      "dock must expose its scene resolver",
    );
    assert.ok(
      !dockBehavior.includes("setInterval") &&
        !dockLayout.includes("MutationObserver") &&
        dockLayout.includes("--dock-h"),
      "dock must not use 350ms setInterval focus polling or MutationObserver layout thrashing, and must publish --dock-h",
    );
    assert.ok(
      dockCards.includes("isCollapsedGhostCard"),
      "dock cards must render lightweight inert ghost shells when collapsed and position > 0",
    );
  });
});
