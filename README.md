# HookKit

API-first **Webhook Inbox** + **Form Backend** for static sites. No AI. English UI.

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Node 22 LTS

## Quick start

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

- Landing: [http://localhost:3000](http://localhost:3000)
- Dashboard (mock UI): [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## Project status

**Phase 8 (staging live):** Neon + Clerk + Vercel, maintenance mode, legal pages. См. [`STATE.md`](./STATE.md).

## API (CP-1 + CP-2 + CP-3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/h/{inboxId}` | Accept webhook (JSON or form, max 256 KB) |
| `GET` | `/h/{inboxId}` | Inbox meta + curl example |
| `GET` | `/api/inboxes/{inboxId}/events` | List events (`?limit=50&cursor=uuid`) |
| `POST` | `/f/{formId}` | Accept form submit (JSON, form, multipart) |
| `GET` | `/f/{formId}` | Form meta + example |
| `GET` | `/api/forms/{formId}/submissions` | List submissions (`?includeSpam=1`) |
| `GET` | `/api/v1/forms` | List forms (Neon) or file-mode hint |

Demo inbox: `wh_demo_guest` · Demo form: `frm_demo_guest`

## Database (Neon)

```bash
# .env.local
DATABASE_URL=postgresql://...

npm run db:push
npm run db:seed
```

**Roadmap & checkpoints:** [`STATE.md`](./STATE.md)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (40 tests: unit + security) |
| `npm run db:push` | Apply Drizzle schema to Neon |
| `npm run db:seed` | Seed guest demo inbox + form |

## Environment

See `.env.example`. No secrets required for the UI-only phase.

## License

MIT — portfolio / open source friendly.
