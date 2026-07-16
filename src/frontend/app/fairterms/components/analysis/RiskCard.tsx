"use client";
/* ============================================================
   RiskCard — self-contained clause risk card.
   Design system: ui-ux-pro-max "Trust & Authority"
   (left risk accent, elevated surface, badge hover, WCAG-safe
   contrast via existing --risk-* tokens, reduced-motion aware).
   Built on existing primitives — no Tailwind / shadcn.
   ============================================================ */
import { useState, type CSSProperties } from "react";
import { Icon } from "../ui/icons";
import { RiskBadge, ConclusionTag, LawChip, CopyButton, RISK_VAR } from "../ui/primitives";
import type { Analysis, RiskLevel } from "../../lib/data";

/** One-line human verdict per risk level. */
const VERDICT: Record<RiskLevel, string> = {
  cao: "Cần thương lượng lại trước khi ký.",
  trung_binh: "Nên rà soát kỹ và làm rõ với bên còn lại.",
  thap: "Tương đối ổn — lưu ý vài điểm nhỏ.",
  khong: "Điều khoản an toàn, phù hợp quy định.",
};

export function RiskCard({
  r,
  tieu_de,
  onTrace,
}: {
  r: Analysis;
  /** Optional clause heading, e.g. "GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN". */
  tieu_de?: string;
  /** Jump to the clause in the original contract. */
  onTrace?: () => void;
}) {
  const [openSug, setOpenSug] = useState(false);
  const accentStyle = { "--rc-accent": RISK_VAR[r.muc_rui_ro] } as CSSProperties;

  return (
    <article className="risk-card" data-risk={r.muc_rui_ro} style={accentStyle}>
      <header className="risk-card__head">
        <div className="risk-card__badges">
          <RiskBadge level={r.muc_rui_ro} size="sm" />
          <ConclusionTag value={r.ket_luan} />
        </div>
        {onTrace ? (
          <button className="risk-card__trace" onClick={onTrace} title="Xem trong hợp đồng gốc">
            <Icon.link style={{ width: 12, height: 12 }} />
            xem điều khoản gốc
          </button>
        ) : null}
      </header>

      {tieu_de ? <p className="risk-card__eyebrow">{tieu_de}</p> : null}
      <h3 className="risk-card__title">{r.dieu_khoan_lam_gi}</h3>

      <p className="risk-card__verdict">{VERDICT[r.muc_rui_ro]}</p>
      <p className="risk-card__explain">{r.giai_thich}</p>

      {r.ly_do ? (
        <div className="risk-card__reason">
          <Icon.warn style={{ width: 14, height: 14, flex: "0 0 auto", marginTop: 2 }} />
          <span>{r.ly_do}</span>
        </div>
      ) : null}

      {r.can_cu && r.can_cu.length ? (
        <div className="risk-card__laws">
          {r.can_cu.map((c, i) => (
            <LawChip key={i} citation={c} />
          ))}
        </div>
      ) : null}

      {r.de_xuat_sua ? (
        <div className="sug-box">
          <button className="sug-toggle" onClick={() => setOpenSug((v) => !v)} aria-expanded={openSug}>
            <Icon.spark style={{ width: 14, height: 14 }} />
            Gợi ý sửa &amp; tin nhắn thương lượng
            <Icon.chevron
              style={{
                width: 15,
                height: 15,
                marginLeft: "auto",
                transform: openSug ? "rotate(180deg)" : "none",
                transition: "transform .2s",
              }}
            />
          </button>
          {openSug ? (
            <div className="sug-content">
              <p style={{ margin: "0 0 8px", fontSize: 13.5, lineHeight: 1.55 }}>
                <b style={{ color: "var(--primary-ink)" }}>Đề xuất: </b>
                {r.de_xuat_sua}
              </p>
              {r.tin_nhan ? <CopyButton text={r.tin_nhan} label="Sao chép tin nhắn thương lượng" /> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
