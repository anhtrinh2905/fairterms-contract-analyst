"use client";
/* ============================================================
   TemplatesView — Tích hợp hợp đồng mẫu vào trong app shell
   ============================================================ */
import { useCallback, useRef, useState } from "react";
import { Icon } from "./ui/icons";
import { Disclaimer } from "./ui/primitives";
import {
  THUE_CAN_HO,
  MUA_BAN_CAN_HO,
  MUA_BAN_CAN_HO_V2,
  type ContractTemplate,
  type ContractSection,
} from "../../hop-dong-mau/contracts";
import { downloadTemplateDocx, createDocxBlob } from "../../hop-dong-mau/download";
import { hasTemplateAnalysis } from "../../hop-dong-mau/template-analysis";
import type { UploadInput } from "./analysis/ContractMode";

const TEMPLATES = [THUE_CAN_HO, MUA_BAN_CAN_HO];

const HIGHLIGHTS: Record<string, string[]> = {
  thue: [
    "Nhiều điều khoản có thể bất lợi được tô đỏ để dễ nhận biết",
    "Phân tích AI có sẵn — xem kết quả ngay không cần chờ",
    "Phụ lục 15 thiết bị bàn giao kèm hợp đồng",
  ],
  "mua-ban": [
    "Nhiều điều khoản có thể bất lợi được tô đỏ để dễ nhận biết",
    "Phân tích AI có sẵn — xem kết quả ngay không cần chờ",
    "Tình huống 'gài bẫy' điển hình khi mua lại căn hộ chung cư",
  ],
  "mua-ban-v2": [
    "Đã bổ sung cam kết pháp lý, công chứng và phân định thuế phí rõ ràng",
    "Mức phạt vi phạm và bồi thường cân bằng cho cả hai bên",
    "Dùng làm bản đã sửa để xem trước tính năng So sánh hợp đồng",
  ],
};

/* ---- Section renderer ---- */
function SectionBlock({ section }: { section: ContractSection }) {
  const baseStyle: React.CSSProperties = {};

  const content = (() => {
    switch (section.type) {
      case "title":
        return (
          <div
            style={{
              textAlign: "center",
              fontWeight: 700,
              fontSize: 18,
              textTransform: "uppercase",
              marginBottom: 8,
              letterSpacing: ".01em",
              color: "var(--ink)",
            }}
          >
            {section.text}
          </div>
        );
      case "meta":
        return (
          <div
            style={{
              textAlign: "center",
              color: "var(--ink-soft)",
              fontSize: 13,
              marginBottom: 4,
            }}
          >
            {section.text}
          </div>
        );
      case "intro":
        return (
          <p
            style={{
              margin: "16px 0",
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--ink)",
            }}
          >
            {section.text}
          </p>
        );
      case "party":
        return (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              padding: "12px 16px",
              borderRadius: 6,
              margin: "12px 0",
              whiteSpace: "pre-line",
              fontSize: 13.5,
              lineHeight: 1.65,
              color: "var(--ink)",
            }}
          >
            {section.text}
          </div>
        );
      case "article-heading":
        return (
          <div
            id={section.id}
            style={{
              textTransform: "uppercase",
              fontWeight: 700,
              fontSize: 15,
              marginTop: 28,
              marginBottom: 8,
              color: "var(--primary)",
              letterSpacing: ".01em",
            }}
          >
            {section.text}
          </div>
        );
      case "clause":
        return (
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              margin: "6px 0",
              color: "var(--ink)",
              whiteSpace: "pre-line",
            }}
          >
            {section.text}
          </p>
        );
      case "signing":
        return (
          <div
            style={{
              textAlign: "center",
              marginTop: 32,
              whiteSpace: "pre-line",
              fontSize: 14,
              lineHeight: 1.8,
              color: "var(--ink)",
            }}
          >
            {section.text}
          </div>
        );
      case "appendix-heading":
        return (
          <div
            id={section.id}
            style={{
              fontWeight: 700,
              fontSize: 15,
              textTransform: "uppercase",
              color: "var(--ink)",
              marginTop: 40,
              marginBottom: 4,
              paddingTop: 24,
              borderTop: "2px solid var(--line-strong, #d1d5db)",
              textAlign: "center",
              letterSpacing: ".02em",
            }}
          >
            {section.text}
          </div>
        );
      case "device-table":
        if (!section.devices?.length) return null;
        return (
          <div style={{ overflowX: "auto", margin: "14px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, lineHeight: 1.5 }}>
              <thead>
                <tr style={{ background: "var(--surface-2, #f5f5f7)" }}>
                  <th style={{ border: "1px solid #d1d5db", padding: "7px 10px", textAlign: "center", fontWeight: 700, width: 36 }}>STT</th>
                  <th style={{ border: "1px solid #d1d5db", padding: "7px 10px", textAlign: "left", fontWeight: 700 }}>Đồ đạc và thiết bị</th>
                  <th style={{ border: "1px solid #d1d5db", padding: "7px 10px", textAlign: "center", fontWeight: 700, width: 50 }}>ĐVT</th>
                  <th style={{ border: "1px solid #d1d5db", padding: "7px 10px", textAlign: "center", fontWeight: 700, width: 70 }}>Số lượng</th>
                  <th style={{ border: "1px solid #d1d5db", padding: "7px 10px", textAlign: "center", fontWeight: 700, width: 110 }}>Tình trạng</th>
                </tr>
              </thead>
              <tbody>
                {section.devices.map((device, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? "white" : "var(--surface, #fafafa)" }}>
                    <td style={{ border: "1px solid #d1d5db", padding: "6px 10px", textAlign: "center", color: "var(--ink-faint)" }}>{idx + 1}</td>
                    <td style={{ border: "1px solid #d1d5db", padding: "6px 10px", color: "var(--ink)" }}>{device.ten}</td>
                    <td style={{ border: "1px solid #d1d5db", padding: "6px 10px", textAlign: "center", color: "var(--ink-soft)" }}>{device.dvt}</td>
                    <td style={{ border: "1px solid #d1d5db", padding: "6px 10px", textAlign: "center", color: "var(--ink-soft)", fontVariantNumeric: "tabular-nums" }}>
                      {String(device.so_luong).padStart(2, "0")}
                    </td>
                    <td style={{ border: "1px solid #d1d5db", padding: "6px 10px", textAlign: "center", color: "var(--risk-khong, #16a34a)", fontWeight: 500 }}>{device.tinh_trang}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  })();

  if (section.unfavorable) {
    return (
      <div
        style={{
          ...baseStyle,
          background: "rgba(220, 38, 38, 0.06)",
          borderLeft: "3px solid #dc2626",
          padding: "6px 10px 6px 14px",
          borderRadius: "0 6px 6px 0",
          margin: "4px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              color: "#dc2626",
              background: "rgba(220, 38, 38, 0.1)",
              padding: "2px 7px",
              borderRadius: 4,
              letterSpacing: ".02em",
            }}
          >
            ⚠ Bất lợi
          </span>
        </div>
        {content}
        {section.note && (
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "#dc2626",
              fontStyle: "italic",
              opacity: 0.85,
              lineHeight: 1.5,
            }}
          >
            {section.note}
          </p>
        )}
      </div>
    );
  }

  return <div style={baseStyle}>{content}</div>;
}

/* ---- Editor sub-view ---- */
function EditorView({
  template,
  onBack,
  onAnalyze,
}: {
  template: ContractTemplate;
  onBack: () => void;
  onAnalyze: (input: UploadInput) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadTemplateDocx(template);
    } finally {
      setDownloading(false);
    }
  }, [template]);

  const handleAnalyze = useCallback(async () => {
    // Template có kết quả phân tích chạy sẵn → phát lại, không gọi backend.
    if (hasTemplateAnalysis(template.id)) {
      onAnalyze({ kind: "template", templateId: template.id, fileName: template.filename });
      return;
    }
    setAnalyzing(true);
    try {
      const blob = await createDocxBlob(template.content);
      const file = new File([blob], template.filename, {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      onAnalyze({ kind: "file", file });
    } finally {
      setAnalyzing(false);
    }
  }, [template, onAnalyze]);

  const scrollToSection = useCallback((sectionId: string) => {
    const el = docRef.current?.querySelector(`#${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const articleHeadings = template.sections.filter((s) => s.type === "article-heading" || s.type === "appendix-heading");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Header bar */}
      <div style={{ padding: "16px 24px 0", flexShrink: 0 }}>
        {/* Back */}
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "none",
            border: "none",
            color: "var(--ink-soft)",
            fontSize: 13.5,
            fontWeight: 500,
            cursor: "pointer",
            marginBottom: 20,
            padding: "4px 0",
            fontFamily: "inherit",
          }}
        >
          <Icon.arrow style={{ width: 15, height: 15, transform: "rotate(180deg)" }} />
          Chọn mẫu khác
        </button>

        {/* Title + actions */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "var(--ink)",
                margin: "0 0 4px",
                letterSpacing: "-.02em",
              }}
            >
              {template.title}
            </h2>
            <p style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: 0 }}>{template.subtitle}</p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn btn-ghost btn-download-docx"
              style={{
                gap: 6,
                padding: "8px 18px",
                borderRadius: 8,
                border: "1.5px solid var(--line-strong)",
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
                cursor: downloading ? "wait" : "pointer",
                opacity: downloading ? 0.7 : 1,
              }}
            >
              <svg
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              {downloading ? "Đang tạo..." : "Tải .docx"}
            </button>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn btn-primary"
              style={{ fontSize: 13, padding: "8px 14px", borderRadius: 8, opacity: analyzing ? 0.7 : 1, cursor: analyzing ? "wait" : "pointer" }}
            >
              {analyzing
                ? <span className="spinner" style={{ width: 13, height: 13 }} />
                : <Icon.warn style={{ width: 13, height: 13 }} />}
              {analyzing ? "Đang chuẩn bị..." : "Phân tích ngay"}
            </button>
          </div>
        </div>

        {/* Info tip */}
        <div
          style={{
            background: "var(--primary-tint)",
            border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
            borderRadius: "var(--radius-sm)",
            padding: "9px 13px",
            marginBottom: 14,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <Icon.info
            style={{ width: 14, height: 14, color: "var(--primary)", flexShrink: 0, marginTop: 2 }}
          />
          <span style={{ fontSize: 12.5, color: "var(--primary-ink)", lineHeight: 1.5 }}>
            Đây là mẫu hợp đồng với thông tin minh họa. Các điều khoản tô đỏ cần chú ý đặc biệt trước khi ký.
            Nhấn <strong>Phân tích ngay</strong> để AI kiểm tra hoặc <strong>Tải .docx</strong> để chỉnh sửa.
          </span>
        </div>
      </div>

      {/* Body: TOC + Document */}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          borderTop: "1px solid var(--line)",
        }}
      >
        {/* Left TOC panel */}
        <div
          style={{
            width: 240,
            flexShrink: 0,
            background: "var(--surface-2, #f8f8fa)",
            borderRight: "1px solid var(--line)",
            overflowY: "auto",
            padding: "16px 12px",
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              marginBottom: 10,
              paddingLeft: 8,
            }}
          >
            Mục lục
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {articleHeadings.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 8px",
                  fontSize: 12.5,
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  lineHeight: 1.45,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  transition: "background 0.12s, color 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--surface)";
                  e.currentTarget.style.color = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "var(--ink-soft)";
                }}
                title={section.text}
              >
                {section.text}
              </button>
            ))}
          </div>
        </div>

        {/* Right document panel */}
        <div
          ref={docRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px 48px",
            background: "white",
          }}
        >
          {template.sections.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))}

          <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
            <Disclaimer />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Thẻ hợp đồng mẫu (dùng cho cả mục Phân tích và mục So sánh) ---- */
function TemplateCard({
  template,
  tags,
  badge,
  onSelect,
  maxHighlights,
}: {
  template: ContractTemplate;
  tags: string[];
  /** Nhãn nhỏ phân biệt vai trò trong cặp so sánh, vd. "Bản gốc" / "Bản đã sửa". */
  badge?: { text: string; color: string };
  onSelect: (t: ContractTemplate) => void;
  /** Giới hạn số điểm nổi bật hiển thị — dùng cho ô bento hẹp hơn (mặc định hiện hết). */
  maxHighlights?: number;
}) {
  const highlights = HIGHLIGHTS[template.id].slice(0, maxHighlights);
  return (
    <button className="tmpl-card" onClick={() => onSelect(template)}>
      <div className="tmpl-card-head">
        <div className="tmpl-ic">
          <Icon.template style={{ width: 19, height: 19 }} />
        </div>
        {badge && (
          <span
            className="tmpl-badge"
            style={{ color: badge.color, background: `color-mix(in srgb, ${badge.color} 14%, transparent)` }}
          >
            {badge.text}
          </span>
        )}
      </div>

      <div className="tmpl-title">{template.title}</div>
      <div className="tmpl-desc">{template.subtitle}</div>

      <ul className="tmpl-highlights">
        {highlights.map((h) => (
          <li key={h}>
            <Icon.check />
            {h}
          </li>
        ))}
      </ul>

      <div className="tmpl-tags">
        {tags.map((tag) => (
          <span key={tag} className="tmpl-tag">
            {tag}
          </span>
        ))}
      </div>

      <div className="tmpl-cta">
        Xem &amp; chỉnh sửa
        <Icon.arrow />
      </div>
    </button>
  );
}

/* ---- Selection view ---- */
function SelectionView({
  onSelect,
  onCompareTemplate,
}: {
  onSelect: (t: ContractTemplate) => void;
  onCompareTemplate: (templateId: string) => void;
}) {
  return (
    <div className="projects-page">
      <div className="tmpl-page-head">
        <div>
          <div className="tmpl-page-eyebrow">
            <Icon.doc style={{ width: 13, height: 13 }} />
            Thư viện tài nguyên
          </div>
          <h1 className="tmpl-page-title">
            Hợp đồng <span className="accent">mẫu</span>
          </h1>
          <p className="tmpl-page-sub">Xem, điền thông tin, tải .docx hoặc phân tích ngay bằng AI.</p>
        </div>
        <div className="tmpl-page-stat">
          <span>
            <b>{TEMPLATES.length + 2}</b> mẫu
          </span>
          <span className="sep">·</span>
          <span>Luật Nhà ở 2023</span>
        </div>
      </div>

      <div className="tmpl-bento">
        <div className="tmpl-feature">
          <div className="tmpl-feature-eyebrow">Tính năng nổi bật</div>
          <h2>So sánh hợp đồng</h2>
          <p className="tmpl-feature-desc">
            Cặp hợp đồng minh hoạ: bản gốc nhiều điều khoản bất lợi và bản đã chỉnh sửa công bằng hơn — dùng để
            xem trước tính năng so sánh hợp đồng.
          </p>
          <div className="tmpl-feature-vs">
            <button className="tmpl-feature-mini" onClick={() => onSelect(MUA_BAN_CAN_HO)}>
              <span className="lbl">Bản gốc</span>
              <span className="name">{MUA_BAN_CAN_HO.title}</span>
            </button>
            <Icon.arrow className="tmpl-feature-arrow" />
            <button className="tmpl-feature-mini" onClick={() => onSelect(MUA_BAN_CAN_HO_V2)}>
              <span className="lbl">Bản đã sửa</span>
              <span className="name">{MUA_BAN_CAN_HO_V2.subtitle}</span>
            </button>
          </div>
          <ul className="tmpl-feature-highlights">
            <li>
              <Icon.check style={{ width: 14, height: 14 }} />
              Đối chiếu từng điều khoản giữa 2 bản để tìm thay đổi
            </li>
            <li>
              <Icon.check style={{ width: 14, height: 14 }} />
              Đánh giá lại mức rủi ro sau khi chỉnh sửa — tăng, giảm hay giữ nguyên
            </li>
            <li>
              <Icon.check style={{ width: 14, height: 14 }} />
              Không cần tải file lên — xem ngay kết quả demo dựng sẵn
            </li>
          </ul>
          <button className="tmpl-feature-cta" onClick={() => onCompareTemplate(MUA_BAN_CAN_HO_V2.id)}>
            <Icon.compare style={{ width: 15, height: 15 }} />
            Xem kết quả so sánh mẫu
          </button>
        </div>

        {TEMPLATES.map((template) => (
          <div className="tmpl-side" key={template.id}>
            <TemplateCard
              template={template}
              tags={["Tải .docx", "Phân tích AI"]}
              onSelect={onSelect}
              maxHighlights={2}
            />
          </div>
        ))}
      </div>

      <Disclaimer />
    </div>
  );
}

/* ---- Root export ---- */
export function TemplatesView({
  onAnalyze,
  onCompareTemplate,
}: {
  onAnalyze: (input: UploadInput) => void;
  onCompareTemplate: (templateId: string) => void;
}) {
  const [selected, setSelected] = useState<ContractTemplate | null>(null);

  if (selected) {
    return (
      <EditorView
        template={selected}
        onBack={() => setSelected(null)}
        onAnalyze={onAnalyze}
      />
    );
  }

  return <SelectionView onSelect={setSelected} onCompareTemplate={onCompareTemplate} />;
}
