import { Icon } from "../ui/icons";

const STEPS = [
  { num: 1, label: "Tạo tài khoản" },
  { num: 2, label: "Tải hợp đồng" },
  { num: 3, label: "Nhận kết quả" },
] as const;

const FEATURES = [
  {
    tone: "purple" as const,
    icon: Icon.shield,
    title: "Phát hiện rủi ro tức thì",
    desc: "Tự động phân tích toàn bộ điều khoản, gắn nhãn mức rủi ro và trích dẫn căn cứ pháp lý cụ thể.",
  },
  {
    tone: "green" as const,
    icon: Icon.doc,
    title: "Hỏi đáp theo điều luật",
    desc: "Đặt câu hỏi về bất kỳ điều khoản nào và nhận câu trả lời có căn cứ theo Luật Dân sự & Nhà ở Việt Nam.",
  },
  {
    tone: "red" as const,
    icon: Icon.eye,
    title: "Bảo vệ thông tin cá nhân",
    desc: "PII được ẩn danh trước khi phân tích. Dữ liệu hợp đồng không bao giờ được lưu trữ hay chia sẻ.",
  },
];

const BADGES = [
  { icon: Icon.shield, label: "Miễn phí dùng thử" },
  { icon: Icon.check, label: "Không cần thẻ" },
  { icon: Icon.clock, label: "Kết quả trong 60 giây" },
] as const;

export function AuthPromoPanel({ activeStep = 1 }: { activeStep?: 1 | 2 | 3 }) {
  return (
    <aside className="auth-right">
      <div className="auth-right-inner">
        <h2 className="auth-right-head rise2">
          Bắt đầu rà soát
          <br />
          hợp đồng thông minh
        </h2>

        <div className="rp-stepper rise3">
          {STEPS.flatMap((step, i) => {
            const items = [
              <div key={step.num} className={"rp-step" + (step.num === activeStep ? " active" : "")}>
                <div className="rp-step-num">{step.num}</div>
                <div className="rp-step-label">{step.label}</div>
              </div>,
            ];
            if (i < STEPS.length - 1) {
              items.push(<div key={`line-${step.num}`} className="rp-step-line" aria-hidden="true" />);
            }
            return items;
          })}
        </div>

        <div className="rp-features rise3">
          {FEATURES.map((feat) => {
            const FeatIcon = feat.icon;
            return (
              <div key={feat.title} className="rp-feat">
                <div className={"rp-feat-ic " + feat.tone}>
                  <FeatIcon style={{ width: 18, height: 18 }} />
                </div>
                <div className="rp-feat-body">
                  <strong>{feat.title}</strong>
                  <span>{feat.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="auth-trust rise4">
          <div className="trust-badges">
            {BADGES.map((badge) => {
              const BadgeIcon = badge.icon;
              return (
                <span key={badge.label} className="tbadge">
                  <BadgeIcon style={{ width: 13, height: 13 }} />
                  {badge.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
