# Frontend RULES — AI Agent Operating Rules

These rules apply to **FairTerms frontend** (`src/frontend/`). Read with [`AGENTS.md`](AGENTS.md) and [`README.md`](README.md).

Shared monorepo rules: [`.agents/rules/`](../../.agents/rules/) (especially `project.md`, `naming.md`, `legal-safety.md`, `frontend.md`).

---

## 1. Before editing

**Mandatory reads** (do not skip):

1. [`README.md`](README.md) — setup and module map
2. [`AGENTS.md`](AGENTS.md) — current stack and implemented features
3. [`.agents/AGENTS.md`](../../.agents/AGENTS.md) — product goals and backend integration
4. Task-specific rule in `.agents/rules/` (e.g. `frontend.md`, `legal-safety.md`)
5. Source files you will change and their neighbors

**Trust the code over docs.** If docs disagree with code, follow the code and note the doc drift.

**Current stack:** Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui + Prisma + PostgreSQL + NextAuth + FastAPI backend. **Not** Supabase unless explicitly requested.

**Styling:** A full redesign onto **Tailwind CSS v4 + shadcn/ui** is in progress (user-approved). [`DESIGN.md`](DESIGN.md) is the design source of truth — it wins on conflict with any mock, import, or ad-hoc component. Reference DESIGN tokens; do not hardcode hex. Legacy `fairterms.css` still styles unmigrated views (e.g. `ContractMode`) — leave it in place until its screens are ported.

---

## 2. Default behavior

- Make the **smallest correct change** that solves the task.
- Follow existing patterns in neighboring files.
- Do not introduce new frameworks, UI libraries, or state managers without approval.
- Do not remove security, validation, usage quota, or legal disclaimer logic.
- Do not log full contracts, prompts, or PII.
- Do not commit real contracts or secrets.

After changes, run `npm run lint` from `src/frontend`.

---

## 3. Product scope

### Current flow (prioritize this)

```text
Auth/Guest → Upload file → Backend OCR/structure → Select contract type
  → Contract or clause analysis → Risks + legal citations → RAG chat
```

### Implemented

- Google OAuth, guest mode (3 uses), usage tracking
- PDF/PNG/JPG upload via backend OCR
- `ContractMode` and `ClauseMode` analysis UI
- `ChatPanel` RAG agent chat
- PII masking in display, hashed IP/UA for usage events

### Planned (do not build unless asked)

- Analysis history persistence in UI
- PDF export
- Admin dashboard
- Paste-text upload
- Payments, e-signature, native app, fine-tuning

### Do not build unless explicitly asked

- Supabase migration
- Fine-tuning, payments, team workspace, multi-language outside Vietnamese

---

## 4. Architecture rules

### Backend calls

- **All** FastAPI calls go through `lib/api/client.ts`.
- New endpoint → add function in `client.ts`, type in `types.ts`, map in `mappers.ts`.
- Do not call the backend directly from components with raw `fetch` unless extending `client.ts` patterns.

### Server vs client

- `"use client"` only when needed (state, effects, handlers).
- Auth, DB, secrets → Route Handlers or server modules only.
- Never import server-only code into client components.

### Types and mapping

- Backend: snake_case; checklist fields often Vietnamese (`loai_hop_dong`, `muc_rui_ro`).
- UI types: `app/fairterms/lib/data.ts` (Vietnamese domain names).
- Transform only in `lib/api/mappers.ts`; use `maskPii()` for displayed PII.

### Auth and quota

- Use `auth()` or `getCurrentActor()` for session.
- Gate expensive actions with `requireUsageAllowance`.
- Guest limit: 3 uses (`GuestSession.usageLimit`).

### Database

- Schema changes → Prisma migration; do not edit DB manually.
- Client output: `app/generated/prisma/`.

---

## 5. UI / UX rules

- User-facing copy: **Vietnamese**, plain language.
- Risk levels in UI: `cao` | `trung_binh` | `thap` | `khong` — do not invent new levels.
- Every important flow: loading, error, and empty states.
- Keep the legal disclaimer in analysis UI (see `.agents/rules/legal-safety.md`).

---

## 6. Legal safety (summary)

- Product is preliminary review only — not a lawyer.
- Do not advise "sign" / "don't sign" or invent legal articles.
- Contract findings need `trich_dan` (citation) from contract text.
- RAG answers must cite law + article; admit insufficient evidence when needed.

Full rules: [`.agents/rules/legal-safety.md`](../../.agents/rules/legal-safety.md).

---

## 7. Privacy

- Hash IP and user-agent (`lib/security/hash.ts`); never store raw values.
- Mask PII in UI via mappers.
- Do not put real contracts in repo fixtures; use placeholders like `[TÊN BÊN A]`.

---

## 8. Definition of done (frontend feature)

A feature is done when:

- It works in dev with backend + DB configured.
- Lint passes (`npm run lint`).
- Loading/error/empty states exist where relevant.
- Vietnamese UX copy is appropriate.
- No secrets or PII in logs or commits.
- Legal disclaimer preserved where analysis is shown.
