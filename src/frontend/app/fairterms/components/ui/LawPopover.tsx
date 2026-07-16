"use client";
/* Popup căn cứ pháp lý — lắng nghe sự kiện show-law từ LawChip, link sang /van-ban. */
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import type { LegalCitation } from "../../lib/data";
import { resolveCitationLink } from "@/lib/api/legal-doc-resolver";

export function LawPopover() {
  const [law, setLaw] = useState<LegalCitation | null>(null);
  useEffect(() => {
    const h = (e: Event) => setLaw((e as CustomEvent<LegalCitation>).detail);
    window.addEventListener("show-law", h);
    return () => window.removeEventListener("show-law", h);
  }, []);
  if (!law) return null;
  const title = law.location || law.law_title || law.article || "Căn cứ pháp lý";
  const subtitle =
    law.location && law.law_title && !law.location.includes(law.law_title) ? law.law_title : null;
  const text =
    law.quote ||
    "Nội dung trích dẫn sẽ hiển thị khi điều luật này có trong kho văn bản đã lập chỉ mục.";
  const traceLink = resolveCitationLink(law);
  return (
    <div className="law-modal" onClick={() => setLaw(null)}>
      <div className="law-sheet rise" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "var(--primary-tint)",
              color: "var(--primary)",
              display: "grid",
              placeItems: "center",
              flex: "0 0 auto",
            }}
          >
            <Icon.scale style={{ width: 20, height: 20 }} />
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
              }}
            >
              Căn cứ pháp lý
            </div>
            <h3 style={{ fontSize: 19 }}>{title}</h3>
            {subtitle ? (
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>{subtitle}</div>
            ) : null}
          </div>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setLaw(null)}>
            <Icon.x style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>{text}</p>
        <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic" }}>
          Trích dẫn rút gọn phục vụ rà soát — vui lòng đối chiếu văn bản luật chính thức.
        </p>
        {traceLink ? (
          <a
            href={traceLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 16,
              padding: "9px 16px",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Xem trong văn bản đầy đủ
            <Icon.arrow style={{ width: 14, height: 14 }} />
          </a>
        ) : null}
      </div>
    </div>
  );
}
