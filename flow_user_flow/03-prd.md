# Stage 03 — PRD

1-2 pages max. Test: could a stranger build v1 from this without asking you anything?

## Gate — check ALL before `/flow next`
- [x] Every section below is filled from MY scope decision (stage 02), not re-expanded
- [x] Success metric is a NUMBER, not vibes ("save time" fails; "first response < 2h" passes)
- [x] Each feature names the user action and the observable result, tagged with a stable `FRn:` id
- [x] Pain & gain is a MAPPING TABLE: every pain cites evidence (a stage-01 quote or a named observation), and names the v1 feature that kills it; every v1 feature kills at least one pain
- [x] A stranger could build v1 from this without asking me anything
- [x] No FILL placeholders remain in this file

## Context

Người mua và thuê bất động sản tại Việt Nam — đặc biệt người lần đầu giao dịch — phải ký hợp đồng dày hàng chục trang đầy thuật ngữ pháp lý. Luật sư tư vấn tốn 500K–3M VND/lần và mất 1–3 ngày. Hỏi group Facebook miễn phí nhưng chờ lâu và không có trích dẫn pháp luật. HopDongAI là web app cho phép upload hợp đồng (PDF/ảnh), AI tự động OCR + phân tích từng điều khoản, gắn cờ rủi ro, và trích dẫn chính xác văn bản hợp đồng + điều luật liên quan (Luật Đất đai 2024, BLDS 2015). Sản phẩm **không thay thế luật sư** — luôn có disclaimer rõ ràng.

## Target users

**Persona chính: "Anh Hùng mua nhà lần đầu"** — 28–42 tuổi, thu nhập trung bình-khá, sắp mua hoặc thuê BĐS, đọc group Facebook để hỏi tư vấn, có smartphone và biết dùng Google Drive. Không có nền tảng pháp lý. Sợ ký sai, sợ mất tiền cọc, không biết điều khoản nào nguy hiểm. Sẵn sàng trả 50K–200K VND nếu được giải thích rõ ràng và nhanh.

**Persona phụ: "Chị Lan môi giới nhỏ"** — tự do, làm 3–5 hợp đồng/tháng, muốn gửi link phân tích cho khách để tạo uy tín. Dùng như công cụ tư vấn không chính thức.

## Pain & gain (mapping table — the traceability spine of the PRD)

| # | Persona | Pain (concrete) | Evidence (stage-01 quote/source or named observation) | Today's workaround | V1 feature that kills it | Observable gain |
|---|---|---|---|---|---|---|
| P1 | Anh Hùng | Không đọc được hợp đồng 30 trang — thuật ngữ pháp lý khó hiểu | "Hợp đồng mua nhà dày mấy chục trang, toàn thuật ngữ pháp lý, không hiểu gì hết" — Dantri.com.vn | Nhờ người quen đọc hộ, hỏi group Facebook | FR1: Upload + OCR + hiển thị structured | Xem toàn bộ nội dung hợp đồng được cấu trúc trong 2 phút |
| P2 | Anh Hùng | Không biết điều khoản nào nguy hiểm, ký xong mới phát hiện | "Người mua nhà thường không đọc kỹ hợp đồng — phát hiện ra thì đã muộn" — CafeF.vn | Không làm gì, tin vào môi giới | FR2: Phân tích rủi ro + checklist | Xem danh sách điều khoản được gắn cờ màu (đỏ/vàng/xanh) với giải thích tiếng Việt đơn giản |
| P3 | Anh Hùng | Không biết điều khoản đó có hợp pháp không, ai nói cũng không biết tin | "Nhiều giao dịch chỉ dùng hợp đồng không công chứng — người mua không được pháp luật bảo vệ" — Thanhnien.vn | Hỏi luật sư tốn tiền và thời gian | FR3: Legal RAG với trích dẫn cụ thể | Mỗi rủi ro được trích dẫn điều luật cụ thể (VD: "vi phạm Điều 328 BLDS 2015 về đặt cọc") |
| P4 | Anh Hùng | Phải tạo tài khoản mới dùng được — rào cản quá cao khi chỉ muốn thử 1 lần | Quan sát: hầu hết tool yêu cầu đăng ký trước | Không dùng tool, hỏi Facebook | FR4: Guest mode với quota (3 phân tích/ngày) | Dùng ngay không cần đăng ký; thấy kết quả → muốn đăng ký để lưu lịch sử |
| P5 | Chị Lan | Muốn chia sẻ kết quả phân tích cho khách hàng | Quan sát: môi giới nhỏ thiếu công cụ tư vấn chuyên nghiệp | Chụp màn hình, gửi Zalo | FR5: Share link kết quả | Gửi link cho khách, họ xem được kết quả phân tích đầy đủ |

### Pains NOT addressed in v1 (deliberate — tie to the scope cut list)

- Ký số điện tử → v2 (cần tích hợp CA provider, ngoài scope)
- So sánh nhiều phiên bản hợp đồng → v2
- Export PDF báo cáo → v2 sau khi validate nhu cầu

## Problem statement

Người mua BĐS Việt Nam không có công cụ nhanh, rẻ, và đáng tin để hiểu hợp đồng trước khi ký — dẫn đến ký sai, mất tiền, tranh chấp kéo dài.

## Features (user-centric — action → observable result)

- **FR1:** Là user, tôi upload file PDF hoặc ảnh hợp đồng, và thấy nội dung được trích xuất + cấu trúc hóa thành các điều khoản rõ ràng trong < 60 giây.
- **FR2:** Là user, tôi chọn loại hợp đồng (mua bán/thuê/đặt cọc), và thấy từng điều khoản được đánh giá rủi ro (cao/trung/thấp) kèm giải thích tiếng Việt đơn giản.
- **FR3:** Là user, tôi xem một điều khoản bị gắn cờ, và thấy trích dẫn cụ thể từ Luật Đất đai 2024 / BLDS 2015 / Luật Kinh doanh BĐS 2023 giải thích tại sao nó rủi ro.
- **FR4:** Là guest user, tôi dùng app mà không cần đăng ký (tối đa 3 phân tích/ngày); sau khi đăng nhập Google, tôi có quota cao hơn và lịch sử lưu lại.
- **FR5:** Là user đã phân tích xong, tôi bấm "Chia sẻ", nhận link read-only và gửi cho người khác xem kết quả.
- **FR6:** Trên mọi trang hiển thị kết quả, có disclaimer rõ ràng: "Đây là phân tích AI hỗ trợ tham khảo, không thay thế tư vấn pháp lý từ luật sư."

## Non-functional requirements

- **Mobile-first:** giao diện dùng được trên điện thoại (upload ảnh từ camera)
- **Tốc độ OCR:** < 60 giây cho file ≤ 20 trang
- **Tiếng Việt:** toàn bộ UI và kết quả phân tích phải bằng tiếng Việt
- **Disclaimer:** bắt buộc xuất hiện trên mọi trang kết quả — không được ẩn hoặc thu nhỏ
- **Privacy:** không lưu nội dung hợp đồng gốc quá 30 ngày; không log PII

## Tech stack

- **Backend:** FastAPI (Python 3.12), uv, ChromaDB (vector store), Gemini API (OCR), OpenAI GPT-4o (RAG + evaluation), port 8010
- **Frontend:** Next.js 16 App Router, React 19, TypeScript, NextAuth (Google), Prisma + PostgreSQL
- **Deploy target:** Frontend → Vercel; Backend → Railway hoặc Fly.io; DB → Railway PostgreSQL
- **OCR pipeline:** Gemini Vision → structured JSON → ChromaDB indexing

## Success metric (numbers only)

- **50 hợp đồng được phân tích trong tuần đầu sau launch** (đo qua UsageEvent table)
- **Tỷ lệ hoàn thành flow (upload → xem kết quả) ≥ 70%** (không bỏ giữa chừng)
- **Ít nhất 5 user đăng nhập Google** sau khi dùng guest mode (conversion rate guest → auth)
- **0 báo cáo lỗi "kết quả sai hoàn toàn"** trong 2 tuần đầu (quality floor)
