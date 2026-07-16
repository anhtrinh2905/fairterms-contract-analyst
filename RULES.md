# HopDongAI Rules

## Project Goal

HopDongAI is an AI assistant for contract analysis. The system should help users understand risks, obligations, missing clauses, and relevant legal references. It is not a replacement for a lawyer and must avoid giving overconfident legal conclusions.

When working on this repository, always preserve the product goal:

- Analyze contracts clearly and safely.
- Cite source contract text when making claims about the uploaded contract.
- Cite legal references when using legal knowledge.
- Keep legal RAG reliable, traceable, and updateable.

## Before Making Changes

Read the relevant files before editing. Do not guess the architecture.

For backend RAG work, read:

- `src/backend/app/rag/parser.py`
- `src/backend/app/rag/retriever.py`
- `src/backend/app/rag/pipeline.py`
- `src/backend/app/api/routes/rag.py`
- `src/backend/app/main.py`
- `src/backend/tests/`

For frontend/product rules, read:

- `src/frontend/AGENTS.md`
- `src/frontend/RULES.md`

Before changing code, briefly state:

- What problem you are solving.
- Which files you plan to touch.
- How you will verify the change.

## Legal RAG Principle

Legal knowledge must be handled in two separate phases:

1. Ingestion / indexing phase
2. Query / retrieval phase

Do not mix them.

### Ingestion / Indexing

Ingestion is an admin or setup action. It should run only when legal Markdown files are added, edited, removed, or reindexed.

Ingestion should:

- Read legal `.md` files.
- Parse YAML frontmatter metadata.
- Preserve legal hierarchy:
  - Law title
  - Chapter
  - Article / Điều
  - Clause / Khoản
- Store child chunks for precise search.
- Store parent documents for complete context.
- Persist data so the system does not lose the knowledge base after restart.
- Avoid duplicate indexing.

Preferred chunking:

- Parent document = full legal Article / Điều.
- Child document = each Clause / Khoản inside the Article.

Search should happen on child chunks. The LLM should usually receive the parent Article as context.

### Query / Retrieval

Retrieval happens every time the user asks a question.

Retrieval should:

- Create an embedding for the user query.
- Search existing indexed child chunks in the vector store.
- Resolve each child chunk to its parent Article.
- Optionally rerank candidate parent Articles.
- Return legal context with metadata and citations.

Retrieval must not:

- Reparse all legal Markdown files.
- Reingest the full knowledge base.
- Create duplicate vector records.
- Hide missing or uncertain legal context.

## Persistent Knowledge Base

The knowledge base should be indexed once and reused.

Recommended architecture:

```text
Legal Markdown files
-> Admin ingest/reindex
-> Parser
-> Parent document store, persistent
-> Child vector store, persistent

User question
-> Query embedding
-> Child vector search
-> Parent article lookup
-> Optional reranker
-> LLM answer with citations
```

If using ChromaDB:

- Store child chunks in ChromaDB.
- Include metadata such as law id, law title, chapter, article, clause, effective date, source URL, and parent id.
- Use stable ids for documents.
- Do not use random UUIDs when stable ids are needed for deduplication.

Parent documents should not live only in process memory unless they are reloaded from a persistent source at startup.

Acceptable parent stores:

- SQLite
- JSONL
- Local persistent document store
- A database already used by the project

Choose the simplest option that fits the current codebase.

## Markdown Format For Legal Documents

Legal documents should use this format:

```md
---
id: bo_luat_dan_su_2015
title: "Bộ luật Dân sự"
so_hieu: "91/2015/QH13"
ngay_ban_hanh: "2015-11-24"
ngay_hieu_luc: "2017-01-01"
co_quan_ban_hanh: "Quốc hội"
loai_van_ban: "Luật"
linh_vuc: "Dân sự"
trang_thai: "Còn hiệu lực"
source_url: "https://..."
---

# Bộ luật Dân sự 2015

## Chương I: Quy định chung

### Điều 1. Phạm vi điều chỉnh

Nội dung điều luật.

### Điều 2. Đối tượng áp dụng

1. Khoản thứ nhất.
2. Khoản thứ hai.
   a) Điểm a.
   b) Điểm b.
```

Rules:

- `#` is the law title.
- `##` is the chapter.
- `###` is the article.
- Numbered lines such as `1.`, `2.`, `3.` are clauses.
- Lettered sub-items such as `a)`, `b)` stay inside their parent clause.
- Keep Vietnamese diacritics correct.
- Preserve article numbers exactly.
- Preserve legal metadata in YAML frontmatter.

## Legal Data Quality

Use official or credible legal sources whenever possible.

For every legal source, preserve:

- Document title
- Document number
- Issuing authority
- Issue date
- Effective date
- Current status if known
- Source URL
- Date the source was collected or checked

Do not silently ingest corrupted text. If text is mojibake, incomplete, OCR-broken, or missing article structure, mark it as needing cleanup before indexing.

## Answering Legal Questions

When the AI answers a user using legal RAG:

- Prefer retrieved legal context over model memory.
- Mention the law/article used.
- Be clear when the retrieved context is insufficient.
- Avoid pretending to provide formal legal advice.
- Do not invent laws, article numbers, citations, penalties, or deadlines.

Good answer style:

```text
Theo Điều X của [tên luật], nội dung liên quan là...
Trong trường hợp này, hợp đồng có thể có rủi ro vì...
Bạn nên kiểm tra thêm...
```

Bad answer style:

```text
Chắc chắn hợp đồng này vô hiệu.
Luật quy định như vậy nhưng không cần trích dẫn.
Theo Điều 999, ...
```

## Testing Expectations

For RAG changes, add or update tests for:

- Parsing legal Markdown.
- Stable document ids.
- Ingesting the same file twice does not create duplicates.
- Retrieval does not call ingestion.
- Parent documents can be restored after app restart or store reload.
- Metadata is preserved.
- Query results include enough citation information.

Run the smallest relevant test set first. If the change touches shared RAG behavior, run the full backend test suite if practical.

## Coding Style

- Keep changes focused.
- Follow existing project patterns.
- Do not refactor unrelated code.
- Do not rename public APIs unless necessary.
- Prefer simple persistent storage over complex infrastructure.
- Add clear logging for ingestion and retrieval.
- Keep comments useful and short.

Important logs for RAG:

- Ingestion started.
- Number of parent and child documents indexed.
- Number of duplicate documents skipped.
- Vector store path or collection name.
- Retrieval query top_k.
- Reranker enabled or disabled.
- Number of retrieved parent documents.

## API Behavior

Keep existing endpoints compatible when possible.

Useful endpoint separation:

- Admin ingest/reindex endpoint or script for legal documents.
- Query/search endpoint for retrieval.
- Agent/chat endpoint that uses retrieval context.

Normal user chat/search endpoints must not trigger full knowledge base ingestion.

## Completion Checklist

Before finishing any RAG-related task, report:

- Files changed.
- What behavior changed.
- How ingestion should be run.
- How retrieval works after the change.
- Tests run and results.
- Any known limitations.

If something is not implemented, say so clearly.

