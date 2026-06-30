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

**Phase 0 (current):** Dashboard UI ported from HTML preview with mock data.

**Next up:** Neon schema, auth, webhook catch route `/h/[id]`, form submit `/f/[id]`, API keys.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Environment

See `.env.example`. No secrets required for the UI-only phase.

## License

MIT — portfolio / open source friendly.
