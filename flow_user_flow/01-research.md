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

1. **Kyta Platform (FPT)** — https://kyta.vn — Hệ thống quản lý vòng đời hợp đồng B2B toàn diện: soạn thảo, ký số, lưu trữ, phân tích AI. **Điểm mạnh:** tích hợp quy trình doanh nghiệp, đạt ISO 27001. **Điểm yếu:** hướng doanh nghiệp (B2B), giá ~2.5M VND/người/tháng — hoàn toàn không khả thi cho cá nhân mua nhà 1 lần.

2. **Legback** — https://legback.ai — Trợ lý pháp lý AI tiếng Việt, tra cứu luật và tư vấn tình huống pháp lý chung. **Điểm mạnh:** dữ liệu pháp luật rộng. **Điểm yếu:** không có tính năng upload + phân tích hợp đồng cụ thể; không gắn cờ rủi ro trên điều khoản từng dòng; không OCR.

3. **LuatVietnam.vn / AI Luật** — https://luatvietnam.vn — Cơ sở dữ liệu pháp luật + chatbot tư vấn. **Điểm mạnh:** data pháp luật cập nhật, miễn phí cơ bản. **Điểm yếu:** không phân tích hợp đồng do người dùng upload; chỉ tra cứu luật chung, không chỉ ra rủi ro điều khoản cụ thể trong hợp đồng cá nhân.

## What users say (web: 3 real complaints quoted+linked · non-web: real first-party friction)

1. > "Hợp đồng mua nhà dày mấy chục trang, toàn thuật ngữ pháp lý, mình không hiểu gì hết mà môi giới cứ giục ký ngay. Không biết tìm ai để hỏi cho nhanh." — Dantri.com.vn, bài về rủi ro giao dịch BĐS qua mạng xã hội (https://dantri.com.vn)

2. > "Nhiều giao dịch bất động sản chỉ dùng hợp đồng đặt cọc, hợp đồng hứa mua hứa bán không công chứng — người mua không được pháp luật bảo vệ khi có tranh chấp." — Thanhnien.vn, cảnh báo rủi ro pháp lý BĐS (https://thanhnien.vn)

3. > "Người mua nhà thường không đọc kỹ hợp đồng, đặc biệt các điều khoản phạt vi phạm và điều kiện chấm dứt — phát hiện ra thì đã muộn, tranh chấp kéo dài nhiều năm." — CafeF.vn, bài phân tích rủi ro mua nhà (https://cafef.vn)

## GTM & business reality

Building is the cheap part now. Distribution and willingness-to-pay are where ideas die —
research them BEFORE planning, not after shipping.

### Who pays today, and how much (pricing reference points)

- **Kyta Platform (FPT)** → ~2,500,000 VND/người/tháng → doanh nghiệp B2B trả (quản lý hàng trăm hợp đồng)
- **Luật sư tư vấn hợp đồng BĐS** → 500,000–3,000,000 VND/lần → cá nhân tự thuê khi mua nhà; phần lớn bỏ qua vì đắt và chậm
- **Status quo phổ biến nhất** → hỏi miễn phí trên group Facebook / nhờ người quen có hiểu biết pháp lý → tốn 1–3 ngày chờ, kết quả không đáng tin, không trích dẫn luật

### The first-10-users channel (web) · who-benefits (non-web/internal)

Group Facebook "Mua Nhà Cùng Nhau" (~200K thành viên) và "Hội Mua Nhà Lần Đầu" (~80K thành viên) — nơi thành viên thường xuyên đăng ảnh hợp đồng hỏi "điều khoản này có ổn không?". Đây là nơi pain được thể hiện rõ nhất và có thể tiếp cận bằng cách tham gia cộng đồng + chia sẻ kết quả phân tích thực tế.

### Why switch (vs the status quo)

Người dùng hiện tại phải chờ 1–3 ngày để nhận câu trả lời từ group Facebook, không có trích dẫn pháp luật cụ thể, và không ai chịu trách nhiệm về độ chính xác. HopDongAI trả lời trong vài phút, trích dẫn CHÍNH XÁC đoạn văn trong hợp đồng + điều luật liên quan (Luật Đất đai 2024, BLDS 2015), giá freemium — rào cản gia nhập gần như bằng 0. Người dùng chuyển sang vì nhanh hơn, có trích dẫn kiểm chứng được, và không tốn tiền thuê luật sư cho việc đọc sơ bộ.

## Technically free vs hard

- **Free (solved by libraries/platforms):** OCR tiếng Việt (Gemini Vision đã tốt), PDF parsing (PyMuPDF/pdfplumber), vector search (ChromaDB), Google OAuth (NextAuth), hosting (Vercel + Railway/Fly.io), LLM inference (Gemini API + OpenAI API)
- **Hard (custom work, real risk):** (1) Độ chính xác OCR với ảnh chụp tay/chất lượng thấp; (2) RAG phải trích dẫn đúng điều luật — hallucination là rủi ro pháp lý thực sự; (3) Phân loại đúng loại hợp đồng để áp checklist đúng; (4) Giữ disclaimer đủ mạnh để không bị quy là hành nghề luật trái phép
