---
description: "Project goals, architecture, and general working rules"
activation: always-on
---

# Project rules — FairTerms / HopDongAI

## Goal

Analyze Vietnamese real-estate contracts in a **safe, cited, easy-to-understand** way:

- Cite the exact contract text when discussing contract content
- Cite legal articles when using legal knowledge (RAG)
- Do not invent clauses, article numbers, penalties, or deadlines
- Do not replace a lawyer; always include a disclaimer

## Priority scope (P0)

1. Upload/OCR contracts (PDF/PNG/JPG)
2. Structuring → display contract info and clauses
3. Risk evaluation via checklist (by contract type)
4. Google auth + guest session with quota
5. Legal RAG (hybrid search + citations)

## Do not do unless explicitly requested

- Fine-tuning, payments, native app, e-signature
- Stack swaps (Supabase instead of Prisma, Redux, etc.)
- Large unrelated refactors
- Committing secrets, real contracts, or PII to the repo

## Code change principles

- **Smallest change** that solves the problem correctly
- **Follow existing patterns** — read neighboring files before writing new code
- **Do not guess architecture** — if docs and code disagree, trust the code
- **Keep API compatibility** for endpoints in use
- **Do not log** full contracts, prompts, or PII

## Module responsibilities

| Module | Directory | Responsibility |
|--------|-----------|----------------|
| OCR + structuring | `src/backend/app/services/` | Gemini OCR, contract JSON |
| Legal RAG | `src/backend/app/rag/` | Ingest, retrieve, citations |
| Checklist | `src/backend/app/checklists/` | Load checklist MD, evaluate clauses |
| Agent chat | `src/backend/app/agents/` | RAG-augmented chat |
| API routes | `src/backend/app/api/routes/` | Thin HTTP layer |
| Analysis UI | `src/frontend/app/fairterms/` | ContractMode, ClauseMode |
| Auth/quota | `src/frontend/lib/auth/` | NextAuth, guest session |
| Backend client | `src/frontend/lib/api/` | client, types, mappers |

## Env & secrets

- `.env` lives at the **repo root**; backend reads it via `../../.env`
- Keys: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`, `AUTH_*`
- Do not hardcode keys; do not expose keys on the client (`NEXT_PUBLIC_*` is for public URLs only)

## Pre-completion checklist

- [ ] Changed files listed clearly
- [ ] Relevant tests/lint run (or explain why not)
- [ ] Existing endpoints/UI not broken
- [ ] Vietnamese copy for user-facing text
- [ ] Disclaimer/legal safety preserved if touching analysis UI
