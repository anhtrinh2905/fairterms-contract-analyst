---
checklist_id: hd_cho_thue_can_ho_chung_cu
loai_hop_dong: cho_thue_can_ho_chung_cu
ten_hien_thi: "Hợp đồng cho thuê căn hộ chung cư"
phien_ban: "2.0"
ngon_ngu: vi
quy_uoc_vai_tro:
  ben_a:
    ma: ben_cho_thue
    ten: "Bên cho thuê (chủ nhà)"
    vi_the: manh_the
  ben_b:
    ma: ben_thue
    ten: "Bên thuê (khách thuê)"
    vi_the: yeu_the
  protected_party: ben_b   # Agent LUÔN bảo vệ Bên B (bên thuê)
muc_rui_ro_enum: [cao, trung_binh, thap]
luu_y: "Tài liệu hỗ trợ rà soát, KHÔNG phải tư vấn pháp lý. Số hiệu điều luật cần người có chuyên môn rà soát & cập nhật theo văn bản còn hiệu lực."
van_ban_phap_luat_tham_chieu:
  - "Hiến pháp 2013"
  - "Bộ luật Dân sự 2015 (91/2015/QH13)"
  - "Luật Nhà ở 2023 (27/2023/QH15) — thay thế Luật Nhà ở 2014 (65/2014/QH13)"
  - "Luật Bảo vệ quyền lợi người tiêu dùng 2023 (nếu là hợp đồng theo mẫu)"
---

# CHECKLIST — HỢP ĐỒNG CHO THUÊ CĂN HỘ CHUNG CƯ

## ⚖️ Quy ước vai trò (Agent PHẢI tuân thủ)

- **Bên A = Bên CHO THUÊ** (chủ nhà) — bên mạnh thế, thường soạn hợp đồng.
- **Bên B = Bên THUÊ** (khách thuê) — bên yếu thế, **bên cần được bảo vệ**.
- **Lập trường:** khi đánh giá MỌI điều khoản, Agent luôn đứng về phía **Bên B**.

### Cách tránh "sai bên" (quy trình bắt buộc cho mỗi điều khoản)
1. **Xác định điều khoản đang nói về nghĩa vụ/quyền của BÊN NÀO** (A hay B) — dựa vào chủ ngữ của câu ("Bên A có quyền…", "Bên B phải…").
2. **Tách từng vế theo chủ thể**: nếu một điều khoản có nhiều tình huống ("nếu Bên A… / nếu Bên B…"), phải đánh giá **riêng từng vế**, KHÔNG gộp thành "mọi trường hợp".
3. **Đối chiếu liên điều khoản**: red flag có điều kiện kiểu *"không loại trừ…"* / *"trong mọi trường hợp"* chỉ được kích hoạt sau khi đã kiểm tra các điều khác (vd điều về chấm dứt, bất khả kháng) và xác nhận điều kiện thực sự thỏa.
4. **Tự kiểm mâu thuẫn**: nếu câu trích dẫn (dữ kiện) trái với kết luận → dừng, đọc lại.
5. **Chỉ cảnh báo khi bất lợi cho Bên B**; nếu điều khoản cân bằng hoặc bảo vệ Bên B → đánh dấu **PASS**.

---

## PHẦN 1 — VAI TRÒ & TRÁCH NHIỆM BÊN A (BÊN CHO THUÊ)

> Đây là các nghĩa vụ/quyền **thuộc về Bên A**. Khi điều khoản nói về Bên A, Agent kiểm tra Bên A có **lạm quyền / trốn nghĩa vụ / miễn trừ trách nhiệm** gây bất lợi cho Bên B không.

### 1.1. Trách nhiệm (nghĩa vụ) Bên A PHẢI có

> Chỉ giữ các nghĩa vụ cốt lõi; các khía cạnh khác (bàn giao thiết bị, bán cho bên
> thứ ba, giải quyết tranh chấp…) đã được tầng dấu hiệu per-clause và các tính năng
> khác của app (phụ lục thiết bị, thông tin hợp đồng) che phủ.

| Mã | Nghĩa vụ của Bên A | Bắt buộc |
|----|--------------------|:--------:|
| A-D3 | Báo trước & được đồng ý khi vào căn hộ | có |
| A-D4 | Bảo trì, sửa chữa lớn & lỗi kết cấu, hao mòn tự nhiên | có |
| A-D6 | Báo trước hợp lý khi chấm dứt hợp đồng | có |

### 1.2. Dấu hiệu Bên A LẠM QUYỀN / TRỐN TRÁCH NHIỆM (cảnh báo)
| Mã | Quyền/nghĩa vụ của Bên A bị lạm dụng | Mức | Loại | Vì sao bất lợi cho Bên B | Căn cứ / Gợi ý |
|----|--------------------------------------|:---:|------|--------------------------|----------------|
| B-R6 | Bên A **tự ý vào căn hộ không báo trước** | cao | red_flag | Xâm phạm quyền bất khả xâm phạm chỗ ở của Bên B | Hiến pháp 2013 Điều 22; BLDS Điều 478 |
| B-R7 | Bên A **tăng giá tùy ý** trong thời hạn thuê | cao | red_flag | Trái nguyên tắc giá đã thỏa thuận | BLDS Điều 421; Luật Nhà ở 2023 Điều 172 |
| B-R2 | Bên A **tự thu hồi căn hộ, không chịu trách nhiệm đồ cá nhân** của Bên B | trung_binh | red_flag | Tự ý xử lý/chiếm giữ tài sản của Bên B | BLDS Điều 163 |
| B-R8 | Bên A **đẩy hao mòn tự nhiên/lỗi kết cấu** sang Bên B | trung_binh | red_flag | Nghĩa vụ bảo dưỡng vốn thuộc Bên A | BLDS Điều 477 |
| U-A1 | Bên A **miễn trừ toàn bộ trách nhiệm** với mọi thiệt hại của Bên B | trung_binh | unfair_but_legal | Loại bỏ trách nhiệm kể cả khi do lỗi Bên A | Gợi ý: chỉ miễn trừ khi không do lỗi Bên A |
| U-A2 | Bên A được **đơn phương thay đổi nội quy/biểu phí áp dụng tự động** | thap | unfair_but_legal | Bên B chịu thay đổi ngoài kiểm soát | Gợi ý: giới hạn mức tăng; cho quyền chấm dứt nếu phí tăng quá ngưỡng |

---

## PHẦN 2 — VAI TRÒ & TRÁCH NHIỆM BÊN B (BÊN THUÊ — CẦN BẢO VỆ)

> Đây là các nghĩa vụ/quyền **thuộc về Bên B**. Khi điều khoản nói về Bên B, Agent kiểm tra Bên B có bị **gánh nghĩa vụ/chi phí/chế tài quá mức, không công bằng** không.

### 2.1. Quyền của Bên B PHẢI được bảo đảm
| Mã | Quyền của Bên B | Bắt buộc |
|----|------------------|:--------:|
| B-Q1 | Được sử dụng căn hộ ổn định, riêng tư trong thời hạn thuê | có |
| B-Q2 | Được hoàn cọc đúng hạn, chỉ khấu trừ có căn cứ | có |
| B-Q3 | Được hoàn tiền thuê đã trả cho thời gian chưa sử dụng khi chấm dứt hợp lệ | có |
| B-Q4 | Không bị phạt khi chấm dứt do lỗi Bên A hoặc bất khả kháng | có |

### 2.2. Dấu hiệu Bên B bị GÁNH NGHĨA VỤ / CHẾ TÀI QUÁ MỨC (cảnh báo)
| Mã | Nghĩa vụ/chế tài áp lên Bên B | Mức | Loại | Vì sao bất lợi cho Bên B | Căn cứ / Gợi ý |
|----|------------------------------|:---:|------|--------------------------|----------------|
| B-R1 | Bên B chậm trả → Bên A hủy **không chịu phạt** + Bên B **mất toàn bộ cọc** | trung_binh | red_flag | Chế tài một chiều, dồn hết về Bên B | BLDS Điều 328, 418 |
| B-R3 | Bên B **mất cọc trong MỌI trường hợp** chấm dứt (không loại trừ lỗi Bên A/bất khả kháng) | trung_binh | red_flag | Phạt cọc cả khi Bên B chấm dứt chính đáng | BLDS Điều 328, 351, 156 |
| B-R4 | Bên B bị **báo trước thu hồi quá ngắn** (vd 5 ngày) | thap | red_flag | Không đủ thời gian khắc phục/dọn ra | BLDS Điều 428 |
| B-U1 | Bên B bị **hoàn cọc chậm** (30–60 ngày sau trả nhà) | trung_binh | unfair_but_legal | Cọc bị giam lâu | Gợi ý: rút còn 7–14 ngày |
| B-U2 | Bên B phải **trả trước 3–6 tháng/lần** | trung_binh | unfair_but_legal | Áp lực dòng tiền | Gợi ý: trả theo tháng/quý |
| B-U3 | Bên B chịu **phí quản lý/dịch vụ/sửa chữa nhỏ** | thap | unfair_but_legal | Tăng chi phí thực | Gợi ý: đặt ngưỡng giá trị mỗi bên chịu |
| B-U4 | Bên B phải **báo trước 60–90 ngày**, nếu không **mất cọc** | trung_binh | unfair_but_legal | Khó thoát hợp đồng, chế tài nặng | Gợi ý: giảm thời gian; chế tài tương xứng |
| B-U5 | **Khấu trừ cọc theo đánh giá của Bên A**, không có biên bản hiện trạng đầu kỳ | trung_binh | unfair_but_legal | Trừ cọc tùy tiện | Gợi ý: lập biên bản + ảnh khi nhận nhà |
| B-U6 | **KHÔNG hoàn tiền thuê đã trả** cho thời gian còn lại khi chấm dứt sớm | trung_binh | unfair_but_legal | Mất tiền cho thời gian chưa ở | Gợi ý: hoàn theo tỷ lệ thời gian còn lại |
| B-U7 | **Hạn chế sinh hoạt** (thú cưng, khách ở lại…) | thap | unfair_but_legal | Hạn chế quyền sử dụng | Gợi ý: làm rõ phạm vi, ngoại lệ hợp lý |
| B-U8 | **Chi phí gia hạn** đổ hết cho Bên B | thap | unfair_but_legal | Chi phí ẩn khi gia hạn | Gợi ý: chia/miễn khi gia hạn đúng hạn |

> **Lưu ý "đạt (pass)":** nếu hợp đồng đã bảo vệ Bên B (vd Bên A báo trước khi vào nhà; giá cố định trong kỳ; **có** hoàn tiền thuê còn lại; Bên A hủy thì hoàn cọc + đền bù) → đánh dấu PASS, KHÔNG cảnh báo. Nhiều red flag/unfair ở trên có "phiên bản đạt" tương ứng — Agent phải phân biệt.

---

## PHẦN 3 — Dữ liệu máy đọc cho Agent (machine_readable)

```yaml
ben_a:
  ma: ben_cho_thue
  ten: "Bên cho thuê (chủ nhà)"
  vi_the: manh_the
  nghia_vu_bat_buoc:   # required_clauses thuộc nghĩa vụ Bên A (rút gọn: chỉ giữ cốt lõi)
    - {id: A-D3, ten: "Báo trước & được đồng ý khi vào căn hộ", bat_buoc: true}
    - {id: A-D4, ten: "Bảo trì, sửa chữa lớn & lỗi kết cấu, hao mòn tự nhiên", bat_buoc: true}
    - {id: A-D6, ten: "Báo trước hợp lý khi chấm dứt hợp đồng", bat_buoc: true}
  dau_hieu_lam_quyen:   # clause nói về Bên A nhưng gây bất lợi Bên B
    - id: B-R6
      loai: red_flag
      muc_rui_ro: cao
      tu_khoa: ["vào nhà", "bất cứ lúc nào", "không cần báo trước", "kiểm tra"]
      mo_ta: "Bên A tự ý vào căn hộ không báo trước"
      gay_bat_loi_cho: ben_b
      can_cu: ["Hiến pháp 2013 Điều 22", "BLDS 2015 Điều 478"]
      truy_van_rag: "quyền bất khả xâm phạm về chỗ ở; nghĩa vụ của bên cho thuê bảo đảm quyền sử dụng tài sản thuê ổn định, không được cản trở việc sử dụng nhà ở của bên thuê"
    - id: B-R7
      loai: red_flag
      muc_rui_ro: cao
      tu_khoa: ["tăng giá", "tùy ý", "bất cứ lúc nào", "điều chỉnh giá"]
      mo_ta: "Bên A tăng giá tùy ý trong thời hạn thuê"
      gay_bat_loi_cho: ben_b
      can_cu: ["BLDS 2015 Điều 421", "Luật Nhà ở 2023 Điều 172"]
      truy_van_rag: "sửa đổi hợp đồng phải có thỏa thuận của các bên; bên cho thuê tăng giá thuê nhà ở bất hợp lý trong thời hạn hợp đồng; quyền đơn phương chấm dứt hợp đồng thuê nhà khi bị tăng giá không báo trước"
    - id: B-R2
      loai: red_flag
      muc_rui_ro: trung_binh
      tu_khoa: ["thu hồi", "vắng mặt", "không chịu trách nhiệm", "đồ cá nhân"]
      mo_ta: "Bên A tự thu hồi căn hộ, không chịu trách nhiệm tài sản cá nhân Bên B"
      gay_bat_loi_cho: ben_b
      can_cu: ["BLDS 2015 Điều 163"]
      truy_van_rag: "bảo vệ quyền sở hữu tài sản; quyền đòi lại tài sản bị chiếm giữ; bồi thường thiệt hại về tài sản do hành vi trái pháp luật; tự ý thu hồi nhà cho thuê chiếm giữ đồ đạc của bên thuê"
    - id: B-R8
      loai: red_flag
      muc_rui_ro: trung_binh
      tu_khoa: ["toàn bộ", "mọi hư hỏng", "kể cả hao mòn", "lỗi kết cấu"]
      mo_ta: "Bên A đẩy hao mòn tự nhiên/lỗi kết cấu sang Bên B"
      gay_bat_loi_cho: ben_b
      can_cu: ["BLDS 2015 Điều 477"]
      truy_van_rag: "nghĩa vụ bảo đảm giá trị sử dụng của tài sản thuê; bên cho thuê phải sửa chữa hư hỏng, khuyết tật của tài sản thuê; hao mòn tự nhiên; bảo trì nhà ở cho thuê"
    - id: U-A1
      loai: unfair_but_legal
      muc_rui_ro: trung_binh
      trai_luat: false
      tu_khoa: ["không chịu trách nhiệm", "mọi thiệt hại", "trong mọi trường hợp"]
      mo_ta: "Bên A miễn trừ toàn bộ trách nhiệm với thiệt hại của Bên B"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Chỉ miễn trừ khi thiệt hại không do lỗi Bên A"
      truy_van_rag: "điều khoản miễn trừ trách nhiệm bồi thường thiệt hại; điều kiện giao dịch chung loại bỏ quyền lợi chính đáng của bên kia thì không có hiệu lực; trách nhiệm dân sự do lỗi"
    - id: U-A2
      loai: unfair_but_legal
      muc_rui_ro: thap
      trai_luat: false
      tu_khoa: ["nội quy", "biểu phí", "từng thời kỳ", "áp dụng tự động"]
      mo_ta: "Bên A đơn phương thay đổi nội quy/biểu phí, áp dụng tự động"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Giới hạn mức tăng; cho quyền chấm dứt nếu phí tăng quá ngưỡng"
      truy_van_rag: "sửa đổi hợp đồng phải có thỏa thuận; điều kiện giao dịch chung; đơn phương thay đổi nội quy biểu phí áp dụng cho bên thuê"

ben_b:
  ma: ben_thue
  ten: "Bên thuê (khách thuê)"
  vi_the: yeu_the
  protected: true
  quyen_can_bao_dam:   # required_clauses bảo vệ Bên B (rút gọn: chỉ giữ cốt lõi)
    - {id: B-Q1, ten: "Được sử dụng căn hộ ổn định, riêng tư trong thời hạn thuê", bat_buoc: true}
    - {id: B-Q2, ten: "Được hoàn cọc đúng hạn, chỉ khấu trừ có căn cứ", bat_buoc: true}
    - {id: B-Q3, ten: "Được hoàn tiền thuê đã trả cho thời gian chưa sử dụng khi chấm dứt hợp lệ", bat_buoc: true}
    - {id: B-Q4, ten: "Không bị phạt khi chấm dứt do lỗi Bên A hoặc bất khả kháng", bat_buoc: true}
  dau_hieu_ganh_qua_muc:   # clause áp nghĩa vụ/chế tài quá mức lên Bên B
    - id: B-R1
      loai: red_flag
      muc_rui_ro: trung_binh
      tu_khoa: ["chậm thanh toán", "đơn phương hủy", "không phải chịu", "khoản phạt", "mất", "đặt cọc"]
      mo_ta: "Bên B chậm trả → Bên A hủy không chịu phạt + Bên B mất toàn bộ cọc (một chiều)"
      gay_bat_loi_cho: ben_b
      can_cu: ["BLDS 2015 Điều 328", "BLDS 2015 Điều 418"]
      truy_van_rag: "đặt cọc và xử lý tiền đặt cọc khi từ chối thực hiện hợp đồng; phạt vi phạm hợp đồng theo thỏa thuận; chế tài một chiều chỉ áp dụng cho một bên"
      dieu_kien_kich_hoat: "Chỉ match khi chế tài chỉ áp một chiều lên Bên B; nếu Bên A cũng bị chế tài tương ứng → PASS"
    - id: B-R3
      loai: red_flag
      muc_rui_ro: trung_binh
      tu_khoa: ["mất cọc", "mọi trường hợp", "đơn phương chấm dứt"]
      mo_ta: "Bên B mất cọc trong mọi trường hợp, không loại trừ lỗi Bên A/bất khả kháng"
      gay_bat_loi_cho: ben_b
      can_cu: ["BLDS 2015 Điều 328", "BLDS 2015 Điều 351", "BLDS 2015 Điều 156"]
      truy_van_rag: "đặt cọc; trách nhiệm dân sự do vi phạm nghĩa vụ; miễn trách nhiệm khi vi phạm do sự kiện bất khả kháng hoặc hoàn toàn do lỗi của bên có quyền; mất tiền đặt cọc trong mọi trường hợp chấm dứt hợp đồng"
      dieu_kien_kich_hoat: "PHẢI kiểm tra liên điều khoản (chấm dứt, bất khả kháng). Nếu hợp đồng ĐÃ loại trừ lỗi Bên A hoặc bất khả kháng ở bất kỳ điều nào → KHÔNG match (PASS)."
    - id: B-R4
      loai: red_flag
      muc_rui_ro: thap
      tu_khoa: ["báo trước", "05 ngày", "5 ngày", "thu hồi"]
      mo_ta: "Thời gian báo trước thu hồi quá ngắn"
      gay_bat_loi_cho: ben_b
      can_cu: ["BLDS 2015 Điều 428"]
      truy_van_rag: "đơn phương chấm dứt thực hiện hợp đồng phải thông báo trước cho bên kia; thời hạn báo trước tối thiểu khi đơn phương chấm dứt hợp đồng thuê nhà ở; thu hồi nhà cho thuê"
    - id: B-U1
      loai: unfair_but_legal
      muc_rui_ro: trung_binh
      trai_luat: false
      tu_khoa: ["hoàn lại", "trong vòng", "30 ngày", "60 ngày", "sau khi trả nhà"]
      mo_ta: "Hoàn cọc chậm (30-60 ngày) sau khi trả nhà"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Rút ngắn còn 7-14 ngày"
      truy_van_rag: "hoàn trả tiền đặt cọc khi chấm dứt hợp đồng thuê; thời hạn thực hiện nghĩa vụ hoàn trả tài sản"
    - id: B-U2
      loai: unfair_but_legal
      muc_rui_ro: trung_binh
      trai_luat: false
      tu_khoa: ["03 tháng", "06 tháng", "trả trước"]
      mo_ta: "Thanh toán 3-6 tháng/lần trả trước"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Trả theo tháng/quý linh hoạt"
      truy_van_rag: "kỳ hạn trả tiền thuê tài sản theo thỏa thuận; phương thức thanh toán tiền thuê nhà ở"
    - id: B-U3
      loai: unfair_but_legal
      muc_rui_ro: thap
      trai_luat: false
      tu_khoa: ["phí quản lý", "phí dịch vụ", "sửa chữa nhỏ", "bên thuê chịu"]
      mo_ta: "Bên B chịu phí quản lý/dịch vụ/sửa chữa nhỏ"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Đặt ngưỡng giá trị mỗi bên chịu"
      truy_van_rag: "chi phí quản lý vận hành nhà chung cư ai chịu; nghĩa vụ sửa chữa nhỏ của bên thuê tài sản"
    - id: B-U4
      loai: unfair_but_legal
      muc_rui_ro: trung_binh
      trai_luat: false
      tu_khoa: ["báo trước", "60 ngày", "90 ngày", "mất cọc"]
      mo_ta: "Báo trước 60-90 ngày khi chấm dứt sớm, nếu không mất cọc"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Giảm thời gian; chế tài tương xứng"
      truy_van_rag: "đơn phương chấm dứt hợp đồng thuê nhà ở phải báo trước; phạt cọc khi chấm dứt hợp đồng trước hạn"
    - id: B-U5
      loai: unfair_but_legal
      muc_rui_ro: trung_binh
      trai_luat: false
      tu_khoa: ["khấu trừ", "hao mòn", "bên A đánh giá", "không biên bản"]
      mo_ta: "Khấu trừ cọc theo đánh giá Bên A, không biên bản hiện trạng đầu kỳ"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Lập biên bản + ảnh hiện trạng khi nhận nhà"
      truy_van_rag: "trả lại tài sản thuê đúng hiện trạng; nghĩa vụ chứng minh thiệt hại khi khấu trừ tiền đặt cọc; hao mòn tự nhiên không phải bồi thường"
    - id: B-U6
      loai: unfair_but_legal
      muc_rui_ro: trung_binh
      trai_luat: false
      tu_khoa: ["không hoàn", "tiền thuê đã trả", "thời gian còn lại", "chấm dứt sớm"]
      mo_ta: "KHÔNG hoàn tiền thuê đã trả cho thời gian còn lại"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Hoàn theo tỷ lệ thời gian còn lại"
      truy_van_rag: "hoàn trả tiền thuê đã trả trước cho thời gian chưa sử dụng khi chấm dứt hợp đồng thuê"
      dieu_kien_kich_hoat: "Chỉ match khi hợp đồng quy định KHÔNG hoàn. Nếu hợp đồng ghi 'trả lại số tiền nhà còn lại' / hoàn theo tỷ lệ → đây là PASS, KHÔNG match."
    - id: B-U7
      loai: unfair_but_legal
      muc_rui_ro: thap
      trai_luat: false
      tu_khoa: ["không được nuôi", "thú cưng", "không được tiếp khách", "hạn chế"]
      mo_ta: "Hạn chế sinh hoạt (thú cưng, khách ở lại...)"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Làm rõ phạm vi; thỏa thuận ngoại lệ hợp lý"
      truy_van_rag: "quyền sử dụng tài sản thuê theo công dụng và thỏa thuận; hạn chế sinh hoạt của bên thuê nhà ở"
    - id: B-U8
      loai: unfair_but_legal
      muc_rui_ro: thap
      trai_luat: false
      tu_khoa: ["chi phí gia hạn", "làm lại hợp đồng", "bên thuê chịu"]
      mo_ta: "Mọi chi phí gia hạn do Bên B chịu"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Chia hoặc miễn khi gia hạn đúng hạn"
      truy_van_rag: "gia hạn hợp đồng thuê nhà ở; chi phí giao kết hợp đồng do các bên thỏa thuận"
