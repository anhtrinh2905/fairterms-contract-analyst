"use client";
/* ============================================================
   TemplateViewer — Xem, chỉnh sửa, tải và phân tích hợp đồng mẫu
   ============================================================ */
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "../../fairterms/components/ui/LogoMark";
import type { ContractTemplate } from "../contracts";
import { downloadAsDocx, downloadTemplateDocx } from "../download";
import { hasTemplateAnalysis } from "../template-analysis";

const PRELOAD_KEY = "fairterms.preload_clause";
const PRELOAD_TEMPLATE_KEY = "fairterms.preload_template";


export default function TemplateViewer({ template }: { template: ContractTemplate }) {
  const router = useRouter();
  const [text, setText] = useState(template.content);
  const [downloading, setDownloading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      // Nội dung gốc → xuất bản docx dựng từ sections (có quốc hiệu, bảng phụ lục);
      // người dùng đã chỉnh sửa → xuất từ text hiện tại.
      if (text === template.content) {
        await downloadTemplateDocx(template);
      } else {
        await downloadAsDocx(text, template.filename);
      }
    } finally {
      setDownloading(false);
    }
  }, [text, template]);

  const handleAnalyze = useCallback(() => {
    try {
      // Template chưa chỉnh sửa và có kết quả chạy sẵn → phát lại phân tích, không gọi backend.
      if (hasTemplateAnalysis(template.id) && text === template.content) {
        localStorage.setItem(PRELOAD_TEMPLATE_KEY, template.id);
      } else {
        localStorage.setItem(PRELOAD_KEY, text);
      }
    } catch {
      /* ignore */
    }
    router.push("/app");
  }, [text, template, router]);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--paper)", fontFamily: "var(--font-body)" }}>

      {/* ===== Sticky header ===== */}
      <header
        style={{
          borderBottom: "1px solid var(--line)",
          background: "var(--paper)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {/* Logo + breadcrumb */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--ink)" }}>
            <LogoMark size={28} />
          </Link>
          <span style={{ color: "var(--line-strong)", fontSize: 16 }}>/</span>
          <Link href="/hop-dong-mau" style={{ color: "var(--ink-soft)", fontSize: 13.5, textDecoration: "none", fontWeight: 500 }}>
            Hợp đồng mẫu
          </Link>
          <span style={{ color: "var(--line-strong)", fontSize: 16 }}>/</span>
          <span style={{ color: "var(--ink)", fontSize: 13.5, fontWeight: 600, maxWidth: "22ch", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {template.title}
          </span>

          {/* Actions */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
              {charCount.toLocaleString("vi")} ký tự · {wordCount.toLocaleString("vi")} từ
            </span>
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                borderRadius: 8,
                border: "1.5px solid var(--line-strong)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: downloading ? "wait" : "pointer",
                opacity: downloading ? 0.7 : 1,
                transition: "opacity .15s",
              }}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {downloading ? "Đang tạo..." : "Tải .docx"}
            </button>
            <button
              onClick={handleAnalyze}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                background: "var(--primary)",
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
                transition: "background .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--primary)")}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M12 3.5 21 19H3L12 3.5Z" /><path d="M12 10v4M12 17h.01" />
              </svg>
              Phân tích ngay
            </button>
          </div>
        </div>
      </header>

      {/* ===== Info bar ===== */}
      <div
        style={{
          background: "var(--primary-tint)",
          borderBottom: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
          padding: "10px 24px",
        }}
      >
        <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="15" height="15" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ flex: "0 0 auto" }}>
            <circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" />
          </svg>
          <span style={{ fontSize: 13, color: "var(--primary-ink)", lineHeight: 1.5 }}>
            <strong>Điền thông tin vào chỗ trống</strong> — tìm ký hiệu <code style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", padding: "1px 5px", borderRadius: 4 }}>___</code> và thay bằng thông tin thực. Sau đó tải .docx hoặc phân tích bằng AI.
          </span>
        </div>
      </div>

      {/* ===== Editor ===== */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 24px 40px" }}>
        <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>

          {/* Contract subtitle */}
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)", margin: 0 }}>{template.title}</h2>
              <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: "4px 0 0" }}>{template.subtitle}</p>
            </div>
            <button
              onClick={() => { setText(template.content); textareaRef.current?.focus(); }}
              style={{
                fontSize: 12.5,
                color: "var(--ink-faint)",
                background: "none",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "5px 11px",
                cursor: "pointer",
              }}
            >
              Khôi phục gốc
            </button>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1,
              minHeight: "70vh",
              width: "100%",
              padding: "28px 32px",
              fontSize: 14.5,
              lineHeight: 1.85,
              fontFamily: "'Times New Roman', Times, serif",
              color: "var(--ink)",
              background: "#fff",
              border: "1px solid var(--line-strong)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow-sm)",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </main>

      {/* ===== Footer disclaimer ===== */}
      <footer
        style={{
          borderTop: "1px solid var(--line)",
          padding: "16px 24px",
          background: "var(--paper-2)",
        }}
      >
        <p
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            fontSize: 12,
            color: "var(--ink-faint)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Đây là mẫu hợp đồng tham khảo, <strong style={{ color: "var(--ink-soft)" }}>không phải tư vấn pháp lý</strong>.
          Với giao dịch quan trọng, hãy tham khảo luật sư hoặc công chứng viên trước khi ký. ·{" "}
          <Link href="/hop-dong-mau" style={{ color: "var(--primary)", textDecoration: "none" }}>
            Xem mẫu khác
          </Link>
        </p>
      </footer>
    </div>
  );
}
