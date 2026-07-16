---
checklist_id: hd_mua_ban_can_ho_chung_cu
loai_hop_dong: mua_ban_can_ho_chung_cu
ten_hien_thi: "Hợp đồng mua bán căn hộ chung cư"
phien_ban: "2.0"
ngon_ngu: vi
quy_uoc_vai_tro:
  ben_a:
    ma: ben_ban
    ten: "Bên bán"
    vi_the: manh_the
  ben_b:
    ma: ben_mua
    ten: "Bên mua"
    vi_the: yeu_the
  protected_party: ben_b   # Agent LUÔN bảo vệ Bên B (bên mua)
muc_rui_ro_enum: [cao, trung_binh, thap]
luu_y: "Tài liệu hỗ trợ rà soát, KHÔNG phải tư vấn pháp lý. Số hiệu điều luật cần người có chuyên môn rà soát & cập nhật theo văn bản còn hiệu lực."
van_ban_phap_luat_tham_chieu:
  - "Bộ luật Dân sự 2015 (91/2015/QH13)"
  - "Luật Nhà ở 2023 (27/2023/QH15)"
  - "Luật Kinh doanh bất động sản 2023 (29/2023/QH15)"
  - "Luật Đất đai 2024"
  - "Luật Công chứng"
  - "Luật Thuế thu nhập cá nhân; Luật Quản lý thuế"
  - "Nghị định về lệ phí trước bạ"
---

# CHECKLIST — HỢP ĐỒNG MUA BÁN CĂN HỘ CHUNG CƯ

## ⚖️ Quy ước vai trò (Agent PHẢI tuân thủ)

- **Bên A = Bên BÁN** — bên mạnh thế, thường soạn hợp đồng.
- **Bên B = Bên MUA** — bên yếu thế, **bên cần được bảo vệ**.
- **Lập trường:** khi đánh giá MỌI điều khoản, Agent luôn đứng về phía **Bên B**.

### Cách tránh "sai bên" (quy trình bắt buộc cho mỗi điều khoản)
1. **Xác định điều khoản đang nói về nghĩa vụ/quyền của BÊN NÀO** (A hay B) — dựa vào chủ ngữ của câu.
2. **Tách từng vế theo chủ thể**: điều khoản có nhiều tình huống ("nếu Bên A… / nếu Bên B…") phải đánh giá **riêng từng vế**, KHÔNG gộp thành "mọi trường hợp".
3. **Đối chiếu liên điều khoản** trước khi gắn red flag có điều kiện ("không loại trừ…", "trong mọi trường hợp").
4. **Tự kiểm mâu thuẫn**: câu trích dẫn trái với kết luận → dừng, đọc lại.
5. **Chỉ cảnh báo khi bất lợi cho Bên B**; cân bằng hoặc bảo vệ Bên B → **PASS**.

---

## PHẦN 1 — VAI TRÒ & TRÁCH NHIỆM BÊN A (BÊN BÁN)

> Nghĩa vụ/quyền **thuộc Bên A**. Agent kiểm tra Bên A có lạm quyền / trốn nghĩa vụ / dồn rủi ro gây bất lợi cho Bên B không.

### 1.1. Trách nhiệm (nghĩa vụ) Bên A PHẢI có

> Chỉ giữ các nghĩa vụ cốt lõi; thuế/chi phí, công nợ, chế tài, quyền khởi kiện đã
> được tầng dấu hiệu per-clause (A-R1, A-R3, A-R6, A-U3, A-U4…) che phủ.

| Mã | Nghĩa vụ của Bên A | Bắt buộc |
|----|--------------------|:--------:|
| A-D1 | Bảo đảm tài sản hợp pháp: không tranh chấp/kê biên/thế chấp | có |
| A-D2 | Cam đoan & chịu trách nhiệm khi có đồng sở hữu/bên thứ ba khiếu nại về sau | có |
| A-D3 | Bàn giao đúng mô tả, đúng hiện trạng cam kết, có biên bản | có |
| A-D4 | Phối hợp hồ sơ để Bên B đăng ký sang tên | có |

### 1.2. Dấu hiệu Bên A LẠM QUYỀN / TRỐN TRÁCH NHIỆM (cảnh báo)
| Mã | Quyền/nghĩa vụ Bên A bị lạm dụng | Mức | Loại | Vì sao bất lợi cho Bên B | Căn cứ / Gợi ý |
|----|----------------------------------|:---:|------|--------------------------|----------------|
| A-R8 | Bên A **bán khi đang thế chấp/kê biên** mà không nêu rõ & giải chấp | cao | red_flag | Giao dịch có thể vô hiệu, Bên B mất tài sản | Luật Nhà ở 2023 Điều 160; Luật KDBĐS 2023; Luật Đất đai 2024 |
| A-R7 | Bên A đề nghị **ghi giá thấp hơn giá thực** ("hai giá") | cao | red_flag | Vi phạm pháp luật thuế, rủi ro cho Bên B | BLDS Điều 124; Luật Quản lý thuế |
| A-U1 | Bên A **bàn giao theo hiện trạng, miễn trách nhiệm khiếm khuyết** sau bàn giao | trung_binh | unfair_but_legal | Đẩy rủi ro lỗi ẩn sang Bên B | Gợi ý: thêm bảo hành lỗi ẩn |
| A-U3 | Bên A **đẩy thuế TNCN của mình + toàn bộ chi phí** sang Bên B | trung_binh | unfair_but_legal | Bên B gánh cả nghĩa vụ thuế của Bên A | Gợi ý: tách thuế TNCN của bên bán |
| A-U4 | Bên A để **công nợ căn hộ trước bàn giao** cho Bên B gánh | trung_binh | unfair_but_legal | Bên B trả nợ cũ của Bên A | Gợi ý: chốt công nợ tới ngày bàn giao |
| A-U6 | Bên A **tự ấn định/gia hạn thời điểm bàn giao** không chế tài nếu chậm | thap | unfair_but_legal | Bên B bị động, không được bồi thường | Gợi ý: mốc cứng + phạt chậm bàn giao |

---

## PHẦN 2 — VAI TRÒ & TRÁCH NHIỆM BÊN B (BÊN MUA — CẦN BẢO VỆ)

> Nghĩa vụ/quyền **thuộc Bên B**. Agent kiểm tra Bên B có bị gánh nghĩa vụ/chi phí/chế tài quá mức không.

### 2.1. Quyền của Bên B PHẢI được bảo đảm
| Mã | Quyền của Bên B | Bắt buộc |
|----|------------------|:--------:|
| B-Q2 | Thanh toán gắn với mốc pháp lý (công chứng/sang tên), không trả hết trước rủi ro | có |
| B-Q6 | Hợp đồng được công chứng/chứng thực (điều kiện có hiệu lực — Luật Nhà ở 2023 Điều 164) | có |
| B-Q7 | Ghi rõ phần sở hữu chung/riêng, diện tích sàn căn hộ, kinh phí bảo trì (Luật Nhà ở 2023 Điều 163) | có |

### 2.2. Dấu hiệu Bên B bị GÁNH NGHĨA VỤ / CHI PHÍ QUÁ MỨC (cảnh báo)
| Mã | Nghĩa vụ/chi phí áp lên Bên B | Mức | Loại | Vì sao bất lợi cho Bên B | Căn cứ / Gợi ý |
|----|------------------------------|:---:|------|--------------------------|----------------|
| A-R6 | Tước/loại bỏ **quyền khiếu nại, khởi kiện** của Bên B | cao | red_flag | Tước quyền cơ bản → vô hiệu | BLDS Điều 3, Điều 123 |
| A-R1 | Bên B chịu **toàn bộ thuế TNCN + lệ phí trước bạ + thuế khác** | trung_binh | red_flag | Gánh cả nghĩa vụ thuế của bên bán | Luật Thuế TNCN; Nghị định lệ phí trước bạ |
| A-R3 | **Thiếu** điều khoản phạt/bồi thường khi một bên vi phạm | trung_binh | red_flag | Bên B khó đòi quyền lợi khi bị vi phạm | BLDS Điều 418, 360, 419 |
| A-R2 | Cho phép **thanh toán tiền mặt** giá trị lớn | trung_binh | red_flag | Thiếu minh bạch, rủi ro thuế/tranh chấp cho Bên B | Luật Quản lý thuế |
| A-U2 | Bên B phải **thanh toán phần lớn trước khi sang tên** | trung_binh | unfair_but_legal | Trả tiền trước khi chắc quyền sở hữu | Gợi ý: gắn mốc thanh toán với mốc pháp lý |
| A-U5 | Mức **phạt/bồi thường không đối xứng** (Bên B bỏ cọc mất nhiều; Bên A hủy chỉ hoàn cọc) | trung_binh | unfair_but_legal | Chế tài lệch về phía Bên B | Gợi ý: đưa về đối xứng |
| A-R4 | "Tự thực hiện, tự chịu trách nhiệm" giao nhận/thanh toán, **không biên bản** | thap | red_flag | Thiếu bằng chứng → rủi ro tranh chấp cho Bên B | BLDS (chứng cứ thực hiện nghĩa vụ) |
| A-R5 | Bên B "mua theo hiện trạng, chấp nhận chuyển dịch theo quy hoạch sau này" | thap | red_flag | Bên B nhận rủi ro quy hoạch tương lai | BLDS Điều 3 |
| A-U7 | Thông báo gửi **một địa chỉ cố định**, mặc nhiên coi đã nhận sau X ngày | thap | unfair_but_legal | Bên B rủi ro bỏ lỡ thông báo quan trọng | Gợi ý: thêm kênh thông báo + xác nhận |

> **Lưu ý "đạt (pass)":** nếu hợp đồng bảo vệ Bên B (vẫn cho quyền khởi kiện; thanh toán gắn mốc sang tên; có chế tài đối xứng) → đánh dấu PASS, KHÔNG cảnh báo.

---

## PHẦN 3 — Dữ liệu máy đọc cho Agent (machine_readable)

```yaml
ben_a:
  ma: ben_ban
  ten: "Bên bán"
  vi_the: manh_the
  nghia_vu_bat_buoc:   # rút gọn: chỉ giữ cốt lõi
    - {id: A-D1, ten: "Bảo đảm tài sản hợp pháp: không tranh chấp/kê biên/thế chấp", bat_buoc: true}
    - {id: A-D2, ten: "Cam đoan & chịu trách nhiệm khi có đồng sở hữu/bên thứ ba khiếu nại về sau", bat_buoc: true}
    - {id: A-D3, ten: "Bàn giao đúng mô tả, đúng hiện trạng cam kết, có biên bản", bat_buoc: true}
    - {id: A-D4, ten: "Phối hợp hồ sơ để Bên B đăng ký sang tên", bat_buoc: true}
  dau_hieu_lam_quyen:
    - id: A-R8
      loai: red_flag
      muc_rui_ro: cao
      tu_khoa: ["thế chấp", "kê biên", "đang bảo đảm"]
      mo_ta: "Bên A bán khi đang thế chấp/kê biên mà không nêu rõ & giải chấp"
      gay_bat_loi_cho: ben_b
      can_cu: ["Luật Nhà ở 2023 Điều 160", "Luật KDBĐS 2023", "Luật Đất đai 2024"]
      truy_van_rag: "điều kiện của nhà ở tham gia giao dịch mua bán không bị kê biên không có tranh chấp; bán nhà ở đang thế chấp phải được bên nhận thế chấp đồng ý; điều kiện chuyển nhượng quyền sử dụng đất"
    - id: A-R7
      loai: red_flag
      muc_rui_ro: cao
      tu_khoa: ["hai giá", "giá thấp hơn", "ghi giá", "giảm thuế"]
      mo_ta: "Bên A đề nghị ghi giá thấp hơn giá thực để giảm thuế"
      gay_bat_loi_cho: ben_b
      can_cu: ["BLDS 2015 Điều 124", "Luật Quản lý thuế"]
      truy_van_rag: "giao dịch dân sự giả tạo nhằm trốn tránh nghĩa vụ thì vô hiệu; hành vi trốn thuế khai giá chuyển nhượng thấp hơn giá thực tế"
    - id: A-U1
      loai: unfair_but_legal
      muc_rui_ro: trung_binh
      trai_luat: false
      tu_khoa: ["theo hiện trạng", "đã kiểm tra", "không chịu trách nhiệm", "khiếm khuyết"]
      mo_ta: "Bàn giao theo hiện trạng, miễn trách khiếm khuyết sau bàn giao"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Thêm bảo hành lỗi ẩn / thông báo khiếm khuyết đã biết"
      truy_van_rag: "nghĩa vụ cung cấp thông tin về tài sản mua bán; trách nhiệm đối với khuyết tật của tài sản; bảo hành nhà ở"
    - id: A-U3
      loai: unfair_but_legal
      muc_rui_ro: trung_binh
      trai_luat: false
      tu_khoa: ["toàn bộ chi phí", "bên mua chịu", "công chứng", "thuế thu nhập"]
      mo_ta: "Bên A đẩy thuế TNCN của mình + toàn bộ chi phí sang Bên B"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Tách thuế TNCN của bên bán; chia chi phí theo thông lệ"
      truy_van_rag: "người nộp thuế thu nhập cá nhân từ chuyển nhượng bất động sản là bên chuyển nhượng; người nộp lệ phí trước bạ; chi phí công chứng do các bên thỏa thuận"
    - id: A-U4
      loai: unfair_but_legal
      muc_rui_ro: trung_binh
      trai_luat: false
      tu_khoa: ["phí tồn đọng", "phí quản lý", "còn nợ", "sau bàn giao"]
      mo_ta: "Bên B gánh công nợ căn hộ phát sinh trước bàn giao"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Chốt công nợ tới ngày bàn giao"
      truy_van_rag: "nghĩa vụ thanh toán chi phí phát sinh trước thời điểm bàn giao tài sản; thời điểm chuyển giao rủi ro trong mua bán tài sản"
    - id: A-U6
      loai: unfair_but_legal
      muc_rui_ro: thap
      trai_luat: false
      tu_khoa: ["bên bán ấn định", "gia hạn", "thời điểm bàn giao"]
      mo_ta: "Bên A tự ấn định/gia hạn bàn giao, không chế tài nếu chậm"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Thêm mốc cứng + phạt chậm bàn giao"
      truy_van_rag: "thời hạn giao tài sản trong hợp đồng mua bán; trách nhiệm do chậm thực hiện nghĩa vụ giao tài sản; phạt vi phạm và bồi thường khi chậm bàn giao nhà"

ben_b:
  ma: ben_mua
  ten: "Bên mua"
  vi_the: yeu_the
  protected: true
  quyen_can_bao_dam:   # rút gọn: chỉ giữ cốt lõi
    - {id: B-Q2, ten: "Thanh toán gắn với mốc pháp lý (công chứng/sang tên), không trả hết trước rủi ro", bat_buoc: true}
    - {id: B-Q6, ten: "Hợp đồng được công chứng/chứng thực (điều kiện có hiệu lực khi mua bán nhà ở)", bat_buoc: true}
    - {id: B-Q7, ten: "Ghi rõ phần sở hữu chung/riêng, diện tích sàn căn hộ, kinh phí bảo trì", bat_buoc: true}
  dau_hieu_ganh_qua_muc:
    - id: A-R6
      loai: red_flag
      muc_rui_ro: cao
      tu_khoa: ["không được khởi kiện", "không được khiếu nại", "toàn quyền quyết định", "quyết định cuối cùng"]
      mo_ta: "Tước quyền khiếu nại/khởi kiện của Bên B"
      gay_bat_loi_cho: ben_b
      can_cu: ["BLDS 2015 Điều 3", "BLDS 2015 Điều 123"]
      truy_van_rag: "điều kiện giao dịch chung loại bỏ quyền lợi chính đáng của bên kia thì không có hiệu lực; giao dịch dân sự vô hiệu do vi phạm điều cấm của luật; quyền khiếu nại khởi kiện của người tiêu dùng không được hạn chế"
      dieu_kien_kich_hoat: "Nếu hợp đồng VẪN cho quyền khởi kiện ra Tòa → PASS, KHÔNG match."
    - id: A-R1
      loai: red_flag
      muc_rui_ro: trung_binh
      tu_khoa: ["bên mua", "bên B", "chịu", "toàn bộ", "thuế thu nhập", "trước bạ"]
      mo_ta: "Bên B chịu toàn bộ thuế TNCN (nghĩa vụ bên bán) + lệ phí trước bạ + thuế khác"
      gay_bat_loi_cho: ben_b
      can_cu: ["Luật Thuế TNCN", "Nghị định lệ phí trước bạ"]
      truy_van_rag: "người nộp thuế thu nhập cá nhân đối với thu nhập từ chuyển nhượng bất động sản; người nộp lệ phí trước bạ khi đăng ký quyền sở hữu nhà đất"
    - id: A-R3
      loai: red_flag
      muc_rui_ro: trung_binh
      kieu: thieu_dieu_khoan
      tu_khoa: []
      mo_ta: "Thiếu điều khoản phạt vi phạm/bồi thường khi một bên vi phạm"
      gay_bat_loi_cho: ben_b
      can_cu: ["BLDS 2015 Điều 418", "BLDS 2015 Điều 360", "BLDS 2015 Điều 419"]
      truy_van_rag: "thỏa thuận phạt vi phạm hợp đồng; trách nhiệm bồi thường thiệt hại do vi phạm nghĩa vụ; thiệt hại được bồi thường do vi phạm hợp đồng"
    - id: A-R2
      loai: red_flag
      muc_rui_ro: trung_binh
      tu_khoa: ["tiền mặt"]
      mo_ta: "Cho phép thanh toán tiền mặt giá trị lớn thay vì qua ngân hàng"
      gay_bat_loi_cho: ben_b
      can_cu: ["Luật Quản lý thuế"]
      truy_van_rag: "thanh toán trong giao dịch kinh doanh bất động sản qua tổ chức tín dụng ngân hàng; thanh toán không dùng tiền mặt trong chuyển nhượng bất động sản"
    - id: A-U2
      loai: unfair_but_legal
      muc_rui_ro: trung_binh
      trai_luat: false
      tu_khoa: ["thanh toán trước", "phần lớn", "trước khi sang tên"]
      mo_ta: "Bên B thanh toán phần lớn trước khi hoàn tất sang tên"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Gắn mốc thanh toán với mốc pháp lý; giữ % cuối sau sang tên"
      truy_van_rag: "thời điểm chuyển quyền sở hữu nhà ở; thời điểm xác lập quyền sở hữu khi đăng ký; nghĩa vụ trả tiền trong hợp đồng mua bán tài sản"
    - id: A-U5
      loai: unfair_but_legal
      muc_rui_ro: trung_binh
      trai_luat: false
      tu_khoa: ["phạt cọc", "gấp", "không đối xứng", "chỉ hoàn cọc"]
      mo_ta: "Mức phạt/bồi thường không đối xứng, lệch về phía Bên B"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Đưa chế tài về đối xứng hai bên"
      truy_van_rag: "đặt cọc bên nhận cọc từ chối giao kết phải trả cọc và khoản tiền tương đương; nguyên tắc bình đẳng thiện chí trong quan hệ dân sự"
    - id: A-R4
      loai: red_flag
      muc_rui_ro: thap
      tu_khoa: ["tự thực hiện", "tự chịu trách nhiệm", "không lập biên bản"]
      mo_ta: "Giao nhận/thanh toán không biên bản, thiếu bằng chứng"
      gay_bat_loi_cho: ben_b
      can_cu: ["BLDS 2015"]
      truy_van_rag: "nghĩa vụ giao tài sản và trả tiền theo thỏa thuận; chứng cứ chứng minh việc thực hiện nghĩa vụ; biên bản bàn giao tài sản"
    - id: A-R5
      loai: red_flag
      muc_rui_ro: thap
      tu_khoa: ["hiện trạng", "quy hoạch", "sau này"]
      mo_ta: "Bên B chấp nhận rủi ro quy hoạch tương lai theo hiện trạng"
      gay_bat_loi_cho: ben_b
      can_cu: ["BLDS 2015 Điều 3"]
      truy_van_rag: "nghĩa vụ cung cấp thông tin ảnh hưởng đến việc chấp nhận giao kết hợp đồng; công khai quy hoạch kế hoạch sử dụng đất; thông tin về nhà ở đưa vào giao dịch"
    - id: A-U7
      loai: unfair_but_legal
      muc_rui_ro: thap
      trai_luat: false
      tu_khoa: ["thông báo", "địa chỉ cố định", "xem như đã nhận", "sau"]
      mo_ta: "Thông báo gửi một địa chỉ, mặc nhiên coi đã nhận sau X ngày"
      gay_bat_loi_cho: ben_b
      goi_y_thuong_luong: "Bổ sung kênh thông báo + xác nhận đã nhận"
      truy_van_rag: "phương thức thông báo giữa các bên trong hợp đồng; thời điểm nhận được thông báo giao dịch dân sự"
