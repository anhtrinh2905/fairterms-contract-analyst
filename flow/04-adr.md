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
| 1 | **Xác thực Admin bằng NextAuth + whitelist email** | Nhanh gọn, an toàn, cấu hình danh sách email admin trực tiếp trong biến môi trường `ADMIN_EMAILS`. | Xây dựng hệ thống phân quyền phức tạp (RBAC) với nhiều bảng trong database (quá phức tạp cho v1). |
| 2 | **Lưu trữ Checklist trong PostgreSQL (thay vì file tĩnh)** | Đảm bảo Admin UI có thể sửa và có hiệu lực ngay lập tức trên môi trường cloud không trạng thái (như Railway/Vercel). | Ghi đè file Markdown/JSON trực tiếp trên server (sẽ bị mất sạch khi server khởi động lại/redeploy). |
| 3 | **Cách ly router backend thành `/admin`** | Viết riêng router `app/api/routes/admin.py` để cách ly hoàn toàn, tránh sửa đổi hay gây lỗi cho code nghiệp vụ hiện tại. | Trộn lẫn các API admin vào các router hiện có như `ocr.py`, `checklist.py`. |
| 4 | **Bảng dữ liệu `AdminAuditLog` riêng** | Ghi nhận rõ ràng lịch sử thao tác của admin (ai đã sửa quota của ai, ai cập nhật checklist) trực tiếp vào DB. | Chỉ log ra console/file log thô của server (khó theo dõi và dễ bị mất log). |

## NOT doing in v1 (and why it's safe to skip)

- **Checklist Version Control UI (Lịch sử chỉnh sửa checklist):** Trình quản trị không cần giao diện rollback hay so sánh các phiên bản checklist cũ. An toàn để bỏ qua vì việc chỉnh sửa checklist diễn ra không thường xuyên và có thể khôi phục thủ công từ database backup nếu cần.
- **Tích hợp quản lý file RAG nâng cao (Sửa/Xóa từng chunk cụ thể):** Chỉ cung cấp tính năng Re-index toàn bộ hoặc Ingest tài liệu mới. An toàn vì ChromaDB chứa dữ liệu dạng vector hóa, việc quản trị từng vector đơn lẻ bằng tay là không thực tế và không cần thiết ở giai đoạn v1.
- **Biểu đồ thống kê thời gian thực (Realtime charts):** Chỉ hiển thị các chỉ số tổng hợp dưới dạng số tĩnh cập nhật khi load trang. Bỏ qua để tiết kiệm tài nguyên hệ thống và giảm độ phức tạp của frontend.
