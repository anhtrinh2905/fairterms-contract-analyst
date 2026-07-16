# FairTerms Backend

FastAPI backend for contract OCR (Gemini), legal RAG (ChromaDB + BM25), checklist evaluation (GPT-4o), and RAG agent chat.

Monorepo root: [`../../README.md`](../../README.md). Shared agent guide: [`.agents/AGENTS.md`](../../.agents/AGENTS.md). API conventions: [`.agents/rules/backend.md`](../../.agents/rules/backend.md).

## Stack

- Python 3.12, FastAPI, uv, Pydantic
- Gemini — OCR and contract structuring
- OpenAI GPT-4o — checklist evaluation and RAG answers
- ChromaDB + BM25 hybrid retrieval — Vietnamese legal corpus
- Anthropic Claude — optional legacy `/agent/chat` path

## Prerequisites

- Python 3.12 + [uv](https://docs.astral.sh/uv/)
- API keys in repo root `.env` (copy from `.env.example`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes (upload) | OCR + structuring |
| `OPENAI_API_KEY` | Yes (analysis) | `/checklist/evaluate-clause` (OpenAI only) + RAG query |
| `EMBEDDING_MODEL` | No | OpenAI embedding model (default `text-embedding-3-small`) |
| `EMBEDDING_OPEN_AI_API_KEY` | No | Embedding API key; falls back to `OPENAI_API_KEY` |
| `DEFAULT_MODEL` | No | OpenAI model for clause evaluation |
| `ANTHROPIC_API_KEY` | No | Legacy agent |
| `CHROMA_PERSIST_DIR` | No | Default `.chroma` |
| `LOG_LEVEL` | No | `DEBUG` / `INFO` / `WARNING` / `ERROR` |

## Setup

```bash
cd src/backend
uv sync --group dev
```

## Run

```bash
cd src/backend
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

- Health: http://127.0.0.1:8010/health
- API docs: http://127.0.0.1:8010/docs

On first startup, if the legal index is empty, the app auto-ingests markdown from `app/rag/data/`.

Rebuild legal index manually:

```bash
cd src/backend
uv run python scripts/ingest.py app/rag/data/ --rebuild
```

## Directory structure

```text
src/backend/
├── app/
│   ├── main.py                 # FastAPI app, lifespan auto-ingest
│   ├── core/config.py          # Settings from root .env
│   ├── api/routes/
│   │   ├── agent.py            # POST /agent/chat
│   │   ├── checklist.py        # GET/POST /checklist/*
│   │   ├── ocr.py              # POST /api/ocr/contract*
│   │   └── rag.py              # POST /rag/search, /rag/query, ingest
│   ├── services/               # Gemini OCR + structuring
│   ├── agents/agent.py         # RAG-augmented legal assistant
│   ├── rag/                    # Parser, embeddings, retriever, pipeline
│   │   └── data/               # 17 Vietnamese legal markdown files
│   ├── checklists/             # Loader + evaluator
│   └── data/checklists/        # Contract type checklists
├── scripts/
│   ├── ingest.py               # CLI RAG ingest
│   └── reconstruct_pdf.py      # PDF → legal markdown
└── tests/
```

## API endpoints

Base URL: `http://127.0.0.1:8010` (or `NEXT_PUBLIC_BACKEND_URL` from frontend)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/ocr/contract` | OCR → Markdown |
| POST | `/api/ocr/contract/structured` | OCR + structured JSON |
| GET | `/checklist/types` | List contract types |
| GET | `/checklist/{loai_hop_dong}` | Checklist detail |
| POST | `/checklist/evaluate-clause` | Evaluate one clause |
| POST | `/checklist/evaluate-coverage` | Check which mandatory required items are missing from the whole contract |
| POST | `/checklist/evaluate-delta` | Judge whether a clause change (edit/addition/removal) between two contract versions helps or hurts the protected party |
| GET | `/rag/status` | Legal index status |
| POST | `/rag/search` | Hybrid search (no LLM) |
| POST | `/rag/query` | Full RAG answer + citations |
| POST | `/rag/ingest-*` | Admin: ingest legal markdown |
| GET | `/rag/documents` | List indexed legal source documents (metadata only) |
| GET | `/rag/documents/{doc_id}` | Full text of one legal document (metadata + markdown) |
| GET | `/rag/documents/{doc_id}/download` | Download the document as PDF (rendered on the fly, cached in memory) |
| POST | `/agent/chat` | RAG agent chat |

### OCR example

```bash
curl -X POST "http://127.0.0.1:8010/api/ocr/contract/structured" \
  -F "file=@hop_dong.pdf"
```

OCR markdown is also written to `outputs/<document_id>/reconstructed_contract.md` at repo root.

Supported uploads: PDF, DOCX, DOC (legacy Word), PNG, JPG. DOC/DOCX are extracted locally; scanned PDFs use Gemini OCR. **Docker image includes LibreOffice** for `.doc` conversion (`LIBREOFFICE_BINARY=/usr/bin/soffice`).

OCR system prompt: `app/services/contract_ocr_system.txt`

## Tests

```bash
cd src/backend
uv run pytest tests/ -v
uv run ruff check app tests   # if configured
```

## For AI coding agents

**Read before editing:**

1. This file — structure and endpoints
2. [`.agents/AGENTS.md`](../../.agents/AGENTS.md) — monorepo context
3. [`.agents/rules/backend.md`](../../.agents/rules/backend.md) — API and Python conventions
4. [`.agents/rules/naming.md`](../../.agents/rules/naming.md) — field names
5. For RAG/legal work: [`.agents/rules/rag.md`](../../.agents/rules/rag.md) and root [`RULES.md`](../../RULES.md)

Cursor loads mandatory rules from [`.cursor/rules/`](../../.cursor/rules/).

**API rules (summary):** Pydantic schemas, snake_case JSON, Vietnamese `detail` for user-facing errors, thin routes → service layer, no PII in logs.
