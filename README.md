# Base Framework

A production-ready Next.js foundation for passwordless, app-like products: an orchestration kernel, a declarative UI chrome (dock, modals, toasts), email/passkey/OAuth authentication and account management, all rebrandable into a new project with one command.

## Highlights

- **Microkernel core.** Pages describe their chrome with `usePage({ title, dock, modal, ... })`; modules plug into the kernel and never import each other.
- **Themeable by configuration.** Every module, the primitives and the error boundary read their visuals from `src/config/*.theme.ts`, so restyling never touches framework code.
- **Passwordless identity.** Email OTP, passkeys (WebAuthn) and OAuth on Supabase Auth, with session management and rate limiting.
- **Typed, verified boundaries.** A five-layer architecture enforced by ESLint rules, an import-cycle check and architecture tests.
- **Made for users.** Failures never leak internals: one message gate (`toUserMessage`) decides what people read.
- **Edge-ready.** Deploys to Cloudflare Workers through OpenNext.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Motion · Supabase (Auth, Postgres, Realtime) · Upstash Redis · Cloudflare Workers

## Architecture

```
src/app             routing and composition (providers, registry)
src/features        domain: auth, account
src/modules         first-party UI modules: dock, modal, notification, ...
src/infrastructure  adapters: supabase, http, redis, security
src/core            kernel, error boundaries, primitives, hooks, utils, tokens
src/config          every theme, plus the project's identity (project.config.json at the root)
```

Imports only point downward. `src/core` is the engine and stays untouched in projects; `src/modules` belongs to the project. Details live in [`src/docs/`](src/docs/README.md).

## Getting started

Requirements: Node.js 22, npm, and Docker for the local Supabase stack.

```bash
npm install
cp .env.example .env.local
npm run supabase:start
npm run dev
```

Open http://localhost:3000. Sign-in codes sent by local Supabase arrive in Inbucket at http://127.0.0.1:54324; `npm run supabase:reset` seeds demo accounts such as `test@baseframework.dev`.

### Environment

| Variable                               | Purpose                                        |
| :------------------------------------- | :--------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | Public origin of the app                       |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key                       |
| `SUPABASE_SECRET_KEY`                  | Server only, used solely for account deletion  |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN`    | Distributed rate limiting (in-memory fallback) |

## Create a project

```bash
git clone https://github.com/omerdlw/Base-Framework.git my-product && cd my-product
npm install
npm run project:scaffold -- "My Product" myproduct.com --dry-run   # preview
npm run project:scaffold -- "My Product" myproduct.com
```

Scaffolding rebrands the app (`project.config.json`, package name, Supabase and Cloudflare identifiers), removes framework-only files and records the upstream baseline. Pull later improvements with `npm run framework:sync`. See [`src/docs/workflows-and-git.md`](src/docs/workflows-and-git.md).

## Scripts

| Command                            | Purpose                                    |
| :--------------------------------- | :----------------------------------------- |
| `npm run dev` / `build` / `start`  | Develop, build and serve                   |
| `npm run lint`                     | ESLint, including layer boundaries         |
| `npm run type-check`               | TypeScript, no emit                        |
| `npm run check:architecture`       | Import cycles and module peer declarations |
| `npm test`                         | Architecture and behavior tests            |
| `npm run format`                   | Prettier                                   |
| `npm run generate`                 | Scaffold a feature or a page               |
| `npm run preview` / `deploy`       | Cloudflare Workers preview and deploy      |
| `npm run supabase:start` / `reset` | Local Supabase stack and seed              |

## Deploying

```bash
npm run deploy
```

Set the variables above as Worker secrets. Apply `supabase/migrations` to your Supabase project before the first deploy.

## Documentation

Start at [`src/docs/README.md`](src/docs/README.md): architecture and rules, the core engine, domain and infrastructure, per-module references and the Git workflow.

## License

[MIT](LICENSE) © 2026 Ömer Deliavcı
