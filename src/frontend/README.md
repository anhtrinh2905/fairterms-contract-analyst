# FairTerms Frontend

Next.js 16 App Router UI for **FairTerms** — Vietnamese real-estate contract review with OCR, checklist risk analysis, and legal RAG citations.

Monorepo root: [`../../README.md`](../../README.md). AI agent guide: [`AGENTS.md`](AGENTS.md).

## Stack

- Next.js 16, React 19, TypeScript
- NextAuth v5 (Google OAuth)
- Prisma 7 + PostgreSQL
- Calls FastAPI backend for OCR, checklist evaluation, and RAG

## Prerequisites

- Node.js 20+
- PostgreSQL (local or hosted)
- Backend running at `http://127.0.0.1:8010` (see [`src/backend/README.md`](../../src/backend/README.md))
- Root `.env` configured (copy from `.env.example`)

Required env vars (in repo root `.env`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `AUTH_URL` | Canonical NextAuth URL, e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_BACKEND_URL` | Optional; default `http://127.0.0.1:8010` |

## Setup

```bash
cd src/frontend
npm install
npx prisma migrate deploy
npm run dev
```

- Landing: http://localhost:3000
- App: http://localhost:3000/app

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/app` | Main app — upload, contract/clause analysis, chat |
| `/api/auth/*` | NextAuth handlers |
| `/api/guest/start` | Create guest session (3 free uses) |

## Key modules

| Path | Role |
|------|------|
| `app/fairterms/components/FairTermsApp.tsx` | App shell and flow orchestration |
| `app/fairterms/components/analysis/` | ContractMode, ClauseMode, ChatPanel |
| `lib/api/client.ts` | HTTP client for FastAPI backend |
| `lib/api/mappers.ts` | Backend responses → UI types + PII masking |
| `lib/auth/require-usage-allowance.ts` | Guest/signed-in usage quota |
| `prisma/schema.prisma` | User, GuestSession, UsageEvent |

## Database

Prisma client is generated to `app/generated/prisma/`.

```bash
# After schema changes
npx prisma migrate dev --name <description>
```

Models: `User`, `Account`, `Session`, `GuestSession`, `UsageEvent`.

## For AI coding agents

**Read before editing:**

1. [`AGENTS.md`](AGENTS.md) — frontend context and structure
2. [`RULES.md`](RULES.md) — operating rules
3. [`.agents/AGENTS.md`](../../.agents/AGENTS.md) — monorepo overview
4. [`.agents/rules/frontend.md`](../../.agents/rules/frontend.md) — conventions

Cursor loads mandatory rules from [`.cursor/rules/`](../../.cursor/rules/).
