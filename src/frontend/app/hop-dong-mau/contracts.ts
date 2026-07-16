/* ============================================================
   Hợp đồng mẫu — cho thuê & mua bán căn hộ chung cư
   Mẫu tham khảo theo Luật Nhà ở 2023 & BLDS 2015
   ============================================================ */

export interface ContractDevice {
  ten: string;
  dvt: string;
  so_luong: number;
  tinh_trang: string;
}

export interface ContractSection {
  id: string;
  type: "title" | "meta" | "intro" | "party" | "article-heading" | "clause" | "signing" | "appendix-heading" | "device-table";
  text: string;
  unfavorable?: boolean;
  note?: string;
  devices?: ContractDevice[];
}

export interface ContractTemplate {
  id: "thue" | "mua-ban" | "mua-ban-v2";
  title: string;
  subtitle: string;
  description: string;
  filename: string;
  content: string;
  sections: ContractSection[];
}

export const THUE_CAN_HO: ContractTemplate = {
  id: "thue",
  title: "Hợp đồng Thuê Căn hộ Chung cư",
  subtitle: "Mẫu thử nghiệm — nhiều điều khoản cần chú ý",
  description:
    "Hợp đồng mẫu chứa nhiều điều khoản có thể bất lợi cho bên thuê (khấu trừ cọc, phạt chậm trả, đơn phương chấm dứt…) — dùng để trải nghiệm tính năng phân tích rủi ro.",
  filename: "hop-dong-thue-can-ho.docx",
  content: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

HỢP ĐỒNG THUÊ CĂN HỘ CHUNG CƯ
Số: 128/HĐTN-2026

Hôm nay, ngày 23 tháng 06 năm 2026, tại địa chỉ: Tòa nhà Green Park, Số 12 Khuất Duy Tiến, quận Thanh Xuân, thành phố Hà Nội.

Chúng tôi gồm các bên dưới đây:

BÊN CHO THUÊ (BÊN A):
Họ và tên: NGUYỄN VĂN HÙNG
CCCD số: 001085012345 — Ngày cấp: 15/04/2022 — Nơi cấp: Cục Cảnh sát Quản lý hành chính về trật tự xã hội
Địa chỉ thường trú: Số 45 ngõ 192 Lê Trọng Tấn, phường Khương Mai, quận Thanh Xuân, Hà Nội
Điện thoại liên hệ: 0913.456.789

BÊN THUÊ (BÊN B):
Họ và tên: TRẦN MINH ĐỨC
CCCD số: 038093009876 — Ngày cấp: 22/08/2023 — Nơi cấp: Cục Cảnh sát Quản lý hành chính về trật tự xã hội
Địa chỉ thường trú: Thôn 3, xã Quảng Chính, huyện Quảng Xương, tỉnh Thanh Hóa
Điện thoại liên hệ: 0987.654.321

Hai bên cùng thỏa thuận và thống nhất ký kết Hợp đồng thuê căn hộ chung cư với các điều khoản cụ thể như sau:

ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG VÀ THỜI HẠN THUÊ
1.1 Bên A đồng ý cho Bên B thuê và Bên B đồng ý thuê căn hộ số: 1805, Tầng: 18, Tòa nhà: Block A thuộc Dự án chung cư: Green Park tại địa chỉ: Số 12 Khuất Duy Tiến, phường Thanh Xuân Trung, quận Thanh Xuân, thành phố Hà Nội.
1.2 Mục đích sử dụng: Dùng để ở cho tối đa 02 người. Bên B không được phép cho bên thứ ba ở nhờ hoặc cho thuê lại dưới mọi hình thức nếu không có sự đồng ý bằng văn bản của Bên A.
1.3 Thời hạn thuê: 12 tháng, tính từ ngày 01/07/2026 đến ngày 30/06/2027.
1.4 Hết thời hạn thuê quy định tại Khoản 1.3, nếu Bên B không thông báo bằng văn bản về việc chấm dứt hợp đồng trước ít nhất chín mươi (90) ngày, hợp đồng này sẽ tự động gia hạn thêm một thời hạn tương đương. Giá thuê căn hộ tại thời điểm gia hạn tự động sẽ áp dụng theo biểu giá mới do Bên A quyết định, tăng tối đa không quá 20% so với giá thuê trước đó.

ĐIỀU 2: GIÁ THUÊ, ĐẶT CỌC VÀ PHƯƠNG THỨC THANH TOÁN
2.1 Giá thuê căn hộ cố định là: 12.000.000 VNĐ/tháng (Bằng chữ: Mười hai triệu đồng chẵn trên một tháng). Giá thuê này chưa bao gồm các khoản thuế phát sinh, phí quản lý vận hành chung cư, phí gửi xe, tiền điện, nước, internet và các dịch vụ khác.
2.2 Phương thức thanh toán: Bên B thanh toán cho Bên A theo định kỳ 03 tháng/lần vào trước ngày 05 của kỳ thanh toán đầu tiên. Hình thức chuyển khoản hoặc tiền mặt.
2.3 Khoản tiền đặt cọc: Bên B giao cho Bên A một khoản tiền cọc là: 24.000.000 VNĐ (tương đương 02 tháng tiền nhà) ngay sau khi ký hợp đồng này nhằm bảo đảm thực hiện nghĩa vụ.
2.4 Hoàn trả tiền đặt cọc: Khoản tiền đặt cọc sẽ được Bên A hoàn trả cho Bên B trong vòng ba mươi (30) ngày làm việc kể từ ngày hợp đồng chấm dứt hợp pháp và Bên B đã bàn giao lại căn hộ. Tuy nhiên, Bên A có quyền khấu trừ toàn bộ hoặc một phần tiền đặt cọc trong các trường hợp sau mà không cần chứng minh thiệt hại thực tế: Căn hộ xuất hiện bất kỳ vết trầy xước, hao mòn tự nhiên nào trên tường, sàn gỗ, trang thiết bị; hoặc Bên B chậm thanh toán tiền thuê nhà quá ba (03) ngày; hoặc Bên B vi phạm bất kỳ điều khoản nhỏ nào trong Nội quy tòa nhà.

ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA BÊN CHO THUÊ (BÊN A)
3.1 Nghĩa vụ của Bên A: Bàn giao căn hộ và các trang thiết bị đính kèm cho Bên B đúng thời hạn.
3.2 Quyền hạn của Bên A:
a) Để đảm bảo an ninh, phòng chống cháy nổ và kiểm tra việc bảo quản tài sản, Bên A hoặc người đại diện của Bên A có quyền vào kiểm tra căn hộ vào bất kỳ lúc nào mà không cần phải thông báo trước cho Bên B. Bên B có nghĩa vụ phối hợp và mở cửa cho Bên A.
b) Bên A có quyền đơn phương chấm dứt hợp đồng trước thời hạn bằng việc thông báo bằng văn bản cho Bên B trước mười lăm (15) ngày trong trường hợp Bên A cần lấy lại nhà để sử dụng cho mục đích cá nhân hoặc bán căn hộ. Trong trường hợp này, Bên A chỉ cần hoàn trả lại tiền cọc và số tiền nhà Bên B đã đóng trước (nếu có) mà không phải chịu bất kỳ khoản phạt vi phạm hợp đồng hay bồi thường nào khác.

ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN THUÊ (BÊN B)
4.1 Quyền của Bên B: Được sử dụng căn hộ cho mục đích sinh hoạt trong thời hạn thuê.
4.2 Nghĩa vụ của Bên B:
a) Thanh toán tiền thuê nhà, phí quản lý, tiền điện, nước đầy đủ và đúng hạn.
b) Tự chịu trách nhiệm và chi trả toàn bộ chi phí đối với việc bảo dưỡng, sửa chữa, thay thế toàn bộ trang thiết bị nội thất, hệ thống điện, nước, điều hòa, máy móc hư hỏng trong căn hộ trong suốt thời gian thuê, kể cả những hư hỏng do hao mòn tự nhiên hoặc lỗi hệ thống có sẵn của tòa nhà.
c) Trong trường hợp Ban quản lý tòa nhà, Nhà nước hoặc cơ quan có thẩm quyền tăng các loại phí quản lý, phí dịch vụ, giá điện, giá nước hoặc áp đặt thêm các loại phí mới phát sinh liên quan đến căn hộ, Bên B có trách nhiệm tự động chấp nhận và chi trả toàn bộ các khoản tăng này mà không được lấy đó làm lý do để yêu cầu giảm giá thuê hoặc chấm dứt hợp đồng.
d) Chấp nhận và tuân thủ tuyệt đối mọi thay đổi trong Nội quy của tòa nhà chung cư do Ban quản lý ban hành tại từng thời điểm.

ĐIỀU 5: PHẠT VI PHẠM VÀ CHẤM DỨT HỢP ĐỒNG
5.1 Nếu Bên B chậm thanh toán tiền thuê nhà theo thời hạn quy định tại Khoản 2.2, Bên B phải chịu khoản phạt chậm trả tương đương 5% trên tổng số tiền chậm thanh toán cho mỗi ngày chậm trễ.
5.2 Nếu Bên B đơn phương chấm dứt hợp đồng trước thời hạn, Bên B sẽ mất toàn bộ số tiền đặt cọc và phải bồi thường cho Bên A số tiền tương đương với tổng số tiền thuê nhà của các tháng còn lại của hợp đồng.
5.3 Trường hợp căn hộ bị thu hồi hoặc không thể tiếp tục cho thuê do các nguyên nhân bất khả kháng (thiên tai, dịch bệnh, thay đổi luật pháp, quyết định của cơ quan nhà nước, tòa nhà bị phong tỏa hoặc thu hồi đất...), hợp đồng này sẽ lập tức chấm dứt. Bên A được miễn trừ toàn bộ nghĩa vụ hoàn trả tiền cọc hoặc bồi thường bất kỳ thiệt hại, chi phí di dời nào cho Bên B.

ĐIỀU 6: ĐIỀU KHOẢN THI HÀNH
6.1 Hợp đồng này có hiệu lực kể từ ngày ký. Mọi sửa đổi, bổ sung hợp đồng phải được lập thành văn bản và có chữ ký của cả hai bên.
6.2 Trong trường hợp có tranh chấp phát sinh từ hoặc liên quan đến hợp đồng này, hai bên sẽ ưu tiên giải quyết thông qua thương lượng. Nếu không thương lượng được, tranh chấp sẽ được tòa án có thẩm quyền nơi có căn hộ chung cư giải quyết. Toàn bộ án phí và chi phí thuê luật sư của Bên A sẽ do Bên B chi trả vô điều kiện.
6.3 Hợp đồng được lập thành hai (02) bản có giá trị pháp lý như nhau, Bên A giữ một (01) bản, Bên B giữ một (01) bản để thực hiện.

PHỤ LỤC HỢP ĐỒNG
DANH MỤC THIẾT BỊ CĂN HỘ 1805 - Tòa nhà Green Park, Số 12 Khuất Duy Tiến, Thanh Xuân, Hà Nội

Thiết bị bàn giao kèm theo hợp đồng:
1. Hệ thống sàn gỗ — Bộ — 01 — Sử dụng tốt
2. Hệ thống tủ bếp trên + dưới — Bộ — 01 — Sử dụng tốt
3. Bếp từ + Máy hút mùi — Bộ — 01 — Sử dụng tốt
4. Rèm — Bộ — 01 — Sử dụng tốt
5. Hệ thống thiết bị vệ sinh bàn giao CĐT Vinhomes — Bộ — 01 — Sử dụng tốt
6. Thẻ ra vào — Chiếc — 02 — Sử dụng tốt
7. Điều hoà + điều khiển — Chiếc — 02 — Sử dụng tốt
8. Tivi — Chiếc — 01 — Sử dụng tốt
9. Giàn phơi — Chiếc — 01 — Sử dụng tốt
10. Sofa + bàn trà — Bộ — 01 — Sử dụng tốt
11. Máy giặt — Chiếc — 01 — Sử dụng tốt
12. Tủ lạnh — Chiếc — 01 — Sử dụng tốt
13. Tủ quần áo — Bộ — 02 — Sử dụng tốt
14. Bàn ăn + ghế ăn — Bộ — 01 — Sử dụng tốt
15. Giường + đệm — Bộ — 02 — Sử dụng tốt

KÝ KẾT

ĐẠI DIỆN BÊN A                               ĐẠI DIỆN BÊN B
(Ký và ghi rõ họ tên)                        (Ký và ghi rõ họ tên)`,
  sections: [
    { id: "quoc-hieu-1", type: "meta", text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" },
    { id: "quoc-hieu-2", type: "meta", text: "Độc lập - Tự do - Hạnh phúc" },
    { id: "title", type: "title", text: "HỢP ĐỒNG THUÊ CĂN HỘ CHUNG CƯ" },
    { id: "so-hop-dong", type: "meta", text: "Số: 128/HĐTN-2026" },
    { id: "ngay-ky", type: "meta", text: "Hôm nay, ngày 23 tháng 06 năm 2026, tại địa chỉ: Tòa nhà Green Park, Số 12 Khuất Duy Tiến, quận Thanh Xuân, thành phố Hà Nội." },
    { id: "intro", type: "intro", text: "Chúng tôi gồm các bên dưới đây:" },
    {
      id: "ben-a",
      type: "party",
      text: "BÊN CHO THUÊ (BÊN A):\nHọ và tên: NGUYỄN VĂN HÙNG\nCCCD số: 001085012345 — Ngày cấp: 15/04/2022 — Nơi cấp: Cục Cảnh sát Quản lý hành chính về trật tự xã hội\nĐịa chỉ thường trú: Số 45 ngõ 192 Lê Trọng Tấn, phường Khương Mai, quận Thanh Xuân, Hà Nội\nĐiện thoại liên hệ: 0913.456.789",
    },
    {
      id: "ben-b",
      type: "party",
      text: "BÊN THUÊ (BÊN B):\nHọ và tên: TRẦN MINH ĐỨC\nCCCD số: 038093009876 — Ngày cấp: 22/08/2023 — Nơi cấp: Cục Cảnh sát Quản lý hành chính về trật tự xã hội\nĐịa chỉ thường trú: Thôn 3, xã Quảng Chính, huyện Quảng Xương, tỉnh Thanh Hóa\nĐiện thoại liên hệ: 0987.654.321",
    },
    { id: "intro-2", type: "intro", text: "Hai bên cùng thỏa thuận và thống nhất ký kết Hợp đồng thuê căn hộ chung cư với các điều khoản cụ thể như sau:" },
    { id: "dieu-1", type: "article-heading", text: "ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG VÀ THỜI HẠN THUÊ" },
    { id: "clause-1-1", type: "clause", text: "1.1 Bên A đồng ý cho Bên B thuê và Bên B đồng ý thuê căn hộ số: 1805, Tầng: 18, Tòa nhà: Block A thuộc Dự án chung cư: Green Park tại địa chỉ: Số 12 Khuất Duy Tiến, phường Thanh Xuân Trung, quận Thanh Xuân, thành phố Hà Nội." },
    { id: "clause-1-2", type: "clause", text: "1.2 Mục đích sử dụng: Dùng để ở cho tối đa 02 người. Bên B không được phép cho bên thứ ba ở nhờ hoặc cho thuê lại dưới mọi hình thức nếu không có sự đồng ý bằng văn bản của Bên A." },
    { id: "clause-1-3", type: "clause", text: "1.3 Thời hạn thuê: 12 tháng, tính từ ngày 01/07/2026 đến ngày 30/06/2027." },
    {
      id: "clause-1-4",
      type: "clause",
      text: "1.4 Hết thời hạn thuê quy định tại Khoản 1.3, nếu Bên B không thông báo bằng văn bản về việc chấm dứt hợp đồng trước ít nhất chín mươi (90) ngày, hợp đồng này sẽ tự động gia hạn thêm một thời hạn tương đương. Giá thuê căn hộ tại thời điểm gia hạn tự động sẽ áp dụng theo biểu giá mới do Bên A quyết định, tăng tối đa không quá 20% so với giá thuê trước đó.",
      unfavorable: true,
      note: "Tự động gia hạn nếu không báo trước tới 90 ngày; giá thuê kỳ mới do Bên A đơn phương quyết định, có thể tăng tới 20%",
    },
    { id: "dieu-2", type: "article-heading", text: "ĐIỀU 2: GIÁ THUÊ, ĐẶT CỌC VÀ PHƯƠNG THỨC THANH TOÁN" },
    { id: "clause-2-1", type: "clause", text: "2.1 Giá thuê căn hộ cố định là: 12.000.000 VNĐ/tháng (Bằng chữ: Mười hai triệu đồng chẵn trên một tháng). Giá thuê này chưa bao gồm các khoản thuế phát sinh, phí quản lý vận hành chung cư, phí gửi xe, tiền điện, nước, internet và các dịch vụ khác." },
    { id: "clause-2-2", type: "clause", text: "2.2 Phương thức thanh toán: Bên B thanh toán cho Bên A theo định kỳ 03 tháng/lần vào trước ngày 05 của kỳ thanh toán đầu tiên. Hình thức chuyển khoản hoặc tiền mặt." },
    { id: "clause-2-3", type: "clause", text: "2.3 Khoản tiền đặt cọc: Bên B giao cho Bên A một khoản tiền cọc là: 24.000.000 VNĐ (tương đương 02 tháng tiền nhà) ngay sau khi ký hợp đồng này nhằm bảo đảm thực hiện nghĩa vụ." },
    {
      id: "clause-2-4",
      type: "clause",
      text: "2.4 Hoàn trả tiền đặt cọc: Khoản tiền đặt cọc sẽ được Bên A hoàn trả cho Bên B trong vòng ba mươi (30) ngày làm việc kể từ ngày hợp đồng chấm dứt hợp pháp và Bên B đã bàn giao lại căn hộ. Tuy nhiên, Bên A có quyền khấu trừ toàn bộ hoặc một phần tiền đặt cọc trong các trường hợp sau mà không cần chứng minh thiệt hại thực tế: Căn hộ xuất hiện bất kỳ vết trầy xước, hao mòn tự nhiên nào trên tường, sàn gỗ, trang thiết bị; hoặc Bên B chậm thanh toán tiền thuê nhà quá ba (03) ngày; hoặc Bên B vi phạm bất kỳ điều khoản nhỏ nào trong Nội quy tòa nhà.",
      unfavorable: true,
      note: "Cho phép khấu trừ cọc không cần chứng minh thiệt hại — kể cả hao mòn tự nhiên, chậm thanh toán 3 ngày hay vi phạm nội quy nhỏ",
    },
    { id: "dieu-3", type: "article-heading", text: "ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA BÊN CHO THUÊ (BÊN A)" },
    { id: "clause-3-1", type: "clause", text: "3.1 Nghĩa vụ của Bên A: Bàn giao căn hộ và các trang thiết bị đính kèm cho Bên B đúng thời hạn." },
    { id: "clause-3-2", type: "clause", text: "3.2 Quyền hạn của Bên A:" },
    {
      id: "clause-3-2a",
      type: "clause",
      text: "a) Để đảm bảo an ninh, phòng chống cháy nổ và kiểm tra việc bảo quản tài sản, Bên A hoặc người đại diện của Bên A có quyền vào kiểm tra căn hộ vào bất kỳ lúc nào mà không cần phải thông báo trước cho Bên B. Bên B có nghĩa vụ phối hợp và mở cửa cho Bên A.",
      unfavorable: true,
      note: "Bên A được vào căn hộ bất kỳ lúc nào không cần báo trước — ảnh hưởng quyền riêng tư và chỗ ở bất khả xâm phạm của Bên B",
    },
    {
      id: "clause-3-2b",
      type: "clause",
      text: "b) Bên A có quyền đơn phương chấm dứt hợp đồng trước thời hạn bằng việc thông báo bằng văn bản cho Bên B trước mười lăm (15) ngày trong trường hợp Bên A cần lấy lại nhà để sử dụng cho mục đích cá nhân hoặc bán căn hộ. Trong trường hợp này, Bên A chỉ cần hoàn trả lại tiền cọc và số tiền nhà Bên B đã đóng trước (nếu có) mà không phải chịu bất kỳ khoản phạt vi phạm hợp đồng hay bồi thường nào khác.",
      unfavorable: true,
      note: "Bên A đơn phương chấm dứt chỉ cần báo trước 15 ngày, không phạt/bồi thường — trong khi Bên B chấm dứt sớm bị phạt rất nặng (Điều 5.2)",
    },
    { id: "dieu-4", type: "article-heading", text: "ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN THUÊ (BÊN B)" },
    { id: "clause-4-1", type: "clause", text: "4.1 Quyền của Bên B: Được sử dụng căn hộ cho mục đích sinh hoạt trong thời hạn thuê." },
    { id: "clause-4-2", type: "clause", text: "4.2 Nghĩa vụ của Bên B:" },
    { id: "clause-4-2a", type: "clause", text: "a) Thanh toán tiền thuê nhà, phí quản lý, tiền điện, nước đầy đủ và đúng hạn." },
    {
      id: "clause-4-2b",
      type: "clause",
      text: "b) Tự chịu trách nhiệm và chi trả toàn bộ chi phí đối với việc bảo dưỡng, sửa chữa, thay thế toàn bộ trang thiết bị nội thất, hệ thống điện, nước, điều hòa, máy móc hư hỏng trong căn hộ trong suốt thời gian thuê, kể cả những hư hỏng do hao mòn tự nhiên hoặc lỗi hệ thống có sẵn của tòa nhà.",
      unfavorable: true,
      note: "Bên B phải chi trả mọi chi phí sửa chữa, kể cả hao mòn tự nhiên và lỗi hệ thống có sẵn — vốn thuộc trách nhiệm của chủ nhà",
    },
    {
      id: "clause-4-2c",
      type: "clause",
      text: "c) Trong trường hợp Ban quản lý tòa nhà, Nhà nước hoặc cơ quan có thẩm quyền tăng các loại phí quản lý, phí dịch vụ, giá điện, giá nước hoặc áp đặt thêm các loại phí mới phát sinh liên quan đến căn hộ, Bên B có trách nhiệm tự động chấp nhận và chi trả toàn bộ các khoản tăng này mà không được lấy đó làm lý do để yêu cầu giảm giá thuê hoặc chấm dứt hợp đồng.",
      unfavorable: true,
      note: "Buộc tự động chấp nhận mọi khoản phí tăng/phí mới, không được yêu cầu giảm giá thuê hay chấm dứt hợp đồng",
    },
    {
      id: "clause-4-2d",
      type: "clause",
      text: "d) Chấp nhận và tuân thủ tuyệt đối mọi thay đổi trong Nội quy của tòa nhà chung cư do Ban quản lý ban hành tại từng thời điểm.",
      unfavorable: true,
      note: "Cam kết tuân thủ tuyệt đối nội quy thay đổi trong tương lai mà chưa biết nội dung — kết hợp Điều 2.4 có thể dẫn tới mất cọc",
    },
    { id: "dieu-5", type: "article-heading", text: "ĐIỀU 5: PHẠT VI PHẠM VÀ CHẤM DỨT HỢP ĐỒNG" },
    {
      id: "clause-5-1",
      type: "clause",
      text: "5.1 Nếu Bên B chậm thanh toán tiền thuê nhà theo thời hạn quy định tại Khoản 2.2, Bên B phải chịu khoản phạt chậm trả tương đương 5% trên tổng số tiền chậm thanh toán cho mỗi ngày chậm trễ.",
      unfavorable: true,
      note: "Phạt chậm trả 5%/ngày (tương đương ~150%/tháng) — vượt xa mức lãi giới hạn theo BLDS 2015",
    },
    {
      id: "clause-5-2",
      type: "clause",
      text: "5.2 Nếu Bên B đơn phương chấm dứt hợp đồng trước thời hạn, Bên B sẽ mất toàn bộ số tiền đặt cọc và phải bồi thường cho Bên A số tiền tương đương với tổng số tiền thuê nhà của các tháng còn lại của hợp đồng.",
      unfavorable: true,
      note: "Phạt kép rất nặng: vừa mất toàn bộ cọc vừa bồi thường toàn bộ tiền thuê các tháng còn lại — không loại trừ trường hợp Bên A có lỗi",
    },
    {
      id: "clause-5-3",
      type: "clause",
      text: "5.3 Trường hợp căn hộ bị thu hồi hoặc không thể tiếp tục cho thuê do các nguyên nhân bất khả kháng (thiên tai, dịch bệnh, thay đổi luật pháp, quyết định của cơ quan nhà nước, tòa nhà bị phong tỏa hoặc thu hồi đất...), hợp đồng này sẽ lập tức chấm dứt. Bên A được miễn trừ toàn bộ nghĩa vụ hoàn trả tiền cọc hoặc bồi thường bất kỳ thiệt hại, chi phí di dời nào cho Bên B.",
      unfavorable: true,
      note: "Bất khả kháng nhưng Bên A được giữ luôn tiền cọc, miễn mọi bồi thường — đẩy toàn bộ rủi ro về phía Bên B",
    },
    { id: "dieu-6", type: "article-heading", text: "ĐIỀU 6: ĐIỀU KHOẢN THI HÀNH" },
    { id: "clause-6-1", type: "clause", text: "6.1 Hợp đồng này có hiệu lực kể từ ngày ký. Mọi sửa đổi, bổ sung hợp đồng phải được lập thành văn bản và có chữ ký của cả hai bên." },
    {
      id: "clause-6-2",
      type: "clause",
      text: "6.2 Trong trường hợp có tranh chấp phát sinh từ hoặc liên quan đến hợp đồng này, hai bên sẽ ưu tiên giải quyết thông qua thương lượng. Nếu không thương lượng được, tranh chấp sẽ được tòa án có thẩm quyền nơi có căn hộ chung cư giải quyết. Toàn bộ án phí và chi phí thuê luật sư của Bên A sẽ do Bên B chi trả vô điều kiện.",
      unfavorable: true,
      note: "Bên B phải trả vô điều kiện toàn bộ án phí và phí luật sư của Bên A — bất lợi lớn khi xảy ra tranh chấp, kể cả khi Bên B thắng kiện",
    },
    { id: "clause-6-3", type: "clause", text: "6.3 Hợp đồng được lập thành hai (02) bản có giá trị pháp lý như nhau, Bên A giữ một (01) bản, Bên B giữ một (01) bản để thực hiện." },
    {
      id: "phu-luc-heading",
      type: "appendix-heading",
      text: "PHỤ LỤC HỢP ĐỒNG — DANH MỤC THIẾT BỊ CĂN HỘ 1805",
    },
    {
      id: "phu-luc-subtitle",
      type: "meta",
      text: "Tòa nhà Green Park, Số 12 Khuất Duy Tiến, Thanh Xuân, Hà Nội",
    },
    {
      id: "device-table",
      type: "device-table",
      text: "Danh mục thiết bị bàn giao kèm hợp đồng",
      devices: [
        { ten: "Hệ thống sàn gỗ", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt" },
        { ten: "Hệ thống tủ bếp trên + dưới", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt" },
        { ten: "Bếp từ + Máy hút mùi", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt" },
        { ten: "Rèm", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt" },
        { ten: "Hệ thống thiết bị vệ sinh bàn giao CĐT Vinhomes", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt" },
        { ten: "Thẻ ra vào", dvt: "Chiếc", so_luong: 2, tinh_trang: "Sử dụng tốt" },
        { ten: "Điều hoà + điều khiển", dvt: "Chiếc", so_luong: 2, tinh_trang: "Sử dụng tốt" },
        { ten: "Tivi", dvt: "Chiếc", so_luong: 1, tinh_trang: "Sử dụng tốt" },
        { ten: "Giàn phơi", dvt: "Chiếc", so_luong: 1, tinh_trang: "Sử dụng tốt" },
        { ten: "Sofa + bàn trà", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt" },
        { ten: "Máy giặt", dvt: "Chiếc", so_luong: 1, tinh_trang: "Sử dụng tốt" },
        { ten: "Tủ lạnh", dvt: "Chiếc", so_luong: 1, tinh_trang: "Sử dụng tốt" },
        { ten: "Tủ quần áo", dvt: "Bộ", so_luong: 2, tinh_trang: "Sử dụng tốt" },
        { ten: "Bàn ăn + ghế ăn", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt" },
        { ten: "Giường + đệm", dvt: "Bộ", so_luong: 2, tinh_trang: "Sử dụng tốt" },
      ],
    },
    {
      id: "signing",
      type: "signing",
      text: "ĐẠI DIỆN BÊN A\n(Ký và ghi rõ họ tên)\n\nĐẠI DIỆN BÊN B\n(Ký và ghi rõ họ tên)",
    },
  ],
};

export const MUA_BAN_CAN_HO: ContractTemplate = {
  id: "mua-ban",
  title: "Hợp đồng Mua bán Căn hộ Chung cư",
  subtitle: "Mẫu thử nghiệm — nhiều điều khoản cần chú ý",
  description:
    "Hợp đồng mẫu chứa nhiều điều khoản có thể bất lợi cho bên mua (mất toàn bộ tiền đã đóng, gánh thuế phí thay bên bán, miễn bảo hành…) — dùng để trải nghiệm tính năng phân tích rủi ro.",
  filename: "hop-dong-mua-ban-can-ho.docx",
  content: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

HỢP ĐỒNG MUA BÁN CĂN HỘ CHUNG CƯ
Số: 89/HĐMB-2026

Hôm nay, ngày 04 tháng 07 năm 2026, tại địa chỉ: Tòa nhà Sky Skyline, Số 88 Láng Hạ, quận Đống Đa, thành phố Hà Nội.

Chúng tôi gồm các bên dưới đây:

BÊN BÁN (BÊN A):
Họ và tên: TRẦN QUANG VŨ
CCCD số: 001079001234 — Ngày cấp: 20/11/2021 — Nơi cấp: Cục Cảnh sát Quản lý hành chính về trật tự xã hội
Địa chỉ thường trú: Số 12 phố hành lang, phường Láng Hạ, quận Đống Đa, thành phố Hà Nội
Điện thoại liên hệ: 0904.555.666

BÊN MUA (BÊN B):
Họ và tên: LÊ HOÀNG NAM
CCCD số: 024091005678 — Ngày cấp: 05/03/2023 — Nơi cấp: Cục Cảnh sát Quản lý hành chính về trật tự xã hội
Địa chỉ thường trú: Khu phố 4, thị trấn Bến Lức, huyện Bến Lức, tỉnh Long An
Điện thoại liên hệ: 0972.111.222

Các bên tự nguyện cùng thỏa thuận, thống nhất ký kết Hợp đồng mua bán căn hộ chung cư này với các điều khoản cụ thể như sau:

ĐIỀU 1: ĐỐI TƯỢNG VÀ THÔNG TIN CĂN HỘ MUA BÁN
1.1 Bên A đồng ý bán và Bên B đồng ý mua căn hộ số: 2408, Tầng: 24, Tòa nhà: Tháp B thuộc Dự án chung cư: Sky Skyline tại địa chỉ: Số 88 Láng Hạ, phường Láng Hạ, quận Đống Đa, thành phố Hà Nội.
1.2 Diện tích sử dụng căn hộ (diện tích thông thủy) theo giấy chứng nhận quyền sở hữu là: 75.5 m². Bên B xác nhận đã đo đạc, kiểm tra thực tế căn hộ tại thời điểm ký kết hợp đồng này và cam kết chấp nhận mọi sai số diện tích phát sinh thực tế sau này (nếu có) mà không yêu cầu Bên A bồi hoàn hoặc điều chỉnh lại tổng giá trị hợp đồng.

ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN
2.1 Tổng giá trị mua bán căn hộ là: 4.500.000.000 VNĐ (Bằng chữ: Bốn tỷ năm trăm triệu đồng chẵn). Giá bán này không bao gồm lệ phí trước bạ, phí công chứng hợp đồng, phí cấp Giấy chứng nhận quyền sở hữu, quỹ bảo trì 2%, phí dịch vụ quản lý vận hành tòa nhà và bất kỳ khoản thuế/phí phát sinh nào khác liên quan đến việc chuyển nhượng.
2.2 Phương thức thanh toán: Bên B thanh toán bằng tiền mặt hoặc chuyển khoản theo các đợt như sau:
- Đợt 1: Bên B thanh toán số tiền đặt cọc và thanh toán trước là 1.500.000.000 VNĐ ngay sau khi ký hợp đồng này.
- Đợt 2: Bên B thanh toán tiếp số tiền 2.500.000.000 VNĐ trong vòng mười lăm (15) ngày kể từ ngày ký hợp đồng.
- Đợt 3: Bên B thanh toán số tiền còn lại là 500.000.000 VNĐ ngay sau khi hai bên ký văn bản bàn giao thực tế căn hộ.
2.3 Quy định về thuế thu nhập cá nhân: Do hai bên thỏa thuận giá bán trên là giá thu ròng về cho Bên A, nên toàn bộ tiền thuế thu nhập cá nhân từ việc chuyển nhượng bất động sản (thông thường do bên bán chịu theo luật định) và các loại phí hành chính khác phát sinh sẽ do Bên B chịu trách nhiệm kê khai và chi trả thay cho Bên A vô điều kiện trước khi thực hiện thủ tục sang tên.

ĐIỀU 3: BÀN GIAO CĂN HỘ VÀ TRÁCH NHIỆM BẢO HÀNH
3.1 Thời hạn bàn giao nhà: Bên A bàn giao căn hộ cho Bên B trong vòng bảy (07) ngày kể từ ngày Bên B hoàn thành toàn bộ nghĩa vụ thanh toán Đợt 2 quy định tại Khoản 2.2.
3.2 Kể từ thời điểm ký biên bản bàn giao căn hộ hoặc kể từ ngày Bên B nhận chìa khóa căn hộ (tùy thời điểm nào đến trước), Bên B chính thức chịu mọi rủi ro về hư hỏng, tổn thất tài sản, cháy nổ liên quan đến căn hộ. Bên A hoàn toàn miễn trừ trách nhiệm bảo hành đối với toàn bộ kết cấu xây dựng ngầm, hệ thống điện nước âm tường, thiết bị nội thất gắn liền và các lỗi kỹ thuật phát sinh của căn hộ. Mọi chi phí sửa chữa, khắc phục hỏng hóc sau bàn giao sẽ do Bên B tự chi trả.

ĐIỀU 4: THỦ TỤC CẤP GIẤY CHỨNG NHẬN QUYỀN SỞ HỮU
4.1 Bên A có trách nhiệm cung cấp đầy đủ các giấy tờ pháp lý hiện có thuộc quyền sở hữu của Bên A cho Bên B để Bên B tự thực hiện thủ tục đăng ký biến động sang tên tại cơ quan nhà nước có thẩm quyền.
4.2 Do căn hộ thuộc dự án đang trong quá trình giải quyết các thủ tục pháp lý chung của Chủ đầu tư, Bên A không cam kết cụ thể về thời gian cơ quan nhà nước cấp Giấy chứng nhận quyền sở hữu mới đứng tên Bên B. Bên B cam kết không khiếu nại, không khởi kiện và không có quyền đơn phương hủy bỏ hợp đồng hoặc yêu cầu Bên A bồi thường vì lý do chậm trễ cấp Sổ hồng từ phía cơ quan chức năng hoặc Chủ đầu tư dự án.

ĐIỀU 5: PHẠT VI PHẠM VÀ ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG
5.1 Nếu Bên B chậm thanh toán bất kỳ đợt tiền nào theo quy định tại Khoản 2.2 quá ba (03) ngày, Bên A có quyền đơn phương chấm dứt hợp đồng ngay lập tức mà không cần thông báo trước. Trong trường hợp này, Bên A được quyền tịch thu toàn bộ số tiền Bên B đã thanh toán ở các đợt trước đó dưới danh nghĩa tiền phạt vi phạm và bồi thường thiệt hại mà không phải hoàn trả lại bất kỳ khoản nào cho Bên B.
5.2 Trong trường hợp Bên B tự ý chấm dứt hợp đồng trước khi thực hiện xong thủ tục chuyển nhượng mà không do lỗi trực tiếp từ Bên A, Bên B sẽ bị phạt số tiền tương đương 30% tổng giá trị hợp đồng và phải hoàn trả căn hộ lại cho Bên A trong tình trạng nguyên vẹn như lúc nhận.
5.3 Ngược lại, nếu Bên A chậm trễ bàn giao nhà hoặc giấy tờ quá chín mươi (90) ngày so với cam kết, Bên A chỉ phải chịu mức phạt cố định tối đa bằng 2% trên tổng số tiền đợt 1 mà không phải gánh chịu thêm bất kỳ trách nhiệm bồi thường thiệt hại thực tế nào khác cho Bên B.

ĐIỀU 6: ĐIỀU KHOẢN CHUNG VÀ GIẢI QUYẾT TRANH CHẤP
6.1 Hợp đồng này có hiệu lực kể từ ngày hai bên ký kết và không thể hủy bỏ trừ trường hợp quy định tại Khoản 5.1.
6.2 Mọi tranh chấp phát sinh sẽ được giải quyết trước tiên bằng thương lượng. Nếu không đạt được sự thống nhất, vụ việc sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền tại nơi có bất động sản. Toàn bộ các khoản chi phí liên quan đến quá trình tố tụng, án phí, chi phí định giá và chi phí thuê luật sư bảo vệ quyền lợi của Bên A tại tòa án sẽ do Bên B chi trả toàn bộ và vô điều kiện trong mọi trường hợp.
6.3 Hợp đồng này được lập thành hai (02) bản có giá trị pháp lý như nhau, mỗi bên giữ một (01) bản để thực hiện.

KÝ KẾT

ĐẠI DIỆN BÊN A                               ĐẠI DIỆN BÊN B
(Ký và ghi rõ họ tên)                        (Ký và ghi rõ họ tên)`,
  sections: [
    { id: "quoc-hieu-1", type: "meta", text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" },
    { id: "quoc-hieu-2", type: "meta", text: "Độc lập - Tự do - Hạnh phúc" },
    { id: "title", type: "title", text: "HỢP ĐỒNG MUA BÁN CĂN HỘ CHUNG CƯ" },
    { id: "so-hop-dong", type: "meta", text: "Số: 89/HĐMB-2026" },
    { id: "ngay-ky", type: "meta", text: "Hôm nay, ngày 04 tháng 07 năm 2026, tại địa chỉ: Tòa nhà Sky Skyline, Số 88 Láng Hạ, quận Đống Đa, thành phố Hà Nội." },
    { id: "intro", type: "intro", text: "Chúng tôi gồm các bên dưới đây:" },
    {
      id: "ben-a",
      type: "party",
      text: "BÊN BÁN (BÊN A):\nHọ và tên: TRẦN QUANG VŨ\nCCCD số: 001079001234 — Ngày cấp: 20/11/2021 — Nơi cấp: Cục Cảnh sát Quản lý hành chính về trật tự xã hội\nĐịa chỉ thường trú: Số 12 phố hành lang, phường Láng Hạ, quận Đống Đa, thành phố Hà Nội\nĐiện thoại liên hệ: 0904.555.666",
    },
    {
      id: "ben-b",
      type: "party",
      text: "BÊN MUA (BÊN B):\nHọ và tên: LÊ HOÀNG NAM\nCCCD số: 024091005678 — Ngày cấp: 05/03/2023 — Nơi cấp: Cục Cảnh sát Quản lý hành chính về trật tự xã hội\nĐịa chỉ thường trú: Khu phố 4, thị trấn Bến Lức, huyện Bến Lức, tỉnh Long An\nĐiện thoại liên hệ: 0972.111.222",
    },
    { id: "intro-2", type: "intro", text: "Các bên tự nguyện cùng thỏa thuận, thống nhất ký kết Hợp đồng mua bán căn hộ chung cư này với các điều khoản cụ thể như sau:" },
    { id: "dieu-1", type: "article-heading", text: "ĐIỀU 1: ĐỐI TƯỢNG VÀ THÔNG TIN CĂN HỘ MUA BÁN" },
    { id: "clause-1-1", type: "clause", text: "1.1 Bên A đồng ý bán và Bên B đồng ý mua căn hộ số: 2408, Tầng: 24, Tòa nhà: Tháp B thuộc Dự án chung cư: Sky Skyline tại địa chỉ: Số 88 Láng Hạ, phường Láng Hạ, quận Đống Đa, thành phố Hà Nội." },
    {
      id: "clause-1-2",
      type: "clause",
      text: "1.2 Diện tích sử dụng căn hộ (diện tích thông thủy) theo giấy chứng nhận quyền sở hữu là: 75.5 m². Bên B xác nhận đã đo đạc, kiểm tra thực tế căn hộ tại thời điểm ký kết hợp đồng này và cam kết chấp nhận mọi sai số diện tích phát sinh thực tế sau này (nếu có) mà không yêu cầu Bên A bồi hoàn hoặc điều chỉnh lại tổng giá trị hợp đồng.",
      unfavorable: true,
      note: "Bên mua từ bỏ trước quyền yêu cầu điều chỉnh giá khi diện tích thực tế sai lệch so với giấy chứng nhận",
    },
    { id: "dieu-2", type: "article-heading", text: "ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN" },
    {
      id: "clause-2-1",
      type: "clause",
      text: "2.1 Tổng giá trị mua bán căn hộ là: 4.500.000.000 VNĐ (Bằng chữ: Bốn tỷ năm trăm triệu đồng chẵn). Giá bán này không bao gồm lệ phí trước bạ, phí công chứng hợp đồng, phí cấp Giấy chứng nhận quyền sở hữu, quỹ bảo trì 2%, phí dịch vụ quản lý vận hành tòa nhà và bất kỳ khoản thuế/phí phát sinh nào khác liên quan đến việc chuyển nhượng.",
      unfavorable: true,
      note: "Đẩy toàn bộ thuế, phí sang bên mua — kể cả quỹ bảo trì 2% (thường đã nộp từ khi mua lần đầu) và mọi khoản 'phát sinh khác' không giới hạn",
    },
    {
      id: "clause-2-2",
      type: "clause",
      text: "2.2 Phương thức thanh toán: Bên B thanh toán bằng tiền mặt hoặc chuyển khoản theo các đợt như sau:\n- Đợt 1: Bên B thanh toán số tiền đặt cọc và thanh toán trước là 1.500.000.000 VNĐ ngay sau khi ký hợp đồng này.\n- Đợt 2: Bên B thanh toán tiếp số tiền 2.500.000.000 VNĐ trong vòng mười lăm (15) ngày kể từ ngày ký hợp đồng.\n- Đợt 3: Bên B thanh toán số tiền còn lại là 500.000.000 VNĐ ngay sau khi hai bên ký văn bản bàn giao thực tế căn hộ.",
      unfavorable: true,
      note: "Phải trả 4 tỷ (gần 89% giá trị) trong 15 ngày đầu — trước khi nhận bàn giao và trước khi hoàn tất sang tên",
    },
    {
      id: "clause-2-3",
      type: "clause",
      text: "2.3 Quy định về thuế thu nhập cá nhân: Do hai bên thỏa thuận giá bán trên là giá thu ròng về cho Bên A, nên toàn bộ tiền thuế thu nhập cá nhân từ việc chuyển nhượng bất động sản (thông thường do bên bán chịu theo luật định) và các loại phí hành chính khác phát sinh sẽ do Bên B chịu trách nhiệm kê khai và chi trả thay cho Bên A vô điều kiện trước khi thực hiện thủ tục sang tên.",
      unfavorable: true,
      note: "Thuế TNCN (2% giá chuyển nhượng ≈ 90 triệu) theo luật do bên bán chịu — điều khoản 'giá thu ròng' đẩy sang bên mua vô điều kiện",
    },
    { id: "dieu-3", type: "article-heading", text: "ĐIỀU 3: BÀN GIAO CĂN HỘ VÀ TRÁCH NHIỆM BẢO HÀNH" },
    { id: "clause-3-1", type: "clause", text: "3.1 Thời hạn bàn giao nhà: Bên A bàn giao căn hộ cho Bên B trong vòng bảy (07) ngày kể từ ngày Bên B hoàn thành toàn bộ nghĩa vụ thanh toán Đợt 2 quy định tại Khoản 2.2." },
    {
      id: "clause-3-2",
      type: "clause",
      text: "3.2 Kể từ thời điểm ký biên bản bàn giao căn hộ hoặc kể từ ngày Bên B nhận chìa khóa căn hộ (tùy thời điểm nào đến trước), Bên B chính thức chịu mọi rủi ro về hư hỏng, tổn thất tài sản, cháy nổ liên quan đến căn hộ. Bên A hoàn toàn miễn trừ trách nhiệm bảo hành đối với toàn bộ kết cấu xây dựng ngầm, hệ thống điện nước âm tường, thiết bị nội thất gắn liền và các lỗi kỹ thuật phát sinh của căn hộ. Mọi chi phí sửa chữa, khắc phục hỏng hóc sau bàn giao sẽ do Bên B tự chi trả.",
      unfavorable: true,
      note: "Miễn toàn bộ trách nhiệm bảo hành kết cấu ngầm, điện nước âm tường ngay khi giao chìa khóa — kể cả lỗi có sẵn khó phát hiện khi xem nhà",
    },
    { id: "dieu-4", type: "article-heading", text: "ĐIỀU 4: THỦ TỤC CẤP GIẤY CHỨNG NHẬN QUYỀN SỞ HỮU" },
    { id: "clause-4-1", type: "clause", text: "4.1 Bên A có trách nhiệm cung cấp đầy đủ các giấy tờ pháp lý hiện có thuộc quyền sở hữu của Bên A cho Bên B để Bên B tự thực hiện thủ tục đăng ký biến động sang tên tại cơ quan nhà nước có thẩm quyền." },
    {
      id: "clause-4-2",
      type: "clause",
      text: "4.2 Do căn hộ thuộc dự án đang trong quá trình giải quyết các thủ tục pháp lý chung của Chủ đầu tư, Bên A không cam kết cụ thể về thời gian cơ quan nhà nước cấp Giấy chứng nhận quyền sở hữu mới đứng tên Bên B. Bên B cam kết không khiếu nại, không khởi kiện và không có quyền đơn phương hủy bỏ hợp đồng hoặc yêu cầu Bên A bồi thường vì lý do chậm trễ cấp Sổ hồng từ phía cơ quan chức năng hoặc Chủ đầu tư dự án.",
      unfavorable: true,
      note: "Không cam kết thời hạn ra sổ + bên mua từ bỏ quyền khiếu nại, khởi kiện, hủy hợp đồng — dù đã trả gần đủ tiền",
    },
    { id: "dieu-5", type: "article-heading", text: "ĐIỀU 5: PHẠT VI PHẠM VÀ ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG" },
    {
      id: "clause-5-1",
      type: "clause",
      text: "5.1 Nếu Bên B chậm thanh toán bất kỳ đợt tiền nào theo quy định tại Khoản 2.2 quá ba (03) ngày, Bên A có quyền đơn phương chấm dứt hợp đồng ngay lập tức mà không cần thông báo trước. Trong trường hợp này, Bên A được quyền tịch thu toàn bộ số tiền Bên B đã thanh toán ở các đợt trước đó dưới danh nghĩa tiền phạt vi phạm và bồi thường thiệt hại mà không phải hoàn trả lại bất kỳ khoản nào cho Bên B.",
      unfavorable: true,
      note: "Chậm 3 ngày → bị chấm dứt không cần báo trước và mất TOÀN BỘ tiền đã đóng (có thể tới 4 tỷ) — không cần chứng minh thiệt hại",
    },
    {
      id: "clause-5-2",
      type: "clause",
      text: "5.2 Trong trường hợp Bên B tự ý chấm dứt hợp đồng trước khi thực hiện xong thủ tục chuyển nhượng mà không do lỗi trực tiếp từ Bên A, Bên B sẽ bị phạt số tiền tương đương 30% tổng giá trị hợp đồng và phải hoàn trả căn hộ lại cho Bên A trong tình trạng nguyên vẹn như lúc nhận.",
      unfavorable: true,
      note: "Phạt 30% tổng giá trị (1,35 tỷ) khi bên mua rút lui — kể cả khi lý do không xuất phát từ 'lỗi trực tiếp' của bên bán (ví dụ sổ hồng treo vô thời hạn)",
    },
    {
      id: "clause-5-3",
      type: "clause",
      text: "5.3 Ngược lại, nếu Bên A chậm trễ bàn giao nhà hoặc giấy tờ quá chín mươi (90) ngày so với cam kết, Bên A chỉ phải chịu mức phạt cố định tối đa bằng 2% trên tổng số tiền đợt 1 mà không phải gánh chịu thêm bất kỳ trách nhiệm bồi thường thiệt hại thực tế nào khác cho Bên B.",
      unfavorable: true,
      note: "Bất cân xứng nghiêm trọng: bên bán chậm 90 ngày chỉ chịu tối đa 2% đợt 1 (30 triệu) — so với bên mua mất toàn bộ tiền đã đóng khi chậm 3 ngày",
    },
    { id: "dieu-6", type: "article-heading", text: "ĐIỀU 6: ĐIỀU KHOẢN CHUNG VÀ GIẢI QUYẾT TRANH CHẤP" },
    {
      id: "clause-6-1",
      type: "clause",
      text: "6.1 Hợp đồng này có hiệu lực kể từ ngày hai bên ký kết và không thể hủy bỏ trừ trường hợp quy định tại Khoản 5.1.",
      unfavorable: true,
      note: "Hợp đồng 'không thể hủy bỏ' — lối thoát duy nhất được chừa lại là quyền chấm dứt của bên bán tại Điều 5.1",
    },
    {
      id: "clause-6-2",
      type: "clause",
      text: "6.2 Mọi tranh chấp phát sinh sẽ được giải quyết trước tiên bằng thương lượng. Nếu không đạt được sự thống nhất, vụ việc sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền tại nơi có bất động sản. Toàn bộ các khoản chi phí liên quan đến quá trình tố tụng, án phí, chi phí định giá và chi phí thuê luật sư bảo vệ quyền lợi của Bên A tại tòa án sẽ do Bên B chi trả toàn bộ và vô điều kiện trong mọi trường hợp.",
      unfavorable: true,
      note: "Bên mua trả vô điều kiện án phí + phí luật sư của bên bán trong mọi trường hợp — kể cả khi bên mua thắng kiện",
    },
    { id: "clause-6-3", type: "clause", text: "6.3 Hợp đồng này được lập thành hai (02) bản có giá trị pháp lý như nhau, mỗi bên giữ một (01) bản để thực hiện." },
    {
      id: "signing",
      type: "signing",
      text: "ĐẠI DIỆN BÊN A\n(Ký và ghi rõ họ tên)\n\nĐẠI DIỆN BÊN B\n(Ký và ghi rõ họ tên)",
    },
  ],
};

export const MUA_BAN_CAN_HO_V2: ContractTemplate = {
  id: "mua-ban-v2",
  title: "Hợp đồng Mua bán Căn hộ Chung cư (đã chỉnh sửa)",
  subtitle: "Bản đã sửa — dùng để thử tính năng So sánh hợp đồng",
  description:
    "Bản chỉnh sửa từ hợp đồng mua bán căn hộ mẫu ở trên: bổ sung cam kết pháp lý của Bên bán, gắn tiến độ thanh toán với mốc công chứng/sang tên, phân định lại nghĩa vụ thuế — phí và cân bằng mức phạt vi phạm giữa hai bên. Dùng cùng bản gốc để trải nghiệm tính năng So sánh hợp đồng.",
  filename: "hop-dong-mua-ban-can-ho-v2.docx",
  content: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

HỢP ĐỒNG MUA BÁN CĂN HỘ CHUNG CƯ
Số: 89/HĐMB-2026/V2

Hôm nay, ngày 04 tháng 07 năm 2026, tại địa chỉ: Phòng Công chứng Nhà nước, thành phố Hà Nội.

Chúng tôi gồm các bên dưới đây:

BÊN BÁN (BÊN A):
Họ và tên: TRẦN QUANG VŨ
CCCD số: 001079001234 — Ngày cấp: 20/11/2021 — Nơi cấp: Cục Cảnh sát Quản lý hành chính về trật tự xã hội
Địa chỉ thường trú: Số 12 phố hành lang, phường Láng Hạ, quận Đống Đa, thành phố Hà Nội
Điện thoại liên hệ: 0904.555.666

BÊN MUA (BÊN B):
Họ và tên: LÊ HOÀNG NAM
CCCD số: 024091005678 — Ngày cấp: 05/03/2023 — Nơi cấp: Cục Cảnh sát Quản lý hành chính về trật tự xã hội
Địa chỉ thường trú: Khu phố 4, thị trấn Bến Lức, huyện Bến Lức, tỉnh Long An
Điện thoại liên hệ: 0972.111.222

Các bên tự nguyện cùng thỏa thuận, thống nhất ký kết Hợp đồng mua bán căn hộ chung cư này với các điều khoản phù hợp với quy định của pháp luật hiện hành như sau:

ĐIỀU 1: ĐỐI TƯỢNG VÀ THÔNG TIN CĂN HỘ MUA BÁN
1.1 Bên A đồng ý bán và Bên B đồng ý mua căn hộ số: 2408, Tầng: 24, Tòa nhà: Tháp B thuộc Dự án chung cư: Sky Skyline tại địa chỉ: Số 88 Láng Hạ, phường Láng Hạ, quận Đống Đa, thành phố Hà Nội.
1.2 Diện tích sử dụng căn hộ (diện tích thông thủy) theo giấy chứng nhận quyền sở hữu là: 75.5 m².
1.3 Sai số diện tích thực tế: Hai bên thống nhất nếu diện tích thông thủy đo đạc lại khi bàn giao thực tế chênh lệch vượt quá 0,5% (không phẩy năm phần trăm) so với diện tích ghi trên giấy chứng nhận, tổng giá trị hợp đồng sẽ được điều chỉnh tăng hoặc giảm tương ứng theo đơn giá mét vuông thực tế.

ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN
2.1 Tổng giá trị mua bán căn hộ là: 4.500.000.000 VNĐ (Bằng chữ: Bốn tỷ năm trăm triệu đồng chẵn).
2.2 Phương thức thanh toán: Bên B thanh toán bằng tiền mặt hoặc chuyển khoản theo các đợt như sau:
- Đợt 1: Bên B thanh toán số tiền đặt cọc và thanh toán trước là 1.500.000.000 VNĐ ngay sau khi ký hợp đồng này.
- Đợt 2: Bên B thanh toán tiếp số tiền 2.500.000.000 VNĐ trong vòng mười lăm (15) ngày kể từ ngày ký hợp đồng.
- Đợt 3: Bên B giữ lại số tiền còn lại là 500.000.000 VNĐ và thanh toán ngay sau khi cơ quan nhà nước hoàn tất thủ tục đăng ký biến động và cấp Giấy chứng nhận quyền sở hữu mới (Sổ hồng) đứng tên Bên B.
2.3 Phân định nghĩa vụ Thuế và Lệ phí: Thuế thu nhập cá nhân phát sinh từ việc chuyển nhượng bất động sản do Bên Bán (Bên A) chịu trách nhiệm kê khai và chi trả theo đúng quy định pháp luật. Lệ phí trước bạ và các chi phí hành chính liên quan đến thủ tục sang tên đổi chủ do Bên Mua (Bên B) chịu trách nhiệm chi trả.

ĐIỀU 3: BÀN GIAO CĂN HỘ VÀ TRÁCH NHIỆM BẢO HÀNH
3.1 Thời hạn bàn giao nhà: Bên A bàn giao căn hộ cho Bên B trong vòng bảy (07) ngày kể từ ngày Bên B hoàn thành nghĩa vụ thanh toán Đợt 2 quy định tại Khoản 2.2.
3.2 Trách nhiệm bảo hành và rủi ro: Kể từ thời điểm ký biên bản bàn giao căn hộ, Bên B chịu rủi ro về hao mòn, tổn thất tài sản và cháy nổ. Tuy nhiên, Bên A có trách nhiệm phối hợp và bàn giao lại toàn bộ quyền được bảo hành kết cấu xây dựng và thiết bị kỹ thuật từ Chủ đầu tư dự án cho Bên B theo đúng chính sách bảo hành còn hiệu lực của tòa nhà.

ĐIỀU 4: THỦ TỤC CẤP GIẤY CHỨNG NHẬN QUYỀN SỞ HỮU
4.1 Bên A cam kết căn hộ chuyển nhượng hoàn toàn hợp pháp, không có tranh chấp, không bị thế chấp hoặc kê biên thi hành án. Bên A có trách nhiệm cung cấp đầy đủ hồ sơ pháp lý, cùng Bên B ký kết hợp đồng công chứng và hỗ trợ tối đa các thủ tục cho đến khi hoàn tất việc đăng ký sang tên Sổ hồng.
4.2 Thời hạn hoàn thành thủ tục: Bên A cam kết hoàn tất việc phối hợp nộp hồ sơ sang tên cho Bên B trong vòng ba mươi (30) ngày làm việc kể từ ngày nhận đủ tiền Đợt 2.

ĐIỀU 5: PHẠT VI PHẠM VÀ ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG
5.1 Trường hợp Bên B chậm thanh toán hoặc Bên A chậm bàn giao nhà/giấy tờ so với thời hạn cam kết, bên vi phạm phải chịu mức phạt chậm trễ tính theo lãi suất quá hạn của ngân hàng Vietcombank tại thời điểm vi phạm trên số tiền chậm nộp/chậm giao tương ứng với số ngày chậm trễ.
5.2 Nếu thời gian chậm trễ của bất kỳ bên nào vượt quá ba mươi (30) ngày, bên còn lại có quyền đơn phương chấm dứt hợp đồng. Nếu lỗi thuộc về Bên B, Bên B chịu mất tiền cọc (tối đa bằng 10% tổng giá trị hợp đồng), Bên A hoàn trả lại số tiền còn lại cho Bên B trong vòng 07 ngày. Nếu lỗi thuộc về Bên A, Bên A phải trả lại toàn bộ số tiền Bên B đã nộp và chịu phạt cọc một khoản tiền tương đương giá trị tiền cọc.

ĐIỀU 6: ĐIỀU KHOẢN CHUNG VÀ GIẢI QUYẾT TRANH CHẤP
6.1 Hợp đồng này được lập và công chứng hợp pháp, có hiệu lực ràng buộc trách nhiệm như nhau đối với hai bên.
6.2 Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết qua thương lượng. Nếu không đạt được sự đồng thuận, tranh chấp sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền theo quy định của Bộ luật Tố tụng dân sự. Án phí và chi phí phát sinh trong quá trình tố tụng sẽ do Tòa án quyết định dựa trên kết quả xét xử.
6.3 Hợp đồng này được lập thành bốn (04) bản có giá trị pháp lý như nhau, mỗi bên giữ một (01) bản, hai (02) bản lưu tại Cơ quan công chứng và Văn phòng đăng ký đất đai để thực hiện thủ tục.

KÝ KẾT

ĐẠI DIỆN BÊN A                               ĐẠI DIỆN BÊN B
(Ký, điểm chỉ và ghi rõ họ tên)               (Ký, điểm chỉ và ghi rõ họ tên)`,
  sections: [
    { id: "quoc-hieu-1", type: "meta", text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" },
    { id: "quoc-hieu-2", type: "meta", text: "Độc lập - Tự do - Hạnh phúc" },
    { id: "title", type: "title", text: "HỢP ĐỒNG MUA BÁN CĂN HỘ CHUNG CƯ" },
    { id: "so-hop-dong", type: "meta", text: "Số: 89/HĐMB-2026/V2" },
    { id: "ngay-ky", type: "meta", text: "Hôm nay, ngày 04 tháng 07 năm 2026, tại địa chỉ: Phòng Công chứng Nhà nước, thành phố Hà Nội." },
    { id: "intro", type: "intro", text: "Chúng tôi gồm các bên dưới đây:" },
    {
      id: "ben-a",
      type: "party",
      text: "BÊN BÁN (BÊN A):\nHọ và tên: TRẦN QUANG VŨ\nCCCD số: 001079001234 — Ngày cấp: 20/11/2021 — Nơi cấp: Cục Cảnh sát Quản lý hành chính về trật tự xã hội\nĐịa chỉ thường trú: Số 12 phố hành lang, phường Láng Hạ, quận Đống Đa, thành phố Hà Nội\nĐiện thoại liên hệ: 0904.555.666",
    },
    {
      id: "ben-b",
      type: "party",
      text: "BÊN MUA (BÊN B):\nHọ và tên: LÊ HOÀNG NAM\nCCCD số: 024091005678 — Ngày cấp: 05/03/2023 — Nơi cấp: Cục Cảnh sát Quản lý hành chính về trật tự xã hội\nĐịa chỉ thường trú: Khu phố 4, thị trấn Bến Lức, huyện Bến Lức, tỉnh Long An\nĐiện thoại liên hệ: 0972.111.222",
    },
    { id: "intro-2", type: "intro", text: "Các bên tự nguyện cùng thỏa thuận, thống nhất ký kết Hợp đồng mua bán căn hộ chung cư này với các điều khoản phù hợp với quy định của pháp luật hiện hành như sau:" },
    { id: "dieu-1", type: "article-heading", text: "ĐIỀU 1: ĐỐI TƯỢNG VÀ THÔNG TIN CĂN HỘ MUA BÁN" },
    { id: "clause-1-1", type: "clause", text: "1.1 Bên A đồng ý bán và Bên B đồng ý mua căn hộ số: 2408, Tầng: 24, Tòa nhà: Tháp B thuộc Dự án chung cư: Sky Skyline tại địa chỉ: Số 88 Láng Hạ, phường Láng Hạ, quận Đống Đa, thành phố Hà Nội." },
    { id: "clause-1-2", type: "clause", text: "1.2 Diện tích sử dụng căn hộ (diện tích thông thủy) theo giấy chứng nhận quyền sở hữu là: 75.5 m²." },
    { id: "clause-1-3", type: "clause", text: "1.3 Sai số diện tích thực tế: Hai bên thống nhất nếu diện tích thông thủy đo đạc lại khi bàn giao thực tế chênh lệch vượt quá 0,5% (không phẩy năm phần trăm) so với diện tích ghi trên giấy chứng nhận, tổng giá trị hợp đồng sẽ được điều chỉnh tăng hoặc giảm tương ứng theo đơn giá mét vuông thực tế." },
    { id: "dieu-2", type: "article-heading", text: "ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN" },
    { id: "clause-2-1", type: "clause", text: "2.1 Tổng giá trị mua bán căn hộ là: 4.500.000.000 VNĐ (Bằng chữ: Bốn tỷ năm trăm triệu đồng chẵn)." },
    {
      id: "clause-2-2",
      type: "clause",
      text: "2.2 Phương thức thanh toán: Bên B thanh toán bằng tiền mặt hoặc chuyển khoản theo các đợt như sau:\n- Đợt 1: Bên B thanh toán số tiền đặt cọc và thanh toán trước là 1.500.000.000 VNĐ ngay sau khi ký hợp đồng này.\n- Đợt 2: Bên B thanh toán tiếp số tiền 2.500.000.000 VNĐ trong vòng mười lăm (15) ngày kể từ ngày ký hợp đồng.\n- Đợt 3: Bên B giữ lại số tiền còn lại là 500.000.000 VNĐ và thanh toán ngay sau khi cơ quan nhà nước hoàn tất thủ tục đăng ký biến động và cấp Giấy chứng nhận quyền sở hữu mới (Sổ hồng) đứng tên Bên B.",
    },
    { id: "clause-2-3", type: "clause", text: "2.3 Phân định nghĩa vụ Thuế và Lệ phí: Thuế thu nhập cá nhân phát sinh từ việc chuyển nhượng bất động sản do Bên Bán (Bên A) chịu trách nhiệm kê khai và chi trả theo đúng quy định pháp luật. Lệ phí trước bạ và các chi phí hành chính liên quan đến thủ tục sang tên đổi chủ do Bên Mua (Bên B) chịu trách nhiệm chi trả." },
    { id: "dieu-3", type: "article-heading", text: "ĐIỀU 3: BÀN GIAO CĂN HỘ VÀ TRÁCH NHIỆM BẢO HÀNH" },
    { id: "clause-3-1", type: "clause", text: "3.1 Thời hạn bàn giao nhà: Bên A bàn giao căn hộ cho Bên B trong vòng bảy (07) ngày kể từ ngày Bên B hoàn thành nghĩa vụ thanh toán Đợt 2 quy định tại Khoản 2.2." },
    { id: "clause-3-2", type: "clause", text: "3.2 Trách nhiệm bảo hành và rủi ro: Kể từ thời điểm ký biên bản bàn giao căn hộ, Bên B chịu rủi ro về hao mòn, tổn thất tài sản và cháy nổ. Tuy nhiên, Bên A có trách nhiệm phối hợp và bàn giao lại toàn bộ quyền được bảo hành kết cấu xây dựng và thiết bị kỹ thuật từ Chủ đầu tư dự án cho Bên B theo đúng chính sách bảo hành còn hiệu lực của tòa nhà." },
    { id: "dieu-4", type: "article-heading", text: "ĐIỀU 4: THỦ TỤC CẤP GIẤY CHỨNG NHẬN QUYỀN SỞ HỮU" },
    { id: "clause-4-1", type: "clause", text: "4.1 Bên A cam kết căn hộ chuyển nhượng hoàn toàn hợp pháp, không có tranh chấp, không bị thế chấp hoặc kê biên thi hành án. Bên A có trách nhiệm cung cấp đầy đủ hồ sơ pháp lý, cùng Bên B ký kết hợp đồng công chứng và hỗ trợ tối đa các thủ tục cho đến khi hoàn tất việc đăng ký sang tên Sổ hồng." },
    { id: "clause-4-2", type: "clause", text: "4.2 Thời hạn hoàn thành thủ tục: Bên A cam kết hoàn tất việc phối hợp nộp hồ sơ sang tên cho Bên B trong vòng ba mươi (30) ngày làm việc kể từ ngày nhận đủ tiền Đợt 2." },
    { id: "dieu-5", type: "article-heading", text: "ĐIỀU 5: PHẠT VI PHẠM VÀ ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG" },
    { id: "clause-5-1", type: "clause", text: "5.1 Trường hợp Bên B chậm thanh toán hoặc Bên A chậm bàn giao nhà/giấy tờ so với thời hạn cam kết, bên vi phạm phải chịu mức phạt chậm trễ tính theo lãi suất quá hạn của ngân hàng Vietcombank tại thời điểm vi phạm trên số tiền chậm nộp/chậm giao tương ứng với số ngày chậm trễ." },
    { id: "clause-5-2", type: "clause", text: "5.2 Nếu thời gian chậm trễ của bất kỳ bên nào vượt quá ba mươi (30) ngày, bên còn lại có quyền đơn phương chấm dứt hợp đồng. Nếu lỗi thuộc về Bên B, Bên B chịu mất tiền cọc (tối đa bằng 10% tổng giá trị hợp đồng), Bên A hoàn trả lại số tiền còn lại cho Bên B trong vòng 07 ngày. Nếu lỗi thuộc về Bên A, Bên A phải trả lại toàn bộ số tiền Bên B đã nộp và chịu phạt cọc một khoản tiền tương đương giá trị tiền cọc." },
    { id: "dieu-6", type: "article-heading", text: "ĐIỀU 6: ĐIỀU KHOẢN CHUNG VÀ GIẢI QUYẾT TRANH CHẤP" },
    { id: "clause-6-1", type: "clause", text: "6.1 Hợp đồng này được lập và công chứng hợp pháp, có hiệu lực ràng buộc trách nhiệm như nhau đối với hai bên." },
    { id: "clause-6-2", type: "clause", text: "6.2 Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết qua thương lượng. Nếu không đạt được sự đồng thuận, tranh chấp sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền theo quy định của Bộ luật Tố tụng dân sự. Án phí và chi phí phát sinh trong quá trình tố tụng sẽ do Tòa án quyết định dựa trên kết quả xét xử." },
    { id: "clause-6-3", type: "clause", text: "6.3 Hợp đồng này được lập thành bốn (04) bản có giá trị pháp lý như nhau, mỗi bên giữ một (01) bản, hai (02) bản lưu tại Cơ quan công chứng và Văn phòng đăng ký đất đai để thực hiện thủ tục." },
    {
      id: "signing",
      type: "signing",
      text: "ĐẠI DIỆN BÊN A\n(Ký, điểm chỉ và ghi rõ họ tên)\n\nĐẠI DIỆN BÊN B\n(Ký, điểm chỉ và ghi rõ họ tên)",
    },
  ],
};

export const CONTRACTS: Record<string, ContractTemplate> = {
  thue: THUE_CAN_HO,
  "mua-ban": MUA_BAN_CAN_HO,
  "mua-ban-v2": MUA_BAN_CAN_HO_V2,
};
