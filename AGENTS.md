# Base Framework — AI Agent & Developer Quick Reference

> **Architecture Documentation:** [`docs/README.md`](file:///Users/omerdlw/Documents/Base%20Framework/docs/README.md)  
> **Git Workflow Guide (Simple & Visual):** [`docs/git-workflow-guide.md`](file:///Users/omerdlw/Documents/Base%20Framework/docs/git-workflow-guide.md)  
> **10 Inviolable Rules:** [`docs/ai-agent-rules-and-anti-patterns.md`](file:///Users/omerdlw/Documents/Base%20Framework/docs/ai-agent-rules-and-anti-patterns.md)  
> **Knowledge Graph:** `.codebase-memory/` & `graphify-out/`

---

## 1. Quick Tech Stack

- **Framework:** Next.js 16 (App Router), React 19
- **Styling:** Tailwind CSS v4 (`@theme`, OKLCH semantic colors, custom `.center`, `.skeleton-block`)
- **Motion:** Motion (v13 / Framer Motion successor) with hardware GPU acceleration (`translate3d`, `scale`)
- **Database & Auth:** Supabase SSR (PKCE, WebAuthn/Passkeys, RLS, Realtime publications)
- **Icons:** `@iconify-icon/react` via `<Icon icon="solar:..." />`

---

## 2. Essential Commands

| Command                    | Purpose                                                        |
| :------------------------- | :------------------------------------------------------------- |
| `npm run dev`              | Start Next.js development server                               |
| `npm test`                 | Run architecture boundary tests (`tests/architecture.test.js`) |
| `npm run type-check`       | Full TypeScript compiler validation (`tsc --noEmit`)           |
| `npm run lint`             | ESLint rules check                                             |
| `npm run format`           | Prettier code formatting                                       |
| `npm run hooks:install`    | Install git hooks (`.githooks/pre-commit` boundary checks)     |
| `npm run supabase:reset`   | Reset local database & apply `supabase/seed.sql` test data     |
| `npm run project:scaffold` | Bootstrap new downstream project (`project:scaffold <name>`)   |
| `npm run generate`         | Scaffold new feature (`feature <name>`) or route (`page <path>`)|
| `npm run project:validate` | Validate project identity consistency and no template leaks    |
| `npm run framework:sync`   | Sync upstream framework updates into downstream project        |
| `npm run graph:update`     | Update Codebase Memory and Graphify AST graphs                 |

---

## 3. Seed Accounts (`supabase/seed.sql`)

Authentication is **100% Passwordless** (Email OTP, Magic Link & Passkeys/WebAuthn).  
In local dev, enter any test email; Supabase delivers the 6-digit OTP to **Inbucket** (`http://127.0.0.1:54324`). No passwords exist in Base Framework.

| Username        | Email                      | Role              | Profile State                                | Local Sign-In    |
| :-------------- | :------------------------- | :---------------- | :------------------------------------------- | :--------------- |
| `alex_creator`  | `alex@baseframework.dev`   | Lead Architect    | Public, 2 emails, accepted & pending follows | Passwordless OTP |
| `sarah_dev`     | `sarah@baseframework.dev`  | Infrastructure    | Public, reciprocal follow with Alex          | Passwordless OTP |
| `elena_design`  | `elena@baseframework.dev`  | Design Lead       | **Private**, pending follow requests         | Passwordless OTP |
| `marcus_mobile` | `marcus@baseframework.dev` | Mobile Specialist | Public, accepted follow with Elena           | Passwordless OTP |
| `test_user`     | `test@baseframework.dev`   | Automated QA      | Public sandbox account                       | Passwordless OTP |

---

## 4. The 4-Layer Hierarchy & Boundaries

```
src/app (4. Routing & Composition)
  ↓ imports
src/features (3. Domain Capabilities: auth, account, social)
  ↓ imports
src/infrastructure (2. Adapters: Supabase, HTTP, Proxy, Rate Limiter)
  ↓ imports
src/core (1. Foundation Engine, Orchestration, UI Modules, Primitives, Tokens)
```

### Strict Forbidden Dependencies:

- `src/core` **MUST NOT** import from `@/features/**`, `@/app/**`, or `@/infrastructure/**`.
- `src/infrastructure` **MUST NOT** import from `@/features/**` or `@/app/**`.
- Every feature in `src/features/` **MUST** have an `index.ts` barrel export.
- Server database files **MUST** start with `import "server-only";`.
- Server Actions **MUST** start with `"use server";` and return `Result<T, E>` (`ok()` / `err()`).
- In downstream projects (`.framework-manifest.json` present), `src/core` **MUST NOT** be modified on project branches (Immutable Core rule).

---

## 5. How to Discover Code with Zero Token Waste

- **Search Symbols:** Use `codebase-memory-mcp` (`search_graph`) or `graphify-out/GRAPH_REPORT.md` instead of full-text grepping.
- **Trace Dependencies:** Use `trace_path` to find who calls a function or what a function calls.
- **Inspect Function Source:** Use `get_code_snippet` to view only the target function, not the entire 1,000-line file.
- **Detailed Guides:** Refer to the [`docs/`](file:///Users/omerdlw/Documents/Base%20Framework/docs) folder.
