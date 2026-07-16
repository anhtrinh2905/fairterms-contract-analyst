/* ============================================================
   HopDongAI — Mock data (mô phỏng output thật của Agent)
   Hợp đồng cho thuê căn hộ chung cư · dữ liệu hardcode
   Ported from the design package (app/data.js) to typed ESM.
   ============================================================ */

export interface Auth {
  mode: "user" | "guest";
  name?: string;
  email?: string;
  plan?: "pro" | "biz" | "free" | string;
}

export type RiskLevel = "cao" | "trung_binh" | "thap" | "khong";
export type BenSide = "ben_a" | "ben_b" | "ca_hai";
export type Conclusion = "MATCH" | "PASS";
export type ChecklistStatus = "co" | "thieu" | "rui_ro";

export type { LegalCitation } from "@/lib/api/types";
import type { LegalCitation as LegalCitationType } from "@/lib/api/types";

/** Wrap a plain law label (e.g. mock data, chat answers) into a citation object. */
export function citationFromLabel(label: string): LegalCitationType {
  return { law_title: label, location: label };
}

export function citationsFromLabels(labels: string[]): LegalCitationType[] {
  return labels.map(citationFromLabel);
}

export interface Analysis {
  id: string;
  so_dieu?: string;
  dieu_khoan_noi_ve_ben: BenSide;
  dieu_khoan_lam_gi: string;
  ket_luan: Conclusion;
  muc_rui_ro: RiskLevel;
  trich_dan: string;
  giai_thich: string;
  ly_do: string;
  can_cu: LegalCitationType[];
  de_xuat_sua: string;
  tin_nhan: string;
}

export interface Paragraph {
  id: string;
  num: string;
  text: string;
}

export interface Article {
  so_dieu: string;
  tieu_de: string;
  paragraphs: Paragraph[];
}

export interface ContractInfo {
  loai: string;
  so_hd: string;
  ngay_ky: string;
  thoi_han: string;
  gia_thue: string;
  dat_coc: string;
  dia_chi: string;
  dien_tich: string;
}

export interface Party {
  nhan: string;
  ho_ten: string | null;
  cccd: string | null;
  ngay_cap: string | null;
  noi_cap: string | null;
  sdt: string | null;
  dia_chi: string | null;
  truong_thieu: string[];
}

export type PartyField = "ho_ten" | "cccd" | "ngay_cap" | "noi_cap" | "sdt" | "dia_chi";

export interface Device {
  ten: string;
  /** Đơn vị tính (Bộ, Chiếc…) — chỉ có ở dữ liệu có phụ lục chi tiết. */
  dvt?: string;
  so_luong: number;
  tinh_trang: string;
  dung_thuc_te: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  trang_thai: ChecklistStatus;
  ghi_chu: string;
  ref: string | null;
}

/** Một nghĩa vụ/quyền bắt buộc phải có, đối chiếu với toàn văn hợp đồng thật. */
export interface ChecklistCoverageItem {
  id: string;
  ten: string;
  thuocBen: BenSide;
  batBuoc: boolean;
  trangThai: "co" | "thieu";
  trichDan: string;
  ghiChu: string;
  /** Chỉ có giá trị khi trangThai === "thieu". */
  goiYBoSung: string;
  viTriDeXuat: string;
}

export interface ChatAnswer {
  text: string;
  refs: string[];
  laws: string[];
}

export interface ClauseExample {
  label: string;
  text: string;
  result: Analysis;
}

export interface Summary {
  flags: Analysis[];
  count: Record<RiskLevel, number>;
  tong: RiskLevel;
  redFlags: number;
}

// ---- Disclaimer (luôn hiển thị) ----
export const LUU_Y =
  "Đây là tài liệu hỗ trợ rà soát do AI tạo ra, KHÔNG phải tư vấn pháp lý. " +
  "Mọi quyết định ký kết nên tham khảo thêm luật sư hoặc chuyên gia.";

// ---- Cục 1: Thông tin hợp đồng ----
export const thong_tin_hop_dong: ContractInfo = {
  loai: "Cho thuê căn hộ chung cư",
  so_hd: "25/2025/HĐTCH",
  ngay_ky: "25/06/2025",
  thoi_han: "12 tháng (01/07/2025 – 30/06/2026)",
  gia_thue: "15.000.000 đ / tháng",
  dat_coc: "30.000.000 đ (02 tháng tiền thuê)",
  dia_chi:
    "Căn hộ A-1502, Chung cư Sunrise City, 23 Nguyễn Hữu Thọ, P. Tân Hưng, Quận 7, TP. Hồ Chí Minh",
  dien_tich: "74 m² (02 phòng ngủ)",
};

// ---- Cục 2 & 3: Thông tin hai bên (PII đã ẩn danh) ----
export const ben_a: Party = {
  nhan: "Bên A — Bên cho thuê",
  ho_ten: "Trần Văn M****",
  cccd: "079•••••1234",
  ngay_cap: null, // THIẾU
  noi_cap: "Cục CS QLHC về TTXH",
  sdt: "090• ••• 567",
  dia_chi: "••• Trần Hưng Đạo, P. Cầu Ông Lãnh, Quận 1, TP.HCM",
  truong_thieu: ["ngay_cap"],
};

export const ben_b: Party = {
  nhan: "Bên B — Bên thuê (được bảo vệ)",
  ho_ten: "Nguyễn Thị Lan A***",
  cccd: null, // THIẾU
  ngay_cap: null, // THIẾU
  noi_cap: null,
  sdt: "093• ••• 432",
  dia_chi: "••• Lê Văn Việt, P. Tăng Nhơn Phú A, TP. Thủ Đức, TP.HCM",
  truong_thieu: ["cccd", "ngay_cap"],
};

export const FIELD_LABELS: Record<PartyField, string> = {
  ho_ten: "Họ và tên",
  cccd: "Số CCCD / CMND",
  ngay_cap: "Ngày cấp",
  noi_cap: "Nơi cấp",
  sdt: "Số điện thoại",
  dia_chi: "Địa chỉ thường trú",
};

// ---- Cục 4: Hợp đồng gốc (cột trái) — mỗi đoạn có id để truy vết ----
export const contract: Article[] = [
  {
    so_dieu: "ĐIỀU 1",
    tieu_de: "ĐỐI TƯỢNG VÀ MỤC ĐÍCH THUÊ",
    paragraphs: [
      {
        id: "p1-1",
        num: "1.1",
        text: "Bên A đồng ý cho thuê và Bên B đồng ý thuê căn hộ số A-1502, Chung cư Sunrise City, 23 Nguyễn Hữu Thọ, Quận 7, TP.HCM; diện tích 74 m², gồm 02 phòng ngủ, đã hoàn thiện nội thất cơ bản.",
      },
      {
        id: "p1-2",
        num: "1.2",
        text: "Mục đích thuê: để ở. Bên B không được sử dụng căn hộ vào mục đích khác hoặc kinh doanh khi chưa có sự đồng ý bằng văn bản của Bên A.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 2",
    tieu_de: "THỜI HẠN THUÊ",
    paragraphs: [
      {
        id: "p2-1",
        num: "2.1",
        text: "Thời hạn thuê là 12 (mười hai) tháng, kể từ ngày 01/07/2025 đến hết ngày 30/06/2026.",
      },
      {
        id: "p2-2",
        num: "2.2",
        text: "Hết thời hạn, nếu Bên B có nhu cầu tiếp tục thuê thì phải thông báo cho Bên A trước 30 ngày để hai bên thương lượng ký hợp đồng mới.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 3",
    tieu_de: "GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN",
    paragraphs: [
      {
        id: "p3-1",
        num: "3.1",
        text: "Giá thuê là 15.000.000 đồng/tháng, chưa bao gồm phí điện, nước, internet, phí quản lý chung cư do Bên B chi trả theo thực tế.",
      },
      {
        id: "p3-2",
        num: "3.2",
        text: "Bên A có quyền điều chỉnh giá thuê bất cứ lúc nào khi giá thị trường biến động; Bên B có nghĩa vụ thanh toán theo mức giá mới kể từ kỳ thanh toán liền kề.",
      },
      {
        id: "p3-3",
        num: "3.3",
        text: "Tiền thuê thanh toán theo tháng, trả trước vào ngày 05 hàng tháng bằng tiền mặt hoặc chuyển khoản.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 4",
    tieu_de: "ĐẶT CỌC TIỀN THUÊ NHÀ",
    paragraphs: [
      {
        id: "p4-1",
        num: "4.1",
        text: "Khi ký hợp đồng, Bên B đặt cọc cho Bên A số tiền 30.000.000 đồng (tương đương 02 tháng tiền thuê) để bảo đảm thực hiện hợp đồng.",
      },
      {
        id: "p4-2",
        num: "4.2",
        text: "Trường hợp Bên B đơn phương chấm dứt hợp đồng trước thời hạn, Bên B sẽ mất toàn bộ số tiền đặt cọc nêu trên trong mọi trường hợp.",
      },
      {
        id: "p4-3",
        num: "4.3",
        text: "Bên A hoàn trả tiền cọc cho Bên B trong vòng 30 ngày kể từ ngày Bên B bàn giao lại căn hộ và thanh toán đầy đủ các chi phí phát sinh.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 5",
    tieu_de: "QUYỀN VÀ NGHĨA VỤ CỦA CÁC BÊN",
    paragraphs: [
      {
        id: "p5-1",
        num: "5.1",
        text: "Bên A có nghĩa vụ bàn giao căn hộ đúng hiện trạng, bảo đảm quyền sử dụng hợp pháp và yên ổn của Bên B trong suốt thời hạn thuê.",
      },
      {
        id: "p5-2",
        num: "5.2",
        text: "Bên A được quyền vào kiểm tra căn hộ bất cứ lúc nào để bảo đảm tài sản, không cần thông báo trước cho Bên B.",
      },
      {
        id: "p5-3",
        num: "5.3",
        text: "Bên B có nghĩa vụ giữ gìn căn hộ, không tự ý sửa chữa, cải tạo; bồi thường mọi hư hỏng phát sinh trong thời gian thuê kể cả do hao mòn tự nhiên.",
      },
      {
        id: "p5-4",
        num: "5.4",
        text: "Bên B chịu trách nhiệm thanh toán đầy đủ, đúng hạn các khoản tiền thuê và chi phí dịch vụ.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 6",
    tieu_de: "CHẤM DỨT HỢP ĐỒNG",
    paragraphs: [
      {
        id: "p6-1",
        num: "6.1",
        text: "Bên B muốn chấm dứt hợp đồng trước thời hạn phải thông báo cho Bên A trước ít nhất 30 ngày, đồng thời chịu mất tiền cọc theo Điều 4.",
      },
      {
        id: "p6-2",
        num: "6.2",
        text: "Bên A được quyền đơn phương chấm dứt hợp đồng và yêu cầu Bên B chuyển đi trong vòng 07 ngày nếu Bên A có nhu cầu sử dụng lại căn hộ.",
      },
      {
        id: "p6-3",
        num: "6.3",
        text: "Khi chấm dứt, hai bên lập biên bản bàn giao căn hộ và đối chiếu phụ lục thiết bị kèm theo.",
      },
    ],
  },
  {
    so_dieu: "ĐIỀU 7",
    tieu_de: "ĐIỀU KHOẢN CHUNG",
    paragraphs: [
      {
        id: "p7-1",
        num: "7.1",
        text: "Hai bên cam kết thực hiện đúng các điều khoản đã thỏa thuận. Mọi tranh chấp được giải quyết thông qua thương lượng; nếu không thành sẽ đưa ra Tòa án có thẩm quyền.",
      },
      {
        id: "p7-2",
        num: "7.2",
        text: "Hợp đồng gồm 03 trang, lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản, có hiệu lực kể từ ngày ký.",
      },
    ],
  },
];

// ---- Phân tích từng điều khoản (cột phải) — id khớp đoạn trong contract ----
export const phan_tich: Analysis[] = [
  {
    id: "p1-1",
    so_dieu: "ĐIỀU 1",
    dieu_khoan_noi_ve_ben: "ca_hai",
    dieu_khoan_lam_gi: "Xác định đối tượng thuê và hiện trạng căn hộ.",
    ket_luan: "PASS",
    muc_rui_ro: "khong",
    trich_dan: "Bên A đồng ý cho thuê và Bên B đồng ý thuê căn hộ số A-1502… diện tích 74 m².",
    giai_thich: "Mô tả tài sản rõ ràng, đầy đủ địa chỉ và diện tích — phù hợp quy định.",
    ly_do: "",
    can_cu: citationsFromLabels(["Luật Nhà ở 2023 Điều 163"]),
    de_xuat_sua: "",
    tin_nhan: "",
  },
  {
    id: "p1-2",
    so_dieu: "ĐIỀU 1",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Giới hạn mục đích sử dụng căn hộ.",
    ket_luan: "PASS",
    muc_rui_ro: "thap",
    trich_dan:
      "Mục đích thuê: để ở… không được sử dụng vào mục đích khác khi chưa có sự đồng ý bằng văn bản của Bên A.",
    giai_thich: "Điều khoản hợp lý, chỉ cần lưu ý nếu Bên B có nhu cầu làm việc tại nhà.",
    ly_do: "",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 472"]),
    de_xuat_sua: "",
    tin_nhan: "",
  },
  {
    id: "p2-2",
    so_dieu: "ĐIỀU 2",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Nghĩa vụ báo trước khi tái ký.",
    ket_luan: "PASS",
    muc_rui_ro: "khong",
    trich_dan: "…phải thông báo cho Bên A trước 30 ngày để hai bên thương lượng ký hợp đồng mới.",
    giai_thich: "Thời hạn báo trước 30 ngày là thông lệ hợp lý, cân bằng cho cả hai bên.",
    ly_do: "",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 474"]),
    de_xuat_sua: "",
    tin_nhan: "",
  },
  {
    id: "p3-2",
    so_dieu: "ĐIỀU 3",
    dieu_khoan_noi_ve_ben: "ben_a",
    dieu_khoan_lam_gi: "Bên A đơn phương điều chỉnh giá thuê bất cứ lúc nào.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan:
      "Bên A có quyền điều chỉnh giá thuê bất cứ lúc nào khi giá thị trường biến động; Bên B có nghĩa vụ thanh toán theo mức giá mới…",
    giai_thich:
      "Cho phép một bên tự ý thay đổi giá trong thời hạn hợp đồng làm mất tính ổn định của giá thuê đã thỏa thuận, đặt Bên B vào thế bị động về tài chính.",
    ly_do:
      "Bất lợi cho Bên B: không có trần điều chỉnh, không cần Bên B đồng ý, không có thời gian báo trước hợp lý.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 472", "BLDS 2015 Điều 420"]),
    de_xuat_sua:
      "Cố định giá thuê trong suốt thời hạn 12 tháng; nếu điều chỉnh phải có sự đồng ý bằng văn bản của Bên B và báo trước tối thiểu 30 ngày, mỗi lần không quá 10%.",
    tin_nhan:
      "Chào anh/chị, về Điều 3.2 em đề nghị giữ cố định giá thuê 15.000.000đ/tháng trong suốt 12 tháng hợp đồng. Việc điều chỉnh giá giữa kỳ chỉ nên áp dụng khi hai bên cùng đồng ý bằng văn bản và báo trước 30 ngày. Mong anh/chị hỗ trợ ạ.",
  },
  {
    id: "p4-2",
    so_dieu: "ĐIỀU 4",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Bên B mất toàn bộ tiền cọc khi đơn phương chấm dứt, trong MỌI trường hợp.",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "Trường hợp Bên B đơn phương chấm dứt hợp đồng trước thời hạn, Bên B sẽ mất toàn bộ số tiền đặt cọc nêu trên trong mọi trường hợp.",
    giai_thich:
      "Điều khoản tịch thu cọc 'trong mọi trường hợp' không loại trừ các tình huống Bên B được quyền chấm dứt do lỗi của Bên A (vi phạm nghĩa vụ, căn hộ không sử dụng được) hoặc do sự kiện bất khả kháng. Đây là điều khoản phạt cọc bất cân xứng, gây bất lợi nghiêm trọng cho Bên B.",
    ly_do:
      "Bất lợi nặng cho Bên B: bị mất cọc kể cả khi Bên A là bên có lỗi, hoặc khi xảy ra bất khả kháng (thiên tai, dịch bệnh). Không có điều khoản đối ứng phạt Bên A.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 328", "BLDS 2015 Điều 351", "BLDS 2015 Điều 156"]),
    de_xuat_sua:
      "Bổ sung loại trừ: Bên B KHÔNG mất cọc nếu chấm dứt do lỗi của Bên A hoặc do sự kiện bất khả kháng. Đồng thời thêm điều khoản đối ứng: nếu Bên A đơn phương chấm dứt sai cam kết thì phải hoàn cọc và bồi thường tương đương.",
    tin_nhan:
      "Chào anh/chị, Điều 4.2 hiện quy định Bên B mất toàn bộ cọc 'trong mọi trường hợp'. Em đề nghị bổ sung: Bên B không bị mất cọc nếu việc chấm dứt là do lỗi của Bên A hoặc do bất khả kháng, và bổ sung nghĩa vụ đối ứng nếu Bên A đơn phương chấm dứt. Như vậy mới công bằng cho cả hai bên ạ.",
  },
  {
    id: "p4-3",
    so_dieu: "ĐIỀU 4",
    dieu_khoan_noi_ve_ben: "ben_a",
    dieu_khoan_lam_gi: "Thời hạn hoàn cọc 30 ngày sau bàn giao.",
    ket_luan: "PASS",
    muc_rui_ro: "thap",
    trich_dan: "Bên A hoàn trả tiền cọc cho Bên B trong vòng 30 ngày kể từ ngày Bên B bàn giao lại căn hộ…",
    giai_thich: "Có cam kết hoàn cọc là điểm tốt; tuy nhiên 30 ngày là hơi dài, nên rút ngắn.",
    ly_do: "Bên B bị giữ cọc lâu sau khi đã bàn giao.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 328"]),
    de_xuat_sua: "Rút thời hạn hoàn cọc xuống tối đa 07 ngày làm việc kể từ ngày bàn giao và chốt công nợ.",
    tin_nhan:
      "Anh/chị ơi, về Điều 4.3 em đề nghị rút thời gian hoàn cọc từ 30 ngày xuống còn 07 ngày làm việc sau khi bàn giao và chốt chi phí, để hai bên gọn gàng ạ.",
  },
  {
    id: "p5-2",
    so_dieu: "ĐIỀU 5",
    dieu_khoan_noi_ve_ben: "ben_a",
    dieu_khoan_lam_gi: "Bên A được vào căn hộ bất cứ lúc nào, không cần báo trước.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan: "Bên A được quyền vào kiểm tra căn hộ bất cứ lúc nào… không cần thông báo trước cho Bên B.",
    giai_thich:
      "Trong thời hạn thuê, Bên B có quyền sử dụng yên ổn và bất khả xâm phạm về chỗ ở. Việc Bên A tự ý vào căn hộ không báo trước xâm phạm quyền riêng tư của Bên B.",
    ly_do:
      "Bất lợi cho Bên B: xâm phạm quyền bất khả xâm phạm về chỗ ở và quyền sử dụng yên ổn tài sản thuê.",
    can_cu: citationsFromLabels(["Hiến pháp 2013 Điều 22", "BLDS 2015 Điều 472"]),
    de_xuat_sua:
      "Bên A chỉ được vào căn hộ khi có sự đồng ý của Bên B và báo trước tối thiểu 24 giờ, trừ trường hợp khẩn cấp (cháy nổ, rò rỉ) đe dọa an toàn.",
    tin_nhan:
      "Chào anh/chị, Điều 5.2 cho phép vào căn hộ bất cứ lúc nào không báo trước. Em đề nghị sửa thành: báo trước tối thiểu 24 giờ và có sự đồng ý của em, trừ trường hợp khẩn cấp. Cảm ơn anh/chị ạ.",
  },
  {
    id: "p5-3",
    so_dieu: "ĐIỀU 5",
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Bên B bồi thường mọi hư hỏng KỂ CẢ hao mòn tự nhiên.",
    ket_luan: "MATCH",
    muc_rui_ro: "trung_binh",
    trich_dan: "…bồi thường mọi hư hỏng phát sinh trong thời gian thuê kể cả do hao mòn tự nhiên.",
    giai_thich:
      "Hao mòn tự nhiên do sử dụng bình thường không phải lỗi của Bên B. Buộc Bên B bồi thường cả phần hao mòn tự nhiên là không hợp lý và trái nguyên tắc bồi thường thiệt hại.",
    ly_do: "Bất lợi cho Bên B: phải trả tiền cho hao mòn vốn thuộc trách nhiệm của chủ tài sản.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 480", "BLDS 2015 Điều 360"]),
    de_xuat_sua:
      "Loại trừ hao mòn tự nhiên: Bên B chỉ bồi thường hư hỏng do lỗi của mình; hao mòn do sử dụng bình thường thuộc trách nhiệm Bên A.",
    tin_nhan:
      "Anh/chị ơi, Điều 5.3 yêu cầu em bồi thường 'kể cả hao mòn tự nhiên'. Em đề nghị loại trừ phần hao mòn tự nhiên — em chỉ chịu trách nhiệm với hư hỏng do lỗi của mình thôi ạ.",
  },
  {
    id: "p6-2",
    so_dieu: "ĐIỀU 6",
    dieu_khoan_noi_ve_ben: "ben_a",
    dieu_khoan_lam_gi: "Bên A đơn phương chấm dứt, buộc Bên B đi trong 07 ngày.",
    ket_luan: "MATCH",
    muc_rui_ro: "cao",
    trich_dan:
      "Bên A được quyền đơn phương chấm dứt hợp đồng và yêu cầu Bên B chuyển đi trong vòng 07 ngày nếu Bên A có nhu cầu sử dụng lại căn hộ.",
    giai_thich:
      "Điều khoản trao cho Bên A quyền chấm dứt tùy nghi chỉ với 'nhu cầu sử dụng', trong khi Bên B phải báo trước 30 ngày và mất cọc. Sự bất cân xứng này khiến Bên B có thể bị buộc dọn đi đột ngột mà không được bồi thường hay hoàn cọc.",
    ly_do:
      "Bất lợi nặng và bất cân xứng: Bên A chấm dứt dễ dàng (07 ngày), không bồi thường; Bên B bị động hoàn toàn về chỗ ở.",
    can_cu: citationsFromLabels(["BLDS 2015 Điều 428", "Luật Nhà ở 2023 Điều 172"]),
    de_xuat_sua:
      "Bên A chỉ được đơn phương chấm dứt trong các trường hợp luật định; nếu chấm dứt vì nhu cầu riêng phải báo trước tối thiểu 30 ngày, hoàn lại toàn bộ cọc và bồi thường tương ứng cho Bên B.",
    tin_nhan:
      "Chào anh/chị, Điều 6.2 cho phép Bên A yêu cầu em dọn đi chỉ trong 07 ngày. Em đề nghị: nếu Bên A cần lấy lại nhà thì báo trước tối thiểu 30 ngày, hoàn đủ cọc và hỗ trợ chi phí chuyển nhà cho em. Mong anh/chị thông cảm ạ.",
  },
];

// ---- Phụ lục thiết bị (Cục 5) ----
export const phu_luc_thiet_bi: Device[] = [
  { ten: "Máy lạnh Panasonic 1.5HP", so_luong: 2, tinh_trang: "Hoạt động tốt", dung_thuc_te: false },
  { ten: "Tủ lạnh Toshiba 180L", so_luong: 1, tinh_trang: "Hoạt động tốt", dung_thuc_te: false },
  { ten: "Máy giặt LG 8kg", so_luong: 1, tinh_trang: "Hoạt động tốt", dung_thuc_te: false },
  { ten: "Giường ngủ gỗ + nệm", so_luong: 2, tinh_trang: "Còn mới 90%", dung_thuc_te: false },
  { ten: "Bộ bàn ăn 4 ghế", so_luong: 1, tinh_trang: "Bình thường", dung_thuc_te: false },
  { ten: "Sofa phòng khách", so_luong: 1, tinh_trang: "Trầy nhẹ tay vịn", dung_thuc_te: false },
  { ten: "Bình nóng lạnh Ariston", so_luong: 2, tinh_trang: "Hoạt động tốt", dung_thuc_te: false },
  { ten: "Kệ bếp + máy hút mùi", so_luong: 1, tinh_trang: "Bình thường", dung_thuc_te: false },
];

// ---- Checklist bảo vệ Bên B (Tính năng 4) ----
export const checklist: ChecklistItem[] = [
  { id: "ck1", label: "Giá thuê cố định trong suốt thời hạn", trang_thai: "rui_ro", ghi_chu: "Điều 3.2 cho phép Bên A tự điều chỉnh giá.", ref: "p3-2" },
  { id: "ck2", label: "Điều kiện & thời hạn hoàn trả tiền cọc rõ ràng", trang_thai: "co", ghi_chu: "Có tại Điều 4.3 (nên rút ngắn còn 7 ngày).", ref: "p4-3" },
  { id: "ck3", label: "Loại trừ mất cọc khi Bên A có lỗi / bất khả kháng", trang_thai: "thieu", ghi_chu: "Điều 4.2 tịch thu cọc trong mọi trường hợp.", ref: "p4-2" },
  { id: "ck4", label: "Bảo đảm quyền sử dụng yên ổn, riêng tư", trang_thai: "rui_ro", ghi_chu: "Điều 5.2 cho Bên A vào nhà không báo trước.", ref: "p5-2" },
  { id: "ck5", label: "Miễn trừ bồi thường hao mòn tự nhiên", trang_thai: "thieu", ghi_chu: "Điều 5.3 buộc bồi thường cả hao mòn tự nhiên.", ref: "p5-3" },
  { id: "ck6", label: "Điều khoản chấm dứt cân xứng giữa hai bên", trang_thai: "rui_ro", ghi_chu: "Điều 6.2 cho Bên A chấm dứt chỉ trong 7 ngày.", ref: "p6-2" },
  { id: "ck7", label: "Biên bản bàn giao & phụ lục thiết bị", trang_thai: "co", ghi_chu: "Có tại Điều 6.3 và phụ lục thiết bị.", ref: null },
  { id: "ck8", label: "Cơ chế giải quyết tranh chấp", trang_thai: "co", ghi_chu: "Có tại Điều 7.1 (thương lượng → Tòa án).", ref: null },
];

// ---- Điều khoản bắt buộc còn thiếu — dữ liệu cho chế độ demo hướng dẫn ----
// (hợp đồng thật dùng /checklist/evaluate-coverage, xem lib/contractData.ts)
export const demoChecklistCoverage: ChecklistCoverageItem[] = [
  {
    id: "A-D3", ten: "Báo trước & được đồng ý khi vào căn hộ", thuocBen: "ben_a", batBuoc: true,
    trangThai: "thieu", trichDan: "",
    ghiChu: "Không thấy điều khoản yêu cầu Bên A báo trước khi vào căn hộ.",
    goiYBoSung: "Bên A phải báo trước cho Bên B ít nhất 24 giờ và được Bên B đồng ý trước khi vào căn hộ, trừ trường hợp khẩn cấp.",
    viTriDeXuat: "Điều 5 — Quyền và nghĩa vụ của các bên",
  },
  {
    id: "B-Q3", ten: "Được hoàn tiền thuê đã trả cho thời gian chưa sử dụng khi chấm dứt hợp lệ", thuocBen: "ben_b", batBuoc: true,
    trangThai: "thieu", trichDan: "",
    ghiChu: "Điều 6.2 không đề cập hoàn tiền thuê còn lại.",
    goiYBoSung: "Khi hợp đồng chấm dứt trước hạn hợp lệ, Bên A hoàn trả Bên B số tiền thuê đã trả tương ứng thời gian chưa sử dụng.",
    viTriDeXuat: "Điều 6 — Chấm dứt hợp đồng",
  },
  {
    id: "B-Q2", ten: "Được hoàn cọc đúng hạn, chỉ khấu trừ có căn cứ", thuocBen: "ben_b", batBuoc: true,
    trangThai: "co", trichDan: "Điều 4.3: Bên A hoàn trả tiền cọc trong vòng 7 ngày...",
    ghiChu: "", goiYBoSung: "", viTriDeXuat: "",
  },
  {
    id: "A-D6", ten: "Báo trước hợp lý khi chấm dứt hợp đồng", thuocBen: "ben_a", batBuoc: true,
    trangThai: "co", trichDan: "Điều 6.2: Bên A phải báo trước cho Bên B 07 ngày...",
    ghiChu: "", goiYBoSung: "", viTriDeXuat: "",
  },
];

// ---- Câu hỏi gợi ý cho chat (Tính năng 5) ----
export const chat_suggestions: string[] = [
  "Tôi mất cọc trong trường hợp nào?",
  "Bên A có được tự ý tăng giá thuê không?",
  "Hợp đồng này còn thiếu thông tin gì?",
  "Điều khoản nào rủi ro cao nhất?",
];

// Trả lời chat mô phỏng (kèm trích dẫn điều khoản + điều luật)
export const chat_answers: Record<string, ChatAnswer> = {
  "Tôi mất cọc trong trường hợp nào?": {
    text: "Theo Điều 4.2, hợp đồng quy định Bên B (bạn) mất toàn bộ tiền cọc 30.000.000đ nếu đơn phương chấm dứt trước hạn — 'trong mọi trường hợp'. Đây là rủi ro CAO vì không loại trừ tình huống Bên A có lỗi hoặc bất khả kháng. Bạn nên đề nghị bổ sung loại trừ.",
    refs: ["p4-2"],
    laws: ["BLDS 2015 Điều 328", "BLDS 2015 Điều 351"],
  },
  "Bên A có được tự ý tăng giá thuê không?": {
    text: "Điều 3.2 cho phép Bên A 'điều chỉnh giá thuê bất cứ lúc nào'. Đây là rủi ro TRUNG BÌNH — giá thuê đã thỏa thuận lẽ ra phải ổn định. Bạn nên yêu cầu cố định giá trong 12 tháng, mọi điều chỉnh phải có sự đồng ý của bạn.",
    refs: ["p3-2"],
    laws: ["BLDS 2015 Điều 472", "BLDS 2015 Điều 420"],
  },
  "Hợp đồng này còn thiếu thông tin gì?": {
    text: "Phần thông tin các bên còn thiếu: Bên A thiếu 'Ngày cấp' CCCD; Bên B thiếu cả 'Số CCCD' và 'Ngày cấp'. Thiếu CCCD của Bên B khiến việc xác minh danh tính và giải quyết tranh chấp về sau gặp khó khăn — nên bổ sung đầy đủ trước khi ký.",
    refs: [],
    laws: ["Luật Công chứng 2014 Điều 40"],
  },
  "Điều khoản nào rủi ro cao nhất?": {
    text: "Có 2 điều khoản rủi ro CAO: (1) Điều 4.2 — mất toàn bộ cọc trong mọi trường hợp; (2) Điều 6.2 — Bên A được buộc bạn dọn đi chỉ trong 7 ngày. Cả hai đều rất bất cân xứng, cần thương lượng sửa trước khi ký.",
    refs: ["p4-2", "p6-2"],
    laws: ["BLDS 2015 Điều 328", "BLDS 2015 Điều 428"],
  },
  __default__: {
    text: "Dựa trên hợp đồng, mình ưu tiên bảo vệ quyền lợi của bạn (Bên B). Bạn có thể hỏi cụ thể về tiền cọc, giá thuê, quyền chấm dứt, hoặc thông tin còn thiếu — mình sẽ trả lời kèm trích dẫn điều khoản và căn cứ pháp luật.",
    refs: [],
    laws: [],
  },
};

// ---- Ví dụ dựng sẵn cho Chế độ 1 (1 điều khoản) ----
export const clause_examples: ClauseExample[] = [
  {
    label: "VD · Phạt cọc (rủi ro cao)",
    text: "Trường hợp Bên B đơn phương chấm dứt hợp đồng trước thời hạn, Bên B sẽ mất toàn bộ số tiền đặt cọc 30.000.000 đồng trong mọi trường hợp.",
    result: {
      id: "B-R3",
      dieu_khoan_noi_ve_ben: "ben_b",
      dieu_khoan_lam_gi: "Tịch thu toàn bộ tiền cọc khi Bên B đơn phương chấm dứt — không có loại trừ.",
      ket_luan: "MATCH",
      muc_rui_ro: "cao",
      trich_dan: "Bên B sẽ mất toàn bộ số tiền đặt cọc 30.000.000 đồng trong mọi trường hợp.",
      giai_thich:
        "Điều khoản phạt cọc không loại trừ trường hợp Bên A có lỗi hay bất khả kháng, gây bất lợi nghiêm trọng và bất cân xứng cho Bên B.",
      ly_do:
        "Bên B có thể mất cọc ngay cả khi không có lỗi, kể cả khi Bên A vi phạm hoặc xảy ra sự kiện bất khả kháng.",
      can_cu: citationsFromLabels(["BLDS 2015 Điều 328", "BLDS 2015 Điều 351", "BLDS 2015 Điều 156"]),
      de_xuat_sua:
        "Bổ sung: Bên B không mất cọc nếu chấm dứt do lỗi của Bên A hoặc bất khả kháng; thêm nghĩa vụ đối ứng cho Bên A.",
      tin_nhan:
        "Chào anh/chị, em đề nghị bổ sung vào điều khoản đặt cọc: Bên B không bị mất cọc nếu chấm dứt do lỗi của Bên A hoặc do bất khả kháng. Như vậy sẽ công bằng cho cả hai bên ạ.",
    },
  },
  {
    label: "VD · Báo trước tái ký (an toàn)",
    text: "Hết thời hạn, nếu Bên B có nhu cầu tiếp tục thuê thì phải thông báo cho Bên A trước 30 ngày để hai bên thương lượng ký hợp đồng mới.",
    result: {
      id: "B-S1",
      dieu_khoan_noi_ve_ben: "ben_b",
      dieu_khoan_lam_gi: "Nghĩa vụ báo trước 30 ngày khi muốn tái ký hợp đồng.",
      ket_luan: "PASS",
      muc_rui_ro: "khong",
      trich_dan: "…phải thông báo cho Bên A trước 30 ngày để hai bên thương lượng ký hợp đồng mới.",
      giai_thich: "Thời hạn báo trước 30 ngày là thông lệ hợp lý, áp dụng cân bằng cho cả hai bên.",
      ly_do: "",
      can_cu: citationsFromLabels(["BLDS 2015 Điều 474"]),
      de_xuat_sua: "",
      tin_nhan: "",
    },
  },
];

// ---- Hàm tổng hợp đánh giá ----
export function tinhTong(items: Analysis[]): Summary {
  const flags = items.filter((x) => x.ket_luan === "MATCH");
  const count: Record<RiskLevel, number> = { cao: 0, trung_binh: 0, thap: 0, khong: 0 };
  items.forEach((x) => {
    count[x.muc_rui_ro] = (count[x.muc_rui_ro] || 0) + 1;
  });
  let tong: RiskLevel = "khong";
  if (flags.some((x) => x.muc_rui_ro === "cao")) tong = "cao";
  else if (flags.some((x) => x.muc_rui_ro === "trung_binh")) tong = "trung_binh";
  else if (flags.some((x) => x.muc_rui_ro === "thap")) tong = "thap";
  return { flags, count, tong, redFlags: flags.length };
}
