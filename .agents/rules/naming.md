---
description: "Naming conventions for variables, fields, files, and slugs across the project"
activation: always-on
---

# Naming conventions

The project uses **two naming layers**: code (English) and contract/legal domain (Vietnamese identifiers).

## Overview

| Context | Convention | Example |
|---------|------------|---------|
| Python code | snake_case | `loai_hop_dong`, `evaluate_clause` |
| Python class | PascalCase | `GeminiOCRService`, `EvaluateClauseRequest` |
| TypeScript code | camelCase | `loaiHopDong`, `evaluateClause` |
| TS component/type | PascalCase | `ContractMode`, `OcrStructuredResponse` |
| HTTP path | kebab-case | `/evaluate-clause`, `/contract/structured` |
| Env var | UPPER_SNAKE | `GEMINI_API_KEY`, `DATABASE_URL` |
| Python file | snake_case | `gemini_ocr_service.py` |
| TS component file | PascalCase | `ContractMode.tsx` |
| Checklist slug | snake_case, Vietnamese without diacritics | `mua_ban_can_ho_chung_cu` |

## JSON API fields

### Backend ↔ frontend wire format: snake_case

```json
{
  "loai_hop_dong": "cho_thue_can_ho_chung_cu",
  "clause_text": "...",
  "muc_rui_ro": "cao",
  "dieu_khoan_noi_ve_ben": "ben_b"
}
```

The frontend sends snake_case when calling FastAPI (`client.ts` uses original keys in `JSON.stringify`).

### OCR structured output: English snake_case

Gemini structuring returns English fields — **keep them** on the backend; map to UI on the frontend:

| Backend (structured) | Frontend UI (data.ts) |
|---------------------|----------------------|
| `full_name` | `ho_ten` |
| `id_number` | `cccd` |
| `contract_type` | `loai` (ContractInfo) |
| `article_no` | `so_dieu` |
| `party_a` / `party_b` | `benA` / `benB` (Party) |

Mapping is centralized in `lib/api/mappers.ts`.

## Domain vocabulary — contracts

Use consistently across backend checklist, evaluator response, and frontend UI:

| Term | Meaning |
|------|---------|
| `ben_a`, `ben_b` | Party A / Party B (per checklist convention) |
| `ben_duoc_bao_ve` | Party the agent protects (usually the weaker party) |
| `loai_hop_dong` | Contract type slug |
| `dieu_khoan` | Clause |
| `so_dieu` | Article number (ĐIỀU 1, ĐIỀU 2, …) |
| `muc_rui_ro` | `cao` \| `trung_binh` \| `thap` \| `khong` |
| `red_flag` | Serious risk |
| `unfair_but_legal` | Disadvantageous but possibly legal |
| `can_cu` | Legal basis (string or list) |
| `trich_dan` | Quote from the contract |
| `ket_luan` | `MATCH` \| `PASS` |
| `goi_y_thuong_luong` | Negotiation suggestion |

## Domain vocabulary — checklist loader

Keys in checklist YAML markdown:

```yaml
quy_uoc_vai_tro:
  ben_a: ...
  ben_b: ...
nghia_vu_bat_buoc: ...
quyen_can_bao_dam: ...
dau_hieu_lam_quyen: ...
dau_hieu_ganh_qua_muc: ...
```

Do not change these keys when adding new checklists.

## Domain vocabulary — RAG / legal

Legal chunk metadata:

- `law_title`, `article`, `clause`, `point`
- `location` — display string, e.g. `"Điều 35, Khoản 2"`
- `source_file` — `.md` filename in `app/rag/data/`

Citation object (`rag/citation.py`):

```python
source_file, law_title, article, clause, point, quote, location, score
```

## Contract type slugs

Checklist files in `app/data/checklists/`:

- `checklist_mua_ban_can_ho.md` → slug `mua_ban_can_ho_chung_cu`
- `checklist_cho_thue_can_ho.md` → slug `cho_thue_can_ho_chung_cu`

Frontend `resolveLoaiHopDong()` maps OCR text → slug.

## File & module naming

### Backend

```text
app/api/routes/{domain}.py     # rag.py, ocr.py, checklist.py
app/services/{name}_service.py # gemini_ocr_service.py
app/rag/{concern}.py           # parser.py, retriever.py, service.py
tests/test_{area}.py
```

### Frontend

```text
app/fairterms/components/{area}/{Name}.tsx
lib/api/{client|types|mappers}.ts
lib/auth/{concern}.ts
```

## Environment variables

- Backend reads from root `.env` (relative path `../../.env` in Settings)
- Frontend server vars: no prefix (`DATABASE_URL`, `AUTH_SECRET`)
- Frontend client-safe: `NEXT_PUBLIC_` prefix (`NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_APP_URL`)

## Names to avoid

- ❌ Mixing camelCase into backend JSON API responses (`loaiHopDong` in FastAPI response)
- ❌ Changing existing checklist slugs without updating loader + frontend mapper
- ❌ Using upload filename as output path (OCR uses UUID `document_id`)
- ❌ Random UUID for legal doc id when stable dedup id is needed (use id from YAML frontmatter)
