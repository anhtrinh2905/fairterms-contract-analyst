/* ============================================================
   Kết quả phân tích chạy sẵn cho Hợp đồng mẫu (template "thue").
   Sinh 1 lần bằng backend thật (/checklist/evaluate-clause +
   /checklist/evaluate-coverage) rồi rà soát, chỉnh câu chữ.
   Nút "Phân tích ngay" của hợp đồng mẫu phát lại dữ liệu này,
   KHÔNG gọi backend — xem ContractMode (kind: "template").
   ============================================================ */
import {
  citationsFromLabels,
  type Analysis,
  type Article,
  type ChecklistCoverageItem,
  type ContractInfo,
  type Device,
  type Party,
} from "@/app/fairterms/lib/data";
import type { ClauseTask, ContractData, OcrPhaseResult } from "@/lib/contractData";

export const TEMPLATE_ANALYSIS_FILE_NAME = "hop-dong-thue-can-ho.docx";

const thong_tin: ContractInfo = {
  loai: "Thuê căn hộ chung cư",
  so_hd: "128/HĐTN-2026",
  ngay_ky: "23/06/2026",
  thoi_han: "12 tháng (01/07/2026 – 30/06/2027)",
  gia_thue: "12.000.000 đ / tháng",
  dat_coc: "24.000.000 đ (02 tháng tiền thuê)",
  dia_chi:
    "Căn hộ 1805, Tầng 18, Block A, Green Park, Số 12 Khuất Duy Tiến, phường Thanh Xuân Trung, quận Thanh Xuân, Hà Nội",
  dien_tich: "—",
};

// PII đã ẩn danh theo cùng pattern với dữ liệu demo (lib/data.ts)
const ben_a: Party = {
  nhan: "Bên A — Bên cho thuê",
  ho_ten: "Nguyễn Văn H***",
  cccd: "001•••••2345",
  ngay_cap: "15/04/2022",
  noi_cap: "Cục CS QLHC về TTXH",
  sdt: "091• ••• 789",
  dia_chi: "••• Lê Trọng Tấn, P. Khương Mai, Q. Thanh Xuân, Hà Nội",
  truong_thieu: [],
};

const ben_b: Party = {
  nhan: "Bên B — Bên thuê (được bảo vệ)",
  ho_ten: "Trần Minh Đ***",
  cccd: "038•••••9876",
  ngay_cap: "22/08/2023",
  noi_cap: "Cục CS QLHC về TTXH",
  sdt: "098• ••• 321",
  dia_chi: "••• xã Quảng Chính, H. Quảng Xương, Thanh Hóa",
  truong_thieu: [],
};

const contract: Article[] = [
  {
    so_dieu: "ĐIỀU 1",
    tieu_de: "ĐỐI TƯỢNG HỢP ĐỒNG VÀ THỜI HẠN THUÊ",
    paragraphs: [
      {
        id: "p1-1",
        num: "1.1",
        text: "Bên A đồng ý cho Bên B thuê và Bên B đồng ý thuê căn hộ số: 1805, Tầng: 18, Tòa nhà: Block A thuộc Dự án chung cư: Green Park tại địa chỉ: Số 12 Khuất Duy Tiến, phường Thanh Xuân Trung, quận Thanh Xuân, thành phố Hà Nội.",
      },
      {
        id: "p1-2",
        num: "1.2",
        text: "Mục đích sử dụng: Dùng để ở cho tối đa 02 người. Bên B không được phép cho bên thứ ba ở nhờ hoặc cho thuê lại dưới mọi hình thức nếu không có sự đồng ý bằng văn bản của Bên A.",
      },
      {
        id: "p1-3",
        num: "1.3",
        text: "Thời hạn thuê: 12 tháng, tính từ ngày 01/07/2026 đến ngày 30/06/2027.",
      },
      {
        id: "p1-4",
        num: "1.4",
        text: "Hết thời hạn thuê quy định tại Khoản 1.3, nếu Bên B không thông báo bằng văn bản về việc chấm dứt hợp đồng trước ít nhất chín mươi (90) ngày, hợp đồng này sẽ tự động gia hạn thêm một thời hạn tương đương. Giá thuê căn hộ tại thời điểm gia hạn tự động sẽ áp dụng theo biểu giá mới do Bên A quyết định, tăng tối đa không quá 20% so với giá thuê trước đó.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 2",
    tieu_de: "GIÁ THUÊ, ĐẶT CỌC VÀ PHƯƠNG THỨC THANH TOÁN",
    paragraphs: [
      {
        id: "p2-1",
        num: "2.1",
        text: "Giá thuê căn hộ cố định là: 12.000.000 VNĐ/tháng (Bằng chữ: Mười hai triệu đồng chẵn trên một tháng). Giá thuê này chưa bao gồm các khoản thuế phát sinh, phí quản lý vận hành chung cư, phí gửi xe, tiền điện, nước, internet và các dịch vụ khác.",
      },
      {
        id: "p2-2",
        num: "2.2",
        text: "Phương thức thanh toán: Bên B thanh toán cho Bên A theo định kỳ 03 tháng/lần vào trước ngày 05 của kỳ thanh toán đầu tiên. Hình thức chuyển khoản hoặc tiền mặt.",
      },
      {
        id: "p2-3",
        num: "2.3",
        text: "Khoản tiền đặt cọc: Bên B giao cho Bên A một khoản tiền cọc là: 24.000.000 VNĐ (tương đương 02 tháng tiền nhà) ngay sau khi ký hợp đồng này nhằm bảo đảm thực hiện nghĩa vụ.",
      },
      {
        id: "p2-4",
        num: "2.4",
        text: "Hoàn trả tiền đặt cọc: Khoản tiền đặt cọc sẽ được Bên A hoàn trả cho Bên B trong vòng ba mươi (30) ngày làm việc kể từ ngày hợp đồng chấm dứt hợp pháp và Bên B đã bàn giao lại căn hộ. Tuy nhiên, Bên A có quyền khấu trừ toàn bộ hoặc một phần tiền đặt cọc trong các trường hợp sau mà không cần chứng minh thiệt hại thực tế: Căn hộ xuất hiện bất kỳ vết trầy xước, hao mòn tự nhiên nào trên tường, sàn gỗ, trang thiết bị; hoặc Bên B chậm thanh toán tiền thuê nhà quá ba (03) ngày; hoặc Bên B vi phạm bất kỳ điều khoản nhỏ nào trong Nội quy tòa nhà.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 3",
    tieu_de: "QUYỀN VÀ NGHĨA VỤ CỦA BÊN CHO THUÊ (BÊN A)",
    paragraphs: [
      {
        id: "p3-1",
        num: "3.1",
        text: "Nghĩa vụ của Bên A: Bàn giao căn hộ và các trang thiết bị đính kèm cho Bên B đúng thời hạn.",
      },
      {
        id: "p3-2",
        num: "3.2.a",
        text: "Để đảm bảo an ninh, phòng chống cháy nổ và kiểm tra việc bảo quản tài sản, Bên A hoặc người đại diện của Bên A có quyền vào kiểm tra căn hộ vào bất kỳ lúc nào mà không cần phải thông báo trước cho Bên B. Bên B có nghĩa vụ phối hợp và mở cửa cho Bên A.",
      },
      {
        id: "p3-3",
        num: "3.2.b",
        text: "Bên A có quyền đơn phương chấm dứt hợp đồng trước thời hạn bằng việc thông báo bằng văn bản cho Bên B trước mười lăm (15) ngày trong trường hợp Bên A cần lấy lại nhà để sử dụng cho mục đích cá nhân hoặc bán căn hộ. Trong trường hợp này, Bên A chỉ cần hoàn trả lại tiền cọc và số tiền nhà Bên B đã đóng trước (nếu có) mà không phải chịu bất kỳ khoản phạt vi phạm hợp đồng hay bồi thường nào khác.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 4",
    tieu_de: "QUYỀN VÀ NGHĨA VỤ CỦA BÊN THUÊ (BÊN B)",
    paragraphs: [
      {
        id: "p4-1",
        num: "4.1",
        text: "Quyền của Bên B: Được sử dụng căn hộ cho mục đích sinh hoạt trong thời hạn thuê.",
      },
      {
        id: "p4-2",
        num: "4.2.a",
        text: "Thanh toán tiền thuê nhà, phí quản lý, tiền điện, nước đầy đủ và đúng hạn.",
      },
      {
        id: "p4-3",
        num: "4.2.b",
        text: "Tự chịu trách nhiệm và chi trả toàn bộ chi phí đối với việc bảo dưỡng, sửa chữa, thay thế toàn bộ trang thiết bị nội thất, hệ thống điện, nước, điều hòa, máy móc hư hỏng trong căn hộ trong suốt thời gian thuê, kể cả những hư hỏng do hao mòn tự nhiên hoặc lỗi hệ thống có sẵn của tòa nhà.",
      },
      {
        id: "p4-4",
        num: "4.2.c",
        text: "Trong trường hợp Ban quản lý tòa nhà, Nhà nước hoặc cơ quan có thẩm quyền tăng các loại phí quản lý, phí dịch vụ, giá điện, giá nước hoặc áp đặt thêm các loại phí mới phát sinh liên quan đến căn hộ, Bên B có trách nhiệm tự động chấp nhận và chi trả toàn bộ các khoản tăng này mà không được lấy đó làm lý do để yêu cầu giảm giá thuê hoặc chấm dứt hợp đồng.",
      },
      {
        id: "p4-5",
        num: "4.2.d",
        text: "Chấp nhận và tuân thủ tuyệt đối mọi thay đổi trong Nội quy của tòa nhà chung cư do Ban quản lý ban hành tại từng thời điểm.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 5",
    tieu_de: "PHẠT VI PHẠM VÀ CHẤM DỨT HỢP ĐỒNG",
    paragraphs: [
      {
        id: "p5-1",
        num: "5.1",
        text: "Nếu Bên B chậm thanh toán tiền thuê nhà theo thời hạn quy định tại Khoản 2.2, Bên B phải chịu khoản phạt chậm trả tương đương 5% trên tổng số tiền chậm thanh toán cho mỗi ngày chậm trễ.",
      },
      {
        id: "p5-2",
        num: "5.2",
        text: "Nếu Bên B đơn phương chấm dứt hợp đồng trước thời hạn, Bên B sẽ mất toàn bộ số tiền đặt cọc và phải bồi thường cho Bên A số tiền tương đương với tổng số tiền thuê nhà của các tháng còn lại của hợp đồng.",
      },
      {
        id: "p5-3",
        num: "5.3",
        text: "Trường hợp căn hộ bị thu hồi hoặc không thể tiếp tục cho thuê do các nguyên nhân bất khả kháng (thiên tai, dịch bệnh, thay đổi luật pháp, quyết định của cơ quan nhà nước, tòa nhà bị phong tỏa hoặc thu hồi đất...), hợp đồng này sẽ lập tức chấm dứt. Bên A được miễn trừ toàn bộ nghĩa vụ hoàn trả tiền cọc hoặc bồi thường bất kỳ thiệt hại, chi phí di dời nào cho Bên B.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 6",
    tieu_de: "ĐIỀU KHOẢN THI HÀNH",
    paragraphs: [
      {
        id: "p6-1",
        num: "6.1",
        text: "Hợp đồng này có hiệu lực kể từ ngày ký. Mọi sửa đổi, bổ sung hợp đồng phải được lập thành văn bản và có chữ ký của cả hai bên.",
      },
      {
        id: "p6-2",
        num: "6.2",
        text: "Trong trường hợp có tranh chấp phát sinh từ hoặc liên quan đến hợp đồng này, hai bên sẽ ưu tiên giải quyết thông qua thương lượng. Nếu không thương lượng được, tranh chấp sẽ được tòa án có thẩm quyền nơi có căn hộ chung cư giải quyết. Toàn bộ án phí và chi phí thuê luật sư của Bên A sẽ do Bên B chi trả vô điều kiện.",
      },
      {
        id: "p6-3",
        num: "6.3",
        text: "Hợp đồng được lập thành hai (02) bản có giá trị pháp lý như nhau, Bên A giữ một (01) bản, Bên B giữ một (01) bản để thực hiện.",
      },
    ],
  },
];

const phan_tich: Analysis[] = [
  {
    id: "p1-1",
    so_dieu: "ĐIỀU 1",
    dieu_khoan_noi_ve_ben: "ca_hai",
    dieu_khoan_lam_gi: "Xác định đối tượng thuê: căn hộ 1805, Block A, Green Park.",
    ket_luan: "PASS",
    muc_rui_ro: "khong",
    trich_dan: "Bên A đồng ý cho Bên B thuê và Bên B đồng ý thuê căn hộ số: 1805, Tầng: 18, Tòa nhà: Block A…",
    giai_thich: "Mô tả tài sản thuê rõ ràng, đầy đủ địa chỉ, tầng và tòa nhà — phù hợp yêu cầu về nội dung hợp đồng nhà ở.",
    ly_do: "",
    can_cu: citationsFromLabels(["Luật Nhà ở 2023 Điều 163"]),
    de_xuat_sua: "",
    tin_nhan: "",
  },
  {
    id: "p1-2",
    so_dieu: "ĐIỀU 1",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Giới hạn mục đích sử dụng: ở tối đa 02 người, cấm cho ở nhờ/cho thuê lại nếu không có đồng ý bằng văn bản.",
    ket_luan: "PASS",
    muc_rui_ro: "thap",
    trich_dan: "Dùng để ở cho tối đa 02 người. Bên B không được phép cho bên thứ ba ở nhờ hoặc cho thuê lại…",
    giai_thich:
      "Hạn chế cho thuê lại/cho ở nhờ là thông dụng trong hợp đồng thuê. Chỉ lưu ý nên làm rõ khái niệm 'ở nhờ' (ví dụ người thân ở tạm ngắn ngày) để tránh bị diễn giải quá rộng.",
    ly_do: "",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 472"]),
    de_xuat_sua: "",
    tin_nhan: "",
  },
  {
    id: "p1-3",
    so_dieu: "ĐIỀU 1",
    dieu_khoan_noi_ve_ben: "ca_hai",
    dieu_khoan_lam_gi: "Xác định thời hạn thuê 12 tháng.",
    ket_luan: "PASS",
    muc_rui_ro: "khong",
    trich_dan: "Thời hạn thuê: 12 tháng, tính từ ngày 01/07/2026 đến ngày 30/06/2027.",
    giai_thich: "Thời hạn thuê được nêu cụ thể, rõ ràng — phù hợp quy định.",
    ly_do: "",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 474"]),
    de_xuat_sua: "",
    tin_nhan: "",
  },
  {
    id: "p1-4",
    so_dieu: "ĐIỀU 1",
    dieu_khoan_noi_ve_ben: "ben_a",
    dieu_khoan_lam_gi: "Tự động gia hạn nếu Bên B không báo trước 90 ngày; giá kỳ gia hạn do Bên A quyết định, tăng tới 20%.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan:
      "…nếu Bên B không thông báo bằng văn bản về việc chấm dứt hợp đồng trước ít nhất chín mươi (90) ngày, hợp đồng này sẽ tự động gia hạn… Giá thuê… theo biểu giá mới do Bên A quyết định, tăng tối đa không quá 20%…",
    giai_thich:
      "Thời hạn báo trước 90 ngày là dài bất thường (thông lệ 30 ngày); nếu quên báo, Bên B bị ràng buộc thêm 12 tháng với mức giá do Bên A đơn phương ấn định. Trần tăng 20% chỉ giới hạn mức tăng chứ không loại bỏ quyền tự quyết định giá của Bên A.",
    ly_do:
      "Bất lợi cho Bên B: dễ bị gia hạn ngoài ý muốn và bị áp giá mới đơn phương mà không có cơ chế thỏa thuận lại.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 472", "BLDS 2015 Điều 420"]),
    de_xuat_sua:
      "Rút thời hạn báo trước xuống 30 ngày; việc gia hạn và giá thuê kỳ mới phải do hai bên thỏa thuận bằng phụ lục — Bên A thông báo mức giá dự kiến trước tối thiểu 30 ngày và Bên B có quyền từ chối gia hạn.",
    tin_nhan:
      "Chào anh/chị, về Điều 1.4 em đề nghị giảm thời hạn báo trước từ 90 ngày xuống 30 ngày, và khi gia hạn thì hai bên thỏa thuận lại giá bằng phụ lục thay vì áp biểu giá do một bên quyết định. Mong anh/chị xem xét ạ.",
  },
  {
    id: "p2-1",
    so_dieu: "ĐIỀU 2",
    dieu_khoan_noi_ve_ben: "ca_hai",
    dieu_khoan_lam_gi: "Xác định giá thuê 12.000.000đ/tháng và các khoản chưa bao gồm.",
    ket_luan: "PASS",
    muc_rui_ro: "khong",
    trich_dan: "Giá thuê căn hộ cố định là: 12.000.000 VNĐ/tháng… chưa bao gồm các khoản thuế phát sinh, phí quản lý…",
    giai_thich:
      "Giá thuê và các khoản ngoài giá được liệt kê rõ. Nên yêu cầu bảng phí dịch vụ hiện hành của tòa nhà để ước tính tổng chi phí hằng tháng trước khi ký.",
    ly_do: "",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 473"]),
    de_xuat_sua: "",
    tin_nhan: "",
  },
  {
    id: "p2-2",
    so_dieu: "ĐIỀU 2",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Buộc thanh toán trước theo kỳ 03 tháng/lần.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan: "Bên B thanh toán cho Bên A theo định kỳ 03 tháng/lần vào trước ngày 05 của kỳ thanh toán đầu tiên.",
    giai_thich:
      "Trả trước 3 tháng/lần (36 triệu đồng/kỳ, cộng 24 triệu tiền cọc là 60 triệu ngay khi ký) tạo gánh nặng dòng tiền lớn cho Bên B so với thông lệ trả theo tháng.",
    ly_do: "Bất lợi cho Bên B: số tiền phải ứng trước lớn, rủi ro càng cao khi kết hợp các điều khoản mất cọc/khấu trừ cọc phía sau.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 481"]),
    de_xuat_sua: "Chuyển sang thanh toán theo tháng, hoặc nếu giữ kỳ 3 tháng thì giảm tiền cọc còn 01 tháng để cân bằng dòng tiền.",
    tin_nhan:
      "Anh/chị ơi, Điều 2.2 yêu cầu trả trước 3 tháng một lần. Em đề nghị đổi sang thanh toán theo tháng, hoặc nếu giữ kỳ 3 tháng thì giảm tiền cọc xuống 1 tháng cho đỡ nặng dòng tiền ạ.",
  },
  {
    id: "p2-3",
    so_dieu: "ĐIỀU 2",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Đặt cọc 24.000.000đ (02 tháng tiền nhà) khi ký hợp đồng.",
    ket_luan: "PASS",
    muc_rui_ro: "thap",
    trich_dan: "Bên B giao cho Bên A một khoản tiền cọc là: 24.000.000 VNĐ (tương đương 02 tháng tiền nhà)…",
    giai_thich:
      "Mức cọc 2 tháng cao hơn thông lệ (1 tháng) nhưng vẫn phổ biến với căn hộ chung cư. Điểm cần chú ý thật sự nằm ở điều kiện khấu trừ cọc tại Điều 2.4.",
    ly_do: "",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 328"]),
    de_xuat_sua: "",
    tin_nhan: "",
  },
  {
    id: "p2-4",
    so_dieu: "ĐIỀU 2",
    dieu_khoan_noi_ve_ben: "ben_a",
    dieu_khoan_lam_gi: "Cho Bên A khấu trừ toàn bộ/một phần tiền cọc không cần chứng minh thiệt hại thực tế.",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "Bên A có quyền khấu trừ toàn bộ hoặc một phần tiền đặt cọc… mà không cần chứng minh thiệt hại thực tế: Căn hộ xuất hiện bất kỳ vết trầy xước, hao mòn tự nhiên nào…; hoặc Bên B chậm thanh toán tiền thuê nhà quá ba (03) ngày; hoặc Bên B vi phạm bất kỳ điều khoản nhỏ nào trong Nội quy tòa nhà.",
    giai_thich:
      "Theo BLDS 2015, bên thuê không chịu trách nhiệm về hao mòn tự nhiên do sử dụng bình thường. Điều khoản này cho phép trừ cọc với cả vết trầy xước/hao mòn tự nhiên, chậm trả chỉ 3 ngày hay vi phạm nội quy 'nhỏ' — lại không cần chứng minh thiệt hại — nên Bên B gần như chắc chắn bị trừ cọc khi trả nhà.",
    ly_do:
      "Bất lợi nghiêm trọng cho Bên B: căn cứ khấu trừ quá rộng, không tương xứng thiệt hại và không có nghĩa vụ chứng minh — trái nguyên tắc bồi thường theo thiệt hại thực tế.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 328", "BLDS 2015 Điều 479", "BLDS 2015 Điều 482"]),
    de_xuat_sua:
      "Chỉ khấu trừ khi có biên bản xác định hư hỏng do lỗi của Bên B (loại trừ hao mòn tự nhiên), mức khấu trừ tương ứng thiệt hại thực tế có chứng từ; bỏ căn cứ 'chậm 3 ngày' và 'vi phạm nội quy nhỏ'.",
    tin_nhan:
      "Chào anh/chị, Điều 2.4 hiện cho phép trừ cọc không cần chứng minh thiệt hại, kể cả hao mòn tự nhiên. Em đề nghị sửa: chỉ khấu trừ phần hư hỏng do lỗi của em, có biên bản và chứng từ kèm theo, loại trừ hao mòn tự nhiên. Như vậy mới công bằng ạ.",
  },
  {
    id: "p3-1",
    so_dieu: "ĐIỀU 3",
    dieu_khoan_noi_ve_ben: "ben_a",
    dieu_khoan_lam_gi: "Nghĩa vụ bàn giao căn hộ và trang thiết bị đúng thời hạn.",
    ket_luan: "PASS",
    muc_rui_ro: "thap",
    trich_dan: "Bàn giao căn hộ và các trang thiết bị đính kèm cho Bên B đúng thời hạn.",
    giai_thich:
      "Có nghĩa vụ bàn giao là điểm tốt, tuy nhiên nên bổ sung biên bản bàn giao ghi hiện trạng và chế tài nếu Bên A chậm bàn giao.",
    ly_do: "",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 476"]),
    de_xuat_sua: "Bổ sung: bàn giao kèm biên bản hiện trạng + danh mục thiết bị; nếu chậm bàn giao, Bên B được lùi ngày tính tiền thuê tương ứng.",
    tin_nhan: "",
  },
  {
    id: "p3-2",
    so_dieu: "ĐIỀU 3",
    dieu_khoan_noi_ve_ben: "ben_a",
    dieu_khoan_lam_gi: "Bên A được vào căn hộ bất kỳ lúc nào, không cần báo trước; Bên B phải mở cửa.",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "Bên A hoặc người đại diện của Bên A có quyền vào kiểm tra căn hộ vào bất kỳ lúc nào mà không cần phải thông báo trước cho Bên B. Bên B có nghĩa vụ phối hợp và mở cửa cho Bên A.",
    giai_thich:
      "Trong thời hạn thuê, Bên B có quyền sử dụng yên ổn và quyền bất khả xâm phạm về chỗ ở. Điều khoản trao quyền vào nhà 'bất kỳ lúc nào, không cần báo trước' và còn buộc Bên B mở cửa — không có giới hạn thời điểm, mục đích hay cơ chế đối trọng nào.",
    ly_do:
      "Bất lợi nghiêm trọng cho Bên B: xâm phạm quyền riêng tư và chỗ ở; Bên B có thể bị làm phiền bất kỳ lúc nào mà không có quyền từ chối.",
    can_cu: citationsFromLabels(["Hiến pháp 2013 Điều 22", "BLDS 2015 Điều 472"]),
    de_xuat_sua:
      "Bên A chỉ được vào căn hộ khi có sự đồng ý của Bên B và báo trước tối thiểu 24 giờ, trong khung giờ hợp lý; trừ trường hợp khẩn cấp (cháy nổ, rò rỉ) đe dọa an toàn thì được vào ngay nhưng phải thông báo lại.",
    tin_nhan:
      "Chào anh/chị, Điều 3.2.a cho phép vào căn hộ bất kỳ lúc nào không báo trước. Em đề nghị sửa thành: báo trước tối thiểu 24 giờ và có sự đồng ý của em, trừ trường hợp khẩn cấp. Cảm ơn anh/chị ạ.",
  },
  {
    id: "p3-3",
    so_dieu: "ĐIỀU 3",
    dieu_khoan_noi_ve_ben: "ben_a",
    dieu_khoan_lam_gi: "Bên A đơn phương chấm dứt chỉ cần báo trước 15 ngày, không phạt, không bồi thường.",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "Bên A có quyền đơn phương chấm dứt hợp đồng trước thời hạn… thông báo… trước mười lăm (15) ngày… mà không phải chịu bất kỳ khoản phạt vi phạm hợp đồng hay bồi thường nào khác.",
    giai_thich:
      "Luật Nhà ở 2023 chỉ cho bên cho thuê đơn phương chấm dứt trong các trường hợp luật định — 'cần lấy lại nhà để dùng cá nhân hoặc bán' không thuộc nhóm này. Điều khoản còn bất cân xứng nghiêm trọng: Bên A rời hợp đồng chỉ với 15 ngày báo trước và không mất gì, trong khi Bên B chấm dứt sớm thì mất toàn bộ cọc và bồi thường các tháng còn lại (Điều 5.2).",
    ly_do:
      "Bất lợi nghiêm trọng cho Bên B: có thể bị buộc rời nhà đột ngột giữa kỳ thuê mà không được bồi thường chi phí chuyển nhà, chênh lệch giá thuê nơi ở mới.",
    can_cu: citationsFromLabels(["Luật Nhà ở 2023 Điều 172", "BLDS 2015 Điều 428"]),
    de_xuat_sua:
      "Bên A chỉ được đơn phương chấm dứt trong các trường hợp luật định; nếu chấm dứt vì nhu cầu riêng phải báo trước tối thiểu 30 ngày, hoàn toàn bộ cọc và bồi thường một khoản tương đương 01–02 tháng tiền thuê cho Bên B.",
    tin_nhan:
      "Chào anh/chị, Điều 3.2.b cho phép Bên A lấy lại nhà chỉ báo trước 15 ngày mà không bồi thường. Em đề nghị: báo trước tối thiểu 30 ngày, hoàn đủ cọc và hỗ trợ em một khoản tương đương 1 tháng tiền thuê để chuyển nhà — tương xứng với mức phạt phía em phải chịu ở Điều 5.2 ạ.",
  },
  {
    id: "p4-1",
    so_dieu: "ĐIỀU 4",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Quyền sử dụng căn hộ cho mục đích sinh hoạt.",
    ket_luan: "PASS",
    muc_rui_ro: "khong",
    trich_dan: "Quyền của Bên B: Được sử dụng căn hộ cho mục đích sinh hoạt trong thời hạn thuê.",
    giai_thich: "Xác lập quyền sử dụng cơ bản của bên thuê — phù hợp quy định.",
    ly_do: "",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 472"]),
    de_xuat_sua: "",
    tin_nhan: "",
  },
  {
    id: "p4-2",
    so_dieu: "ĐIỀU 4",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Nghĩa vụ thanh toán tiền thuê và chi phí sử dụng đầy đủ, đúng hạn.",
    ket_luan: "PASS",
    muc_rui_ro: "khong",
    trich_dan: "Thanh toán tiền thuê nhà, phí quản lý, tiền điện, nước đầy đủ và đúng hạn.",
    giai_thich: "Nghĩa vụ thanh toán thông thường của bên thuê — hợp lý.",
    ly_do: "",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 481"]),
    de_xuat_sua: "",
    tin_nhan: "",
  },
  {
    id: "p4-3",
    so_dieu: "ĐIỀU 4",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Bên B chịu toàn bộ chi phí bảo dưỡng, sửa chữa, thay thế — kể cả hao mòn tự nhiên và lỗi hệ thống có sẵn.",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "Tự chịu trách nhiệm và chi trả toàn bộ chi phí đối với việc bảo dưỡng, sửa chữa, thay thế toàn bộ trang thiết bị… kể cả những hư hỏng do hao mòn tự nhiên hoặc lỗi hệ thống có sẵn của tòa nhà.",
    giai_thich:
      "Theo BLDS 2015, bên thuê chỉ phải bảo dưỡng, sửa chữa nhỏ và không chịu trách nhiệm về hao mòn tự nhiên; bên cho thuê phải sửa các hư hỏng, khuyết tật của tài sản. Điều khoản này đảo ngược hoàn toàn: đẩy cả chi phí thay thế thiết bị, lỗi hệ thống có sẵn của tòa nhà sang Bên B — chi phí có thể rất lớn (điều hòa, hệ thống điện nước).",
    ly_do:
      "Bất lợi nghiêm trọng cho Bên B: gánh chi phí sửa chữa/thay thế không phát sinh từ lỗi của mình, vượt xa nghĩa vụ 'sửa chữa nhỏ' theo luật.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 477", "BLDS 2015 Điều 479"]),
    de_xuat_sua:
      "Bên B chỉ chịu chi phí sửa chữa nhỏ và hư hỏng do lỗi của mình; hao mòn tự nhiên, lỗi kết cấu/hệ thống có sẵn thuộc trách nhiệm Bên A. Hư hỏng lớn cần lập biên bản xác định nguyên nhân và báo giá trước khi sửa.",
    tin_nhan:
      "Anh/chị ơi, Điều 4.2.b đang yêu cầu em chịu cả hư hỏng do hao mòn tự nhiên và lỗi hệ thống có sẵn. Em đề nghị sửa lại theo đúng luật: em chịu sửa chữa nhỏ và hư hỏng do lỗi của em, còn hao mòn tự nhiên và lỗi có sẵn thuộc trách nhiệm chủ nhà ạ.",
  },
  {
    id: "p4-4",
    so_dieu: "ĐIỀU 4",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Buộc Bên B tự động chấp nhận mọi khoản phí tăng/phí mới, không được yêu cầu giảm giá hay chấm dứt.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan:
      "…Bên B có trách nhiệm tự động chấp nhận và chi trả toàn bộ các khoản tăng này mà không được lấy đó làm lý do để yêu cầu giảm giá thuê hoặc chấm dứt hợp đồng.",
    giai_thich:
      "Bên B phải 'tự động chấp nhận' mọi khoản phí tăng và phí mới không giới hạn mức trần, đồng thời bị tước quyền thương lượng lại hoặc chấm dứt hợp đồng — toàn bộ rủi ro tăng chi phí bị đẩy về một phía.",
    ly_do:
      "Bất lợi cho Bên B: tổng chi phí thuê thực tế có thể tăng đáng kể ngoài tầm kiểm soát mà không có biện pháp đối ứng nào.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 420"]),
    de_xuat_sua:
      "Bên B chỉ chi trả các khoản phí do cơ quan/đơn vị có thẩm quyền công bố hợp lệ, có chứng từ; nếu tổng chi phí tăng vượt một ngưỡng thỏa thuận (ví dụ 10%/năm), hai bên đàm phán lại hoặc Bên B được quyền chấm dứt không bị phạt.",
    tin_nhan:
      "Chào anh/chị, về Điều 4.2.c em đề nghị thêm ngưỡng: nếu các loại phí tăng làm tổng chi phí vượt quá 10%/năm thì hai bên thương lượng lại, và em được chấm dứt không bị phạt nếu không đạt thỏa thuận ạ.",
  },
  {
    id: "p4-5",
    so_dieu: "ĐIỀU 4",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Buộc tuân thủ tuyệt đối mọi thay đổi nội quy tòa nhà trong tương lai.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan: "Chấp nhận và tuân thủ tuyệt đối mọi thay đổi trong Nội quy của tòa nhà chung cư do Ban quản lý ban hành tại từng thời điểm.",
    giai_thich:
      "Bên B cam kết tuân thủ 'tuyệt đối' những quy định chưa tồn tại ở thời điểm ký. Kết hợp với Điều 2.4 (vi phạm 'điều khoản nhỏ' trong nội quy cũng bị trừ cọc), điều khoản này tạo rủi ro mất cọc từ những thay đổi Bên B không kiểm soát được.",
    ly_do:
      "Bất lợi cho Bên B: bị ràng buộc tự động bởi nghĩa vụ mới phát sinh đơn phương, không có quyền phản đối hay chấm dứt khi thay đổi bất hợp lý.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 420"]),
    de_xuat_sua:
      "Chỉ cam kết tuân thủ nội quy hiện hành đính kèm hợp đồng và các thay đổi hợp lệ được thông báo trước tối thiểu 15 ngày, không trái pháp luật và không làm phát sinh nghĩa vụ tài chính bất hợp lý; thay đổi ảnh hưởng lớn thì Bên B được đề nghị thỏa thuận lại.",
    tin_nhan:
      "Anh/chị ơi, Điều 4.2.d em đề nghị sửa: em tuân thủ nội quy hiện hành đính kèm hợp đồng; nếu nội quy thay đổi thì cần thông báo trước 15 ngày và không tạo thêm nghĩa vụ bất hợp lý cho người thuê ạ.",
  },
  {
    id: "p5-1",
    so_dieu: "ĐIỀU 5",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Phạt chậm trả 5%/ngày trên số tiền chậm thanh toán.",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "Bên B phải chịu khoản phạt chậm trả tương đương 5% trên tổng số tiền chậm thanh toán cho mỗi ngày chậm trễ.",
    giai_thich:
      "Mức 5%/ngày tương đương khoảng 150%/tháng — vượt rất xa trần lãi suất 20%/năm mà BLDS 2015 cho phép đối với tiền chậm trả. Chậm một kỳ 36 triệu đồng chỉ 10 ngày đã bị phạt 18 triệu đồng. Điều khoản cũng chỉ phạt một chiều với Bên B, không có chế tài tương ứng nếu Bên A vi phạm.",
    ly_do:
      "Bất lợi nghiêm trọng cho Bên B: mức phạt vượt trần luật định nhiều lần và bất cân xứng một chiều.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 357", "BLDS 2015 Điều 468"]),
    de_xuat_sua:
      "Thay bằng lãi chậm trả theo mức luật cho phép (không quá 20%/năm trên số tiền chậm), có thời gian ân hạn 5–7 ngày, và bổ sung chế tài tương ứng khi Bên A vi phạm nghĩa vụ.",
    tin_nhan:
      "Chào anh/chị, mức phạt 5%/ngày ở Điều 5.1 cao hơn nhiều lần trần lãi theo BLDS. Em đề nghị đổi thành lãi chậm trả tối đa 20%/năm theo luật và cho em 5 ngày ân hạn. Mong anh/chị hỗ trợ ạ.",
  },
  {
    id: "p5-2",
    so_dieu: "ĐIỀU 5",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Bên B chấm dứt sớm: mất toàn bộ cọc VÀ bồi thường tiền thuê toàn bộ các tháng còn lại.",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "…Bên B sẽ mất toàn bộ số tiền đặt cọc và phải bồi thường cho Bên A số tiền tương đương với tổng số tiền thuê nhà của các tháng còn lại của hợp đồng.",
    giai_thich:
      "Đây là chế tài kép: vừa mất 24 triệu tiền cọc, vừa bồi thường toàn bộ tiền thuê còn lại (chấm dứt ở tháng thứ 3 có thể phải trả thêm ~108 triệu). Điều khoản không loại trừ trường hợp Bên B buộc phải chấm dứt do lỗi của Bên A hoặc bất khả kháng, và bất cân xứng hoàn toàn với quyền chấm dứt gần như tự do của Bên A tại Điều 3.2.b.",
    ly_do:
      "Bất lợi nghiêm trọng cho Bên B: mức bồi thường vượt xa thiệt hại thực tế của Bên A (căn hộ có thể cho thuê lại ngay), không có ngoại lệ nào cho Bên B.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 328", "BLDS 2015 Điều 428", "Luật Nhà ở 2023 Điều 172"]),
    de_xuat_sua:
      "Giới hạn chế tài ở mức mất tiền cọc (hoặc bồi thường tối đa 01–02 tháng tiền thuê); loại trừ mất cọc khi chấm dứt do lỗi của Bên A hoặc bất khả kháng; Bên B báo trước 30 ngày.",
    tin_nhan:
      "Chào anh/chị, Điều 5.2 hiện phạt kép: mất cọc và đền toàn bộ các tháng còn lại. Em đề nghị: nếu em báo trước 30 ngày thì chỉ mất tiền cọc, và không bị phạt nếu chấm dứt do lỗi của Bên A hoặc bất khả kháng ạ.",
  },
  {
    id: "p5-3",
    so_dieu: "ĐIỀU 5",
    dieu_khoan_noi_ve_ben: "ben_a",
    dieu_khoan_lam_gi: "Bất khả kháng: hợp đồng chấm dứt ngay, Bên A giữ luôn tiền cọc, miễn mọi bồi thường.",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "…hợp đồng này sẽ lập tức chấm dứt. Bên A được miễn trừ toàn bộ nghĩa vụ hoàn trả tiền cọc hoặc bồi thường bất kỳ thiệt hại, chi phí di dời nào cho Bên B.",
    giai_thich:
      "Bất khả kháng là sự kiện không do lỗi bên nào — việc miễn trách nhiệm bồi thường là hợp lý, nhưng miễn cả nghĩa vụ HOÀN TRẢ TIỀN CỌC là vô lý: tiền cọc là tài sản bảo đảm của Bên B, không phải khoản Bên A đương nhiên được hưởng khi không ai vi phạm. Bên B vừa mất chỗ ở đột ngột vừa mất 24 triệu tiền cọc và tiền thuê đã trả trước.",
    ly_do:
      "Bất lợi nghiêm trọng cho Bên B: mất cọc và tiền thuê trả trước dù không bên nào có lỗi — toàn bộ rủi ro khách quan bị đẩy về phía Bên B.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 156", "BLDS 2015 Điều 351", "BLDS 2015 Điều 328"]),
    de_xuat_sua:
      "Khi chấm dứt do bất khả kháng: Bên A hoàn trả toàn bộ tiền cọc và phần tiền thuê đã trả cho thời gian chưa sử dụng trong 07 ngày; hai bên không phải bồi thường thêm cho nhau.",
    tin_nhan:
      "Chào anh/chị, Điều 5.3 đang cho phép giữ lại tiền cọc khi chấm dứt vì bất khả kháng. Vì đây là rủi ro không do lỗi bên nào, em đề nghị: hoàn lại tiền cọc và tiền thuê đã trả cho thời gian chưa ở, còn hai bên không bồi thường gì thêm ạ.",
  },
  {
    id: "p6-1",
    so_dieu: "ĐIỀU 6",
    dieu_khoan_noi_ve_ben: "ca_hai",
    dieu_khoan_lam_gi: "Hiệu lực hợp đồng và điều kiện sửa đổi bằng văn bản.",
    ket_luan: "PASS",
    muc_rui_ro: "khong",
    trich_dan: "Hợp đồng này có hiệu lực kể từ ngày ký. Mọi sửa đổi, bổ sung hợp đồng phải được lập thành văn bản…",
    giai_thich: "Quy định hiệu lực và hình thức sửa đổi chuẩn mực, bảo vệ cả hai bên.",
    ly_do: "",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 401"]),
    de_xuat_sua: "",
    tin_nhan: "",
  },
  {
    id: "p6-2",
    so_dieu: "ĐIỀU 6",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Bên B trả vô điều kiện toàn bộ án phí và chi phí luật sư của Bên A khi có tranh chấp.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan: "Toàn bộ án phí và chi phí thuê luật sư của Bên A sẽ do Bên B chi trả vô điều kiện.",
    giai_thich:
      "Theo pháp luật tố tụng dân sự, án phí do bên thua kiện chịu theo phán quyết của Tòa án. Điều khoản buộc Bên B trả 'vô điều kiện' — tức kể cả khi Bên B thắng kiện hoặc Bên A là bên vi phạm — làm Bên B e ngại khởi kiện ngay cả khi quyền lợi bị xâm phạm.",
    ly_do:
      "Bất lợi cho Bên B: gánh chi phí tố tụng của đối phương trong mọi trường hợp, vô hiệu hóa trên thực tế quyền khởi kiện của mình.",
    can_cu: citationsFromLabels(["Bộ luật TTDS 2015 Điều 147"]),
    de_xuat_sua:
      "Sửa thành: án phí và chi phí hợp lý do bên thua kiện chịu theo phán quyết của Tòa án; bỏ cụm 'vô điều kiện'.",
    tin_nhan:
      "Chào anh/chị, Điều 6.2 đang buộc em trả án phí và phí luật sư của Bên A trong mọi trường hợp. Em đề nghị sửa theo nguyên tắc chung: bên thua kiện chịu án phí theo quyết định của Tòa ạ.",
  },
  {
    id: "p6-3",
    so_dieu: "ĐIỀU 6",
    dieu_khoan_noi_ve_ben: "ca_hai",
    dieu_khoan_lam_gi: "Số bản hợp đồng và giá trị pháp lý.",
    ket_luan: "PASS",
    muc_rui_ro: "khong",
    trich_dan: "Hợp đồng được lập thành hai (02) bản có giá trị pháp lý như nhau…",
    giai_thich: "Điều khoản hình thức thông thường, mỗi bên giữ một bản — hợp lý.",
    ly_do: "",
    can_cu: [],
    de_xuat_sua: "",
    tin_nhan: "",
  },
];

const phu_luc_thiet_bi: Device[] = [
  { ten: "Hệ thống sàn gỗ", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Hệ thống tủ bếp trên + dưới", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Bếp từ + Máy hút mùi", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Rèm", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Hệ thống thiết bị vệ sinh bàn giao CĐT Vinhomes", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Thẻ ra vào", dvt: "Chiếc", so_luong: 2, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Điều hoà + điều khiển", dvt: "Chiếc", so_luong: 2, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Tivi", dvt: "Chiếc", so_luong: 1, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Giàn phơi", dvt: "Chiếc", so_luong: 1, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Sofa + bàn trà", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Máy giặt", dvt: "Chiếc", so_luong: 1, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Tủ lạnh", dvt: "Chiếc", so_luong: 1, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Tủ quần áo", dvt: "Bộ", so_luong: 2, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Bàn ăn + ghế ăn", dvt: "Bộ", so_luong: 1, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
  { ten: "Giường + đệm", dvt: "Bộ", so_luong: 2, tinh_trang: "Sử dụng tốt", dung_thuc_te: false },
];

/** Kết quả đối chiếu điều khoản bắt buộc (từ /checklist/evaluate-coverage, đã rà soát). */
const checklistCoverage: ChecklistCoverageItem[] = [
  {
    id: "A-D3", ten: "Báo trước & được đồng ý khi vào căn hộ", thuocBen: "ben_a", batBuoc: true,
    trangThai: "thieu", trichDan: "",
    ghiChu: "Điều 3.2.a còn quy định ngược lại: Bên A được vào căn hộ bất kỳ lúc nào mà không cần thông báo trước.",
    goiYBoSung: "Bên A phải báo trước cho Bên B ít nhất 24 giờ và được Bên B đồng ý trước khi vào căn hộ, trừ trường hợp khẩn cấp.",
    viTriDeXuat: "Điều 3 — Quyền và nghĩa vụ của Bên cho thuê (Bên A)",
  },
  {
    id: "A-D4", ten: "Bảo trì, sửa chữa lớn & lỗi kết cấu, hao mòn tự nhiên", thuocBen: "ben_a", batBuoc: true,
    trangThai: "thieu", trichDan: "",
    ghiChu: "Hợp đồng không quy định nghĩa vụ bảo trì/sửa chữa lớn thuộc Bên A; Điều 4.2.b lại đẩy toàn bộ chi phí, kể cả hao mòn tự nhiên, sang Bên B.",
    goiYBoSung: "Bên A chịu trách nhiệm bảo trì, sửa chữa lớn và khắc phục hư hỏng do lỗi kết cấu, hệ thống kỹ thuật của căn hộ; hao mòn tự nhiên thuộc trách nhiệm của Bên A.",
    viTriDeXuat: "Điều 3 — Quyền và nghĩa vụ của Bên cho thuê (Bên A)",
  },
  {
    id: "A-D6", ten: "Báo trước hợp lý khi chấm dứt hợp đồng", thuocBen: "ben_a", batBuoc: true,
    trangThai: "thieu", trichDan: "",
    ghiChu: "Điều 3.2.b chỉ yêu cầu báo trước 15 ngày cho nhu cầu cá nhân của Bên A — chưa phải thời hạn báo trước hợp lý và không kèm bồi thường.",
    goiYBoSung: "Mọi trường hợp Bên A chấm dứt trước hạn (trừ bất khả kháng) phải thông báo bằng văn bản trước tối thiểu 30 ngày để Bên B kịp sắp xếp chỗ ở.",
    viTriDeXuat: "Điều 3 — Quyền và nghĩa vụ của Bên cho thuê (Bên A)",
  },
  {
    id: "B-Q1", ten: "Được sử dụng căn hộ ổn định, riêng tư trong thời hạn thuê", thuocBen: "ben_b", batBuoc: true,
    trangThai: "co", trichDan: "Điều 4.1: Được sử dụng căn hộ cho mục đích sinh hoạt trong thời hạn thuê.",
    ghiChu: "", goiYBoSung: "", viTriDeXuat: "",
  },
  {
    id: "B-Q2", ten: "Được hoàn cọc đúng hạn, chỉ khấu trừ có căn cứ", thuocBen: "ben_b", batBuoc: true,
    trangThai: "thieu", trichDan: "",
    ghiChu: "Điều 2.4 có cam kết hoàn cọc trong 30 ngày nhưng cho phép khấu trừ rất rộng và 'không cần chứng minh thiệt hại thực tế'.",
    goiYBoSung: "Việc khấu trừ tiền đặt cọc chỉ thực hiện khi có căn cứ chứng minh thiệt hại thực tế do lỗi của Bên B, mức khấu trừ tương ứng thiệt hại; loại trừ hao mòn tự nhiên.",
    viTriDeXuat: "Điều 2 — Giá thuê, đặt cọc và phương thức thanh toán",
  },
  {
    id: "B-Q3", ten: "Được hoàn tiền thuê đã trả cho thời gian chưa sử dụng khi chấm dứt hợp lệ", thuocBen: "ben_b", batBuoc: true,
    trangThai: "thieu", trichDan: "",
    ghiChu: "Hợp đồng không quy định hoàn/khấu trừ tiền thuê đã trả trước (kỳ 3 tháng) cho thời gian chưa sử dụng khi chấm dứt hợp lệ.",
    goiYBoSung: "Khi hợp đồng chấm dứt hợp lệ trước thời hạn, Bên A hoàn trả Bên B phần tiền thuê đã thanh toán tương ứng với thời gian chưa sử dụng.",
    viTriDeXuat: "Điều 5 — Phạt vi phạm và chấm dứt hợp đồng",
  },
  {
    id: "B-Q4", ten: "Không bị phạt khi chấm dứt do lỗi Bên A hoặc bất khả kháng", thuocBen: "ben_b", batBuoc: true,
    trangThai: "thieu", trichDan: "",
    ghiChu: "Điều 5.2 phạt Bên B trong mọi trường hợp chấm dứt sớm; Điều 5.3 còn cho Bên A giữ cọc khi bất khả kháng.",
    goiYBoSung: "Bên B không bị mất cọc, không bị phạt nếu chấm dứt hợp đồng do lỗi của Bên A hoặc do sự kiện bất khả kháng; tiền cọc và tiền thuê trả trước được hoàn lại tương ứng.",
    viTriDeXuat: "Điều 5 — Phạt vi phạm và chấm dứt hợp đồng",
  },
];

/* ============================================================
   Template "mua-ban" — Hợp đồng mua bán căn hộ Sky Skyline
   (HĐ 89/HĐMB-2026, nhiều điều khoản bất lợi cho bên mua)
   ============================================================ */

const MUA_BAN_FILE_NAME = "hop-dong-mua-ban-can-ho.docx";

const thong_tin_mb: ContractInfo = {
  loai: "Mua bán căn hộ chung cư",
  so_hd: "89/HĐMB-2026",
  ngay_ky: "04/07/2026",
  thoi_han: "—",
  gia_thue: "4.500.000.000 đ (chưa gồm thuế, phí chuyển nhượng)",
  dat_coc: "1.500.000.000 đ (đợt 1 — gồm đặt cọc và thanh toán trước)",
  dia_chi:
    "Căn hộ 2408, Tầng 24, Tháp B, Sky Skyline, Số 88 Láng Hạ, phường Láng Hạ, quận Đống Đa, Hà Nội",
  dien_tich: "75.5 m² (thông thủy, theo giấy chứng nhận)",
};

const ben_a_mb: Party = {
  nhan: "Bên A — Bên bán",
  ho_ten: "Trần Quang V***",
  cccd: "001•••••1234",
  ngay_cap: "20/11/2021",
  noi_cap: "Cục CS QLHC về TTXH",
  sdt: "090• ••• 666",
  dia_chi: "••• phường Láng Hạ, Q. Đống Đa, Hà Nội",
  truong_thieu: [],
};

const ben_b_mb: Party = {
  nhan: "Bên B — Bên mua (được bảo vệ)",
  ho_ten: "Lê Hoàng N***",
  cccd: "024•••••5678",
  ngay_cap: "05/03/2023",
  noi_cap: "Cục CS QLHC về TTXH",
  sdt: "097• ••• 222",
  dia_chi: "••• thị trấn Bến Lức, H. Bến Lức, Long An",
  truong_thieu: [],
};

const contract_mb: Article[] = [
  {
    so_dieu: "ĐIỀU 1",
    tieu_de: "ĐỐI TƯỢNG VÀ THÔNG TIN CĂN HỘ MUA BÁN",
    paragraphs: [
      {
        id: "p1-1",
        num: "1.1",
        text: "Bên A đồng ý bán và Bên B đồng ý mua căn hộ số: 2408, Tầng: 24, Tòa nhà: Tháp B thuộc Dự án chung cư: Sky Skyline tại địa chỉ: Số 88 Láng Hạ, phường Láng Hạ, quận Đống Đa, thành phố Hà Nội.",
      },
      {
        id: "p1-2",
        num: "1.2",
        text: "Diện tích sử dụng căn hộ (diện tích thông thủy) theo giấy chứng nhận quyền sở hữu là: 75.5 m². Bên B xác nhận đã đo đạc, kiểm tra thực tế căn hộ tại thời điểm ký kết hợp đồng này và cam kết chấp nhận mọi sai số diện tích phát sinh thực tế sau này (nếu có) mà không yêu cầu Bên A bồi hoàn hoặc điều chỉnh lại tổng giá trị hợp đồng.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 2",
    tieu_de: "GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN",
    paragraphs: [
      {
        id: "p2-1",
        num: "2.1",
        text: "Tổng giá trị mua bán căn hộ là: 4.500.000.000 VNĐ (Bằng chữ: Bốn tỷ năm trăm triệu đồng chẵn). Giá bán này không bao gồm lệ phí trước bạ, phí công chứng hợp đồng, phí cấp Giấy chứng nhận quyền sở hữu, quỹ bảo trì 2%, phí dịch vụ quản lý vận hành tòa nhà và bất kỳ khoản thuế/phí phát sinh nào khác liên quan đến việc chuyển nhượng.",
      },
      {
        id: "p2-2",
        num: "2.2",
        text: "Phương thức thanh toán: Bên B thanh toán bằng tiền mặt hoặc chuyển khoản theo các đợt như sau: Đợt 1: Bên B thanh toán số tiền đặt cọc và thanh toán trước là 1.500.000.000 VNĐ ngay sau khi ký hợp đồng này. Đợt 2: Bên B thanh toán tiếp số tiền 2.500.000.000 VNĐ trong vòng mười lăm (15) ngày kể từ ngày ký hợp đồng. Đợt 3: Bên B thanh toán số tiền còn lại là 500.000.000 VNĐ ngay sau khi hai bên ký văn bản bàn giao thực tế căn hộ.",
      },
      {
        id: "p2-3",
        num: "2.3",
        text: "Quy định về thuế thu nhập cá nhân: Do hai bên thỏa thuận giá bán trên là giá thu ròng về cho Bên A, nên toàn bộ tiền thuế thu nhập cá nhân từ việc chuyển nhượng bất động sản (thông thường do bên bán chịu theo luật định) và các loại phí hành chính khác phát sinh sẽ do Bên B chịu trách nhiệm kê khai và chi trả thay cho Bên A vô điều kiện trước khi thực hiện thủ tục sang tên.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 3",
    tieu_de: "BÀN GIAO CĂN HỘ VÀ TRÁCH NHIỆM BẢO HÀNH",
    paragraphs: [
      {
        id: "p3-1",
        num: "3.1",
        text: "Thời hạn bàn giao nhà: Bên A bàn giao căn hộ cho Bên B trong vòng bảy (07) ngày kể từ ngày Bên B hoàn thành toàn bộ nghĩa vụ thanh toán Đợt 2 quy định tại Khoản 2.2.",
      },
      {
        id: "p3-2",
        num: "3.2",
        text: "Kể từ thời điểm ký biên bản bàn giao căn hộ hoặc kể từ ngày Bên B nhận chìa khóa căn hộ (tùy thời điểm nào đến trước), Bên B chính thức chịu mọi rủi ro về hư hỏng, tổn thất tài sản, cháy nổ liên quan đến căn hộ. Bên A hoàn toàn miễn trừ trách nhiệm bảo hành đối với toàn bộ kết cấu xây dựng ngầm, hệ thống điện nước âm tường, thiết bị nội thất gắn liền và các lỗi kỹ thuật phát sinh của căn hộ. Mọi chi phí sửa chữa, khắc phục hỏng hóc sau bàn giao sẽ do Bên B tự chi trả.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 4",
    tieu_de: "THỦ TỤC CẤP GIẤY CHỨNG NHẬN QUYỀN SỞ HỮU",
    paragraphs: [
      {
        id: "p4-1",
        num: "4.1",
        text: "Bên A có trách nhiệm cung cấp đầy đủ các giấy tờ pháp lý hiện có thuộc quyền sở hữu của Bên A cho Bên B để Bên B tự thực hiện thủ tục đăng ký biến động sang tên tại cơ quan nhà nước có thẩm quyền.",
      },
      {
        id: "p4-2",
        num: "4.2",
        text: "Do căn hộ thuộc dự án đang trong quá trình giải quyết các thủ tục pháp lý chung của Chủ đầu tư, Bên A không cam kết cụ thể về thời gian cơ quan nhà nước cấp Giấy chứng nhận quyền sở hữu mới đứng tên Bên B. Bên B cam kết không khiếu nại, không khởi kiện và không có quyền đơn phương hủy bỏ hợp đồng hoặc yêu cầu Bên A bồi thường vì lý do chậm trễ cấp Sổ hồng từ phía cơ quan chức năng hoặc Chủ đầu tư dự án.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 5",
    tieu_de: "PHẠT VI PHẠM VÀ ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG",
    paragraphs: [
      {
        id: "p5-1",
        num: "5.1",
        text: "Nếu Bên B chậm thanh toán bất kỳ đợt tiền nào theo quy định tại Khoản 2.2 quá ba (03) ngày, Bên A có quyền đơn phương chấm dứt hợp đồng ngay lập tức mà không cần thông báo trước. Trong trường hợp này, Bên A được quyền tịch thu toàn bộ số tiền Bên B đã thanh toán ở các đợt trước đó dưới danh nghĩa tiền phạt vi phạm và bồi thường thiệt hại mà không phải hoàn trả lại bất kỳ khoản nào cho Bên B.",
      },
      {
        id: "p5-2",
        num: "5.2",
        text: "Trong trường hợp Bên B tự ý chấm dứt hợp đồng trước khi thực hiện xong thủ tục chuyển nhượng mà không do lỗi trực tiếp từ Bên A, Bên B sẽ bị phạt số tiền tương đương 30% tổng giá trị hợp đồng và phải hoàn trả căn hộ lại cho Bên A trong tình trạng nguyên vẹn như lúc nhận.",
      },
      {
        id: "p5-3",
        num: "5.3",
        text: "Ngược lại, nếu Bên A chậm trễ bàn giao nhà hoặc giấy tờ quá chín mươi (90) ngày so với cam kết, Bên A chỉ phải chịu mức phạt cố định tối đa bằng 2% trên tổng số tiền đợt 1 mà không phải gánh chịu thêm bất kỳ trách nhiệm bồi thường thiệt hại thực tế nào khác cho Bên B.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 6",
    tieu_de: "ĐIỀU KHOẢN CHUNG VÀ GIẢI QUYẾT TRANH CHẤP",
    paragraphs: [
      {
        id: "p6-1",
        num: "6.1",
        text: "Hợp đồng này có hiệu lực kể từ ngày hai bên ký kết và không thể hủy bỏ trừ trường hợp quy định tại Khoản 5.1.",
      },
      {
        id: "p6-2",
        num: "6.2",
        text: "Mọi tranh chấp phát sinh sẽ được giải quyết trước tiên bằng thương lượng. Nếu không đạt được sự thống nhất, vụ việc sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền tại nơi có bất động sản. Toàn bộ các khoản chi phí liên quan đến quá trình tố tụng, án phí, chi phí định giá và chi phí thuê luật sư bảo vệ quyền lợi của Bên A tại tòa án sẽ do Bên B chi trả toàn bộ và vô điều kiện trong mọi trường hợp.",
      },
      {
        id: "p6-3",
        num: "6.3",
        text: "Hợp đồng này được lập thành hai (02) bản có giá trị pháp lý như nhau, mỗi bên giữ một (01) bản để thực hiện.",
      },
    ],
  },
];

const phan_tich_mb: Analysis[] = [
  {
    id: "p1-1",
    so_dieu: "ĐIỀU 1",
    dieu_khoan_noi_ve_ben: "ca_hai",
    dieu_khoan_lam_gi: "Xác định đối tượng mua bán: căn hộ 2408, Tháp B, Sky Skyline.",
    ket_luan: "PASS",
    muc_rui_ro: "khong",
    trich_dan: "Bên A đồng ý bán và Bên B đồng ý mua căn hộ số: 2408, Tầng: 24, Tòa nhà: Tháp B…",
    giai_thich:
      "Mô tả căn hộ rõ ràng, đầy đủ địa chỉ. Lưu ý: hợp đồng không nêu số giấy chứng nhận quyền sở hữu và tình trạng thế chấp/kê biên — nên yêu cầu xem sổ và xác minh trước khi ký.",
    ly_do: "",
    can_cu: citationsFromLabels(["Luật Nhà ở 2023 Điều 163"]),
    de_xuat_sua: "",
    tin_nhan: "",
  },
  {
    id: "p1-2",
    so_dieu: "ĐIỀU 1",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Bên B chấp nhận trước mọi sai số diện tích, từ bỏ quyền yêu cầu điều chỉnh giá.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan:
      "…cam kết chấp nhận mọi sai số diện tích phát sinh thực tế sau này (nếu có) mà không yêu cầu Bên A bồi hoàn hoặc điều chỉnh lại tổng giá trị hợp đồng.",
    giai_thich:
      "Giá 4,5 tỷ được tính trên 75.5 m² — mỗi m² tương đương gần 60 triệu đồng. Điều khoản buộc Bên B chấp nhận 'mọi sai số' không giới hạn ngưỡng, tức nếu diện tích thực hụt vài m² thì Bên B vẫn phải trả đủ giá mà không được điều chỉnh.",
    ly_do:
      "Bất lợi cho Bên B: chuyển toàn bộ rủi ro chênh lệch diện tích sang bên mua, không có ngưỡng sai số cho phép hay cơ chế đối soát bằng đo đạc độc lập.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 433"]),
    de_xuat_sua:
      "Chỉ chấp nhận sai số trong ngưỡng thỏa thuận (ví dụ ±0,5%); vượt ngưỡng thì điều chỉnh giá trị hợp đồng tương ứng phần chênh lệch, căn cứ biên bản đo đạc khi bàn giao.",
    tin_nhan:
      "Chào anh/chị, Điều 1.2 em đề nghị thêm ngưỡng sai số diện tích (ví dụ ±0,5%): trong ngưỡng thì giữ nguyên giá, vượt ngưỡng thì hai bên điều chỉnh giá theo phần chênh lệch dựa trên đo đạc thực tế khi bàn giao ạ.",
  },
  {
    id: "p2-1",
    so_dieu: "ĐIỀU 2",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Giá bán 4,5 tỷ chưa gồm mọi loại thuế phí — kể cả các khoản thường thuộc bên bán.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan:
      "Giá bán này không bao gồm lệ phí trước bạ, phí công chứng hợp đồng, phí cấp Giấy chứng nhận quyền sở hữu, quỹ bảo trì 2%, phí dịch vụ quản lý vận hành tòa nhà và bất kỳ khoản thuế/phí phát sinh nào khác liên quan đến việc chuyển nhượng.",
    giai_thich:
      "Theo BLDS 2015, chi phí liên quan đến việc chuyển quyền sở hữu mặc định do bên bán chịu trừ khi thỏa thuận khác. Điều khoản này đẩy toàn bộ sang Bên B, gồm cả 'quỹ bảo trì 2%' (với căn hộ mua lại, khoản này thường đã được nộp từ lần mua đầu) và cụm mở 'bất kỳ khoản thuế/phí phát sinh nào khác' không giới hạn.",
    ly_do:
      "Bất lợi cho Bên B: tổng chi phí thực tế vượt đáng kể giá niêm yết (trước bạ ~0,5%, quỹ bảo trì 2% ≈ 90 triệu nếu bị thu lại), và khoản 'phát sinh khác' là điều khoản mở không thể lường trước.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 442"]),
    de_xuat_sua:
      "Liệt kê rõ từng khoản phí và bên chịu theo đúng quy định; xác minh quỹ bảo trì 2% đã nộp chưa; bỏ cụm 'bất kỳ khoản thuế/phí phát sinh nào khác'.",
    tin_nhan:
      "Chào anh/chị, Điều 2.1 em đề nghị liệt kê cụ thể từng khoản phí và bên chịu theo quy định, xác nhận quỹ bảo trì 2% đã nộp từ khi mua CĐT, và bỏ cụm 'phí phát sinh khác' vì quá mở ạ.",
  },
  {
    id: "p2-2",
    so_dieu: "ĐIỀU 2",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Buộc thanh toán 4 tỷ (89%) trong 15 ngày đầu — trước bàn giao, trước sang tên.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan:
      "Đợt 1: Bên B thanh toán số tiền đặt cọc và thanh toán trước là 1.500.000.000 VNĐ ngay sau khi ký hợp đồng này. Đợt 2: Bên B thanh toán tiếp số tiền 2.500.000.000 VNĐ trong vòng mười lăm (15) ngày kể từ ngày ký hợp đồng.",
    giai_thich:
      "Bên B phải trả 4 tỷ (gần 89% giá trị) chỉ trong 15 ngày sau ký — trước khi nhận bàn giao và trước khi hoàn tất công chứng/sang tên; chỉ giữ lại 500 triệu đến lúc bàn giao và không giữ lại đồng nào chờ ra sổ. Tiến độ thanh toán không gắn với bất kỳ mốc pháp lý nào bảo vệ bên mua.",
    ly_do:
      "Bất lợi cho Bên B: dồn gần hết tiền khi chưa nắm được tài sản lẫn giấy tờ; nếu thủ tục pháp lý trục trặc (xem Điều 4.2), Bên B đã trả gần đủ tiền mà không có cơ chế thu hồi.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 440"]),
    de_xuat_sua:
      "Gắn từng đợt thanh toán với mốc pháp lý: phần lớn thanh toán khi công chứng hợp đồng, và giữ lại tối thiểu 5–10% giá trị cho đến khi Bên B nhận Giấy chứng nhận đứng tên mình.",
    tin_nhan:
      "Chào anh/chị, Điều 2.2 em đề nghị cơ cấu lại: thanh toán phần lớn khi công chứng, và giữ lại 5–10% giá trị đến khi em nhận sổ đứng tên mình — đây là thông lệ phổ biến để hai bên cùng yên tâm ạ.",
  },
  {
    id: "p2-3",
    so_dieu: "ĐIỀU 2",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Đẩy thuế TNCN của bên bán và mọi phí hành chính sang Bên B 'vô điều kiện'.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan:
      "…toàn bộ tiền thuế thu nhập cá nhân từ việc chuyển nhượng bất động sản (thông thường do bên bán chịu theo luật định) và các loại phí hành chính khác phát sinh sẽ do Bên B chịu trách nhiệm kê khai và chi trả thay cho Bên A vô điều kiện trước khi thực hiện thủ tục sang tên.",
    giai_thich:
      "Thuế TNCN từ chuyển nhượng bất động sản (2% giá chuyển nhượng ≈ 90 triệu đồng) theo luật là nghĩa vụ của bên bán — chính điều khoản cũng thừa nhận điều này. Cách viết 'giá thu ròng' hợp thức hóa việc đẩy nghĩa vụ sang Bên B, kèm cụm mở 'các loại phí hành chính khác phát sinh' và chữ 'vô điều kiện'.",
    ly_do:
      "Bất lợi cho Bên B: gánh thêm ~90 triệu tiền thuế của đối phương cộng các phí không xác định; nghĩa vụ 'kê khai thay' còn kéo theo rủi ro thủ tục về phía Bên B.",
    can_cu: citationsFromLabels(["Luật Thuế TNCN 2007 Điều 3", "BLDS 2015 Điều 442"]),
    de_xuat_sua:
      "Mỗi bên tự chịu nghĩa vụ thuế, phí của mình theo quy định; nếu vẫn theo 'giá thu ròng' thì quy đổi phần thuế vào giá bán công khai để so sánh đúng với thị trường, bỏ chữ 'vô điều kiện'.",
    tin_nhan:
      "Chào anh/chị, Điều 2.3 đang chuyển thuế TNCN (~90 triệu) sang em. Em đề nghị mỗi bên tự chịu thuế phí thuộc nghĩa vụ của mình theo luật; nếu anh/chị muốn thu ròng thì mình cộng thẳng vào giá để em so sánh minh bạch ạ.",
  },
  {
    id: "p3-1",
    so_dieu: "ĐIỀU 3",
    dieu_khoan_noi_ve_ben: "ben_a",
    dieu_khoan_lam_gi: "Bàn giao trong 07 ngày sau khi Bên B trả xong Đợt 2.",
    ket_luan: "PASS",
    muc_rui_ro: "thap",
    trich_dan: "Bên A bàn giao căn hộ cho Bên B trong vòng bảy (07) ngày kể từ ngày Bên B hoàn thành toàn bộ nghĩa vụ thanh toán Đợt 2…",
    giai_thich:
      "Có thời hạn bàn giao cụ thể là điểm tốt; tuy nhiên chế tài nếu Bên A chậm bàn giao lại bị giới hạn rất thấp tại Điều 5.3 — xem phân tích điều khoản đó.",
    ly_do: "",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 434"]),
    de_xuat_sua: "Bổ sung: bàn giao kèm biên bản hiện trạng, chỉ số điện nước và giấy tờ liên quan.",
    tin_nhan: "",
  },
  {
    id: "p3-2",
    so_dieu: "ĐIỀU 3",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Miễn toàn bộ bảo hành từ lúc giao chìa khóa; Bên B tự trả mọi chi phí sửa chữa.",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "Bên A hoàn toàn miễn trừ trách nhiệm bảo hành đối với toàn bộ kết cấu xây dựng ngầm, hệ thống điện nước âm tường, thiết bị nội thất gắn liền và các lỗi kỹ thuật phát sinh của căn hộ. Mọi chi phí sửa chữa, khắc phục hỏng hóc sau bàn giao sẽ do Bên B tự chi trả.",
    giai_thich:
      "Kết cấu ngầm và hệ thống âm tường là những hạng mục không thể kiểm tra bằng mắt khi xem nhà — đây chính là nơi 'lỗi ẩn' thường trú ngụ và chi phí khắc phục lớn nhất. Điều khoản miễn trừ 'hoàn toàn' mọi trách nhiệm bảo hành, kể cả với khiếm khuyết có sẵn trước bàn giao mà Bên A biết nhưng không thông báo — trái tinh thần nghĩa vụ bảo đảm chất lượng tài sản mua bán.",
    ly_do:
      "Bất lợi nghiêm trọng cho Bên B: nếu phát hiện thấm dột, nứt kết cấu, chập điện âm tường ngay sau khi nhận nhà, Bên B vẫn phải tự chi trả toàn bộ mà không có quyền yêu cầu Bên A khắc phục.",
    can_cu: citationsFromLabels(["Luật Nhà ở 2023 Điều 129", "BLDS 2015 Điều 445"]),
    de_xuat_sua:
      "Giới hạn miễn trừ chỉ với hư hỏng do lỗi sử dụng của Bên B sau bàn giao; Bên A chịu trách nhiệm với khiếm khuyết có sẵn/lỗi ẩn được phát hiện trong thời hạn hợp lý (ví dụ 6 tháng) và cam kết đã thông báo mọi khiếm khuyết đã biết.",
    tin_nhan:
      "Chào anh/chị, Điều 3.2 miễn trừ cả lỗi ẩn ở kết cấu ngầm, điện nước âm tường — những thứ em không thể kiểm tra khi xem nhà. Em đề nghị: anh/chị chịu trách nhiệm với khiếm khuyết có sẵn được phát hiện trong 6 tháng đầu, còn hư hỏng do em sử dụng thì em chịu ạ.",
  },
  {
    id: "p4-1",
    so_dieu: "ĐIỀU 4",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Bên B tự thực hiện thủ tục sang tên; Bên A chỉ cung cấp giấy tờ hiện có.",
    ket_luan: "PASS",
    muc_rui_ro: "thap",
    trich_dan: "…Bên B tự thực hiện thủ tục đăng ký biến động sang tên tại cơ quan nhà nước có thẩm quyền.",
    giai_thich:
      "Việc bên mua tự làm thủ tục là chấp nhận được, nhưng cụm 'giấy tờ pháp lý hiện có' không cam kết hồ sơ đủ điều kiện sang tên — cần đối chiếu với rủi ro tại Điều 4.2.",
    ly_do: "",
    can_cu: citationsFromLabels(["Luật Nhà ở 2023 Điều 160"]),
    de_xuat_sua:
      "Bổ sung: Bên A cam kết hồ sơ đủ điều kiện đăng ký biến động, cung cấp trong thời hạn xác định và phối hợp ký bổ sung khi cơ quan nhà nước yêu cầu.",
    tin_nhan: "",
  },
  {
    id: "p4-2",
    so_dieu: "ĐIỀU 4",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Không cam kết thời hạn ra sổ; Bên B từ bỏ quyền khiếu nại, khởi kiện, hủy hợp đồng.",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "Bên A không cam kết cụ thể về thời gian cơ quan nhà nước cấp Giấy chứng nhận quyền sở hữu mới đứng tên Bên B. Bên B cam kết không khiếu nại, không khởi kiện và không có quyền đơn phương hủy bỏ hợp đồng hoặc yêu cầu Bên A bồi thường vì lý do chậm trễ cấp Sổ hồng…",
    giai_thich:
      "Điều khoản tự thú nhận dự án 'đang trong quá trình giải quyết các thủ tục pháp lý chung' — tín hiệu cảnh báo căn hộ có thể chưa đủ điều kiện giao dịch. Nguy hiểm hơn, Bên B bị buộc từ bỏ trước quyền khiếu nại, khởi kiện và hủy hợp đồng — trong khi đã trả 89% tiền trong 15 ngày đầu (Điều 2.2). Nếu sổ hồng treo vô thời hạn, Bên B kẹt cứng: không đòi được tiền, không có sổ, không được kiện.",
    ly_do:
      "Bất lợi nghiêm trọng cho Bên B: quyền khởi kiện là quyền cơ bản được pháp luật tố tụng bảo hộ, thỏa thuận từ bỏ trước kiểu này khó có hiệu lực nhưng tạo rào cản tâm lý; kết hợp Điều 5.2, việc rút lui còn bị phạt 30% giá trị.",
    can_cu: citationsFromLabels(["Bộ luật TTDS 2015 Điều 4", "Luật Nhà ở 2023 Điều 160"]),
    de_xuat_sua:
      "Yêu cầu xác minh tình trạng pháp lý dự án trước khi ký; bổ sung mốc thời hạn tối đa cho việc sang tên — quá hạn thì Bên B có quyền hủy hợp đồng, nhận lại toàn bộ tiền đã trả kèm lãi; xóa cam kết từ bỏ quyền khiếu nại/khởi kiện.",
    tin_nhan:
      "Chào anh/chị, Điều 4.2 buộc em từ bỏ quyền khiếu nại dù sổ hồng có thể treo vô thời hạn trong khi em đã trả gần đủ tiền. Em đề nghị: đặt mốc tối đa (ví dụ 12 tháng) cho việc ra sổ, quá hạn em được nhận lại tiền, và bỏ cam kết không khởi kiện ạ.",
  },
  {
    id: "p5-1",
    so_dieu: "ĐIỀU 5",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Chậm trả 3 ngày → Bên A chấm dứt không cần báo trước, tịch thu toàn bộ tiền đã đóng.",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "…quá ba (03) ngày, Bên A có quyền đơn phương chấm dứt hợp đồng ngay lập tức mà không cần thông báo trước. Trong trường hợp này, Bên A được quyền tịch thu toàn bộ số tiền Bên B đã thanh toán ở các đợt trước đó… mà không phải hoàn trả lại bất kỳ khoản nào cho Bên B.",
    giai_thich:
      "Đây là điều khoản nguy hiểm nhất của hợp đồng: chỉ cần chậm Đợt 2 quá 3 ngày (một khoản 2,5 tỷ phải xoay trong 15 ngày), Bên B có thể mất trắng 1,5–4 tỷ đã đóng. Mức 'tịch thu toàn bộ' không tương xứng với bất kỳ thiệt hại thực tế nào của Bên A (căn hộ vẫn thuộc về Bên A và có thể bán tiếp), và việc chấm dứt 'không cần thông báo trước' tước luôn cơ hội khắc phục vi phạm.",
    ly_do:
      "Bất lợi nghiêm trọng cho Bên B: chế tài tịch thu không giới hạn, không cần chứng minh thiệt hại, không có thời gian ân hạn hay cơ hội khắc phục — kết hợp với lịch thanh toán dồn dập tại Điều 2.2 tạo thành 'bẫy' mất tiền có chủ đích.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 418", "BLDS 2015 Điều 428", "BLDS 2015 Điều 585"]),
    de_xuat_sua:
      "Thêm thời gian ân hạn 7–10 ngày và nghĩa vụ thông báo bằng văn bản trước khi chấm dứt; nếu chấm dứt, Bên A chỉ được giữ khoản phạt tương xứng (ví dụ tối đa tiền đặt cọc), phần còn lại phải hoàn trả cho Bên B.",
    tin_nhan:
      "Chào anh/chị, Điều 5.1 cho phép tịch thu toàn bộ tiền em đã đóng chỉ vì chậm 3 ngày. Em đề nghị: ân hạn 7 ngày kèm thông báo bằng văn bản, và nếu chấm dứt thì anh/chị chỉ giữ phần phạt tương đương tiền cọc, hoàn lại phần còn lại cho em ạ.",
  },
  {
    id: "p5-2",
    so_dieu: "ĐIỀU 5",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Bên B rút lui bị phạt 30% tổng giá trị hợp đồng (1,35 tỷ).",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "…Bên B sẽ bị phạt số tiền tương đương 30% tổng giá trị hợp đồng và phải hoàn trả căn hộ lại cho Bên A trong tình trạng nguyên vẹn như lúc nhận.",
    giai_thich:
      "Mức phạt 30% tổng giá trị (1,35 tỷ đồng) vượt xa mọi thông lệ phạt cọc. Điều kiện 'không do lỗi trực tiếp từ Bên A' rất hẹp: nếu Bên B buộc phải rút lui vì sổ hồng treo (Điều 4.2 quy định đó không phải lỗi Bên A), Bên B vẫn chịu phạt 30%. So sánh với Điều 5.3: Bên A vi phạm chỉ chịu tối đa 30 triệu.",
    ly_do:
      "Bất lợi nghiêm trọng cho Bên B: mức phạt bất cân xứng gấp ~45 lần chế tài áp cho Bên A, và đường lui hợp lý duy nhất của Bên B (rủi ro pháp lý dự án) lại bị đưa ra ngoài phạm vi 'lỗi của Bên A'.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 418", "BLDS 2015 Điều 328"]),
    de_xuat_sua:
      "Giới hạn mức phạt ở phạm vi tiền đặt cọc; loại trừ trường hợp Bên B chấm dứt do rủi ro pháp lý của căn hộ/dự án hoặc do Bên A không đáp ứng mốc thời hạn sang tên.",
    tin_nhan:
      "Chào anh/chị, Điều 5.2 phạt em 1,35 tỷ nếu rút lui, kể cả khi lý do là sổ hồng bị treo. Em đề nghị mức phạt tối đa bằng tiền cọc và loại trừ trường hợp em rút lui do vấn đề pháp lý của dự án ạ.",
  },
  {
    id: "p5-3",
    so_dieu: "ĐIỀU 5",
    dieu_khoan_noi_ve_ben: "ben_a",
    dieu_khoan_lam_gi: "Bên A chậm 90 ngày chỉ chịu phạt tối đa 2% đợt 1, miễn mọi bồi thường thực tế.",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "…Bên A chỉ phải chịu mức phạt cố định tối đa bằng 2% trên tổng số tiền đợt 1 mà không phải gánh chịu thêm bất kỳ trách nhiệm bồi thường thiệt hại thực tế nào khác cho Bên B.",
    giai_thich:
      "2% của đợt 1 là 30 triệu đồng — cho việc chậm bàn giao căn hộ 4,5 tỷ quá 90 ngày, trong khi Bên B đã trả 4 tỷ. Điều khoản còn loại trừ hoàn toàn nghĩa vụ bồi thường thiệt hại thực tế (chi phí thuê nhà, lãi vay…), trái nguyên tắc thiệt hại thực tế phải được bồi thường toàn bộ của BLDS 2015. Đối chiếu Điều 5.1–5.2: cùng là vi phạm nhưng Bên B mất tiền tỷ, Bên A mất tối đa 30 triệu.",
    ly_do:
      "Bất lợi nghiêm trọng cho Bên B: trần trách nhiệm của Bên A thấp bất thường và bất cân xứng nghiêm trọng với chế tài áp cho Bên B, khiến Bên A gần như không có động lực thực hiện đúng cam kết.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 585", "BLDS 2015 Điều 428"]),
    de_xuat_sua:
      "Áp chế tài đối xứng: Bên A chậm bàn giao chịu phạt theo tỷ lệ %/ngày trên số tiền đã nhận (tương đương mức áp cho Bên B) và vẫn phải bồi thường thiệt hại thực tế được chứng minh; quá 90 ngày thì Bên B có quyền hủy hợp đồng, nhận lại toàn bộ tiền kèm lãi.",
    tin_nhan:
      "Chào anh/chị, Điều 5.3 giới hạn trách nhiệm của bên bán ở 30 triệu trong khi em đã đóng 4 tỷ. Em đề nghị chế tài đối xứng hai bên: chậm bàn giao thì phạt theo ngày trên số tiền đã nhận và bồi thường thiệt hại thực tế; quá 90 ngày em được hủy hợp đồng nhận lại đủ tiền kèm lãi ạ.",
  },
  {
    id: "p6-1",
    so_dieu: "ĐIỀU 6",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Hợp đồng 'không thể hủy bỏ' — ngoại lệ duy nhất là quyền chấm dứt của Bên A.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan: "Hợp đồng này có hiệu lực kể từ ngày hai bên ký kết và không thể hủy bỏ trừ trường hợp quy định tại Khoản 5.1.",
    giai_thich:
      "Lối thoát duy nhất được chừa lại (Khoản 5.1) là quyền chấm dứt CỦA BÊN A khi Bên B chậm trả. Bên B không có bất kỳ trường hợp hủy bỏ nào — kể cả khi Bên A vi phạm nghiêm trọng. BLDS 2015 cho phép hủy bỏ hợp đồng khi một bên vi phạm nghiêm trọng nghĩa vụ, nên cách viết này chèn ép quyền luật định của Bên B.",
    ly_do:
      "Bất lợi cho Bên B: bị khóa chặt vào hợp đồng một chiều, mọi cửa thoát đều dẫn về mức phạt tại Điều 5.2.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 423", "BLDS 2015 Điều 428"]),
    de_xuat_sua:
      "Bổ sung quyền hủy bỏ/chấm dứt cho cả hai bên khi bên kia vi phạm nghiêm trọng nghĩa vụ theo quy định của BLDS 2015, kèm cơ chế hoàn trả tương ứng.",
    tin_nhan:
      "Chào anh/chị, Điều 6.1 hiện chỉ chừa quyền chấm dứt cho bên bán. Em đề nghị ghi rõ: mỗi bên đều được hủy bỏ hợp đồng khi bên kia vi phạm nghiêm trọng nghĩa vụ, theo đúng BLDS 2015 ạ.",
  },
  {
    id: "p6-2",
    so_dieu: "ĐIỀU 6",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Bên B trả toàn bộ án phí, phí định giá, phí luật sư của Bên A — vô điều kiện.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan:
      "Toàn bộ các khoản chi phí liên quan đến quá trình tố tụng, án phí, chi phí định giá và chi phí thuê luật sư bảo vệ quyền lợi của Bên A tại tòa án sẽ do Bên B chi trả toàn bộ và vô điều kiện trong mọi trường hợp.",
    giai_thich:
      "Theo pháp luật tố tụng dân sự, án phí do bên thua kiện chịu theo phán quyết của Tòa án. Buộc Bên B trả 'trong mọi trường hợp' — kể cả khi Bên B thắng kiện — khiến việc khởi kiện của Bên B trở nên đắt đỏ vô lý và triệt tiêu trên thực tế quyền yêu cầu Tòa án bảo vệ (vốn đã bị Điều 4.2 chặn một lần).",
    ly_do:
      "Bất lợi cho Bên B: gánh chi phí tố tụng của đối phương bất kể đúng sai, cộng hưởng với Điều 4.2 tạo thành hai lớp rào cản quyền khởi kiện.",
    can_cu: citationsFromLabels(["Bộ luật TTDS 2015 Điều 147"]),
    de_xuat_sua: "Sửa thành: án phí và chi phí hợp lý do bên thua kiện chịu theo phán quyết của Tòa án; bỏ cụm 'vô điều kiện trong mọi trường hợp'.",
    tin_nhan:
      "Chào anh/chị, Điều 6.2 buộc em trả cả phí luật sư của anh/chị kể cả khi em thắng kiện. Em đề nghị theo nguyên tắc chung: bên thua kiện chịu án phí theo quyết định của Tòa ạ.",
  },
  {
    id: "p6-3",
    so_dieu: "ĐIỀU 6",
    dieu_khoan_noi_ve_ben: "ca_hai",
    dieu_khoan_lam_gi: "Số bản hợp đồng và giá trị pháp lý.",
    ket_luan: "PASS",
    muc_rui_ro: "thap",
    trich_dan: "Hợp đồng này được lập thành hai (02) bản có giá trị pháp lý như nhau, mỗi bên giữ một (01) bản để thực hiện.",
    giai_thich:
      "Điều khoản hình thức thông thường. Lưu ý quan trọng: hợp đồng mua bán nhà ở giữa cá nhân phải được công chứng/chứng thực mới có hiệu lực — toàn bộ hợp đồng này không nhắc đến công chứng (xem mục điều khoản còn thiếu).",
    ly_do: "",
    can_cu: citationsFromLabels(["Luật Nhà ở 2023 Điều 164"]),
    de_xuat_sua: "",
    tin_nhan: "",
  },
];

/** Kết quả đối chiếu điều khoản bắt buộc cho template mua bán (đã rà soát). */
const checklistCoverageMuaBan: ChecklistCoverageItem[] = [
  {
    id: "A-D1", ten: "Bảo đảm tài sản hợp pháp: không tranh chấp/kê biên/thế chấp", thuocBen: "ben_a", batBuoc: true,
    trangThai: "thieu", trichDan: "",
    ghiChu: "Hợp đồng không có cam kết của Bên A về việc căn hộ không tranh chấp, không bị kê biên, không thế chấp — Điều 4.2 còn cho biết dự án đang vướng thủ tục pháp lý.",
    goiYBoSung: "Bên A cam kết căn hộ không có tranh chấp, không bị kê biên, không đang thế chấp tại thời điểm ký; nếu phát sinh khiếu nại của bên thứ ba, Bên A chịu trách nhiệm giải quyết và bồi thường.",
    viTriDeXuat: "Điều 1 — Đối tượng và thông tin căn hộ mua bán",
  },
  {
    id: "A-D2", ten: "Cam đoan & chịu trách nhiệm khi có đồng sở hữu/bên thứ ba khiếu nại về sau", thuocBen: "ben_a", batBuoc: true,
    trangThai: "thieu", trichDan: "",
    ghiChu: "Không có cam đoan/trách nhiệm của Bên A khi có đồng sở hữu hoặc bên thứ ba khiếu nại về sau.",
    goiYBoSung: "Trường hợp có đồng sở hữu hoặc bên thứ ba khiếu nại/khởi kiện liên quan đến quyền sở hữu căn hộ, Bên A chịu trách nhiệm giải quyết, chịu mọi chi phí và bồi thường thiệt hại cho Bên B.",
    viTriDeXuat: "Điều 4 — Thủ tục cấp giấy chứng nhận quyền sở hữu",
  },
  {
    id: "A-D3", ten: "Bàn giao đúng mô tả, đúng hiện trạng cam kết, có biên bản", thuocBen: "ben_a", batBuoc: true,
    trangThai: "co",
    trichDan: "Điều 3.1: Bên A bàn giao căn hộ cho Bên B trong vòng bảy (07) ngày… Điều 3.2: Kể từ thời điểm ký biên bản bàn giao căn hộ…",
    ghiChu: "", goiYBoSung: "", viTriDeXuat: "",
  },
  {
    id: "A-D4", ten: "Phối hợp hồ sơ để Bên B đăng ký sang tên", thuocBen: "ben_a", batBuoc: true,
    trangThai: "co",
    trichDan: "Điều 4.1: Bên A có trách nhiệm cung cấp đầy đủ các giấy tờ pháp lý hiện có… để Bên B tự thực hiện thủ tục đăng ký biến động sang tên.",
    ghiChu: "", goiYBoSung: "", viTriDeXuat: "",
  },
  {
    id: "B-Q2", ten: "Thanh toán gắn với mốc pháp lý (công chứng/sang tên), không trả hết trước rủi ro", thuocBen: "ben_b", batBuoc: true,
    trangThai: "thieu", trichDan: "",
    ghiChu: "Điều 2.2 buộc trả 89% trong 15 ngày đầu, không gắn đợt thanh toán nào với mốc công chứng/sang tên và không có khoản giữ lại chờ ra sổ.",
    goiYBoSung: "Phần lớn giá trị thanh toán khi công chứng hợp đồng; Bên B giữ lại tối thiểu 5–10% giá trị cho đến khi nhận Giấy chứng nhận quyền sở hữu đứng tên mình.",
    viTriDeXuat: "Điều 2 — Giá trị hợp đồng và phương thức thanh toán",
  },
  {
    id: "B-Q6", ten: "Hợp đồng được công chứng/chứng thực (điều kiện có hiệu lực khi mua bán nhà ở)", thuocBen: "ben_b", batBuoc: true,
    trangThai: "thieu", trichDan: "",
    ghiChu: "Toàn bộ hợp đồng không nhắc đến việc công chứng/chứng thực — trong khi mua bán nhà ở giữa cá nhân bắt buộc công chứng mới có hiệu lực.",
    goiYBoSung: "Hợp đồng này được công chứng tại tổ chức hành nghề công chứng theo quy định pháp luật; thời điểm có hiệu lực là thời điểm công chứng.",
    viTriDeXuat: "Điều 6 — Điều khoản chung và giải quyết tranh chấp",
  },
  {
    id: "B-Q7", ten: "Ghi rõ phần sở hữu chung/riêng, diện tích sàn căn hộ, kinh phí bảo trì", thuocBen: "ben_b", batBuoc: true,
    trangThai: "thieu", trichDan: "",
    ghiChu: "Có nêu diện tích thông thủy nhưng không ghi phần sở hữu chung/riêng; quỹ bảo trì 2% bị đẩy sang Bên B tại Điều 2.1 mà không nói rõ đã nộp hay chưa.",
    goiYBoSung: "Ghi rõ phần sở hữu riêng/chung theo Giấy chứng nhận và hồ sơ dự án; xác nhận tình trạng nộp kinh phí bảo trì 2% và bên chịu trách nhiệm theo quy định pháp luật.",
    viTriDeXuat: "Điều 1 — Đối tượng và thông tin căn hộ mua bán",
  },
];

function buildContractData(): ContractData {
  return {
    fileName: TEMPLATE_ANALYSIS_FILE_NAME,
    contractInfo: thong_tin,
    benA: ben_a,
    benB: ben_b,
    contract,
    phanTich: phan_tich,
    devices: phu_luc_thiet_bi.map((d) => ({ ...d })),
    loaiHopDong: "cho_thue_can_ho_chung_cu",
    documentTitle: "HỢP ĐỒNG THUÊ CĂN HỘ CHUNG CƯ",
  };
}

function buildMuaBanContractData(): ContractData {
  return {
    fileName: MUA_BAN_FILE_NAME,
    contractInfo: thong_tin_mb,
    benA: ben_a_mb,
    benB: ben_b_mb,
    contract: contract_mb,
    phanTich: phan_tich_mb,
    devices: [],
    loaiHopDong: "mua_ban_can_ho_chung_cu",
    documentTitle: "HỢP ĐỒNG MUA BÁN CĂN HỘ CHUNG CƯ",
  };
}

/** Toàn bộ dữ liệu phân tích chạy sẵn của một template (null nếu template chưa hỗ trợ). */
export function getTemplateContractData(templateId: string): ContractData | null {
  if (templateId === "thue") return buildContractData();
  if (templateId === "mua-ban") return buildMuaBanContractData();
  return null;
}

/** Dạng giai đoạn OCR (chưa có phân tích) — dùng cho ProcessingStage của ContractMode. */
export function getTemplateOcrPhase(templateId: string): OcrPhaseResult | null {
  const full = getTemplateContractData(templateId);
  if (!full) return null;
  const clauseTasks: ClauseTask[] = [];
  full.contract.forEach((art) => {
    art.paragraphs.forEach((p) => {
      if (p.text.trim()) {
        clauseTasks.push({ id: p.id, soDieu: art.so_dieu, text: p.text });
      }
    });
  });
  return { data: { ...full, phanTich: [] }, clauseTasks };
}

/** Kết quả checklist coverage chạy sẵn (null nếu template chưa hỗ trợ). */
export function getTemplateCoverage(templateId: string): ChecklistCoverageItem[] | null {
  if (templateId === "thue") return checklistCoverage;
  if (templateId === "mua-ban") return checklistCoverageMuaBan;
  return null;
}

/** Template có sẵn kết quả phân tích chạy trước hay không. */
export function hasTemplateAnalysis(templateId: string): boolean {
  return templateId === "thue" || templateId === "mua-ban";
}
