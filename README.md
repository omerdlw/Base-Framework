# Base Framework — Starter Template

A production-ready Next.js foundation for passwordless, app-like web products. Powered by the [`@omerdlw/base-framework`](https://www.npmjs.com/package/@omerdlw/base-framework) microkernel engine and declarative UI chrome (dock, modals, toasts), with Supabase Auth, Upstash rate limiting, and 1-command scaffolding.

## Highlights

- **Microkernel Engine.** Powered by `@omerdlw/base-framework`. Pages describe their chrome declaratively with `usePage({ title })`; UI modules (Dock, Modal, Toast, Ambient, Context Menu) are completely decoupled.
- **Themeable by Configuration.** Every UI module and primitive reads its visual tokens from `src/config/*.theme.ts`. Restyling your entire app never touches framework code.
- **Passwordless Identity.** Supabase Auth SSR with Email OTP, Passkeys (WebAuthn), and OAuth out of the box, with session management and user profile flows.
- **Strict Boundary Enforcement.** Clean layered architecture validated by ESLint and boundary tests.
- **Edge-Ready.** First-class deployment to Cloudflare Workers via OpenNext.
- **One-Command Project Scaffolding.** Clone this template and turn it into your own brand with `npm run project:scaffold`.

## Stack

- **Framework:** Next.js 16 (App Router), React 19
- **Engine & UI Chrome:** [`@omerdlw/base-framework`](https://www.npmjs.com/package/@omerdlw/base-framework) (v1.0.4+)
- **Styling:** Tailwind CSS v4 (`@theme`, custom utilities)
- **Motion:** Motion (v13 GPU-accelerated transforms)
- **Database & Auth:** Supabase (Auth SSR, Postgres, Realtime)
- **Rate Limiting:** Upstash Redis (with in-memory fallback)
- **Deployment:** Cloudflare Workers (OpenNext)

## Architecture

```
src/app             routing, layout, and composition (page, providers, registry)
src/config          theme token configurations and project identity (project.config.json)
src/features        domain modules: auth, account, shell
src/infrastructure  external adapters: supabase, http, redis, security
[npm dependency]    @omerdlw/base-framework (kernel, dock, modal, toasts, tokens, hooks)
```

Imports strictly follow a downward hierarchy. Domain features never depend on `src/app`, and infrastructure adapters remain domain-agnostic.

## Getting Started

Requirements: Node.js 22+, npm, and Docker (for local Supabase).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local

# 3. Start local Supabase (Auth, DB, Storage, Inbucket)
npm run supabase:start

# 4. Start the Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).  
Sign-in OTP codes sent by local Supabase arrive in **Inbucket** at [http://127.0.0.1:54324](http://127.0.0.1:54324).  
Use `npm run supabase:reset` to seed local demo accounts (e.g. `test@baseframework.dev`).

## Create a New Project

To turn this template into your own product:

```bash
# Preview what scaffolding will change
npm run project:scaffold -- "My Product" myproduct.com --dry-run

# Rebrand into your new project
npm run project:scaffold -- "My Product" myproduct.com
```

Scaffolding rebrands `project.config.json`, package identity, Supabase project IDs, Cloudflare worker names, and initializes your project baseline.

## Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Next.js production build |
| `npm run type-check` | TypeScript compiler validation (`tsc --noEmit`) |
| `npm run lint` | ESLint layer boundaries and code quality check |
| `npm test` | Run architecture boundary and behavior tests |
| `npm run format` | Prettier code formatting |
| `npm run project:scaffold` | Scaffold / rebrand into a new downstream project |
| `npm run generate` | Scaffold a new feature (`feature <name>`) or page (`page <path>`) |
| `npm run preview` / `deploy` | Cloudflare Workers preview and deployment |
| `npm run supabase:start` / `reset` | Manage local Supabase Docker stack and seed data |

## License

[MIT](LICENSE) © 2026 Ömer Deliavcı
