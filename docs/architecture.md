# Architecture & System Boundaries

Base Framework is architected around strict unidirectional dependencies, a module-independent Microkernel orchestration engine, decoupled event-driven communication, and explicit server-client execution boundaries.

---

## 1. The 4-Layer Architecture Model

The codebase is organized into four vertical layers with strictly enforced dependency rules:

```mermaid
graph TD
  App["4. Composition & Routing Layer (src/app)"]
  Features["3. Feature & Domain Layer (src/features)"]
  Infra["2. Infrastructure & Adapter Layer (src/infrastructure)"]
  Core["1. Core Engine & Microkernel Layer (src/core)"]

  App --> Features
  App --> Infra
  App --> Core
  Features --> Infra
  Features --> Core
  Infra --> Core

  Core -. "❌ FORBIDDEN" .-> Features
  Core -. "❌ FORBIDDEN" .-> App
  Core -. "❌ FORBIDDEN" .-> Infra
  Infra -. "❌ FORBIDDEN" .-> Features
  Infra -. "❌ FORBIDDEN" .-> App
```

### Layer 1: Core Engine & Microkernel (`src/core`)

- **Role:** The reusable, immutable platform engine. It has zero knowledge of application domains, business entities, database tables, or authentication providers.
- **Internal Acyclic Hierarchy within `src/core`:**
  ```mermaid
  graph BT
    L0["1a. Foundation (tokens, events, result, utils, hooks, composer)"]
    L1["1b. Pure UI Primitives (src/core/primitives — 18 atomic components)"]
    L2["1c. Orchestration Microkernel (src/core/orchestration — RegistryStore, usePage, PageRuntimeBridge)"]
    L3["1d. Interactive UI Modules (src/core/modules — Nav, Modal, Ambient, Background, Notification, Controls...)"]
    L4["1e. Runtime Composition Shell (src/core/provider.tsx — CoreProvider)"]

    L1 --> L0
    L2 --> L0
    L3 --> L0
    L3 --> L1
    L3 --> L2
    L4 --> L2
    L4 --> L3
  ```
- **Key Subsystems:**
  - **Orchestration Microkernel (`src/core/orchestration`):** Scoped `RegistryStore`, `PageControllerStore`, `PageRuntimeBridgeContext`, `usePage()` dual-mode hook, and Open/Closed extension APIs (`defineRegistryModule`, `registerPageResolver`, `registerRegistryHandler`, `createFeatureRegistrationHook`). Has **0 imports** from `@/core/modules/*`.
  - **Interactive UI Modules (`src/core/modules`):** Nav dock & 6-phase task surfaces, ambient palette extraction, multi-layer background engine, Promise-based modal stack, anti-flood notification toast bus, collision-aware context menu, viewport-synced controls rails, 3-tier error boundaries, and anti-flicker loading overlays.
  - **Pure UI Primitives (`src/core/primitives`):** 18 domain-free, slot-customizable primitives (`Button`, `Input`, `Textarea`, `Checkbox`, `Switch`, `Badge`, `Avatar`, `Progress`, `Separator`, `Skeleton`, `Kbd`, `Tooltip`, `Icon`, `Spinner`, `Loader`, `AdaptiveImage`, `BackdropHero`, `FullscreenState`).
  - **Tokens & Motion (`src/core/tokens`):** `Z_INDEX` layers, universal motion tokens (`DURATION_TOKENS`, `EASING_CURVES`, `SPRING_PRESETS`), semantic OKLCH tone classes, and font loaders (`geistSans`, `zuume`).
  - **Decoupled Event Bus (`src/core/events.ts`):** Singleton `EventEmitter` on `globalThis` supporting TypeScript module augmentation (`FrameworkEventMap`).
  - **Result Pattern (`src/core/result.ts`):** Discriminated union (`Result<T, E>`, `ok`, `err`, `tryCatch`) for zero-throw error handling across Server Action boundaries.
- **Invariants:**
  - MUST NOT import from `@/features/**`, `@/app/**`, or `@/infrastructure/**`.
  - `src/core/orchestration` MUST NOT import from `@/core/modules/**`.
  - `src/core/events.ts` MUST NOT contain domain-specific `AUTH_*` event constants (features augment `FrameworkEventMap` in their own modules).

### Layer 2: Infrastructure Adapters (`src/infrastructure`)

- **Role:** Adapters connecting the application to external cloud services, databases, caches, and runtimes (Supabase SSR, Upstash Redis, Cloudflare Workers, Edge Network).
- **Contains:**
  - Supabase SDK clients (`src/infrastructure/supabase`): Browser SSR client, server cookie client, admin service-role client, TypeScript schema definitions.
  - Edge Proxy & Session Middleware (`src/infrastructure/supabase/proxy.ts`, `src/proxy.ts`): Edge session heartbeat, revoked session enforcement, and security headers.
  - HTTP Client (`src/infrastructure/http/client.ts`): `requestJson` wrapper that automatically parses errors and emits `API_UNAUTHORIZED` / `API_ERROR` events on `globalEvents`.
  - Distributed & In-Memory Rate Limiting (`src/infrastructure/security/rate-limiter.ts`): Sliding-window rate limiter backed by Upstash Redis with automatic in-memory fallback.
- **Invariants:**
  - MUST NOT import from `@/features/**` or `@/app/**`.
  - MAY ONLY import pure utilities (`@/core/utils`) and event bus symbols (`@/core/events`).

### Layer 3: Feature Domains (`src/features`)

- **Role:** Business capabilities, domain schemas, Server Actions, and task surfaces.
- **Contains:**
  - `src/features/auth` & `src/features/account`: Twin identity and profile subsystems handling 100% passwordless authentication (Email OTP, Magic Link, WebAuthn/Passkeys), session verification, `AuthListener`, profile management, social follow graphs (`src/features/account/social`), and realtime notification sync.
- **Invariants:**
  - Every feature folder MUST expose an `index.ts` client-safe barrel export.
  - Server-only queries MUST live in `server.ts` or `server/` and begin with `import "server-only";`.
  - Server Actions MUST reside in `actions.ts` or `server/actions.ts`, begin with `"use server";`, and return `Promise<Result<T, E>>`.

### Layer 4: Application & Composition (`src/app`)

- **Role:** The Next.js 16 App Router layer that wires together `CoreProvider`, `APP_REGISTRY_ENTRIES`, feature providers, and route views.

---

## 2. Dependency Import Matrix

| Importer Layer           |              Can Import From `@/core`?               | Can Import From `@/infrastructure`? |       Can Import From `@/features`?        |      Can Import From `@/app`?       |
| :----------------------- | :--------------------------------------------------: | :---------------------------------: | :----------------------------------------: | :---------------------------------: |
| **`src/core`**           |                  ✅ Yes (internal)                   |            ❌ **NEVER**             | ❌ **FORBIDDEN (Enforced by test & lint)** | ❌ **FORBIDDEN (Enforced by lint)** |
| **`src/infrastructure`** | ⚠️ Restricted (`@/core/utils`, `@/core/events` only) |          ✅ Yes (internal)          |                ❌ **NEVER**                |            ❌ **NEVER**             |
| **`src/features`**       |                  ✅ Yes (`@/core`)                   |     ✅ Yes (`@/infrastructure`)     |  ⚠️ Yes (via barrel `@/features/<name>`)   |            ❌ **NEVER**             |
| **`src/app`**            |                  ✅ Yes (`@/core`)                   |     ✅ Yes (`@/infrastructure`)     |           ✅ Yes (`@/features`)            |          ✅ Yes (internal)          |

---

## 3. Automated Boundary Enforcement (`npm test`)

Architectural boundaries in Base Framework are verified automatically by [`tests/architecture.test.js`](file:///Users/omerdlw/Documents/Base%20Framework/tests/architecture.test.js) and [`tests/orchestration.test.js`](file:///Users/omerdlw/Documents/Base%20Framework/tests/orchestration.test.js):

1. **Core Isolation Check:** Verifies that no file in `src/core` references `@/features`, `@/app`, or `@/infrastructure`.
2. **Orchestration Microkernel Isolation Check:** Verifies that `src/core/orchestration` has zero imports from `@/core/modules/*`, ensuring a strictly acyclic core graph.
3. **Zero Horizontal Cross-Module Coupling Check:** Verifies that no module inside `src/core/modules/<name>` directly imports from any sibling module (`@/core/modules/*` or `../<other>`). Cross-module coordination flows exclusively through `PageRuntimeBridge` or `globalEvents`.
4. **Pure Event Bus Check:** Verifies that `src/core/events.ts` contains zero `AUTH_*` domain constants.
5. **Pure Primitive Invariant Check:** Verifies that primitives in `src/core/primitives` do not contain hardcoded opinionated variant strings (`"primary"`, `"secondary"`, `"danger"`).
6. **Feature Barrel & Server-Only Check:** Verifies that every feature has an `index.ts` and never leaks `server-only` modules into client barrels.

---

## 4. The Engine-Isolated Upstream Model & Immutable Core Contract

Base Framework is designed to power **10–20 distinct downstream websites** without falling into the "fork drift" trap.

### How Downstream Projects Extend the Platform Without Editing `src/core`:

1. **Styling & Tokens (`80%`):** Override CSS variables (`--primary`, `--black`, `--white`) in `src/app/globals.css` and customize primitive slots via `classNames`.
2. **Declarative Orchestration (`15%`):** Configure routes, backgrounds, ambient themes, dock actions, and modals in `src/app/registry.tsx` and route `client.tsx` files via `usePage()`.
3. **Microkernel Extension APIs (`4%`):**
   - Register custom registry types via `defineRegistryModule()` and `registerPageResolver()`.
   - Extend `PageConfig` and `FrameworkEventMap` via TypeScript `declare module` augmentation inside `src/features/<feature>/constants.ts`.
   - Inject global viewport widgets into `CoreProvider` via `slots={{ beforeContent, afterContent, overlays }}`.
4. **Upstream Core Contributions (`1%`):** Generic improvements to `src/core` are developed on a `contrib/*` branch, tested via `npm test`, pushed to Base Framework upstream, and synced back via `npm run framework:sync`.
