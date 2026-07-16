"use client";
/* ============================================================
   HopDongAI — Shared UI primitives, ported from components.jsx
   ============================================================ */
import { useState, type CSSProperties } from "react";
import { Icon } from "./icons";
import { LUU_Y, type Conclusion, type LegalCitation, type RiskLevel } from "../../lib/data";

/* ---------- Risk vocabulary ---------- */
export const RISK_LABEL: Record<RiskLevel, string> = {
  cao: "Rủi ro cao",
  trung_binh: "Rủi ro trung bình",
  thap: "Rủi ro thấp",
  khong: "An toàn",
};
export const RISK_SHORT: Record<RiskLevel, string> = {
  cao: "Cao",
  trung_binh: "Trung bình",
  thap: "Thấp",
  khong: "Không",
};
export const RISK_CLASS: Record<RiskLevel, string> = {
  cao: "risk-cao",
  trung_binh: "risk-tb",
  thap: "risk-thap",
  khong: "risk-khong",
};
export const RISK_VAR: Record<RiskLevel, string> = {
  cao: "var(--risk-cao)",
  trung_binh: "var(--risk-tb)",
  thap: "var(--risk-thap)",
  khong: "var(--risk-khong)",
};
export const RISK_ORDER: Record<RiskLevel, number> = { cao: 0, trung_binh: 1, thap: 2, khong: 3 };

/* ---------- RiskBadge ---------- */
export function RiskBadge({ level, size }: { level: RiskLevel; size?: "sm" }) {
  return (
    <span
      className={"risk-badge " + RISK_CLASS[level]}
      style={size === "sm" ? { fontSize: 11, padding: "3px 9px" } : undefined}
    >
      <span className="dot"></span>
      {RISK_LABEL[level]}
    </span>
  );
}

/* ---------- ConclusionTag ---------- */
export function ConclusionTag({ value }: { value: Conclusion }) {
  const match = value === "MATCH";
  return (
    <span className={"concl " + (match ? "concl-match" : "concl-pass")}>
      {match ? <Icon.warn style={{ width: 13, height: 13 }} /> : <Icon.check style={{ width: 13, height: 13 }} />}
      {match ? "MATCH · Cảnh báo" : "PASS · An toàn"}
    </span>
  );
}

/* ---------- LawChip ---------- */
export function LawChip({ citation, onClick }: { citation: LegalCitation; onClick?: () => void }) {
  const handle =
    onClick ||
    (() => window.dispatchEvent(new CustomEvent<LegalCitation>("show-law", { detail: citation })));
  return (
    <button className="law-chip" onClick={handle} title="Tra cứu căn cứ pháp lý">
      <Icon.scale />
      {citation.location || citation.law_title || citation.article}
    </button>
  );
}

/* ---------- MissingField tag ---------- */
export function MissingTag() {
  return (
    <span className="missing-tag">
      <Icon.warn style={{ width: 11, height: 11 }} />
      Thiếu
    </span>
  );
}

/* ---------- CopyButton ---------- */
export function CopyButton({ text, label }: { text?: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    const t = String(text || "");
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = t;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        /* ignore */
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).catch(fallback);
    } else fallback();
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };
  return (
    <button className={"copy-btn" + (done ? " done" : "")} onClick={copy}>
      {done ? <Icon.check style={{ width: 14, height: 14 }} /> : <Icon.copy style={{ width: 14, height: 14 }} />}
      {done ? "Đã sao chép" : label || "Sao chép"}
    </button>
  );
}

/* ---------- Disclaimer ---------- */
export function Disclaimer({ text }: { text?: string }) {
  return (
    <div className="disclaimer">
      <Icon.info />
      <span>
        <b style={{ color: "var(--ink)" }}>Lưu ý:</b> {text || LUU_Y}
      </span>
    </div>
  );
}

/* shared inline style helpers used by ClauseMode result card */
export const lblStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "var(--ink-faint)",
  marginBottom: 6,
};
export const pStyle: CSSProperties = { margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" };
