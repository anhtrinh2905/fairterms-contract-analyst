---
description: "Next.js, TypeScript, and UI rules for the frontend"
globs: "src/frontend/**"
---

# Frontend — Next.js & TypeScript

Actual stack: **Next.js 16 App Router**, **React 19**, **TypeScript**, **Prisma**, **PostgreSQL**, **NextAuth v5 (Google)**, **Zod**.

Read `src/frontend/README.md`, `src/frontend/AGENTS.md`, and `src/frontend/RULES.md` before editing. **Do not add** Supabase, Tailwind, or shadcn unless explicitly requested.

## Structure

```text
src/frontend/
├── app/
│   ├── layout.tsx, page.tsx, globals.css
│   ├── landing/              # Landing page
│   ├── app/page.tsx          # App shell (FairTermsApp)
│   ├── fairterms/
│   │   ├── components/       # UI components (analysis/, auth/, ui/)
│   │   └── lib/data.ts       # UI domain types (Vietnamese)
│   └── api/                  # Route Handlers (server-only)
│       ├── auth/[...nextauth]/
│       └── guest/start/
├── lib/
│   ├── api/                  # Backend client + mappers
│   ├── auth/                 # Guest, usage quota, getCurrentActor
│   ├── security/hash.ts      # Hash IP/UA (never store raw)
│   └── prisma.ts
├── auth.ts                   # NextAuth config
└── prisma/schema.prisma
```

## Component rules

- **Functional components** + hooks
- `"use client"` only when state/effects/event handlers are needed
- Server logic (auth, DB, secrets) → Route Handlers or server modules
- **Do not import** server-only code into client components

## Calling the FastAPI backend

All backend calls go through `lib/api/client.ts`:

```typescript
import { ocrContractStructured, evaluateClause } from "@/lib/api/client";
```

- Base URL: `NEXT_PUBLIC_BACKEND_URL` or default `http://127.0.0.1:8010`
- Parse errors via `BackendApiError` (reads FastAPI `detail`)
- New endpoint: add a function in `client.ts` + type in `types.ts`

## Mapper layer

Backend returns **snake_case** fields (OCR structured uses English keys; checklist uses Vietnamese keys).

UI uses Vietnamese types in `app/fairterms/lib/data.ts`.

**Always map through `lib/api/mappers.ts`**; do not put transform logic in components:

```text
Backend response → mappers.ts → UI types (ContractInfo, Analysis, Party, ...)
```

## API Route Handlers (Next.js)

Current pattern (`app/api/guest/start/route.ts`):

```typescript
export async function POST(request: Request) {
  try {
    // server logic
    return NextResponse.json({ ... });
  } catch (error) {
    console.error("[POST /api/guest/start] ...", error);
    return NextResponse.json({ error: "..." }, { status: 500 });
  }
}
```

- Log prefix: `[METHOD /path]`
- User-facing error messages in **Vietnamese**
- Auth: use `auth()` from `@/auth` or `getCurrentActor()`

## Auth & usage quota

- Google OAuth via NextAuth (`auth.ts`)
- Guest: `guest_session` cookie, API `POST /api/guest/start`
- Before expensive actions: `requireUsageAllowance({ request, action })`
- Guest limit: 3 uses (configured in `GuestSession.usageLimit`)

## Database (Prisma)

- Schema: `prisma/schema.prisma`
- Client output: `app/generated/prisma`
- **All schema changes** → new migration; do not edit the DB manually
- Current models: `User`, `Account`, `Session`, `GuestSession`, `UsageEvent`

## TypeScript style

- **camelCase**: variables, functions, props
- **PascalCase**: components, types, interfaces
- Avoid `any`; validate input with Zod when receiving from user/API
- Path alias: `@/` → `src/frontend/`
- Shared types from `lib/api/types.ts` or `fairterms/lib/data.ts`

## UI/UX

- User-facing copy: **Vietnamese**, plain language, minimal legal jargon
- Every important flow: loading, error, empty state
- UI risk levels: `cao` | `trung_binh` | `thap` | `khong` (do not invent new levels)
- Mask PII via `maskPii()` in mappers
- Theme: CSS variables in `fairterms.css` / `globals.css`

## CSS

- Currently uses custom CSS (`fairterms.css`, component inline styles)
- Do not add Tailwind/shadcn unless the task is a migration

## Scripts

```bash
cd src/frontend
npm run dev      # dev server :3000
npm run lint     # eslint
npm run build    # production build
```

## Adding a frontend feature — checklist

1. UI component in `app/fairterms/components/`
2. If backend needed: add client function + types + mapper
3. If auth/quota needed: use `requireUsageAllowance`
4. If DB needed: Prisma migration + schema update
5. Run `npm run lint`
