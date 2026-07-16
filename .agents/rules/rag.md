---
description: "Legal RAG rules — ingest, retrieval, citations"
globs: "src/backend/app/rag/**,src/backend/scripts/**,RULES.md"
---

# Legal RAG

Full details: `RULES.md` (root). This file is a concise agent summary.

## Core principle

**Keep two phases separate — do not mix them:**

1. **Ingestion** (admin/setup): read `.md` → parse → index → persist
2. **Retrieval** (each query): embed query → search → parent lookup → LLM

User chat **must not** trigger full re-ingest.

## Current architecture

```text
app/rag/data/*.md          # Legal documents (YAML frontmatter + headings)
        ↓ ingest (scripts/ingest.py or startup lifespan)
parser.py                  # H1=law, H2=chapter, H3=article, numbered=clause
        ↓
ChromaDB (child chunks) + SQLiteParentStore (parent = full Article)
BM25 index (keyword fallback)
        ↓ retrieve (hybrid vector + BM25, optional reranker)
service.py → rag_query()   # answer + citations + confidence + status
```

## Chunking

- **Parent** = full Article (### Điều X)
- **Child** = each Clause (1., 2., 3.)
- Search on children; LLM receives parent context

## Legal markdown format

```md
---
id: bo_luat_dan_su_2015
title: "Bộ luật Dân sự"
so_hieu: "91/2015/QH13"
...
---

# Law title
## Chapter I: ...
### Điều 1. ...
1. First clause.
2. Second clause.
```

Preserve Vietnamese diacritics, exact article numbers, and complete YAML metadata.

## Stable IDs

- Use `id` from YAML frontmatter for dedup
- Do not use random UUIDs when a stable id is needed
- Ingesting the same file twice must not create duplicates

## API endpoints

| Endpoint | When to use |
|----------|-------------|
| `POST /rag/ingest-file` | Admin ingest local path |
| `POST /rag/ingest-upload` | Admin upload `.md` |
| `POST /rag/search` | Debug/search, no LLM |
| `POST /rag/query` | Production query + answer |
| `GET /rag/status` | Check index status |

## Citation format

From `rag/citation.py`:

```python
Citation(source_file, law_title, article, clause, point, quote, location, score)
```

`/rag/query` response includes `citations[]` + `confidence` + `status`.

## Confidence & status

- `confidence`: `high` | `medium` | `low`
- `status`: `success` | `insufficient_evidence` | `error`
- Insufficient evidence → do not hallucinate; report clearly

## Related config

```env
CHROMA_PERSIST_DIR=.chroma
RAG_USE_RERANKER=false
OPENAI_API_KEY=...        # GPT-4o for rag_query
```

## Ingest CLI

```bash
cd src/backend
uv run python scripts/ingest.py app/rag/data/ --rebuild
```

Changing the embedding model → **must rebuild** the index.

## Required tests when changing RAG

- Parse markdown hierarchy
- Stable doc ids, no duplicate ingest
- Retrieval does not call ingestion
- Parent restore after restart
- Metadata preserved in results

```bash
cd src/backend && uv run pytest tests/test_rag.py -v
```

## Key files

| File | Role |
|------|------|
| `rag/parser.py` | Parse legal markdown |
| `rag/retriever.py` | ChromaDB + hybrid search |
| `rag/pipeline.py` | ingest_legal_markdown, retrieve |
| `rag/service.py` | High-level rag_query |
| `rag/citation.py` | Citation builder |
| `rag/bm25_index.py` | Keyword index |
| `scripts/ingest.py` | CLI ingest |
