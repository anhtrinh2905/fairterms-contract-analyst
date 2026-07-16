---
description: "FastAPI API and Python coding rules for the backend"
globs: "src/backend/**"
---

# Backend — FastAPI & Python

Stack: **Python 3.12**, **FastAPI**, **Pydantic v2**, **uv**, **pytest**, **ruff**.

## Directory structure

```text
src/backend/app/
├── main.py                 # App factory, lifespan, include routers
├── core/
│   ├── config.py           # Settings (pydantic-settings, reads root .env)
│   └── logging.py
├── api/
│   ├── middleware.py       # RequestLoggingMiddleware + X-Request-ID
│   └── routes/             # One file = one domain router
├── services/               # Heavy business logic (OCR, structuring)
├── agents/                 # LLM agent
├── rag/                    # RAG pipeline
├── checklists/             # Checklist loader + evaluator
└── data/checklists/        # Markdown checklist files
```

## API rules

### 1. Router pattern

One router file per domain in `app/api/routes/`:

```python
router = APIRouter(prefix="/checklist", tags=["checklist"])

@router.post("/evaluate-clause")
def evaluate(req: EvaluateClauseRequest) -> dict:
    ...
```

Register in `main.py`: `app.include_router(checklist.router)`

### 2. Prefix & path naming

| Domain | Prefix | Example |
|--------|--------|---------|
| OCR | `/api/ocr` | `POST /api/ocr/contract/structured` |
| RAG | `/rag` | `POST /rag/query` |
| Checklist | `/checklist` | `POST /checklist/evaluate-clause` |
| Agent | `/agent` | `POST /agent/chat` |
| Health | (none) | `GET /health` |

- Paths use **kebab-case**: `/evaluate-clause`, `/ingest-upload`
- OCR keeps prefix `/api/ocr` because the frontend is already wired to it
- RAG/checklist/agent do **not** use an `/api` prefix

### 3. Request/response models

- Declare **Pydantic `BaseModel`** in the route file (or split out if shared)
- Always set `response_model=` on public endpoints
- JSON API fields: **snake_case** (`loai_hop_dong`, `clause_text`)

```python
class EvaluateClauseRequest(BaseModel):
    loai_hop_dong: str
    clause_text: str
```

### 4. Error handling

- Use `HTTPException(status_code=..., detail="...")` — short message, **no** stack trace
- Custom domain errors inherit from a base error with `status_code`:

```python
class GeminiOCRError(RuntimeError):
    status_code = 500

# In route:
except GeminiOCRError as exc:
    raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
```

- FastAPI returns `{"detail": "..."}` — frontend `client.ts` already parses this

### 5. Async vs sync

- Routes are **async** when reading `UploadFile` or needing `await`
- CPU/blocking I/O (Gemini, PDF, ChromaDB): wrap with `run_in_threadpool(...)`

```python
result = await run_in_threadpool(get_gemini_ocr_service().process_contract, ...)
```

### 6. File upload

- Fixed field name: `file: UploadFile = File(...)`
- Validate in the service layer, not in the route (except read errors → 400)

### 7. Thin routes, logic in services

```text
routes/*.py           → validate HTTP, map request/response
services/*.py         → Gemini OCR, structuring
rag/service.py        → RAG query pipeline
checklists/evaluator.py → clause evaluation
```

Routes **must not** call LLMs directly; go through a service function.

### 8. Singleton services

Current pattern:

```python
@lru_cache
def get_gemini_ocr_service() -> GeminiOCRService:
    return GeminiOCRService(...)
```

Keep this pattern for services with config/state.

## Python style

- **snake_case**: variables, functions, modules, Pydantic fields
- **PascalCase**: classes, exceptions, Pydantic models
- **UPPER_SNAKE**: module-level constants
- Type hints required on public functions
- `from __future__ import annotations` in complex files
- Imports: stdlib → third-party → local (`app.*`)
- Line length: 100 (ruff config)
- Logger: `logger = logging.getLogger(__name__)`

## Config

- All env vars via `app.core.config.settings`
- Do not scatter `os.getenv` (except legacy OCR service dotenv at init)
- New variables: update `Settings` + `.env.example`

## Clause-evaluation cache (Redis)

- `evaluate_clause` caches successful verdicts in Redis (`app/services/cache.py`).
  Enabled by `CHECKLIST_CACHE_ENABLED=true` + `REDIS_URL`; **fail-open** — a
  missing/broken Redis just runs a normal fresh evaluation.
- Cache key fingerprints contract type, checklist `phien_ban`, `PROMPT_VERSION`,
  model, `checklist_enable_rag_citation_v2`, and citation top-k/rerank settings.
- **Bump `PROMPT_VERSION` in `evaluator.py` whenever you change the prompt,
  JSON schema, or the shape of the returned dict** — this invalidates stale
  entries without a manual flush. `CHECKLIST_CACHE_TTL_SECONDS` (default 30d) is
  only the backstop. Re-ingesting the RAG corpus does not auto-invalidate; bump
  `PROMPT_VERSION` (or let TTL expire) if it would change verdicts.
- docker-compose (local/dev/main) provides a `redis:7-alpine` service.

## Tests

- HTTP tests: `TestClient(app)` in `tests/test_endpoints.py`
- Mock services/pipelines; do not call real APIs in unit tests
- RAG tests: `tests/test_rag.py`, `tests/test_checklists.py`

```bash
cd src/backend && uv run pytest tests/ -v
cd src/backend && uv run ruff check app/
```

## Adding a new endpoint — checklist

1. Create/edit router in `app/api/routes/`
2. Add Pydantic request/response models
3. `include_router` in `main.py` if it is a new router
4. Add tests in `tests/test_endpoints.py`
5. If frontend needs it: add to `lib/api/client.ts` + `types.ts`
6. Update endpoint table in `src/backend/README.md`

## Admin / ingest endpoints

- `/rag/ingest-*` is **admin/setup**; do not call from user chat flow
- User queries use `/rag/search` or `/rag/query` only
- Startup auto-ingests when the index is empty (`main.py` lifespan)
