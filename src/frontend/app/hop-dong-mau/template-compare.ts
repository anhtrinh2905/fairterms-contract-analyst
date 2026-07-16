/* ============================================================
   Kết quả so sánh chạy sẵn cho cặp hợp đồng mẫu "mua-ban" (gốc)
   → "mua-ban-v2" (đã chỉnh sửa). Soạn tay 1 lần dựa trên nội dung
   thật của hai template (contracts.ts / template-analysis.ts), để
   minh hoạ tính năng So sánh hợp đồng mà không cần backend.
   Nút "Xem kết quả so sánh mẫu" ở Hợp đồng mẫu phát lại dữ liệu
   này — xem CompareMode (prop `templateCompareId`).
   ============================================================ */
import { citationsFromLabels } from "@/app/fairterms/lib/data";
import type {
  CompareAddedAnalysis,
  CompareClauseItem,
  CompareInfoRow,
  CompareResultData,
} from "@/app/fairterms/components/analysis/CompareResultView";

const info: CompareInfoRow[] = [
  {
    label: "Địa chỉ căn hộ",
    oldValue: "Căn hộ 2408, Tầng 24, Tháp B, Sky Skyline, Số 88 Láng Hạ, Đống Đa, Hà Nội",
    newValue: "Căn hộ 2408, Tầng 24, Tháp B, Sky Skyline, Số 88 Láng Hạ, Đống Đa, Hà Nội",
    changed: false,
  },
  { label: "Diện tích", oldValue: "75.5 m² (thông thủy)", newValue: "75.5 m² (thông thủy)", changed: false },
  { label: "Giá", oldValue: "4.500.000.000 đ", newValue: "4.500.000.000 đ", changed: false },
  { label: "Đặt cọc", oldValue: "1.500.000.000 đ (đợt 1)", newValue: "1.500.000.000 đ (đợt 1)", changed: false },
  { label: "Số hợp đồng", oldValue: "89/HĐMB-2026", newValue: "89/HĐMB-2026/V2", changed: true },
  { label: "Bên A — họ tên", oldValue: "Trần Quang V***", newValue: "Trần Quang V***", changed: false },
  { label: "Bên A — CCCD/CMND", oldValue: "001•••••1234", newValue: "001•••••1234", changed: false },
  { label: "Bên B — họ tên", oldValue: "Lê Hoàng N***", newValue: "Lê Hoàng N***", changed: false },
  { label: "Bên B — CCCD/CMND", oldValue: "024•••••5678", newValue: "024•••••5678", changed: false },
];

const addedDienTichAnalysis: CompareAddedAnalysis = {
  mucRuiRo: "khong",
  ketLuan: "PASS",
  dieuKhoanLamGi: "Thiết lập ngưỡng sai số diện tích 0,5% và cơ chế điều chỉnh giá theo đơn giá m² thực tế khi vượt ngưỡng.",
  giaiThich:
    "Thay thế cho việc bên mua phải chấp nhận trước mọi sai số diện tích ở bản gốc — nay có ngưỡng rõ ràng và cơ chế điều chỉnh giá công bằng cho cả hai bên khi đo đạc thực tế lệch so với giấy chứng nhận.",
  lyDo: "",
  deXuatSua: "",
  canCu: citationsFromLabels(["BLDS 2015 Điều 433"]),
};

const NEW_5_2_TEXT =
  "Nếu thời gian chậm trễ của bất kỳ bên nào vượt quá ba mươi (30) ngày, bên còn lại có quyền đơn phương chấm dứt hợp đồng. Nếu lỗi thuộc về Bên B, Bên B chịu mất tiền cọc (tối đa bằng 10% tổng giá trị hợp đồng), Bên A hoàn trả lại số tiền còn lại cho Bên B trong vòng 07 ngày. Nếu lỗi thuộc về Bên A, Bên A phải trả lại toàn bộ số tiền Bên B đã nộp và chịu phạt cọc một khoản tiền tương đương giá trị tiền cọc.";

const clauses: CompareClauseItem[] = [
  {
    kind: "unchanged",
    articleNo: "ĐIỀU 1",
    articleTitle: "ĐỐI TƯỢNG VÀ THÔNG TIN CĂN HỘ MUA BÁN",
    oldText:
      "Bên A đồng ý bán và Bên B đồng ý mua căn hộ số: 2408, Tầng: 24, Tòa nhà: Tháp B thuộc Dự án chung cư: Sky Skyline tại địa chỉ: Số 88 Láng Hạ, phường Láng Hạ, quận Đống Đa, thành phố Hà Nội.",
    newText:
      "Bên A đồng ý bán và Bên B đồng ý mua căn hộ số: 2408, Tầng: 24, Tòa nhà: Tháp B thuộc Dự án chung cư: Sky Skyline tại địa chỉ: Số 88 Láng Hạ, phường Láng Hạ, quận Đống Đa, thành phố Hà Nội.",
  },
  {
    kind: "modified",
    articleNo: "ĐIỀU 1",
    articleTitle: "ĐỐI TƯỢNG VÀ THÔNG TIN CĂN HỘ MUA BÁN",
    oldText:
      "Diện tích sử dụng căn hộ (diện tích thông thủy) theo giấy chứng nhận quyền sở hữu là: 75.5 m². Bên B xác nhận đã đo đạc, kiểm tra thực tế căn hộ tại thời điểm ký kết hợp đồng này và cam kết chấp nhận mọi sai số diện tích phát sinh thực tế sau này (nếu có) mà không yêu cầu Bên A bồi hoàn hoặc điều chỉnh lại tổng giá trị hợp đồng.",
    newText: "Diện tích sử dụng căn hộ (diện tích thông thủy) theo giấy chứng nhận quyền sở hữu là: 75.5 m².",
    verdict: "tot_hon",
    giaiThich:
      "Bỏ điều khoản buộc Bên B chấp nhận trước mọi sai số diện tích mà không được điều chỉnh giá — cơ chế điều chỉnh giá theo diện tích thực tế nay được quy định riêng và rõ ràng hơn ở Điều 1.3.",
  },
  {
    kind: "added",
    articleNo: "ĐIỀU 1",
    articleTitle: "ĐỐI TƯỢNG VÀ THÔNG TIN CĂN HỘ MUA BÁN",
    oldText: null,
    newText:
      "Sai số diện tích thực tế: Hai bên thống nhất nếu diện tích thông thủy đo đạc lại khi bàn giao thực tế chênh lệch vượt quá 0,5% (không phẩy năm phần trăm) so với diện tích ghi trên giấy chứng nhận, tổng giá trị hợp đồng sẽ được điều chỉnh tăng hoặc giảm tương ứng theo đơn giá mét vuông thực tế.",
    verdict: "tot_hon",
    analysis: addedDienTichAnalysis,
  },
  {
    kind: "modified",
    articleNo: "ĐIỀU 2",
    articleTitle: "GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN",
    oldText:
      "Tổng giá trị mua bán căn hộ là: 4.500.000.000 VNĐ (Bằng chữ: Bốn tỷ năm trăm triệu đồng chẵn). Giá bán này không bao gồm lệ phí trước bạ, phí công chứng hợp đồng, phí cấp Giấy chứng nhận quyền sở hữu, quỹ bảo trì 2%, phí dịch vụ quản lý vận hành tòa nhà và bất kỳ khoản thuế/phí phát sinh nào khác liên quan đến việc chuyển nhượng.",
    newText: "Tổng giá trị mua bán căn hộ là: 4.500.000.000 VNĐ (Bằng chữ: Bốn tỷ năm trăm triệu đồng chẵn).",
    verdict: "tot_hon",
    giaiThich:
      "Bỏ điều khoản liệt kê hàng loạt phí đẩy sang Bên B kèm cụm mở 'bất kỳ khoản thuế/phí phát sinh nào khác' — nghĩa vụ thuế/phí nay được phân định rõ ràng tại Điều 2.3.",
  },
  {
    kind: "modified",
    articleNo: "ĐIỀU 2",
    articleTitle: "GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN",
    oldText:
      "Phương thức thanh toán: Bên B thanh toán bằng tiền mặt hoặc chuyển khoản theo các đợt như sau: Đợt 1: Bên B thanh toán số tiền đặt cọc và thanh toán trước là 1.500.000.000 VNĐ ngay sau khi ký hợp đồng này. Đợt 2: Bên B thanh toán tiếp số tiền 2.500.000.000 VNĐ trong vòng mười lăm (15) ngày kể từ ngày ký hợp đồng. Đợt 3: Bên B thanh toán số tiền còn lại là 500.000.000 VNĐ ngay sau khi hai bên ký văn bản bàn giao thực tế căn hộ.",
    newText:
      "Phương thức thanh toán: Bên B thanh toán bằng tiền mặt hoặc chuyển khoản theo các đợt như sau: Đợt 1: Bên B thanh toán số tiền đặt cọc và thanh toán trước là 1.500.000.000 VNĐ ngay sau khi ký hợp đồng này. Đợt 2: Bên B thanh toán tiếp số tiền 2.500.000.000 VNĐ trong vòng mười lăm (15) ngày kể từ ngày ký hợp đồng. Đợt 3: Bên B giữ lại số tiền còn lại là 500.000.000 VNĐ và thanh toán ngay sau khi cơ quan nhà nước hoàn tất thủ tục đăng ký biến động và cấp Giấy chứng nhận quyền sở hữu mới (Sổ hồng) đứng tên Bên B.",
    verdict: "tot_hon",
    giaiThich:
      "Đợt thanh toán cuối (500 triệu, ~11% giá trị) được giữ lại đến khi Bên B nhận Giấy chứng nhận quyền sở hữu đứng tên mình, thay vì trả ngay sau khi bàn giao thực tế như bản gốc — gắn tiến độ thanh toán với mốc pháp lý bảo vệ Bên mua.",
  },
  {
    kind: "modified",
    articleNo: "ĐIỀU 2",
    articleTitle: "GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN",
    oldText:
      "Quy định về thuế thu nhập cá nhân: Do hai bên thỏa thuận giá bán trên là giá thu ròng về cho Bên A, nên toàn bộ tiền thuế thu nhập cá nhân từ việc chuyển nhượng bất động sản (thông thường do bên bán chịu theo luật định) và các loại phí hành chính khác phát sinh sẽ do Bên B chịu trách nhiệm kê khai và chi trả thay cho Bên A vô điều kiện trước khi thực hiện thủ tục sang tên.",
    newText:
      "Phân định nghĩa vụ Thuế và Lệ phí: Thuế thu nhập cá nhân phát sinh từ việc chuyển nhượng bất động sản do Bên Bán (Bên A) chịu trách nhiệm kê khai và chi trả theo đúng quy định pháp luật. Lệ phí trước bạ và các chi phí hành chính liên quan đến thủ tục sang tên đổi chủ do Bên Mua (Bên B) chịu trách nhiệm chi trả.",
    verdict: "tot_hon",
    giaiThich:
      "Khôi phục đúng nguyên tắc pháp luật: Bên Bán tự chịu thuế thu nhập cá nhân khi chuyển nhượng, Bên Mua chỉ còn chịu lệ phí trước bạ và chi phí hành chính sang tên — bỏ cách viết 'giá thu ròng' và chữ 'vô điều kiện' của bản gốc.",
  },
  {
    kind: "unchanged",
    articleNo: "ĐIỀU 3",
    articleTitle: "BÀN GIAO CĂN HỘ VÀ TRÁCH NHIỆM BẢO HÀNH",
    oldText:
      "Thời hạn bàn giao nhà: Bên A bàn giao căn hộ cho Bên B trong vòng bảy (07) ngày kể từ ngày Bên B hoàn thành toàn bộ nghĩa vụ thanh toán Đợt 2 quy định tại Khoản 2.2.",
    newText:
      "Thời hạn bàn giao nhà: Bên A bàn giao căn hộ cho Bên B trong vòng bảy (07) ngày kể từ ngày Bên B hoàn thành nghĩa vụ thanh toán Đợt 2 quy định tại Khoản 2.2.",
  },
  {
    kind: "modified",
    articleNo: "ĐIỀU 3",
    articleTitle: "BÀN GIAO CĂN HỘ VÀ TRÁCH NHIỆM BẢO HÀNH",
    oldText:
      "Kể từ thời điểm ký biên bản bàn giao căn hộ hoặc kể từ ngày Bên B nhận chìa khóa căn hộ (tùy thời điểm nào đến trước), Bên B chính thức chịu mọi rủi ro về hư hỏng, tổn thất tài sản, cháy nổ liên quan đến căn hộ. Bên A hoàn toàn miễn trừ trách nhiệm bảo hành đối với toàn bộ kết cấu xây dựng ngầm, hệ thống điện nước âm tường, thiết bị nội thất gắn liền và các lỗi kỹ thuật phát sinh của căn hộ. Mọi chi phí sửa chữa, khắc phục hỏng hóc sau bàn giao sẽ do Bên B tự chi trả.",
    newText:
      "Trách nhiệm bảo hành và rủi ro: Kể từ thời điểm ký biên bản bàn giao căn hộ, Bên B chịu rủi ro về hao mòn, tổn thất tài sản và cháy nổ. Tuy nhiên, Bên A có trách nhiệm phối hợp và bàn giao lại toàn bộ quyền được bảo hành kết cấu xây dựng và thiết bị kỹ thuật từ Chủ đầu tư dự án cho Bên B theo đúng chính sách bảo hành còn hiệu lực của tòa nhà.",
    verdict: "tot_hon",
    giaiThich:
      "Thay vì miễn trừ hoàn toàn trách nhiệm bảo hành kết cấu ngầm và hệ thống âm tường, Bên A nay có nghĩa vụ bàn giao lại quyền bảo hành còn hiệu lực của Chủ đầu tư cho Bên B — bảo vệ Bên B trước các lỗi ẩn khó phát hiện khi xem nhà.",
  },
  {
    kind: "modified",
    articleNo: "ĐIỀU 4",
    articleTitle: "THỦ TỤC CẤP GIẤY CHỨNG NHẬN QUYỀN SỞ HỮU",
    oldText:
      "Bên A có trách nhiệm cung cấp đầy đủ các giấy tờ pháp lý hiện có thuộc quyền sở hữu của Bên A cho Bên B để Bên B tự thực hiện thủ tục đăng ký biến động sang tên tại cơ quan nhà nước có thẩm quyền.",
    newText:
      "Bên A cam kết căn hộ chuyển nhượng hoàn toàn hợp pháp, không có tranh chấp, không bị thế chấp hoặc kê biên thi hành án. Bên A có trách nhiệm cung cấp đầy đủ hồ sơ pháp lý, cùng Bên B ký kết hợp đồng công chứng và hỗ trợ tối đa các thủ tục cho đến khi hoàn tất việc đăng ký sang tên Sổ hồng.",
    verdict: "tot_hon",
    giaiThich:
      "Bổ sung cam kết pháp lý rõ ràng của Bên Bán về tình trạng căn hộ (không tranh chấp, không thế chấp, không kê biên) và nghĩa vụ cùng ký hợp đồng công chứng — điều bản gốc hoàn toàn không có.",
  },
  {
    kind: "modified",
    articleNo: "ĐIỀU 4",
    articleTitle: "THỦ TỤC CẤP GIẤY CHỨNG NHẬN QUYỀN SỞ HỮU",
    oldText:
      "Do căn hộ thuộc dự án đang trong quá trình giải quyết các thủ tục pháp lý chung của Chủ đầu tư, Bên A không cam kết cụ thể về thời gian cơ quan nhà nước cấp Giấy chứng nhận quyền sở hữu mới đứng tên Bên B. Bên B cam kết không khiếu nại, không khởi kiện và không có quyền đơn phương hủy bỏ hợp đồng hoặc yêu cầu Bên A bồi thường vì lý do chậm trễ cấp Sổ hồng từ phía cơ quan chức năng hoặc Chủ đầu tư dự án.",
    newText:
      "Thời hạn hoàn thành thủ tục: Bên A cam kết hoàn tất việc phối hợp nộp hồ sơ sang tên cho Bên B trong vòng ba mươi (30) ngày làm việc kể từ ngày nhận đủ tiền Đợt 2.",
    verdict: "tot_hon",
    giaiThich:
      "Thay thế điều khoản không cam kết thời hạn ra sổ và buộc Bên B từ bỏ quyền khiếu nại/khởi kiện bằng một mốc thời hạn cụ thể (30 ngày làm việc) mà Bên A phải thực hiện.",
  },
  {
    kind: "modified",
    articleNo: "ĐIỀU 5",
    articleTitle: "PHẠT VI PHẠM VÀ ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG",
    oldText:
      "Nếu Bên B chậm thanh toán bất kỳ đợt tiền nào theo quy định tại Khoản 2.2 quá ba (03) ngày, Bên A có quyền đơn phương chấm dứt hợp đồng ngay lập tức mà không cần thông báo trước. Trong trường hợp này, Bên A được quyền tịch thu toàn bộ số tiền Bên B đã thanh toán ở các đợt trước đó dưới danh nghĩa tiền phạt vi phạm và bồi thường thiệt hại mà không phải hoàn trả lại bất kỳ khoản nào cho Bên B.",
    newText:
      "Trường hợp Bên B chậm thanh toán hoặc Bên A chậm bàn giao nhà/giấy tờ so với thời hạn cam kết, bên vi phạm phải chịu mức phạt chậm trễ tính theo lãi suất quá hạn của ngân hàng Vietcombank tại thời điểm vi phạm trên số tiền chậm nộp/chậm giao tương ứng với số ngày chậm trễ.",
    verdict: "tot_hon",
    giaiThich:
      "Bỏ chế tài tịch thu toàn bộ tiền đã đóng khi chậm thanh toán quá 3 ngày; thay bằng mức phạt tính theo lãi suất quá hạn ngân hàng trên số ngày chậm trễ — áp dụng công bằng cho cả Bên mua lẫn Bên bán khi vi phạm.",
  },
  {
    kind: "modified",
    articleNo: "ĐIỀU 5",
    articleTitle: "PHẠT VI PHẠM VÀ ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG",
    oldText:
      "Trong trường hợp Bên B tự ý chấm dứt hợp đồng trước khi thực hiện xong thủ tục chuyển nhượng mà không do lỗi trực tiếp từ Bên A, Bên B sẽ bị phạt số tiền tương đương 30% tổng giá trị hợp đồng và phải hoàn trả căn hộ lại cho Bên A trong tình trạng nguyên vẹn như lúc nhận.",
    newText: NEW_5_2_TEXT,
    verdict: "tot_hon",
    giaiThich:
      "Mức phạt khi Bên B rút lui giảm từ 30% tổng giá trị hợp đồng (1,35 tỷ đồng) xuống tối đa bằng tiền cọc (10% giá trị hợp đồng), và chỉ áp dụng khi lỗi thuộc về Bên B.",
  },
  {
    kind: "modified",
    articleNo: "ĐIỀU 5",
    articleTitle: "PHẠT VI PHẠM VÀ ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG",
    oldText:
      "Ngược lại, nếu Bên A chậm trễ bàn giao nhà hoặc giấy tờ quá chín mươi (90) ngày so với cam kết, Bên A chỉ phải chịu mức phạt cố định tối đa bằng 2% trên tổng số tiền đợt 1 mà không phải gánh chịu thêm bất kỳ trách nhiệm bồi thường thiệt hại thực tế nào khác cho Bên B.",
    newText: NEW_5_2_TEXT,
    verdict: "tot_hon",
    giaiThich:
      "Mức phạt bất cân xứng trước đây (Bên bán chậm 90 ngày chỉ chịu tối đa 2% đợt 1, tương đương 30 triệu đồng) được thay bằng chế tài đối xứng: nếu lỗi thuộc về Bên A, Bên A phải hoàn toàn bộ tiền đã nhận và chịu phạt một khoản tương đương tiền cọc.",
  },
  {
    kind: "modified",
    articleNo: "ĐIỀU 6",
    articleTitle: "ĐIỀU KHOẢN CHUNG VÀ GIẢI QUYẾT TRANH CHẤP",
    oldText: "Hợp đồng này có hiệu lực kể từ ngày hai bên ký kết và không thể hủy bỏ trừ trường hợp quy định tại Khoản 5.1.",
    newText: "Hợp đồng này được lập và công chứng hợp pháp, có hiệu lực ràng buộc trách nhiệm như nhau đối với hai bên.",
    verdict: "tot_hon",
    giaiThich:
      "Bỏ quy định hợp đồng 'không thể hủy bỏ' với lối thoát chỉ dành cho Bên Bán; thay bằng nguyên tắc hợp đồng có hiệu lực ràng buộc như nhau cho cả hai bên và được công chứng hợp pháp.",
  },
  {
    kind: "modified",
    articleNo: "ĐIỀU 6",
    articleTitle: "ĐIỀU KHOẢN CHUNG VÀ GIẢI QUYẾT TRANH CHẤP",
    oldText:
      "Mọi tranh chấp phát sinh sẽ được giải quyết trước tiên bằng thương lượng. Nếu không đạt được sự thống nhất, vụ việc sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền tại nơi có bất động sản. Toàn bộ các khoản chi phí liên quan đến quá trình tố tụng, án phí, chi phí định giá và chi phí thuê luật sư bảo vệ quyền lợi của Bên A tại tòa án sẽ do Bên B chi trả toàn bộ và vô điều kiện trong mọi trường hợp.",
    newText:
      "Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết qua thương lượng. Nếu không đạt được sự đồng thuận, tranh chấp sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền theo quy định của Bộ luật Tố tụng dân sự. Án phí và chi phí phát sinh trong quá trình tố tụng sẽ do Tòa án quyết định dựa trên kết quả xét xử.",
    verdict: "tot_hon",
    giaiThich:
      "Khôi phục nguyên tắc tố tụng chuẩn: án phí và chi phí tố tụng do Tòa án quyết định dựa trên kết quả xét xử, thay vì buộc Bên Mua trả toàn bộ án phí và phí luật sư của Bên Bán một cách vô điều kiện.",
  },
  {
    kind: "modified",
    articleNo: "ĐIỀU 6",
    articleTitle: "ĐIỀU KHOẢN CHUNG VÀ GIẢI QUYẾT TRANH CHẤP",
    oldText: "Hợp đồng này được lập thành hai (02) bản có giá trị pháp lý như nhau, mỗi bên giữ một (01) bản để thực hiện.",
    newText:
      "Hợp đồng này được lập thành bốn (04) bản có giá trị pháp lý như nhau, mỗi bên giữ một (01) bản, hai (02) bản lưu tại Cơ quan công chứng và Văn phòng đăng ký đất đai để thực hiện thủ tục.",
    verdict: "khong_doi",
    giaiThich:
      "Thay đổi thuần về hình thức (số bản hợp đồng và nơi lưu) để phù hợp với yêu cầu công chứng và đăng ký đất đai mới bổ sung ở Điều 6.1 — không ảnh hưởng quyền lợi thực chất của các bên.",
  },
];

function buildMuaBanCompareResult(): CompareResultData {
  return {
    summary: {
      unchanged: clauses.filter((c) => c.kind === "unchanged").length,
      modified: clauses.filter((c) => c.kind === "modified").length,
      added: clauses.filter((c) => c.kind === "added").length,
      removed: clauses.filter((c) => c.kind === "removed").length,
    },
    overallVerdict: "tot_hon",
    overallSummary:
      "Bản đã chỉnh sửa khắc phục hầu hết điều khoản bất lợi của bản gốc: thanh toán gắn với mốc pháp lý (sang tên/sổ hồng), nghĩa vụ thuế — phí được phân định đúng quy định, mức phạt vi phạm cân bằng cho cả hai bên, và bổ sung cam kết pháp lý, bảo hành rõ ràng hơn cho Bên mua.",
    info: { rows: info, anyChanged: info.some((r) => r.changed) },
    clauses,
  };
}

/** Cặp mẫu có sẵn kết quả so sánh dựng sẵn hay không. */
export function hasTemplateCompareResult(templateId: string): boolean {
  return templateId === "mua-ban-v2";
}

/** Kết quả so sánh dựng sẵn (null nếu cặp mẫu chưa hỗ trợ). */
export function getTemplateCompareResult(templateId: string): CompareResultData | null {
  if (templateId === "mua-ban-v2") return buildMuaBanCompareResult();
  return null;
}
