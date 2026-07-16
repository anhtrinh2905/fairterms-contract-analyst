# FairTerms / HopDongAI — AI Agent Guide

Read this file **before** editing code. You do not need to read the entire codebase if you understand the rules below.

## Product goal

**HopDongAI** is a LegalTech app for analyzing Vietnamese real-estate contracts:

> Understand your real-estate contract before signing — AI flags risky clauses, explains them in plain language, and cites the exact source text.

Main flow: **Auth/Guest → Upload contract → OCR + structuring → Clause analysis (checklist + RAG) → Display risks + legal basis**.

The product **does not** replace a lawyer. Always include a disclaimer and avoid overconfident legal conclusions.

## Actual architecture (2026)

Monorepo at the repo root:

```text
fairterms/
├── .env                    # Shared env vars (backend + frontend)
├── .agents/                # ← You are here
├── src/
│   ├── backend/            # FastAPI Python 3.12 (port 8010)
│   └── frontend/           # Next.js 16 App Router (port 3000)
├── outputs/                # OCR markdown output (gitignored)
└── scripts/                # Hooks, AI logging
```

| Layer | Stack | Role |
|-------|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Prisma, PostgreSQL, NextAuth (Google) | UI, auth, guest quota, backend calls |
| Backend | FastAPI, uv, ChromaDB, Gemini, OpenAI GPT-4o | OCR, legal RAG, checklist evaluation |
| AI | Gemini (OCR/structuring), GPT-4o (RAG query, clause evaluation), Claude (legacy agent) | Contract & legal processing |

**Note:** `src/frontend/AGENTS.md` and `src/frontend/RULES.md` describe the **current** frontend. Do not add Supabase, Tailwind, or shadcn unless explicitly requested.

## What to read before a task

| Task | Also read |
|------|-----------|
| Any task | `.agents/rules/project.md`, `.agents/rules/naming.md` |
| Backend API / Python | `.agents/rules/backend.md` |
| Frontend / Next.js | `.agents/rules/frontend.md` |
| RAG / legal documents | `.agents/rules/rag.md`, `RULES.md` (root) |
| Legal safety / UX copy | `.agents/rules/legal-safety.md` |
| AI usage logging | `.agents/rules/ai-log-hook.md` |

## Backend — quick endpoint map

Base URL: `http://127.0.0.1:8010` (or `NEXT_PUBLIC_BACKEND_URL`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/ocr/contract` | OCR → Markdown |
| POST | `/api/ocr/contract/structured` | OCR + structured JSON |
| GET | `/rag/status` | Index status |
| POST | `/rag/search` | Hybrid search (no LLM) |
| POST | `/rag/query` | Full RAG + citations |
| POST | `/rag/ingest-*` | Admin ingest legal documents |
| GET | `/rag/documents` | List legal source documents (metadata) |
| GET | `/rag/documents/{doc_id}` | Full legal document text (for the `/van-ban/[docId]` viewer) |
| GET | `/rag/documents/{doc_id}/download` | Download document as PDF (rendered via `app/rag/pdf_render.py`) |
| POST | `/agent/chat` | RAG agent chat |
| GET | `/checklist/types` | Contract type list |
| GET | `/checklist/{loai_hop_dong}` | Checklist detail |
| POST | `/checklist/evaluate-clause` | Evaluate one clause |
| POST | `/checklist/evaluate-coverage` | Missing mandatory required items for the whole contract |

API writing rules: `.agents/rules/backend.md`

## Frontend — main structure

```text
src/frontend/
├── app/
│   ├── page.tsx                    # Landing
│   ├── app/page.tsx                # Main app (FairTermsApp)
│   ├── fairterms/components/       # Contract analysis UI
│   └── api/                        # Next.js Route Handlers (auth, guest)
├── lib/
│   ├── api/client.ts               # FastAPI backend client
│   ├── api/types.ts                # Backend response types
│   ├── api/mappers.ts              # Backend → UI types (Vietnamese)
│   └── auth/                       # Guest session, usage quota
└── prisma/schema.prisma            # User, GuestSession, UsageEvent
```

## Agent workflow

1. **Scope the task** — backend, frontend, or both?
2. **Read relevant rules** in `.agents/rules/`
3. **Read specific files** you will change (do not scan the whole repo)
4. **Smallest correct change** following existing patterns
5. **Run tests/lint** as appropriate:
   - Backend: `cd src/backend && uv run pytest tests/ -v`
   - Frontend: `cd src/frontend && npm run lint`
6. **Report**: files changed, how to test, limitations

## Run locally

```bash
# Backend
cd src/backend && uv sync --group dev
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8010

# Frontend
cd src/frontend && npm install && npm run dev
```

Copy `.env.example` → `.env` at the repo root.

## Additional docs (read when going deeper)

- `README.md` — OCR API, env vars
- `src/backend/README.md` — detailed backend structure
- `RULES.md` (root) — legal RAG principles
- `src/frontend/README.md`, `src/frontend/AGENTS.md`, `src/frontend/RULES.md` — frontend setup and agent rules
- `implementation_plan.md` — RAG system audit
