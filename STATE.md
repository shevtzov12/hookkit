# HookKit — State & Checkpoints

> Читай этот файл в начале нового чата вместо полного разбора репо.

## Что это

Webhook Inbox + Form Backend для статики. API-first, без AI.

## Стек

- Next.js 16 App Router, React 19, Tailwind 4, Node 22
- **Persistence:** file store (`.data/`) по умолчанию; **Neon Postgres** при `DATABASE_URL`
- **ORM:** Drizzle
- **Потом:** Upstash rate limits

## Карта роутов

| Route | Статус | Назначение |
|-------|--------|------------|
| `/` | done | Landing |
| `/dashboard` | done | UI + Clerk (optional) + live API keys |
| `/sign-in`, `/sign-up` | done | Clerk auth pages |
| `/h/[id]` | done | POST webhook (256 KB) |
| `/f/[id]` | done | POST form (honeypot, redirect) |
| `/api/inboxes/[id]/events` | done | GET events (guest public, rest auth) |
| `/api/forms/[id]/submissions` | done | GET submissions (guest public, rest auth) |
| `/api/v1/forms` | done | GET forms list (auth / API key) |
| `/api/v1/api-keys` | done | GET/POST API keys |
| `/api/v1/api-keys/[id]` | done | DELETE revoke key |
| `/api/v1/inboxes` | done | GET/POST inboxes (Neon + Clerk) |

## Структура кода

```
src/
  app/
    h/[id]/route.ts
    f/[id]/route.ts
    api/inboxes/[id]/events/
    api/forms/[id]/submissions/
    api/v1/forms/route.ts
    api/v1/api-keys/route.ts
    api/v1/inboxes/route.ts
    sign-in/ sign-up/
    dashboard/page.tsx
  lib/
    auth/                  # Clerk config, API keys, require-access
    db/                    # Drizzle schema, client, repositories, seed
    store/                 # facade → file or Neon
    forms/ webhooks/
    json-highlight.ts      # XSS-safe escape
  test/ setup.ts
drizzle/                   # SQL migrations
scripts/seed.ts
```

## Checkpoints

### CP-0 — Mock UI ✅

Landing + dashboard из HTML preview. GitHub: `shevtzov12/hookkit`.

### CP-1 — Webhook catch ✅

`POST /h/{id}`, file store, demo inbox `wh_demo_guest`, events API, dashboard live.

### CP-2 — Form submit ✅

`POST /f/{id}`, honeypot, redirect (same-origin), demo form `frm_demo_guest`, submissions API.

### CP-2.5 — Security + tests ✅

- **40 vitest tests** (unit, integration, security/jailbreak)
- Fixes: XSS в `highlightJson`, open redirect tightened, multipart size limit
- Known gap: IDOR на read API → **исправлено в CP-4**

### CP-3 — Neon + schema ✅

- Drizzle schema: `users`, `api_keys`, `inboxes`, `events`, `forms`, `submissions`
- Migration: `drizzle/0000_init.sql`
- Dual store: `DATABASE_URL` → Neon, иначе `.data/`
- Seed: `npm run db:seed` (guest demo inbox + form)
- `GET /api/v1/forms` — список форм из Neon

**Neon setup:**

```bash
# .env.local
DATABASE_URL=postgresql://...

npm run db:push      # применить схему
npm run db:seed      # wh_demo_guest + frm_demo_guest
npm run dev
```

### CP-4 — Auth (Clerk) + API keys ✅

- `@clerk/nextjs`: middleware защищает `/dashboard` (если ключи в env)
- Guest demo IDs (`wh_demo_guest`, `frm_demo_guest`) — публичный read
- Non-guest read: Clerk/API key + **ownership check** (Neon или `.data/resource-owners.json`)
- API keys: SHA-256 hash, file store `.data/api-keys.json` или Neon
- `GET/POST /api/v1/api-keys`, `DELETE /api/v1/api-keys/[id]`
- `GET/POST /api/v1/inboxes` (Neon + Clerk)
- Dashboard: live API keys tab, UserButton при Clerk

### CP-5 — Replay, rate limits, Turnstile (next)

## Локальная разработка

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
npm test             # 43+ tests
```

## Git

- Ветка: `main`
- CP-1…CP-4 локально, не закоммичено

## Google Tasks (OtomOsem TV's list)

Закрыто на CP-3 (2026-06-30):

- [x] CP-0…CP-2 tasks (init, UI, /h, /f, demo inbox/form, events API)
- [x] Neon — схема users, api_keys, inboxes, events
- [x] Forms — DB schema (+ GET /api/v1/forms; full CRUD → CP-4)
- [x] Public `/f/[publicId]`
- [x] Guest demo form `frm_demo_guest`

- [x] Auth (Clerk) + API keys backend
- [x] Inboxes CRUD (POST/GET /api/v1/inboxes)

Открыто: Replay, Rate limits, Turnstile, Resend, Vercel, Termly, /docs, лендинг polish, Export CSV.
