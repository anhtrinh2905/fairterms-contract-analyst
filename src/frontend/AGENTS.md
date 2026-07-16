# FairTerms Frontend — AI Agent Guide

Read this file **before** editing frontend code. Also read [`README.md`](README.md) and [`RULES.md`](RULES.md) in this folder.

Shared monorepo context: [`.agents/AGENTS.md`](../../.agents/AGENTS.md) and [root `README.md`](../../README.md).

## Product context

**FairTerms / HopDongAI** — Vietnamese real-estate contract review:

> Hiểu hợp đồng BĐS trước khi ký — AI phát hiện điều khoản rủi ro, giải thích dễ hiểu và trích dẫn đúng đoạn hợp đồng gốc.

**Current user flow (implemented):**

```text
Landing → Auth (Google) or Guest (3 free uses) → Upload PDF/PNG/JPG
  → FastAPI OCR + structuring → ContractMode / ClauseMode analysis
  → Checklist evaluation + legal RAG citations → ChatPanel (RAG agent)
```

The product is a **preliminary review assistant**, not a lawyer. Keep disclaimers and avoid overconfident legal conclusions.

## Actual stack (2026)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Auth | NextAuth v5 (Google OAuth) |
| Database | PostgreSQL via Prisma 7 |
| Backend AI | FastAPI at `NEXT_PUBLIC_BACKEND_URL` (default `http://127.0.0.1:8010`) |
| Styling | **Tailwind CSS v4 + shadcn/ui** (redesign in progress) — tokens in [`DESIGN.md`](DESIGN.md). Legacy `fairterms.css` still styles unmigrated views. |
| Validation | Zod |

[`DESIGN.md`](DESIGN.md) owns HOW IT LOOKS and wins on conflict with any mock or ad-hoc component. Reference its tokens; never hardcode hex. Risk levels are always shown with icon + text, never color alone.

**Do not add** Supabase or Redux unless explicitly requested.

> Next.js 16 may differ from older training data. Check `node_modules/next/dist/docs/` for deprecations when unsure.

## Implemented vs planned

| Feature | Status |
|---------|--------|
| Landing page | ✅ |
| Google OAuth + guest mode (3 uses) | ✅ |
| Upload → OCR/structuring (via backend) | ✅ |
| Full-contract UI (`ContractMode`) | ✅ |
| Single-clause UI (`ClauseMode`) | ✅ |
| RAG agent chat (`ChatPanel`) | ✅ |
| Analysis history | 🔜 |
| PDF export | 🔜 |
| Admin dashboard | ✅ |
| Paste text upload | 🔜 |

**Supported checklists:** `mua_ban_can_ho_chung_cu`, `cho_thue_can_ho_chung_cu`.

## Directory structure

```text
src/frontend/
├── app/
│   ├── page.tsx                    # Landing
│   ├── layout.tsx, globals.css
│   ├── landing/Landing.tsx
│   ├── app/page.tsx                # FairTermsApp entry
│   ├── fairterms/
│   │   ├── components/
│   │   │   ├── FairTermsApp.tsx
│   │   │   ├── analysis/           # ContractMode, ClauseMode, ChatPanel
│   │   │   ├── auth/               # AuthLanding, AuthPromoPanel
│   │   │   └── ui/                 # primitives, icons
│   │   └── lib/data.ts             # UI domain types (Vietnamese)
│   └── api/
│       ├── auth/[...nextauth]/     # NextAuth handlers
│       └── guest/start/            # Guest session creation
├── lib/
│   ├── api/client.ts               # FastAPI client — all backend calls
│   ├── api/types.ts                # Backend response types
│   ├── api/mappers.ts              # Backend → UI mapping + PII mask
│   ├── auth/                       # Guest session, usage quota
│   ├── security/hash.ts            # Hash IP/UA (never store raw)
│   └── prisma.ts
├── auth.ts                         # NextAuth config
├── prisma/schema.prisma            # User, GuestSession, UsageEvent
└── app/generated/prisma/         # Prisma client output
```

## Backend integration

All AI work runs on FastAPI. Frontend only calls HTTP APIs:

```typescript
import { ocrContractStructured, evaluateClause } from "@/lib/api/client";
```

- Add new endpoints in `lib/api/client.ts` + `lib/api/types.ts`
- Map responses in `lib/api/mappers.ts` — **not** in components
- Backend field names: snake_case (checklist uses Vietnamese keys like `loai_hop_dong`, `muc_rui_ro`)

## Auth & usage quota

- **Signed-in:** NextAuth Google OAuth (`auth.ts`)
- **Guest:** `POST /api/guest/start` → `guest_session` cookie, limit 3 uses
- Before expensive actions: `requireUsageAllowance({ request, action })`
- Link guest to user on sign-in: `link-guest-to-user.ts`

## Agent workflow (frontend tasks)

1. Read this file + `RULES.md` + `.agents/rules/frontend.md`
2. Read files you will change (do not scan the whole repo)
3. Smallest correct change following existing patterns
4. Run `npm run lint` from `src/frontend`
5. Report: files changed, how to test, limitations

## Run locally

```bash
cd src/frontend
npm install
npx prisma migrate deploy   # needs DATABASE_URL in root .env
npm run dev                   # http://localhost:3000
```

Env vars live in the **repo root** `.env` (see root `README.md`).

## Further reading

| Document | Purpose |
|----------|---------|
| [`README.md`](README.md) | Setup, scripts, env |
| [`RULES.md`](RULES.md) | Agent operating rules for this app |
| [`.agents/rules/frontend.md`](../../.agents/rules/frontend.md) | Detailed frontend conventions |
| [`.agents/rules/naming.md`](../../.agents/rules/naming.md) | Field names, slugs |
| [`.agents/rules/legal-safety.md`](../../.agents/rules/legal-safety.md) | Disclaimer, PII, copy |
| [`src/backend/README.md`](../../src/backend/README.md) | Backend API reference |
