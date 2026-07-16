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

Dự án đã có codebase hoạt động (backend FastAPI + frontend Next.js). Budget còn lại: **4–6 tuần** để hoàn thiện các tính năng còn thiếu và đưa ra production URL thực sự.

## Features in v1 (each with impact AND grade)

- **Upload hợp đồng PDF/ảnh + OCR** — impact H (core job: không upload được thì không có sản phẩm) — grade B (Gemini Vision API đã tích hợp, PyMuPDF có sẵn; risk: chất lượng ảnh thấp) — Path 2 áp dụng: single Gemini call thay vì pipeline phức tạp; ĐÃ CÓ trong backend.

- **Phân tích rủi ro điều khoản + hiển thị checklist** — impact H (core promise: gắn cờ điều khoản nguy hiểm) — grade B/C (LLM call + RAG + checklist eval; rủi ro hallucination) — Path 1: đây là sản phẩm, đi trước tiên. Re-arch xuống B: checklist đánh giá từng điều khoản độc lập bằng single LLM call; ĐÃ CÓ endpoint /checklist/evaluate-clause.

- **Legal RAG: trích dẫn văn bản pháp luật** — impact H (differentiator chính vs hỏi Facebook: có nguồn dẫn) — grade B (ChromaDB + hybrid search đã có; risk: recall quality) — ĐÃ CÓ /rag/query.

- **Google Auth + guest session với quota** — impact H (acquisition: không auth thì không giữ được user; guest quota để thử) — grade B (NextAuth Google đã cấu hình; Prisma quota tracking) — ĐÃ CÓ trong frontend.

- **Hiển thị kết quả phân tích rõ ràng (UI)** — impact H (retention: nếu UI tệ, user không hiểu kết quả, rời đi) — grade A (React component, đã có fairterms UI) — cần polish.

- **Disclaimer pháp lý rõ ràng** — impact H (legal safety: nếu thiếu có thể bị quy là hành nghề luật) — grade A — PHẢI CÓ trong mọi trang kết quả.

## Suggested features (impact-first — proposed, not decided)

- **Chia sẻ kết quả phân tích qua link** — impact M (viral: user chia sẻ vào group Facebook để hỏi thêm → acquisition channel tự nhiên) — grade A (generate read-only share URL) — **IN**: chi phí thấp, trực tiếp kích hoạt GTM channel (group Facebook). Implement sau khi core flow xong.

- **History: lưu hợp đồng đã phân tích** — impact M (retention: user quay lại xem lại, không phải upload lại) — grade A (Prisma + DB query) — **IN**: effort nhỏ, giữ user logged-in.

- **Export PDF báo cáo phân tích** — impact L (nice-to-have: user muốn in ra cho luật sư xem) — grade B (puppeteer/pdf render) — **OUT**: L-impact, B-grade — deferred v2.

## Cut list (NOT in v1 — deferred, not deleted)

- **E-signature / ký số** — ngoài phạm vi (cần tích hợp CA, không liên quan core job)
- **Export PDF báo cáo** — v2 sau khi validate nhu cầu thực tế
- **Thanh toán / subscription** — v2; v1 freemium với quota guest
- **Native mobile app** — v2; PWA-ready qua Next.js là đủ
- **Fine-tuning model riêng** — v3; GPT-4o + Gemini đủ tốt cho v1
- **So sánh nhiều hợp đồng** — v2
- **Agent chat tự do (không có contract)** — v2; v1 focus vào contract-first flow

## Decision

GO — core value prop (OCR + phân tích rủi ro + trích dẫn pháp luật) đã được chứng minh có pain thực (research), budget và stack đã sẵn sàng (codebase hiện tại), và tất cả H-impact features đều ở grade A/B với path rõ ràng.
