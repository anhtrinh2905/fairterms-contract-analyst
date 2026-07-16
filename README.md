# FairTerms

**Hiểu hợp đồng BĐS trước khi ký** — AI-powered Vietnamese real-estate contract review with clause-level risk analysis, contract citations, and legal RAG.

FairTerms helps users upload a contract (PDF/image), extract and structure its content, evaluate clauses against type-specific checklists, and surface legal references from an indexed corpus of Vietnamese property law. The product is a preliminary review assistant — **not a replacement for a lawyer**.

---

## What the app does today


| Capability                                                | Status     |
| --------------------------------------------------------- | ---------- |
| Landing page + app shell                                  | ✅          |
| Google OAuth (NextAuth) + guest mode (3 free uses)        | ✅          |
| Upload contract PDF/PNG/JPG → OCR (Gemini)                | ✅          |
| Structured contract JSON (parties, clauses, metadata)     | ✅          |
| Full-contract analysis UI (`ContractMode`)                | ✅          |
| Single-clause analysis UI (`ClauseMode`)                  | ✅          |
| Checklist-based risk evaluation (GPT-4o)                  | ✅          |
| Legal RAG (ChromaDB + BM25 hybrid, citations)             | ✅          |
| RAG agent chat                                            | ✅          |
| Persisted auth, guest sessions, usage events (PostgreSQL) | ✅          |
| Analysis history / PDF export / admin dashboard           | 🔜 Planned |


**Supported contract checklists:** apartment sale (`mua_ban_can_ho_chung_cu`), apartment lease (`cho_thue_can_ho_chung_cu`).

**Legal corpus:** 17 Vietnamese legal markdown files under `src/backend/app/rag/data/` (property law, land law, housing law, decrees, etc.).

---

## Architecture

Monorepo with a **Next.js frontend** and a **FastAPI backend** that handles AI-heavy work.

```text
Browser (Next.js :3000)
  ├─ Landing (/)
  ├─ App (/app) — upload, contract/clause analysis
  ├─ NextAuth + guest API routes
  └─ lib/api/client.ts ──HTTP──► FastAPI (:8010)
                                    ├─ OCR + structuring (Gemini)
                                    ├─ Checklist evaluation (GPT-4o)
                                    ├─ Legal RAG (ChromaDB + BM25)
                                    └─ Agent chat

PostgreSQL (Prisma)          ChromaDB + BM25 (.chroma/)
  User, Session,               Legal markdown corpus
  GuestSession, UsageEvent
```

```text
fairterms/
├── .env                      # Shared environment (backend + frontend)
├── scripts/dev-local.sh      # Start local dev stack (proxy + backend + frontend)
├── .agents/                  # AI agent guides — read before coding
├── README.md                 # This file
├── RULES.md                  # Legal RAG principles
├── src/
│   ├── backend/              # FastAPI Python 3.12
│   └── frontend/             # Next.js 16 App Router
├── outputs/                  # OCR markdown output (gitignored)
└── scripts/                  # Git hooks, AI usage logging
```

For deeper backend layout see `[src/backend/README.md](src/backend/README.md)`.

---

## Tech stack

| Layer                           | Technologies                                                               |
| ------------------------------- | -------------------------------------------------------------------------- |
| Frontend                        | Next.js 16, React 19, TypeScript, Prisma, PostgreSQL, NextAuth v5 (Google) |
| Backend                         | FastAPI, Python 3.12, uv, Pydantic, pytest, ruff                           |
| OCR / structuring               | Google Gemini                                                              |
| Clause evaluation + RAG answers | OpenAI GPT-4o                                                              |
| Legal retrieval                 | ChromaDB, OpenAI embeddings, BM25 (rank-bm25)                              |
| Agent (legacy)                  | Anthropic Claude (optional)                                                |

---

## Prerequisites

- **Python 3.12** + [uv](https://docs.astral.sh/uv/)
- **Node.js 20+** + npm
- **Google Cloud SDK** + [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy) — connects local dev to the shared Cloud SQL instance (no local PostgreSQL required)
- API keys:
  - `GEMINI_API_KEY` — OCR and contract structuring (required for upload flow)
  - `OPENAI_API_KEY` — checklist evaluation, RAG query, and RAG embeddings (required for analysis)
  - `ANTHROPIC_API_KEY` — optional, legacy agent only
- Google OAuth credentials for sign-in (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)

---

## Quick start (local dev)

Use `[scripts/dev-local.sh](scripts/dev-local.sh)` to start everything in one terminal (Cloud SQL Proxy, migrations, backend, frontend).

**First time:**

```bash
cp .env.example .env
# Edit .env — API keys, AUTH_*, DATABASE_URL (see Local development below)

brew install google-cloud-sdk cloud-sql-proxy uv node   # macOS
winget install -e --id Google.CloudSDK    # Window
gcloud auth application-default login
gcloud config set project contract-analysis-g145-vinuni

bash scripts/dev-local.sh setup
```

Set `DATABASE_URL` in `.env` (via proxy, no `sslmode`):

```env
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/fairterms?schema=public"
```

**Every day:**

```bash
bash scripts/dev-local.sh start    # Ctrl+C stops proxy + backend + frontend
```


| URL                                                      | Service            |
| -------------------------------------------------------- | ------------------ |
| [http://localhost:3000](http://localhost:3000)           | Frontend (landing) |
| [http://localhost:3000/app](http://localhost:3000/app)   | App UI             |
| [http://127.0.0.1:8010/docs](http://127.0.0.1:8010/docs) | Backend API docs   |


**Other commands:**

```bash
bash scripts/dev-local.sh stop      # stop services started by the script
bash scripts/dev-local.sh status    # check running processes
PROXY_PORT=5433 bash scripts/dev-local.sh start   # if local Postgres uses port 5432
```

Logs: `.dev-local/*.log`

**Docker alternative:** `docker compose -f deploy/docker-compose.local.yml up --build` — see [Local development](#local-development).

---

## Local development

Details and manual steps if you prefer not to use `[scripts/dev-local.sh](scripts/dev-local.sh)`. For the fastest path, use [Quick start (local dev)](#quick-start-local-dev) above.

The team database runs on **GCP Cloud SQL** (`fairterms-db`). For local dev, use **Cloud SQL Auth Proxy** so the app connects to `127.0.0.1:5432` while the proxy handles TLS to GCP. You do **not** need to add your laptop IP to GCP Authorized networks.

Full Docker Compose setup (proxy + backend + frontend): `[deploy/docker-compose.local.yml](deploy/docker-compose.local.yml)`.

### One-time setup

**1. Environment file**

```bash
cp .env.example .env
# Fill in API keys, AUTH_*, and DATABASE_URL (see below)
```

**2. Google Cloud credentials**

```bash
brew install google-cloud-sdk cloud-sql-proxy   # macOS
winget install -e --id Google.CloudSDK          # Window
gcloud auth application-default login
gcloud config set project contract-analysis-g145-vinuni
```

**3. `DATABASE_URL` in repo root `.env`**

Connect through the proxy on localhost. URL-encode special characters in the password (`?` → `%3F`, `@` → `%40`):

```env
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/fairterms?schema=public"
```

No `sslmode` is needed when using the proxy. `src/frontend/.env` is a symlink to the repo root `.env`.

**4. Database schema (first time only)**

With the proxy running (see below):

```bash
cd src/frontend
npx prisma migrate deploy
```

Use `prisma migrate deploy` to apply migrations from the repo — **not** `prisma db pull` (that introspects an existing DB and expects tables to already exist). The dev script runs migrations automatically on `start`.

### Option A — Script (recommended)

See [Quick start (local dev)](#quick-start-local-dev).

### Option B — Manual (three terminals)

**Terminal 1 — Cloud SQL Proxy**

```bash
# If port 5432 is busy (e.g. local Homebrew Postgres), stop it first:
brew services stop postgresql@16

# Or use another port and update DATABASE_URL accordingly:
# cloud-sql-proxy ... --port 5433

cloud-sql-proxy contract-analysis-g145-vinuni:asia-southeast1:fairterms-db --port 5432
```

Wait for: `The proxy has started successfully and is ready for new connections!`

**Terminal 2 — Backend**

```bash
cd src/backend
uv sync --group dev
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

- Health: [http://127.0.0.1:8010/health](http://127.0.0.1:8010/health)  
- API docs: [http://127.0.0.1:8010/docs](http://127.0.0.1:8010/docs)

On first startup, if the legal index is empty, the backend auto-ingests markdown files from `app/rag/data/`.

**Terminal 3 — Frontend**

```bash
cd src/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — landing page. App UI at [http://localhost:3000/app](http://localhost:3000/app).

Restart `npm run dev` after changing `.env` (Next.js loads env vars at startup).

### Option C — Docker Compose

Runs Cloud SQL Proxy, backend, and frontend together with hot reload:

```bash
docker compose -f deploy/docker-compose.local.yml up --build
```
$env:GCP_ADC_FILE = "C:\Users\ADMIN\AppData\Roaming\gcloud\application_default_credentials.json"
docker compose -f deploy/docker-compose.local.yml up --build

- Frontend: [http://localhost:3000](http://localhost:3000)  
- Backend: [http://localhost:8010](http://localhost:8010)

Requires `gcloud auth application-default login` on the host (credentials are mounted into the proxy container). The compose file rewrites `DATABASE_URL` host from `127.0.0.1` to `cloud-sql-proxy` inside Docker and runs `prisma migrate deploy` on frontend startup.

### Troubleshooting


| Symptom                                     | Fix                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `bind: address already in use` on port 5432 | Local Postgres is running — `brew services stop postgresql@16` or use proxy on port `5433` |
| `Can't reach database server at 3127.0.0.1` | Typo in `DATABASE_URL` — host must be `127.0.0.1`, not `3127.0.0.1`                        |
| `unable to verify the first certificate`    | You are connecting directly to Cloud SQL public IP — use the proxy instead                 |
| `P4001 introspected database was empty`     | Run `npx prisma migrate deploy`, not `db pull`                                             |
| Google login → `error=Configuration`        | Usually a DB connection failure — check proxy is running and restart `npm run dev`         |
| Auth works but upload fails                 | Backend not running on port 8010                                                           |


To rebuild the legal index manually:

```bash
cd src/backend
uv run python scripts/ingest.py app/rag/data/ --rebuild
```

After changing embedding model/provider, rebuild the legal index once so stored
vectors match the active OpenAI embedding dimension.

### Git hooks (one-time, for course AI logging)

```bash
bash scripts/setup_hooks.sh        # macOS / Linux
# or
powershell -ExecutionPolicy Bypass -File scripts\setup_hooks.ps1
```

---

## Environment variables

Copy from `[.env.example](.env.example)`. Key variables:


| Variable                  | Required       | Description                                                                                          |
| ------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`          | Yes (upload)   | Gemini OCR + structuring                                                                             |
| `OPENAI_API_KEY`          | Yes (analysis) | Checklist `/checklist/evaluate-clause` (OpenAI only) + RAG query                                     |
| `DEFAULT_MODEL`           | No             | OpenAI model for clause evaluation (default `gpt-4o-mini`)                                           |
| `EMBEDDING_MODEL`         | No             | OpenAI embedding model (default `text-embedding-3-small`)                                            |
| `EMBEDDING_OPEN_AI_API_KEY` | No           | Embedding API key; falls back to `OPENAI_API_KEY`                                                    |
| `OPENAI_EMBEDDING_MODEL`  | No             | Legacy OpenAI embedding model override for RAG                                                       |
| `OPENAI_EMBEDDING_DIMENSIONS` | No         | Optional reduced embedding dimension; unset uses model default                                       |
| `DATABASE_URL`            | Yes (frontend) | PostgreSQL via Cloud SQL Proxy, e.g. `postgresql://USER:PASS@127.0.0.1:5432/fairterms?schema=public` |
| `AUTH_SECRET`             | Yes (frontend) | NextAuth secret (`openssl rand -base64 32`)                                                          |
| `AUTH_GOOGLE_ID`          | Yes (frontend) | Google OAuth client ID                                                                               |
| `AUTH_GOOGLE_SECRET`      | Yes (frontend) | Google OAuth client secret                                                                           |
| `AUTH_URL`                | Yes (frontend) | Canonical NextAuth URL, e.g. `http://localhost:3000`; must match the Google OAuth redirect origin     |
| `NEXT_PUBLIC_APP_URL`     | Yes            | Frontend URL, e.g. `http://localhost:3000`                                                           |
| `NEXT_PUBLIC_BACKEND_URL` | No             | Backend URL (default `http://127.0.0.1:8010`)                                                        |
| `ANTHROPIC_API_KEY`       | No             | Legacy `/agent/chat`                                                                                 |
| `RAG_USE_RERANKER`        | No             | Legacy no-op flag; local reranker models are disabled                                                |
| `CHROMA_PERSIST_DIR`      | No             | ChromaDB path (default `.chroma`)                                                                    |
| `LOG_LEVEL`               | No             | Backend log level (`INFO`)                                                                           |

Gemini tuning (optional): `GEMINI_MODEL`, `GEMINI_TIMEOUT_SECONDS`, `GEMINI_MAX_UPLOAD_MB`, `GEMINI_PDF_PAGE_CONCURRENCY`, `GEMINI_STRUCTURING_MODEL` — see `.env.example`.

---

## Backend API

Base URL: `http://127.0.0.1:8010`


| Method | Path                           | Description                  |
| ------ | ------------------------------ | ---------------------------- |
| GET    | `/health`                      | Health check                 |
| POST   | `/api/ocr/contract`            | OCR → Markdown               |
| POST   | `/api/ocr/contract/structured` | OCR + structured JSON        |
| GET    | `/checklist/types`             | List contract types          |
| GET    | `/checklist/{loai_hop_dong}`   | Checklist detail             |
| POST   | `/checklist/evaluate-clause`   | Evaluate one clause          |
| GET    | `/rag/status`                  | Legal index status           |
| POST   | `/rag/search`                  | Hybrid search (no LLM)       |
| POST   | `/rag/query`                   | Full RAG answer + citations  |
| POST   | `/rag/ingest-*`                | Admin: ingest legal markdown |
| POST   | `/agent/chat`                  | RAG agent chat               |


### OCR example

```bash
curl -X POST "http://127.0.0.1:8010/api/ocr/contract/structured" \
  -F "file=@hop_dong.pdf"
```

OCR output is also written to:

```text
outputs/<document_id>/reconstructed_contract.md
```

Editable OCR prompt: `src/backend/app/services/contract_ocr_system.txt`

### Clause evaluation example

```bash
curl -X POST "http://127.0.0.1:8010/checklist/evaluate-clause" \
  -H "Content-Type: application/json" \
  -d '{"loai_hop_dong":"cho_thue_can_ho_chung_cu","clause_text":"..."}'
```

---

## Frontend routes


| Route                     | Description                                      |
| ------------------------- | ------------------------------------------------ |
| `/`                       | Landing page                                     |
| `/app`                    | Main app — contract upload, full/clause analysis |
| `/api/auth/[...nextauth]` | NextAuth handlers                                |
| `/api/guest/start`        | Create or resume guest session (3-use quota)     |


---

## Testing

**Backend:**

```bash
cd src/backend
uv run pytest tests/ -v
uv run ruff check app/
```

**Frontend:**

```bash
cd src/frontend
npm run lint
```

---

## Documentation


| Document                                                             | Purpose                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------ |
| `[scripts/dev-local.sh](scripts/dev-local.sh)`                       | **Local dev — one command** (proxy + backend + frontend)     |
| `[deploy/docker-compose.local.yml](deploy/docker-compose.local.yml)` | Local dev with Docker (proxy + hot reload)                   |
| `[deploy/README.md](deploy/README.md)`                               | VM / CI/CD deploy (dev + main stacks)                        |
| `[.agents/rules/](.agents/rules/)`                                   | Backend API rules, frontend rules, naming, legal safety, RAG |
| `[.cursor/rules/](.cursor/rules/)`                                   | **Cursor** — auto-loaded rules (mandatory doc reads)         |
| `[src/frontend/README.md](src/frontend/README.md)`                   | Frontend setup, routes, scripts                              |
| `[src/frontend/AGENTS.md](src/frontend/AGENTS.md)`                   | Frontend agent guide (current stack)                         |
| `[src/frontend/RULES.md](src/frontend/RULES.md)`                     | Frontend agent operating rules                               |
| `[src/backend/README.md](src/backend/README.md)`                     | Backend structure and endpoints                              |
| `[RULES.md](RULES.md)`                                               | Legal RAG ingestion/retrieval principles                     |
| `[implementation_plan.md](implementation_plan.md)`                   | RAG system audit and roadmap                                 |


**Cursor (team default):** rules in `.cursor/rules/` with `alwaysApply: true` instruct agents to read READMEs and AGENTS files before coding — no extra prompt needed.

For other tools, include in your prompt:

```text
Read README.md, .agents/AGENTS.md, and the module README/AGENTS/RULES for the area you touch before making changes.
```

---

## Privacy & legal disclaimer

- Contracts may contain sensitive PII; the app masks displayed fields and hashes IP/user-agent for usage tracking.
- Do not commit real contracts, API keys, or `.env` to the repository.
- Analysis results are **for preliminary review only** and do not constitute legal advice. Users should consult a qualified real-estate lawyer for high-value or complex transactions.

---

## License

See repository settings or course materials for license terms.
