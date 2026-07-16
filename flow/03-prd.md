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

HopDongAI cần cập nhật liên tục các văn bản pháp lý mới và các checklist đánh giá hợp đồng bất động sản. Hiện tại các thao tác này đều được làm thủ công bằng code hoặc script chạy bằng CLI từ nhà phát triển, gây chậm trễ cho vận hành và rủi ro bảo mật dữ liệu. Phân hệ Admin Dashboard này được xây dựng độc lập hoàn toàn, không ảnh hưởng đến code nghiệp vụ hiện tại của người dùng, giúp đội ngũ vận hành tự quản lý tài liệu pháp luật (RAG), checklist rà soát, kiểm soát tier/quota của người dùng và giám sát hệ thống một cách trực quan, an toàn.

## Target users

**Quản trị viên / Biên tập viên pháp chế (Admin/Ops):** Người chịu trách nhiệm cập nhật văn bản luật và tối ưu các checklist đánh giá hợp đồng. Có kiến thức luật nhưng không biết lập trình hoặc dùng Git/Database. Cần giao diện web đơn giản, trực quan để thao tác.

## Pain & gain (mapping table — the traceability spine of the PRD)

| # | Persona | Pain (concrete) | Evidence (stage-01 quote/source or named observation) | Today's workaround | V1 feature that kills it | Observable gain |
|---|---|---|---|---|---|---|
| P1 | Admin | Khó cập nhật văn bản luật mới vào RAG | Phải nhờ dev nạp file qua script Python CLI | Dev chạy script thủ công | **FR2**: RAG Document Management | Admin tự tải file luật (.md) lên UI và hệ thống tự động nạp vào ChromaDB trong < 30 giây. |
| P2 | Admin | Không tự cập nhật được tiêu chuẩn checklist rà soát | Checklist lưu dạng file tĩnh trong git, sửa phải tạo PR và deploy lại code | Gửi file Word yêu cầu dev sửa | **FR3**: Checklist Editor | Admin cập nhật checklist trực tiếp trên UI, thay đổi có hiệu lực ngay lập tức. |
| P3 | Admin | Sửa đổi hạn mức người dùng (quota/tier) thủ công gây rủi ro | Dev phải SSH và chạy câu lệnh SQL trực tiếp trên DB production | Dev chạy SQL sửa DB | **FR4**: User Quota Editor | Tìm kiếm và sửa quota/tier của user an toàn thông qua các form kiểm duyệt trên UI. |
| P4 | Admin | Thiếu góc nhìn giám sát hoạt động hệ thống | Không có trang tổng hợp số liệu tải, lỗi, và các thay đổi dữ liệu | Đọc log file thô từ server | **FR5**: System Monitoring & Logs | Xem biểu đồ thống kê tĩnh và danh sách Audit Logs các hành động của admin. |
| P5 | Admin | Không kiểm tra được dữ liệu RAG nạp vào đã đúng chưa | Phải gọi API `/rag/search` từ Postman để kiểm tra | Gọi Postman check | **FR6**: RAG Testing Playground | Nhập câu hỏi thử nghiệm trên UI và xem trực tiếp các đoạn luật (chunks) tìm được cùng điểm số (score). |

### Pains NOT addressed in v1 (deliberate — tie to the scope cut list)

- Rollback phiên bản checklist khi sửa sai → Dùng quy trình git backup file định kỳ để dev rollback thủ công.
- Tự động phát hiện xung đột dữ liệu checklist → v2.

## Problem statement

Người vận hành hệ thống HopDongAI không có giao diện an toàn và trực quan để tự quản lý văn bản pháp luật, cập nhật checklists rà soát và cấu hình quota người dùng, dẫn đến phụ thuộc hoàn toàn vào lập trình viên và làm chậm tiến độ cập nhật sản phẩm.

## Features (user-centric — action → observable result)

- **FR1: Role-Based Route Protection:** Là Admin, tôi truy cập vào `/admin`, và tôi chỉ thấy dashboard nếu tài khoản của tôi có role `admin` hoặc email thuộc danh sách `ADMIN_EMAILS` cấu hình trong `.env`, nếu không tôi sẽ bị redirect ra trang chủ kèm thông báo lỗi.
- **FR2: RAG Document Management:** Là Admin, tôi tải lên file luật Markdown hoặc paste văn bản luật mới trên UI và bấm "Index", sau đó tôi thấy tài liệu xuất hiện trong danh sách các luật đã ingest kèm trạng thái cập nhật thành công.
- **FR3: Checklist Editor:** Là Admin, tôi chọn một loại hợp đồng và sửa đổi nội dung các đầu mục checklist, sau đó tôi thấy các thay đổi này được lưu lại và áp dụng ngay cho các lượt phân tích hợp đồng mới của người dùng.
- **FR4: User Quota Editor:** Là Admin, tôi tìm kiếm một người dùng theo email và tăng giới hạn lượt dùng hoặc đổi tier của họ từ "free" sang "premium", sau đó tôi thấy số quota mới hiển thị tức thì trên tài khoản của người dùng đó.
- **FR5: System Monitoring & Logs:** Là Admin, tôi mở trang chủ dashboard và thấy tổng quan số hợp đồng đã phân tích hôm nay, tỷ lệ thành công, thời gian OCR trung bình, kèm theo danh sách Audit Log ghi rõ admin nào vừa thực hiện hành động gì.
- **FR6: RAG Testing Playground:** Là Admin, tôi nhập một câu hỏi kiểm tra và bấm "Search", hệ thống hiển thị trực tiếp danh sách các chunk văn bản luật tìm được từ ChromaDB kèm theo điểm tương đồng để tôi đánh giá chất lượng index.

## Non-functional requirements

- **Cách ly nghiệp vụ:** Code của Admin Dashboard phải được viết hoàn toàn cô lập (sử dụng thư mục `/admin` ở frontend và router `/admin` ở backend), tuyệt đối không sửa đổi hay gây ảnh hưởng tới hoạt động của luồng rà soát hợp đồng của người dùng thường.
- **Bảo mật:** Tất cả các endpoint `/admin` phía backend phải thực hiện xác thực session hợp lệ của người dùng có quyền admin.
- **Tính tức thời:** Các cấu hình quota và checklist sau khi sửa phải có tác dụng ngay mà không cần khởi động lại server.

## Tech stack

- **Backend:** FastAPI (thêm `app/api/routes/admin.py` router mới), gọi các service nạp RAG và cập nhật checklist hiện có.
- **Frontend:** Next.js 16 App Router (thư mục `src/frontend/app/admin/` cô lập), Prisma Client để query DB trực tiếp phía frontend cho các tác vụ quản trị user.
- **Database:** PostgreSQL (lưu thêm bảng `AdminAuditLog`).

## Success metric (numbers only)

- **100%** thao tác nạp tài liệu luật (RAG) mới và cập nhật checklist được thực hiện qua giao diện Admin UI thay vì chạy script thủ công bởi lập trình viên.
- Thời gian thực hiện cập nhật 1 điều khoản checklist giảm từ **24 giờ** (qua code PR/deploy) xuống còn dưới **1 phút** (qua giao diện Admin).
- **0%** rò rỉ dữ liệu trang admin cho người dùng thường (kiểm thử 10 tài khoản không có quyền admin truy cập `/admin` đều bị redirect/chặn 100%).
