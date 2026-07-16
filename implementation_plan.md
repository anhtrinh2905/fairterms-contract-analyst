# RAG System — Audit & Implementation Plan

## 1. Hiện trạng hệ thống RAG (Audit)

### Đã hoàn thành ✅

| Module | File | Mô tả |
|--------|------|-------|
| **Parser** | [parser.py](file:///d:/C2-App-145/src/backend/app/rag/parser.py) | Hierarchical parser tốt — tách YAML frontmatter, H2=Chapter, H3=Article, clause-level splitting |
| **Embeddings** | [embeddings.py](file:///d:/C2-App-145/src/backend/app/rag/embeddings.py) | Singleton embedding function (nhưng sai model — xem bên dưới) |
| **Vector Store** | [retriever.py](file:///d:/C2-App-145/src/backend/app/rag/retriever.py) | ChromaDB + SQLiteParentStore, parent-child retrieval, dedup |
| **Pipeline** | [pipeline.py](file:///d:/C2-App-145/src/backend/app/rag/pipeline.py) | Ingest + retrieve + optional cross-encoder reranker |
| **Ingest CLI** | [ingest.py](file:///d:/C2-App-145/src/backend/scripts/ingest.py) | Batch ingest từ folder/file |
| **Agent** | [agent.py](file:///d:/C2-App-145/src/backend/app/agents/agent.py) | RAG-augmented Claude agent (nhưng prompt quá đơn giản) |
| **API** | [rag.py](file:///d:/C2-App-145/src/backend/app/api/routes/rag.py) | `/rag/search`, `/rag/ingest-*`, `/rag/status` |
| **Checklist** | [evaluator.py](file:///d:/C2-App-145/src/backend/app/checklists/evaluator.py) | Contract clause evaluation với GPT-4o |
| **Tests** | [test_rag.py](file:///d:/C2-App-145/src/backend/tests/test_rag.py) | Parser, ingest, retrieval, dedup, persistence |

### Vấn đề nghiêm trọng 🔴

| # | Vấn đề | Severity | Chi tiết |
|---|--------|----------|----------|
| 1 | **Embedding model sai cho tiếng Việt** | 🔴 CRITICAL | `all-MiniLM-L6-v2` là model English-only, retrieval tiếng Việt pháp lý sẽ rất kém. Cần đổi sang multilingual model. |
| 2 | **Không có Citation system** | 🔴 CRITICAL | Retrieval chỉ trả `content` + `metadata` thô. Không có citation object chuẩn (`law_title`, `article`, `clause`, `quote`, `location`, `score`). Agent prompt không yêu cầu trích dẫn. |
| 3 | **Agent prompt quá đơn giản** | 🔴 HIGH | Prompt chỉ là "You are a helpful assistant. Use the context below..." — không có guardrails pháp lý, không có disclaimer, không yêu cầu citation, không phân biệt vai trò. |
| 4 | **Không có hybrid search** | 🟡 MEDIUM | Chỉ vector search. Thiếu BM25/keyword fallback — nhiều truy vấn pháp lý là keyword-heavy ("Điều 35 Luật Đất đai"). |
| 5 | **Không có confidence/status** | 🟡 MEDIUM | API response không có `confidence`, `status`, `evidence_status`. Không biết khi nào evidence yếu. |
| 6 | **Checklist evaluator không nối RAG** | 🟡 MEDIUM | `evaluate_clause()` dùng GPT-4o với checklist cứng, nhưng không query RAG để lấy legal basis. Trường `can_cu` trong checklist là static, không dynamic. |
| 7 | **Startup chỉ ingest 1 sample file** | 🟢 LOW | `main.py` lifespan chỉ auto-ingest `luat_kyd_bds_2023_sample.md`, không phải toàn bộ `/rag/data`. |
| 8 | **Không có ingest idempotency tracking** | 🟢 LOW | Dedup bằng `doc_id` match nhưng không track file hash. Rebuild index phải delete + re-add toàn bộ. |

### Rủi ro kỹ thuật

1. **Embedding model change = phải rebuild toàn bộ index** — vì vector dimensions khác nhau.
2. **File `luat_kyd_bds_2023_sample.md` không tồn tại trong `/rag/data`** — sample file cũ đã bị xóa hoặc rename, startup sẽ skip.
3. **Một số file markdown có cấu trúc heading không chuẩn** — H1 bị duplicate, heading "# Điều X" thay vì "### Điều X" → parser có thể bỏ sót.

---

## 2. Proposed Changes

### Phase 1: Embedding Model — Đổi sang multilingual

#### [MODIFY] [embeddings.py](file:///d:/C2-App-145/src/backend/app/rag/embeddings.py)

Đổi từ `all-MiniLM-L6-v2` (English) sang `paraphrase-multilingual-MiniLM-L12-v2` (multilingual, 384 dims, hỗ trợ tiếng Việt tốt, chạy local, không cần API key).

> [!IMPORTANT]
> Đổi model embedding = phải **rebuild toàn bộ ChromaDB index**. Cần xóa `.chroma/` rồi chạy lại ingest.

---

### Phase 2: Hybrid Search — BM25 + Vector

#### [NEW] [bm25_index.py](file:///d:/C2-App-145/src/backend/app/rag/bm25_index.py)

- BM25 index dùng `rank-bm25` library.
- Index toàn bộ parent documents (full articles).
- Hỗ trợ keyword search mạnh cho truy vấn pháp lý kiểu "Điều 35 Luật Đất đai".
- Persist index vào disk (pickle).

#### [MODIFY] [retriever.py](file:///d:/C2-App-145/src/backend/app/rag/retriever.py)

- Thêm hybrid retrieval: vector search + BM25 search → Reciprocal Rank Fusion (RRF).
- `retrieve_with_parents()` → `retrieve_hybrid()` với option `hybrid=True`.

---

### Phase 3: Citation System

#### [NEW] [citation.py](file:///d:/C2-App-145/src/backend/app/rag/citation.py)

Module tạo citation object từ retrieved documents:

```python
@dataclass
class Citation:
    source_file: str
    law_title: str
    article: str
    clause: str | None
    point: str | None
    quote: str  # trích đoạn ngắn từ chunk
    location: str  # "Điều 35, Khoản 2, Điểm a"
    score: float
```

- Format citation từ metadata + page_content.
- Build `location` string tự động từ metadata fields.
- Truncate `quote` để không quá dài.

---

### Phase 4: RAG Service — Query Pipeline hoàn chỉnh

#### [NEW] [service.py](file:///d:/C2-App-145/src/backend/app/rag/service.py)

Service trung tâm thay thế cách gọi trực tiếp `retrieve()`:

```python
class RAGResponse:
    answer: str
    citations: list[Citation]
    retrieved_chunks: list[dict]
    confidence: Literal["high", "medium", "low"]
    status: Literal["success", "insufficient_evidence", "error"]

def rag_query(
    query: str,
    *,
    top_k: int = 10,
    contract_type: str | None = None,
    filters: dict | None = None,
) -> RAGResponse:
```

- Gọi hybrid retrieval.
- Build citations.
- Xác định confidence dựa trên score distribution.
- Nếu thiếu evidence → `status = "insufficient_evidence"`.
- Gọi LLM với legal-aware prompt.
- Parse response + attach citations.

---

### Phase 5: Legal-Aware Prompt & Guardrails

#### [MODIFY] [agent.py](file:///d:/C2-App-145/src/backend/app/agents/agent.py)

Viết lại system prompt hoàn chỉnh cho RAG pháp lý:

- Chỉ dùng nguồn trong retrieved context.
- Không bịa điều luật.
- Không tự nhận là luật sư.
- Luôn có disclaimer.
- Phân biệt: nội dung hợp đồng / căn cứ pháp luật / đánh giá rủi ro / cần kiểm tra thêm.
- Nếu thiếu căn cứ → nói rõ.
- Trả lời bằng tiếng Việt.
- Format citations inline.

#### [MODIFY] [service.py](file:///d:/C2-App-145/src/backend/app/rag/service.py)

- Dùng OpenAI GPT-4o thay vì Claude (vì `.env` hiện tại chỉ có `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` bị comment out).
- Parse structured response từ LLM.

---

### Phase 6: API Enrichment + Contract Integration

#### [MODIFY] [rag.py (routes)](file:///d:/C2-App-145/src/backend/app/api/routes/rag.py)

- Endpoint mới `POST /rag/query` dùng `rag_query()` service.
- Response schema có `answer`, `citations`, `confidence`, `status`.
- Giữ nguyên `/rag/search` cũ cho backward compatibility.

#### [MODIFY] [evaluator.py](file:///d:/C2-App-145/src/backend/app/checklists/evaluator.py)

- Sau khi evaluate clause, gọi RAG để enrich `legal_basis` cho mỗi matched signal.
- Thêm `evidence_status` vào response.

---

### Phase 7: Ingest CLI Enhancement + Startup Fix

#### [MODIFY] [ingest.py](file:///d:/C2-App-145/src/backend/scripts/ingest.py)

- Thêm `--rebuild` flag: xóa index cũ rồi build lại.
- Thêm `--clear` flag: chỉ xóa index.
- Thêm summary: số file, chunk, lỗi parse.
- Build BM25 index sau khi ingest xong.

#### [MODIFY] [main.py](file:///d:/C2-App-145/src/backend/app/main.py)

- Startup: auto-ingest **toàn bộ** `/rag/data/*.md` nếu index empty.
- Bỏ hard-code `luat_kyd_bds_2023_sample.md`.

---

## 3. Dependency Changes

#### [MODIFY] [pyproject.toml](file:///d:/C2-App-145/src/backend/pyproject.toml)

Thêm:
```
"rank-bm25>=0.2.2",
```

> [!NOTE]
> `rank-bm25` là lightweight BM25 library, không cần model download. `sentence-transformers` và `chromadb` đã có sẵn.

---

## 4. Open Questions

> [!IMPORTANT]
> **Q1: Embedding model choice** — Tôi đề xuất `paraphrase-multilingual-MiniLM-L12-v2` (chạy local, free, 384 dims). Nếu bạn muốn chất lượng cao hơn có thể xem xét `intfloat/multilingual-e5-small` hoặc OpenAI embeddings (tốn tiền). Bạn muốn dùng model nào?

> [!IMPORTANT]
> **Q2: LLM cho RAG answer** — `.env` hiện tại có `OPENAI_API_KEY` active, `ANTHROPIC_API_KEY` bị comment out. Agent hiện dùng Claude nhưng sẽ fail. Tôi sẽ chuyển RAG service sang dùng GPT-4o (giống evaluator). Bạn OK không?

> [!WARNING]
> **Q3: Rebuild index bắt buộc** — Sau khi đổi embedding model, phải xóa `.chroma/` và chạy lại `uv run python scripts/ingest.py app/rag/data/`. Điều này mất thời gian ingest (~17 files × nhiều articles). Bạn OK?

---

## 5. Verification Plan

### Automated Tests

```bash
# Unit test: parser + citation + BM25
uv run pytest tests/ -v

# Ingest test (rebuild index)
uv run python scripts/ingest.py app/rag/data/ --rebuild

# Retrieval test script
uv run python tests/test_rag.py
```

### Manual Verification

Test queries mẫu:

| # | Query | Kỳ vọng |
|---|-------|---------|
| 1 | Bên cho thuê có quyền đơn phương chấm dứt hợp đồng khi nào? | Trả về điều luật từ Luật Nhà ở hoặc BLDS, có citation |
| 2 | Điều khoản phạt chậm thanh toán tiền thuê nên đối chiếu với quy định nào? | Trả về điều luật + `confidence: medium/high` |
| 3 | Hợp đồng mua bán căn hộ cần kiểm tra những nội dung pháp lý nào? | Trả về nhiều điều luật từ Luật KDBDS, Luật Nhà ở |
| 4 | Nếu hợp đồng không ghi rõ thời điểm bàn giao nhà thì có rủi ro gì? | Trả về rủi ro + `evidence_status: supported` |
| 5 | Chủ đầu tư chậm bàn giao căn hộ thì người mua cần kiểm tra điều khoản nào? | Trả về checklist + legal basis |

### API Test

```bash
# Test RAG query
curl -X POST http://localhost:8000/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Bên cho thuê có quyền đơn phương chấm dứt hợp đồng khi nào?"}'
```

---

## 6. File Summary

| Action | File | Mô tả |
|--------|------|-------|
| MODIFY | `app/rag/embeddings.py` | Đổi sang multilingual model |
| NEW | `app/rag/bm25_index.py` | BM25 keyword index |
| NEW | `app/rag/citation.py` | Citation formatter |
| NEW | `app/rag/service.py` | RAG service chính |
| MODIFY | `app/rag/retriever.py` | Thêm hybrid retrieval |
| MODIFY | `app/rag/pipeline.py` | Wire new components |
| MODIFY | `app/agents/agent.py` | Legal-aware prompt |
| MODIFY | `app/api/routes/rag.py` | New `/rag/query` endpoint |
| MODIFY | `app/checklists/evaluator.py` | RAG legal basis enrichment |
| MODIFY | `scripts/ingest.py` | Rebuild flag, BM25 build |
| MODIFY | `app/main.py` | Auto-ingest all data |
| MODIFY | `pyproject.toml` | Add `rank-bm25` |
| NEW | `tests/test_rag_query.py` | Integration test cho RAG query |
