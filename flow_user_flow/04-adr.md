# Stage 04 — ADR (architecture decisions)

Short. The most valuable section is what you are NOT doing and why.

## Gate — check ALL before `/flow next`
- [x] Each decision has a one-line "why" and a one-line "what I rejected"
- [x] The NOT-doing list is written
- [x] Decisions cover: data storage, auth approach, deploy target
- [x] No FILL placeholders remain in this file

## Decisions

| # | Decision | Why | Rejected alternative |
|---|---|---|---|
| 1 | **PostgreSQL (Railway) + Prisma ORM** cho user data, sessions, usage events | Relational fits tốt cho user↔session↔usage; Prisma type-safe; Railway free tier đủ cho v1 | Supabase (overkill, thêm vendor lock-in); SQLite (không scale khi deploy multi-instance) |
| 2 | **ChromaDB (in-process)** cho vector store legal RAG | Không cần managed infra, chạy cùng FastAPI process; đủ cho corpus pháp luật VN (~1K–10K chunks); persist local file | Pinecone/Weaviate (chi phí, latency mạng); pgvector (thêm complexity vào PG schema) |
| 3 | **NextAuth v5 (Google OAuth only)** cho auth | Google account là chuẩn ở VN; zero password management; NextAuth đã tích hợp sẵn với Next.js 16 | Magic link (cần SMTP server); JWT-only (không có server-side session, khó revoke) |
| 4 | **Vercel (frontend) + Railway (backend FastAPI)** cho deploy | Vercel zero-config cho Next.js; Railway free tier cho FastAPI + PostgreSQL; cả hai có CI/CD built-in | AWS/GCP (over-engineered cho v1); Heroku (đắt hơn Railway) |
| 5 | **Gemini Vision** cho OCR, **GPT-4o** cho RAG + clause evaluation | Gemini tốt nhất cho OCR tiếng Việt đa dạng; GPT-4o reasoning tốt hơn cho phân tích pháp lý có ngữ cảnh | Single model (risk: một model tệt ở cả 2 task); Claude (latency cao hơn, pricing) |
| 6 | **Guest session bằng cookie** (không cần DB row cho mỗi visit) | Giảm DB writes; quota tracking bằng cookie-signed tránh DB lookup mỗi request | Force login trước (tăng friction, giết acquisition); localStorage (không secure, dễ bypass) |
| 7 | **Hybrid search (keyword + vector)** cho RAG | BM25 + vector cho recall tốt hơn đặc biệt với tên điều luật cụ thể ("Điều 328 BLDS") mà vector thuần có thể bỏ qua | Vector-only (miss exact article references); keyword-only (miss semantic queries) |

## NOT doing in v1 (and why it's safe to skip)

- **Real-time streaming response:** batch response đủ; latency mục tiêu < 60s cho full analysis, không cần stream
- **Multi-tenancy / team accounts:** v1 chỉ cần individual user; team features là v2 revenue expansion
- **Fine-tuned model:** GPT-4o + Gemini off-the-shelf đủ tốt; fine-tuning cần labeled data chưa có
- **Server-side caching của contract:** privacy concern; OCR results lưu tạm trong session, không persist hợp đồng gốc
- **Rate limiting nâng cao (Redis):** in-memory counter + Prisma DB đủ cho v1 scale; Redis thêm infra complexity
- **WebSocket / realtime:** không cần; poll hoặc batch là đủ cho usecase upload-and-analyze
