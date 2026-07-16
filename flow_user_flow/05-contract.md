# Stage 05 — Interface Contract (the seam)

The contract is whatever sits between your core and its consumer. For a web app that's
API endpoints (the table below). For a CLI it's commands + flags + output shapes; for a
plugin it's hooks + filters; for a pipeline it's input/output file schemas. Keep the
table's SPIRIT — every feature maps to an interface, every interface has its shapes
written before code — and adapt the columns to your project's shape.

Written BEFORE any code. Backend cards build TO this table; UI cards consume FROM it.
The #1 AI-build failure is producer/consumer drift — backend ships one shape, UI assumes
another, both look green. This file is the cheap fix.

## Gate — check ALL before `/flow next`
- [x] Every PRD feature maps to at least one INTERFACE below (web: endpoint · cli: command · library: public function · skill: command/file)
- [x] Every interface has its INPUT and OUTPUT shapes written (web: request+response · cli: flags+output/exit code · library: args+return)
- [x] Access/effects column filled for every interface (web: public/token/admin · non-web: writes/side-effects, or "none")
- [x] No FILL placeholders remain in this file

## OpenAPI / Swagger rule  (web only — N/A for cli/library/skill)

This table is the PLANNING source of truth. If the framework serves a spec (FastAPI →
`/openapi.json` + `/docs`), the served spec is the RUNTIME artifact of this same contract:
- Path/method/shapes here and in the served spec must agree — the contract-test card
  asserts every endpoint in this table exists in the live `/openapi.json` with matching
  request/response shapes.
- Change flows ONE way: amend this file first, then the code, then the spec follows.
- **Docs land with the API, not after**: the served spec is live from the vertical-slice
  card onward, and every backend card's verify checks its endpoints appear in the live
  `/docs` with correct schemas. The contract-test card later asserts full agreement —
  but by then the docs have been growing card by card, never a catch-up task.
- Keep `/docs` enabled at least until v1 ships — it's the free human-readable contract.

## Interfaces  (web: endpoints · cli: commands · library: functions · skill: commands)

| Method/Interface | Path/Name | Access/Effects | Input shape | Output shape |
|---|---|---|---|---|
| GET | `/health` | public | — | `{ status: "ok", version: str }` |
| POST | `/api/ocr/contract` | public (guest quota checked by frontend) | `multipart/form-data: file (PDF\|PNG\|JPG, max 20MB)` | `{ markdown: str, page_count: int, processing_time_s: float }` |
| POST | `/api/ocr/contract/structured` | public | `multipart/form-data: file` | `{ contract_type: str, parties: [{role, name}], clauses: [{id, title, text, page}], metadata: {date, address, value_vnd} }` |
| GET | `/checklist/types` | public | — | `{ types: [{id: str, label_vi: str}] }` |
| GET | `/checklist/{loai_hop_dong}` | public | path: `loai_hop_dong` (str) | `{ items: [{id, category, title_vi, required: bool, description_vi}] }` |
| POST | `/checklist/evaluate-clause` | public | `{ clause_text: str, loai_hop_dong: str, checklist_item_id: str }` | `{ risk_level: "high"\|"medium"\|"low"\|"ok", explanation_vi: str, legal_basis: [{article: str, law: str, excerpt: str}] }` |
| POST | `/checklist/evaluate-coverage` | public | `{ clauses: [{id, text}], loai_hop_dong: str }` | `{ missing_required: [{checklist_item_id, title_vi, severity: "critical"\|"warning"}], coverage_pct: float }` |
| POST | `/rag/query` | public | `{ query: str, top_k: int = 5, filters?: {law_name: str} }` | `{ answer: str, citations: [{doc_id, article, excerpt, score}] }` |
| POST | `/rag/search` | public | `{ query: str, top_k: int = 5 }` | `{ results: [{doc_id, chunk_id, text, score, metadata}] }` |
| GET | `/rag/documents` | public | — | `{ documents: [{id, name, law_code, effective_date, chunk_count}] }` |
| GET | `/rag/documents/{doc_id}` | public | path: `doc_id` | `{ id, name, content_md: str, metadata: object }` |
| POST | `/agent/chat` | public | `{ message: str, contract_context?: str, history: [{role, content}] }` | `{ reply: str, citations: [{doc_id, excerpt}] }` |
| — | `POST /api/auth/[...nextauth]` (Next.js route) | public | Google OAuth callback | session cookie + redirect |
| — | `GET /api/guest/session` (Next.js route) | public (cookie) | — | `{ guest_id: str, used_today: int, limit: int, remaining: int }` |
| — | `POST /api/guest/use` (Next.js route) | public (cookie, writes UsageEvent) | `{ action: "analyze" }` | `{ allowed: bool, remaining: int }` |
| — | `GET /api/share/[shareId]` (Next.js route) | public | path: `shareId` | `{ analysis_result: AnalysisResult, created_at: str }` | 
| — | `POST /api/share` (Next.js route) | token (session required) | `{ analysis_result: AnalysisResult }` | `{ share_url: str, share_id: str }` |

## Shared shapes (objects used by multiple interfaces)

```
AnalysisResult {
  contract_id:    str                          # UUID, stable per upload session
  contract_type:  str                          # e.g. "hop_dong_mua_ban"
  clauses: [
    {
      id:             str
      title:          str
      text:           str
      page:           int
      risk_level:     "high" | "medium" | "low" | "ok"
      explanation_vi: str                      # plain Vietnamese explanation
      legal_basis: [
        {
          article:  str                        # e.g. "Điều 328"
          law:      str                        # e.g. "BLDS 2015"
          excerpt:  str                        # quoted text from law
        }
      ]
    }
  ]
  missing_required: [
    {
      checklist_item_id: str
      title_vi:          str
      severity:          "critical" | "warning"
    }
  ]
  coverage_pct:   float                        # 0.0–1.0
  disclaimer_vi:  str                          # always present in response
  analyzed_at:    str                          # ISO8601
}

GuestSession {
  guest_id:    str    # cookie-based UUID
  used_today:  int
  limit:       int    # default 3
  remaining:   int
}
```

## Feature → interface map

- FR1 (Upload + OCR) → `POST /api/ocr/contract` + `POST /api/ocr/contract/structured`
- FR2 (Phân tích rủi ro checklist) → `POST /checklist/evaluate-clause` + `POST /checklist/evaluate-coverage` + `GET /checklist/types` + `GET /checklist/{loai_hop_dong}`
- FR3 (Legal RAG trích dẫn) → `POST /rag/query` (called per flagged clause to get legal_basis)
- FR4 (Guest mode + quota) → `GET /api/guest/session` + `POST /api/guest/use` + `POST /api/auth/[...nextauth]`
- FR5 (Share link) → `POST /api/share` + `GET /api/share/[shareId]`
- FR6 (Disclaimer) → `disclaimer_vi` field bắt buộc trong mọi `AnalysisResult` response
