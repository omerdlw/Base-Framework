import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  COMPOSITOR_GPU_STYLE,
  DURATION_TOKENS,
  EASING_CURVES,
  REDUCED_MOTION_TRANSITION,
  SPRING_PRESETS,
  TAP_SCALE_SUBTLE,
} from "../src/core/tokens/motion.ts";

test("motion tokens expose hardware-accelerated spring presets and durations", () => {
  assert.equal(SPRING_PRESETS.SNAPPY.type, "spring");
  assert.equal(SPRING_PRESETS.MICRO.type, "spring");
  assert.equal(SPRING_PRESETS.GENTLE.type, "spring");
  assert.equal(SPRING_PRESETS.BOUNCY.type, "spring");
  assert.ok(DURATION_TOKENS.FAST < DURATION_TOKENS.BASE);
  assert.ok(DURATION_TOKENS.BASE < DURATION_TOKENS.SLOW);
  assert.equal(EASING_CURVES.OUT_EXPO.length, 4);
  assert.equal(REDUCED_MOTION_TRANSITION.ease, "linear");
  assert.equal(COMPOSITOR_GPU_STYLE.transform, "translate3d(0, 0, 0)");
  assert.equal(TAP_SCALE_SUBTLE, 0.97);
});

test("orchestration microkernel exports open/closed extension APIs", () => {
  const utilsContent = fs.readFileSync(
    path.resolve("src/core/orchestration/utils.ts"),
    "utf8",
  );
  const handlersContent = fs.readFileSync(
    path.resolve("src/core/orchestration/handlers.ts"),
    "utf8",
  );
  const adaptersContent = fs.readFileSync(
    path.resolve("src/core/orchestration/adapters.tsx"),
    "utf8",
  );

  assert.ok(
    utilsContent.includes("export function defineRegistryModule("),
    "orchestration/utils.ts must export defineRegistryModule",
  );
  assert.ok(
    utilsContent.includes("export function registerPageResolver"),
    "orchestration/utils.ts must export registerPageResolver",
  );
  assert.ok(
    handlersContent.includes("export function registerRegistryHandler("),
    "orchestration/handlers.ts must export registerRegistryHandler",
  );
  assert.ok(
    adaptersContent.includes("export function createFeatureRegistrationHook("),
    "orchestration/adapters.tsx must export createFeatureRegistrationHook",
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
    "Kbd",
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
  const hooksContent = fs.readFileSync(
    path.resolve("src/core/hooks.ts"),
    "utf8",
  );
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
      `src/core/hooks.ts must contain ${hookName}`,
    );
  }
});

test("Z_INDEX tokens use SELECT and CONTEXT_MENU and do not include DROPDOWN or DEBUG_OVERLAY", () => {
  const tokensContent = fs.readFileSync(
    path.resolve("src/core/tokens/tokens.ts"),
    "utf8",
  );
  assert.ok(tokensContent.includes("SELECT:"), "Z_INDEX must include SELECT");
  assert.ok(tokensContent.includes("CONTEXT_MENU:"), "Z_INDEX must include CONTEXT_MENU");
  assert.ok(!tokensContent.includes("DROPDOWN:"), "Z_INDEX must not include DROPDOWN");
  assert.ok(!tokensContent.includes("DEBUG_OVERLAY:"), "Z_INDEX must not include DEBUG_OVERLAY");
});

test("core orchestration and dock modules contain zero debug/diagnostic/inspector bloat", () => {
  const orchIndex = fs.readFileSync(
    path.resolve("src/core/orchestration/index.ts"),
    "utf8",
  );
  const dockIndex = fs.readFileSync(
    path.resolve("src/core/modules/dock/index.ts"),
    "utf8",
  );
  assert.ok(!orchIndex.includes("Diagnostic"), "orchestration must not export Diagnostic APIs");
  assert.ok(!orchIndex.includes("Inspector"), "orchestration must not export Inspector APIs");
  assert.ok(!dockIndex.includes("Diagnostic"), "dock module must not export Diagnostic APIs");
  assert.ok(!dockIndex.includes("Inspector"), "dock module must not export Inspector APIs");
});

test("core module providers use unified single contexts without redundant Actions/State context splitting", () => {
  const providerFiles = [
    "src/core/orchestration/provider.tsx",
    "src/core/modules/loading/provider.tsx",
    "src/core/modules/background/provider.tsx",
    "src/core/modules/context-menu/provider.tsx",
    "src/core/modules/notification/provider.tsx",
    "src/core/modules/modal/provider.tsx",
    "src/core/modules/ambient/provider.tsx",
    "src/core/modules/dock/provider.tsx",
    "src/core/modules/dock/breadcrumbs.tsx",
  ];

  for (const relPath of providerFiles) {
    const content = fs.readFileSync(path.resolve(relPath), "utf8");
    const matches = content.match(/createContext\b/g) || [];
    // 1 import + 1 createContext call = 2 occurrences maximum
    assert.ok(
      matches.length <= 2,
      `${relPath} must define only 1 unified React Context (found ${matches.length - 1})`,
    );
  }
});

test("usePage performs atomic 1x registry registration and @/core barrel exposes unified runtime hooks without shadowing", () => {
  const pageControllerContent = fs.readFileSync(
    path.resolve("src/core/orchestration/page-controller.tsx"),
    "utf8",
  );
  const coreIndexContent = fs.readFileSync(
    path.resolve("src/core/index.ts"),
    "utf8",
  );
  const adaptersContent = fs.readFileSync(
    path.resolve("src/core/orchestration/adapters.tsx"),
    "utf8",
  );

  assert.ok(
    pageControllerContent.includes("createPageRegistryConfig("),
    "page-controller.tsx must use createPageRegistryConfig for atomic 1x registration",
  );
  assert.ok(
    !pageControllerContent.includes("useDock(resolvedModules.dock"),
    "page-controller.tsx must not invoke separate per-feature registration hooks",
  );
  assert.ok(
    adaptersContent.includes('createFeatureRegistrationHook("dock")') &&
      adaptersContent.includes('createFeatureRegistrationHook("background")') &&
      adaptersContent.includes('createFeatureRegistrationHook("modal")'),
    "adapters.tsx must build built-in registration hooks via createFeatureRegistrationHook",
  );
  assert.ok(
    !coreIndexContent.includes("  useModal,\n") &&
      !coreIndexContent.includes("  useBackground,\n") &&
      !coreIndexContent.includes("  useLoading,\n") &&
      !coreIndexContent.includes("  useContextMenu,\n") &&
      !coreIndexContent.includes("  useControls,\n") &&
      !coreIndexContent.includes("  useDock,\n"),
    "src/core/index.ts must not overwrite unified module hooks with orchestration adapters",
  );
  assert.ok(
    pageControllerContent.includes("export function usePageController(): PageController") &&
      !pageControllerContent.includes("export const usePageController = usePage") &&
      !pageControllerContent.includes("const isConsumer ="),
    "page-controller.tsx must separate usePage (Producer) from usePageController (pure Consumer) without dual-role branching",
  );
});

test("modules expose ergonomic APIs and background module enforces pure Image URL without presets", () => {
  const bgConstants = fs.readFileSync(
    path.resolve("src/core/modules/background/constants.ts"),
    "utf8",
  );
  const bgUtils = fs.readFileSync(
    path.resolve("src/core/modules/background/utils.ts"),
    "utf8",
  );
  const toastContent = fs.readFileSync(
    path.resolve("src/core/modules/notification/toast.ts"),
    "utf8",
  );
  const ambientProvider = fs.readFileSync(
    path.resolve("src/core/modules/ambient/provider.tsx"),
    "utf8",
  );
  const loadingProvider = fs.readFileSync(
    path.resolve("src/core/modules/loading/provider.tsx"),
    "utf8",
  );
  const contextMenuProvider = fs.readFileSync(
    path.resolve("src/core/modules/context-menu/provider.tsx"),
    "utf8",
  );

  assert.ok(
    !bgConstants.includes("BACKGROUND_PRESETS") && !bgUtils.includes("preset"),
    "background module must not contain BACKGROUND_PRESETS or preset logic",
  );
  const notifConstants = fs.readFileSync(
    path.resolve("src/core/modules/notification/constants.ts"),
    "utf8",
  );
  assert.ok(
    toastContent.includes("Object.assign(") &&
      toastContent.includes("promise") &&
      toastContent.includes("fromResult") &&
      toastContent.includes("dismiss") &&
      !toastContent.includes("TOAST_TYPES") &&
      notifConstants.includes("bg-black/60") &&
      notifConstants.includes("backdrop-blur-lg") &&
      notifConstants.includes("rounded-[20px]") &&
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

test("dock module enforces resolveDockScene, deferUntilFull, lightweight ghost cards, and zero interval polling", () => {
  const dockAttention = fs.readFileSync(
    path.resolve("src/core/modules/dock/attention.ts"),
    "utf8",
  );
  const dockBehavior = fs.readFileSync(
    path.resolve("src/core/modules/dock/behavior.ts"),
    "utf8",
  );
  const dockLayout = fs.readFileSync(
    path.resolve("src/core/modules/dock/layout.ts"),
    "utf8",
  );
  const dockCards = fs.readFileSync(
    path.resolve("src/core/modules/dock/cards.tsx"),
    "utf8",
  );
  const dockScheduler = fs.readFileSync(
    path.resolve("src/core/modules/dock/scheduler.ts"),
    "utf8",
  );

  assert.ok(
    dockAttention.includes("export function resolveDockScene") &&
      dockScheduler.includes("export function deferUntilFull"),
    "dock must expose resolveDockScene and deferUntilFull orchestrators",
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

