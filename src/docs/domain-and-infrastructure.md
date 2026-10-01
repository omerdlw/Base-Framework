# Domain Features & Infrastructure Layer

> **Features Location:** `src/features/` (Domain capabilities)  
> **Infrastructure Location:** `src/infrastructure/` (External platform adapters)

---

## 1. Domain Capabilities (`src/features/`)

Features follow a strict 3-part layout:

- `index.ts`: Re-exports public client types, hooks, components.
- `client.ts` & `provider.tsx`: Client store, context, and fetcher.
- `server/`: Server actions (`"use server"`) and DB queries (`import "server-only";`).

### Feature: Auth (`src/features/auth`)

- **100% Passwordless:** Zero passwords exist in Base Framework. Authentication uses 6-digit Email OTP or WebAuthn/Passkeys.
- **Local Testing:** OTP codes are sent to **Inbucket** (`http://127.0.0.1:54324`).
- **Server Guard:** `requireUser()` returns authenticated user or throws Next.js redirect; `getOptionalUser()` returns `User | null`.

### Feature: Account & Social (`src/features/account`)

- **Profile Management:** Handle, display name, bio, avatar, and media view.
- **Security & Sessions:** Active session audit, remote revocation, Passkey registration.
- **Social Graph:** Follow / unfollow with pending request approvals for private profiles (`is_private: true`).
- **Realtime Sync:** Centralized `SocialRealtimeSync` listens to Postgres changes and emits `globalEvents` without individual components subscribing directly.

---

## 2. Seed Test Accounts (`supabase/seed.sql`)

| Username        | Email                      | Role & Profile State     | Test Purpose                        |
| :-------------- | :------------------------- | :----------------------- | :---------------------------------- |
| `alex_creator`  | `alex@baseframework.dev`   | Public, Lead Architect   | Full mutual follows & notifications |
| `sarah_dev`     | `sarah@baseframework.dev`  | Public, Infrastructure   | Reciprocal follow testing           |
| `elena_design`  | `elena@baseframework.dev`  | **Private**, Design Lead | Follow request & approval flow      |
| `marcus_mobile` | `marcus@baseframework.dev` | Public, Mobile Lead      | Standard user interactions          |
| `test_user`     | `test@baseframework.dev`   | Public, Sandbox QA       | Clean sandbox account               |

---

## 3. Infrastructure Adapters (`src/infrastructure/`)

### Supabase SSR (`src/infrastructure/supabase/`)

- `createServerSupabaseClient()`: Default client for Server Components, Route Handlers, and Server Actions. Enforces Postgres Row Level Security (RLS).
- `createBrowserSupabaseClient()`: Singleton client for client-side queries and WebAuthn.
- `createAdminSupabaseClient()`: Service role client with RLS bypass. Strictly restricted to account deletion (`deleteAccountAction`).

### Security & Distributed Cache (`src/infrastructure/security/` & `redis/`)

- **Rate Limiting:** `checkRateLimitAsync()` uses Upstash Redis in production with an in-memory fallback for local development or disconnected environments.
- **Edge Security:** Origin validation (`verifyOrigin`), upload MIME/size validation, and standard security headers (`Content-Security-Policy`, `X-Frame-Options`).
- **HTTP Client:** Type-safe `requestJson` automatically emits auth error events on `401 Unauthorized`.
