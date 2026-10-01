# Base Framework — System Architecture & Documentation

> **Technology Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Motion v13, Supabase SSR, Cloudflare OpenNext.  
> **Design Philosophy:** Immutable Microkernel Core, Declarative Chrome, Passwordless Identity.

---

## 1. The Layer System Model

```
src/app (5. Routing & Composition)
  ↓ imports
src/features (4. Domain: auth, account — barrel index.ts, server/ segregated)
  ↓ imports
src/modules (3. First-party UI modules) + src/infrastructure (3. Adapters: supabase, http, redis, security)
  ↓ imports
src/core (1-2. Kernel + foundation: kernel, error, primitives, hooks, utils, tokens, events, result)
```

Enforced strictly by automated boundary tests in `tests/architecture.test.js`.

---

## 2. Documentation Directory

All documentation is consolidated, up-to-date, and optimized for minimal token consumption:

| Document                                                             | Scope & Contents                                                                                                                                |
| :------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **[`architecture-and-rules.md`](./architecture-and-rules.md)**       | 4-layer boundaries, 10 inviolable rules, decision trees, anti-patterns, and the Immutable Core contract.                                        |
| **[`core-engine.md`](./core-engine.md)**                             | Orchestration microkernel (`usePage`, scoped store, dynamic resolvers), Dock & modules, 19 pure UI primitives, motion roles, and design tokens. |
| **[`domain-and-infrastructure.md`](./domain-and-infrastructure.md)** | Auth & Account features, 100% passwordless OTP/Passkeys, Supabase SSR, Upstash Redis rate-limiter, and edge proxy.                              |
| **[`workflows-and-git.md`](./workflows-and-git.md)**                 | Project scaffolding, upstream sync, CLI generators, and the visual dual-remote Git workflow (`origin` vs `upstream`).                           |
| **[`modules/`](./modules/README.md)**                                | Per-module reference (purpose, public API, usage, file map, dependencies) and the canonical module template.                                    |
| **[`testing.md`](./testing.md)**                                     | Test layout, the harness, conventions and what is deliberately left to manual checks.                                                           |

---

## 3. Working in the Codebase

1. **Before writing code:** read [`architecture-and-rules.md`](./architecture-and-rules.md) for the import restrictions and the 10 inviolable rules.
2. **Finding your way:** each module has a reference page under [`modules/`](./modules/README.md) with its public API and file map.
3. **Before committing:** run `npm run type-check && npm run lint && npm run check:architecture && npm test`.
