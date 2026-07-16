# Stage 02 — Scope (go/no-go)

Scope = features chosen by IMPACT × COST, inside your time budget.
KILL here is cheap and smart. Killing a weak idea at this gate is a SUCCESS outcome.

## Impact rubric (business value — score BEFORE looking at cost)

| Impact | Meaning |
|---|---|
| H | moves money or the core promise: gets users in (acquisition), gets them paying (revenue), or delivers the one job they came for |
| M | keeps users / saves real time weekly (retention, operations) |
| L | nice-to-have; nobody would pay for or switch over it |

Decision matrix: **H-impact features justify B/C cost** (via the C-paths below).
**L-impact features must be grade A or they're cut** — and even grade-A L-features are
cut when the budget is tight. The classic failure is a v1 full of A-grade L-impact
features: cheap to build, worthless to sell.

## AI coding grade rubric

| Grade | Meaning | Examples |
|---|---|---|
| A | cheap for AI | CRUD, forms, dashboards, content sites, API wrappers |
| B | moderate | file processing, 3rd-party integrations, auth via library, single LLM call, HITL AI drafts |
| C | expensive | realtime, payments from scratch, custom auth, autonomous agentic AI pipelines, heavy concurrency |

**Grade is a COST estimate, not a permission.** The gate is fit(grades, budget), not "no C allowed."
When a C feature is the real need, three honest paths:
1. **The C feature IS the product** → invert the cut: C goes FIRST (riskiest assumption first),
   everything else is minimized to serve it, and the budget is renegotiated against reality.
   But: one C proves the value prop — its siblings are v2 cards, not v1 scope.
2. **Re-architect C down to B** (highest-leverage move): multi-step agent → single LLM call;
   auto-send → human-approves-draft; custom pipeline → managed service / library.
   Same user value, one grade cheaper.
3. **Irreducible C that doesn't fit the budget** → KILL or re-budget. Both are honest.

## Gate — check ALL before `/flow next`
- [x] Every feature below has an IMPACT (H/M/L with the business reason) AND a grade (A/B/C)
- [x] No L-impact feature above grade A survives in v1
- [x] The suggested-features section was actually considered (each suggestion has an in/out decision)
- [x] fit(grades, budget) holds — every C in scope is justified as path 1, 2, or 3 above (written next to the feature)
- [x] If the product IS a C feature: it is FIRST in build order, and its sibling C features are on the cut list
- [x] The cut list is written (what I am NOT building in v1)
- [x] GO / KILL decision is written below
- [x] No FILL placeholders remain in this file

## Time budget

Thời gian phát triển dự kiến: **15-20 giờ làm việc** (khoảng 1 tuần).

## Features in v1 (each with impact AND grade)

- **Admin Authentication & Access Control (RBAC):** Impact H (Bảo vệ thông tin hệ thống, chỉ admin được vào) — Grade A (NextAuth session checking + Route Guard/Middleware).
- **RAG legal document management UI:** Impact H (Cập nhật dữ liệu luật mới) — Grade B (Tải file markdown lên frontend + gọi API `/rag/ingest-*` của backend).
- **Checklist Management UI:** Impact H (Cập nhật tiêu chuẩn rà soát) — Grade B (Đọc/ghi file JSON/Markdown checklist hoặc ghi vào DB).
- **User Quota & Tier management UI:** Impact H (Quản lý hạn mức phân tích, sửa chữa lỗi cho khách hàng) — Grade A (CRUD thông tin User và UserQuota qua Prisma).
- **Usage Analytics Dashboard:** Impact M (Theo dõi tải của hệ thống, phát hiện lỗi) — Grade A (Aggregate thống kê từ UsageEvent và ContractAnalysis qua Prisma).

## Suggested features (impact-first — proposed, not decided)

- **Admin Audit Logging:** Ghi log các thao tác chỉnh sửa quota/checklist của admin.
  - Impact: M (Bảo mật, truy vết lỗi) — Grade: A (Ghi vào bảng `AdminAuditLog` trong DB).
  - Decision: **IN** (Rất rẻ để làm, tăng tính an toàn cho hệ thống).
- **RAG Playground:** Giao diện cho phép thử nghiệm truy vấn RAG và xem kết quả tìm kiếm thô (chunks, scores) từ ChromaDB.
  - Impact: M (Giúp người biên tập luật kiểm tra xem dữ liệu đã được index đúng chưa) — Grade: B (Gọi API `/rag/search` và `/rag/query`).
  - Decision: **IN** (Cực kỳ hữu dụng để test dữ liệu RAG sau khi ingest).
- **Generic Database Table Editor:** Trình soạn thảo dữ liệu dạng bảng đa năng.
  - Impact: L (Redundant vì đã có Prisma Studio cho dev) — Grade: B.
  - Decision: **OUT** (Không cần thiết cho v1, chỉ cần giao diện sửa Quota/User cụ thể).

## Cut list (NOT in v1 — deferred, not deleted)

- **Visual DB table editor** (dùng Prisma Studio thay thế).
- **Checklist version control / rollback UI** (dùng Git quản lý phiên bản file thay thế).
- **Realtime charting** (dashboard dạng số liệu tĩnh là đủ cho v1).

## Decision

GO — Tất cả các tính năng cần thiết cho phân hệ Admin đều nằm ở Grade A/B (không có C), thời gian hoàn thành dưới 20 giờ, không đụng vào code nghiệp vụ hiện tại, và giải quyết triệt để các pain points về vận hành thủ công.
