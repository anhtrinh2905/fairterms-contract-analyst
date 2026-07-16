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
| GET | `/admin/stats` | admin | — | `{ total_analyses: int, active_users: int, guest_sessions: int, avg_processing_time_ms: float }` |
| GET | `/admin/users` | admin | query: `email` (optional str) | `{ users: [AdminUserListItem] }` |
| POST | `/admin/users/{user_id}/quota` | admin, writes DB | path: `user_id` (str), body: `{ tier: str, contractAnalysisLimit: int }` | `{ success: bool, user: AdminUserListItem }` |
| GET | `/admin/checklists` | admin | — | `{ checklists: [ChecklistMeta] }` |
| GET | `/admin/checklists/{checklist_id}` | admin | path: `checklist_id` (str) | `{ id: str, label_vi: str, items: [ChecklistItem] }` |
| POST | `/admin/checklists/{checklist_id}` | admin, writes DB | path: `checklist_id` (str), body: `{ items: [ChecklistItem] }` | `{ success: bool }` |
| GET | `/admin/rag/documents` | admin | — | `{ documents: [RAGDocMeta] }` |
| POST | `/admin/rag/ingest` | admin, writes ChromaDB | `multipart/form-data: file` or `{ text: str, name: str }` | `{ success: bool, doc_id: str, chunk_count: int }` |
| POST | `/admin/rag/search-test` | admin | `{ query: str, top_k: int }` | `{ results: [RAGSearchTestResult] }` |
| GET | `/admin/audit-logs` | admin | — | `{ logs: [AdminAuditLogItem] }` |

## Shared shapes (objects used by multiple interfaces)

```json
AdminUserListItem {
  id: String
  name: String?
  email: String?
  tier: String
  createdAt: String
  quota: {
    contractAnalysisCount: Int
    contractAnalysisLimit: Int
  }?
}

ChecklistMeta {
  id: String
  label_vi: String
  items_count: Int
}

ChecklistItem {
  id: String
  category: String
  title_vi: String
  required: Boolean
  description_vi: String
}

RAGDocMeta {
  id: String
  name: String
  effective_date: String?
  chunk_count: Int
}

RAGSearchTestResult {
  text: String
  doc_id: String
  article: String?
  score: Float
}

AdminAuditLogItem {
  id: String
  admin_email: String
  action: String
  target: String
  metadata: Json?
  created_at: String
}
```

## Feature → interface map

- **FR1 (Role-Based Route Protection):** Frontend route guard/Middleware `/admin` checking NextAuth session whitelisting `ADMIN_EMAILS` (env var).
- **FR2 (RAG Document Management):** `GET /admin/rag/documents` + `POST /admin/rag/ingest`
- **FR3 (Checklist Editor):** `GET /admin/checklists` + `GET /admin/checklists/{checklist_id}` + `POST /admin/checklists/{checklist_id}`
- **FR4 (User Quota Editor):** `GET /admin/users` + `POST /admin/users/{user_id}/quota`
- **FR5 (System Monitoring & Logs):** `GET /admin/stats` + `GET /admin/audit-logs`
- **FR6 (RAG Testing Playground):** `POST /admin/rag/search-test`
