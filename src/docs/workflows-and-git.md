# Workflows, CLI Tooling & Git Model

> **Scope:** Multi-site scaffolding, upstream framework synchronization, and dual-remote Git workflows.

---

## 1. Essential Commands Reference

| Command                             | Purpose                                                           |
| :---------------------------------- | :---------------------------------------------------------------- |
| `npm run dev`                       | Start Next.js local development server (`http://localhost:3000`)  |
| `npm test`                          | Run architecture boundary tests (`tests/architecture.test.js`)    |
| `npm run type-check`                | Validate TypeScript compiler (`tsc --noEmit`)                     |
| `npm run lint`                      | ESLint rules check                                                |
| `npm run format`                    | Prettier code formatting                                          |
| `npm run supabase:reset`            | Reset local database and seed test accounts                       |
| `npm run supabase:start` / `stop`   | Start or stop local Supabase containers                           |
| `npm run project:scaffold <name>`   | Scaffold downstream project (`scripts/scaffold.js`)               |
| `npm run project:rebrand -- <name>` | Re-run only the identity step (name, slug, domain)                |
| `npm run project:prune`             | Re-run only the cleanup of framework-only files                   |
| `npm run project:validate`          | Validate project identity and ensure zero template leaks          |
| `npm run framework:sync`            | Sync upstream framework updates into downstream project           |
| `npm run generate feature <name>`   | Scaffold a new feature under `src/features/` with barrel export   |
| `npm run generate page <path>`      | Scaffold a new route under `src/app/` with `usePage` client shell |

---

## 2. Multi-Project Scaffolding & Sync Architecture

Base Framework is an upstream template for downstream web products.

```
Upstream: Base Framework (github.com/org/base-framework)
  │
  ├─> project:scaffold "Client-A" ──> Downstream Repo A (origin: github.com/org/client-a)
  └─> project:scaffold "Client-B" ──> Downstream Repo B (origin: github.com/org/client-b)
```

### Downstream Invariants:

1. When `.framework-manifest.json` exists, `src/core` is **frozen** on project branches (`coreTreeHash`). Needing to edit it means an extension point is missing upstream: raise it there. `src/modules` is project-owned: edit, replace or remove modules freely.
2. Custom domain logic belongs in `src/features/` and `src/app/`.
3. Upstream improvements are synchronized via:
   ```bash
   npm run framework:sync
   ```
4. Before shipping, run `npm run project:validate` to ensure project identity consistency.

---

## 3. Dual-Remote Git Workflow

In downstream projects, Git manages two distinct remotes:

- `origin`: Downstream project repository (e.g., `git@github.com:my-org/my-app.git`).
- `upstream`: Base Framework engine repository (e.g., `git@github.com:my-org/base-framework.git`).

### Daily Development Flow:

1. **Feature Branching:** Create branch from `main` (`git checkout -b feat/checkout-flow`).
2. **Implementation:** Add domain code in `src/features/` and `src/app/`. Never touch `src/core/`.
3. **Verification:**
   ```bash
   npm run type-check && npm test
   ```
4. **Push:** Push to `origin` (`git push origin feat/checkout-flow`).
5. **Sync Upstream:** Run `npm run framework:sync` to incorporate upstream framework updates cleanly.

## 3. Scaffolding a project

```bash
git clone <base-framework-url> tvizzie && cd tvizzie
npm install
npm run project:scaffold -- "Tvizzie" tvizzie.com --dry-run   # preview
npm run project:scaffold -- "Tvizzie" tvizzie.com
```

**Rebrand.** Writes `project.config.json` (the single identity source; `src/config/project.ts` feeds it to the app metadata), `package.json` name, `supabase/config.toml` project id, `wrangler.jsonc` worker names, an empty `supabase/seed.sql` (`--keep-seed` to keep the demo accounts) and a project `README.md`.

**Prune.** Removes what only the framework needs, grouped in `scripts/framework-files.json`: `ai` (local agent guides and caches), `docs` (`src/docs/`), `tests` (`tests/`; `npm test` becomes the architecture check) and `scaffold` (the script itself). Keep a group with `--keep=docs,tests`. Kept regardless: `scripts/` tooling (`generate`, `sync`, `validate-project`, `check-architecture`) and CI.

**Baseline.** `.framework-manifest.json` records the upstream commit, the `src/core` tree hash and the pruned groups. `framework:sync` re-prunes those groups after every upstream merge, so deleted files never come back as conflicts.

Options: `--domain=`, `--slug=`, `--description=`, `--keep=<groups>`, `--keep-seed`, `--dry-run`, `--only=rebrand|prune`.
