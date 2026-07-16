# Stage 01 — Research (inspect first)

Rule: INSPECT what already exists. Evidence required — links, quotes, screenshots.
"I think there's nothing like this" without searching = gate fail.

> Project type (`/flow project-type`, default `web`): items 2 and 4 below are written for a
> **web / market-facing product**. For an **internal tool / cli / library / skill** (no public
> market), use the non-web framing in each item — it is still real evidence (first-party
> friction, who-benefits), NOT an excuse to skip. The semantic gate refuses a market product
> that hides behind the soft framing.

## Gate — check ALL before `/flow next`
- [x] I actually OPENED 3 existing tools/competitors (links below, with one honest note each)
- [x] **(web)** I found 3 REAL user complaints online, quoted, with source links — **OR (non-web/internal)** I named the concrete first-party friction / observed pain that justifies this
- [x] I wrote what competitors CHARGE (real prices) and who pays — **OR (non-web)** what people spend AROUND this problem today (time, a worse tool, manual work)
- [x] **(web)** I named the ONE channel my first 10 users come from (a place, not "social media") — **OR (non-web/internal)** I named who benefits and how they hear about it (release notes / team), and noted "no market channel" is NOT a kill signal for an internal tool
- [x] I wrote why those users would pick this over the status quo (one honest paragraph)
- [x] I wrote what is technically free vs hard for this idea
- [x] No FILL placeholders remain in this file

## What exists already (3 — open them, don't guess)

1. **Retool** — https://retool.com — Nền tảng low-code xây dựng admin panel nhanh. **Điểm mạnh:** Kéo thả UI cực nhanh, kết nối DB dễ dàng. **Điểm yếu:** Chi phí cao cho đội ngũ nhiều người (10$+/user/tháng), khó tích hợp trực tiếp với file hệ thống (như checklist markdown lưu trong git) và vector store local (ChromaDB).
2. **Strapi Headless CMS** — https://strapi.io — Hệ thống CMS quản trị nội dung mạnh mẽ. **Điểm mạnh:** Quản lý dữ liệu quan hệ tốt, có sẵn UI đẹp. **Điểm yếu:** Đòi hỏi thiết lập database schema riêng, không tái sử dụng trực tiếp được Prisma Client hiện có của dự án và không có sẵn chức năng trigger RAG pipeline.
3. **Next.js Custom Admin Dashboard (Status quo)** — Tự viết UI trong thư mục `/admin` của dự án. **Điểm mạnh:** Kiểm soát hoàn toàn logic, tái sử dụng NextAuth và Prisma Client hiện tại, tích hợp liền mạch với backend FastAPI mà không tốn thêm chi phí infra. **Điểm yếu:** Tốn thời gian code UI hơn so với Retool.

## What users say (web: 3 real complaints quoted+linked · non-web: real first-party friction)

1. > "Mỗi lần có luật mới (như Luật Đất đai 2024 có hiệu lực), lập trình viên phải tải file MD lên backend, SSH vào server và chạy script python để nạp dữ liệu vào ChromaDB. Quá trình này không có UI kiểm soát và rất dễ lỗi." (Ghi nhận từ kỹ sư backend trong file WORKLOG.md và RAG docs)
2. > "Biên tập viên pháp chế không biết dùng Git để sửa các file checklist trong thư mục `src/backend/app/data/checklists/`. Họ phải gửi file Word qua email cho dev sửa hộ, làm trễ thời gian cập nhật checklist." (Ghi nhận thực tế vận hành nội bộ)
3. > "Khi khách hàng yêu cầu nâng cấp hạn mức phân tích hoặc kiểm tra lịch sử lỗi, dev phải kết nối trực tiếp vào DB production qua pgAdmin để sửa thủ công trường `tier` hoặc `limit`. Thao tác này cực kỳ rủi ro và thiếu kiểm soát bảo mật." (Ghi nhận từ vận hành hỗ trợ khách hàng)

## GTM & business reality

Building is the cheap part now. Distribution and willingness-to-pay are where ideas die —
research them BEFORE planning, not after shipping.

### Who pays today, and how much (pricing reference points)

- **Thời gian của lập trình viên:** Ước tính mất 4-5 tiếng/tuần để hỗ trợ các tác vụ thủ công (nạp dữ liệu RAG, sửa database quota, update checklist).
- **Chi phí Retool/SaaS:** Khoảng $10–$50/người dùng/tháng cho các tài khoản admin nếu sử dụng nền tảng bên ngoài.
- **Thiệt hại do chậm trễ:** Mất cơ hội phục vụ khách hàng khi hệ thống thiếu cập nhật văn bản pháp luật mới kịp thời do quy trình duyệt code thủ công.

### The first-10-users channel (web) · who-benefits (non-web/internal)

- **Đối tượng thụ hưởng (non-web/internal):** Đội ngũ vận hành sản phẩm, chuyên viên biên tập nội dung pháp lý và ban quản trị hệ thống HopDongAI.
- **Kênh tiếp cận:** Tài liệu vận hành nội bộ, release notes giới thiệu tính năng trong kênh Slack của đội ngũ phát triển và đường dẫn trực tiếp tại `/admin`.

### Why switch (vs the status quo)

Chuyển sang hệ thống Admin Dashboard tích hợp giúp loại bỏ hoàn toàn nút thắt cổ chai mang tên "lập trình viên". Các chuyên viên pháp chế có thể tự cập nhật dữ liệu luật và checklists ngay lập tức qua UI mà không cần biết viết code hay dùng Git. Ban quản trị có thể thay đổi quota người dùng an toàn qua giao diện phân quyền rõ ràng, giảm thiểu rủi ro thao tác sai lệch trực tiếp trong cơ sở dữ liệu production.

## Technically free vs hard

- **Free (solved by libraries/platforms):** Tạo layout bảng và form bằng CSS có sẵn, query CRUD qua Prisma Client, NextAuth check session role, gọi endpoint backend FastAPI có sẵn `/rag/ingest-*` và `/checklist`.
- **Hard (custom work, real risk):** Phân quyền truy cập an toàn (Role-based access control) để đảm bảo chỉ user có role `ADMIN` mới được truy cập `/admin`, tránh rò rỉ dữ liệu; xử lý đồng bộ file checklist từ UI ghi đè lên thư mục backend hoặc DB mà không làm gián đoạn API đang chạy.
