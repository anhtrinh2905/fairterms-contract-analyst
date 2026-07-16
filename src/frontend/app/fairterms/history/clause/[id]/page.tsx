"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getClauseAnalysis, type ClauseAnalysisDetail } from "@/lib/analysis/analysis-api";
import { Icon } from "@/app/fairterms/components/ui/icons";
import { ResultCard } from "@/app/fairterms/components/analysis/ClauseMode";
import { FeedbackWidget } from "@/app/fairterms/components/FeedbackWidget";
import { mapEvaluateResponseToAnalysis } from "@/lib/api/mappers";
import type { LegalCitation, EvaluateClauseResponse } from "@/lib/api/types";
import type { Analysis, RiskLevel, Conclusion, BenSide } from "@/app/fairterms/lib/data";
import { resolveCitationLink } from "@/lib/api/legal-doc-resolver";
import "@/app/fairterms.css";

// Helper to format Date nicely
function formatDate(value: string | Date): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
}

// Helper to calculate days remaining
function getDaysRemaining(value: string | Date): number {
  const diffTime = new Date(value).getTime() - new Date().getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

// Friendly Contract Type mapping
function getFriendlyContractType(type: string): string {
  const typeMap: Record<string, string> = {
    cho_thue_can_ho_chung_cu: "Thuê căn hộ chung cư",
    mua_ban_can_ho_chung_cu: "Mua bán căn hộ chung cư",
    unknown: "Hợp đồng bất động sản",
  };
  return typeMap[type] || type;
}

const LawPopover = () => {
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

function mapDbClauseToAnalysis(data: ClauseAnalysisDetail): Analysis {
  const analysisResult = data.analysisResult as Record<string, unknown> | null;

  // 1. If it's a nested EvaluateClauseResponse (contains 'danh_gia')
  if (analysisResult && typeof analysisResult === "object" && "danh_gia" in analysisResult && analysisResult.danh_gia) {
    return mapEvaluateResponseToAnalysis(
      data.clauseText || "",
      analysisResult as unknown as EvaluateClauseResponse,
      data.id,
      data.articleNo || undefined
    );
  }

  // 2. If it's a flat legacy/v1 object or mapped Analysis (contains 'giai_thich' or 'dieu_khoan_lam_gi')
  if (analysisResult && typeof analysisResult === "object" && !("error" in analysisResult)) {
    return {
      id: data.id,
      so_dieu: data.articleNo || undefined,
      dieu_khoan_noi_ve_ben: (analysisResult.dieu_khoan_noi_ve_ben as BenSide) || "ben_b",
      dieu_khoan_lam_gi: (analysisResult.dieu_khoan_lam_gi as string) ?? data.conclusion ?? "Phân tích điều khoản",
      ket_luan: ((analysisResult.ket_luan as Conclusion) || (data.conclusion === "MATCH" ? "MATCH" : "PASS")),
      muc_rui_ro: ((analysisResult.muc_rui_ro as RiskLevel) || data.riskLevel || "khong"),
      trich_dan: (analysisResult.trich_dan as string) ?? data.clauseText ?? "",
      giai_thich: (analysisResult.giai_thich as string) ?? "",
      ly_do: (analysisResult.ly_do as string) ?? "",
      can_cu: ((analysisResult.can_cu as LegalCitation[]) || data.legalBasis || []),
      de_xuat_sua: (analysisResult.de_xuat_sua as string) ?? data.suggestion ?? "",
      tin_nhan: (analysisResult.tin_nhan as string) ?? data.negotiationMessage ?? "",
    };
  }

  // 3. Fallback to DB columns
  return {
    id: data.id,
    so_dieu: data.articleNo || undefined,
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Phân tích điều khoản",
    ket_luan: data.conclusion === "MATCH" ? "MATCH" : "PASS",
    muc_rui_ro: (data.riskLevel || "khong") as RiskLevel,
    trich_dan: data.clauseText || "",
    giai_thich: "",
    ly_do: "",
    can_cu: (data.legalBasis || []) as LegalCitation[],
    de_xuat_sua: data.suggestion || "",
    tin_nhan: data.negotiationMessage || "",
  };
}

export default function ClauseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClauseAnalysisDetail | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getClauseAnalysis(id)
      .then((res) => {
        setData(res);
        setAnalysis(mapDbClauseToAnalysis(res));
        setError(null);
      })
      .catch((err) => {
        console.error(`[GET /fairterms/history/clause/${id}] Error:`, err);
        setError(err.message || "Đã xảy ra lỗi khi tải thông tin phân tích điều khoản.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="app-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--background)" }}>
        <div style={{ textAlign: "center", color: "var(--ink-faint)" }}>
          <div className="spinner" style={{ border: "3px solid var(--line)", borderTop: "3px solid var(--primary)", borderRadius: "50%", width: 36, height: 36, animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
          <p style={{ fontSize: 14.5, fontWeight: 500 }}>Đang tải phân tích điều khoản...</p>
          <style jsx global>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error || !data || !analysis) {
    return (
      <div className="app-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--background)", padding: 24 }}>
        <div className="card" style={{ maxWidth: 500, width: "100%", padding: 32, textAlign: "center", borderColor: "var(--risk-cao)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--risk-cao-bg)", color: "var(--risk-cao)", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
            <Icon.warn style={{ width: 28, height: 28 }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "var(--ink)" }}>Không thể tải kết quả</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 14.5, lineHeight: 1.6, marginBottom: 24 }}>
            {error || "Kết quả phân tích điều khoản không tìm thấy hoặc đã hết hạn lưu trữ."}
          </p>
          <Link href="/app" className="btn btn-primary" style={{ display: "inline-flex", textDecoration: "none" }}>
            Quay lại bảng điều khiển
          </Link>
        </div>
      </div>
    );
  }

  const daysLeft = getDaysRemaining(data.expiresAt);
  const friendlyContractType = getFriendlyContractType(data.contractType);

  // Back navigation path: back to parent contract detail or dashboard
  const backUrl = data.source === "contract" && data.contractAnalysisId
    ? `/fairterms/history/contract/${data.contractAnalysisId}`
    : "/app";

  const backLabel = data.source === "contract" && data.contract?.fileName
    ? `Quay lại: ${data.contract.title || data.contract.fileName}`
    : "Quay lại bảng điều khiển";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--background)" }}>
      {/* Header bar */}
      <header style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)", padding: "16px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href={backUrl} className="btn btn-ghost" style={{ gap: 6, paddingLeft: 8, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              <Icon.arrow style={{ width: 15, height: 15, transform: "rotate(180deg)" }} />
              {backLabel}
            </Link>
            <div style={{ width: 1, height: 20, background: "var(--line)" }}></div>
            <div>
              <h1 style={{ fontSize: 16.5, fontWeight: 700, color: "var(--ink)", margin: 0, fontFamily: "var(--font-display)" }}>
                {data.articleNo || "Điều khoản bổ sung"}
              </h1>
              <p style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: 0 }}>
                Rà soát nhanh · Loại HĐ: {friendlyContractType} · Ngày rà soát: {formatDate(data.createdAt)}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {daysLeft > 0 ? (
              <span className="pii-badge" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                <Icon.info style={{ width: 13, height: 13 }} />
                Còn {daysLeft} ngày lưu trữ
              </span>
            ) : (
              <span className="pii-badge" style={{ background: "var(--risk-cao-bg)", color: "var(--risk-cao)" }}>
                <Icon.warn style={{ width: 13, height: 13 }} />
                Hết hạn hôm nay
              </span>
            )}
            <span className="pii-badge">
              <Icon.eye style={{ width: 13, height: 13 }} />
              Dữ liệu bảo mật
            </span>
          </div>
        </div>
      </header>

      {/* Page Layout */}
      <main className="wrap" style={{ flex: 1, padding: "24px 0 60px", display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Left Column: Result Detail Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <ResultCard r={analysis} />
          <FeedbackWidget analysisType="clause" analysisId={data.id} />
        </div>

        {/* Right Column: Metadata details summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Metadata details card */}
          <div className="card" style={{ padding: "24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 16 }}>Thông tin rà soát</div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                <span style={{ fontSize: 13.5, color: "var(--ink-faint)" }}>Loại giao dịch</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{friendlyContractType}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: data.source === "contract" && data.contract ? "1px solid var(--line)" : "none",
                  paddingBottom: data.source === "contract" && data.contract ? 8 : 0,
                }}
              >
                <span style={{ fontSize: 13.5, color: "var(--ink-faint)" }}>Nguồn rà soát</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                  {data.source === "contract" ? "Hợp đồng của tôi" : "Điều khoản đơn lẻ"}
                </span>
              </div>
              {data.source === "contract" && data.contract && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13.5, color: "var(--ink-faint)" }}>Hợp đồng cha</span>
                  <Link href={`/fairterms/history/contract/${data.contractAnalysisId}`} style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
                    {data.contract.title || data.contract.fileName} &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Retention info card */}
          <div className="card" style={{ padding: "20px 22px", background: "var(--surface-2)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Icon.info style={{ width: 16, height: 16, color: "var(--primary)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <h4 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px 0" }}>Bảo vệ thông tin</h4>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-faint)" }}>
                  Các thông tin rà soát và căn cứ pháp lý được tham chiếu chuẩn xác từ hệ thống dữ liệu luật bất động sản Việt Nam. Bản ghi sẽ hết hạn lưu trữ vào ngày {formatDate(data.expiresAt)}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <LawPopover />
    </div>
  );
}
