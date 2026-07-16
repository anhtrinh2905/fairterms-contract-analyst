"use client";
/* ============================================================
   HopDongAI — Khung hiển thị kết quả so sánh hợp đồng (full-width,
   bento: đồng hồ sức khỏe + danh sách điều khoản lọc chung).
   Dùng chung cho màn hình live (CompareMode) và trang lịch sử
   /fairterms/history/compare/[id].
   ============================================================ */
import { useMemo, useState } from "react";
import { Icon } from "../ui/icons";
import { Disclaimer, LawChip, RiskBadge } from "../ui/primitives";
import { FeedbackWidget } from "../FeedbackWidget";
import type { LegalCitation, RiskLevel } from "../../lib/data";
import type { ClauseChangeKind, ClauseDiffSummary } from "@/lib/analysis/compare/clauseMatcher";
import type { DeltaVerdict } from "@/lib/api/types";
import type { OverallCompareVerdict } from "@/lib/analysis/analysis-api";

export interface CompareInfoRow {
  label: string;
  oldValue: string;
  newValue: string;
  changed: boolean;
}

/** Phân tích đầy đủ (từ /checklist/evaluate-clause) cho một điều khoản mới thêm. */
export interface CompareAddedAnalysis {
  mucRuiRo: RiskLevel;
  ketLuan: "MATCH" | "PASS";
  dieuKhoanLamGi: string;
  giaiThich: string;
  lyDo: string;
  deXuatSua: string;
  canCu: LegalCitation[];
}

export interface CompareClauseItem {
  kind: ClauseChangeKind;
  articleNo: string;
  articleTitle: string;
  oldText: string | null;
  newText: string | null;
  /** Đánh giá thay đổi có lợi/bất lợi cho Bên B (điều khoản sửa/thêm/xóa). */
  verdict?: DeltaVerdict;
  giaiThich?: string;
  /** Chỉ có ở điều khoản mới (kind === "added"): kết quả evaluate-clause. */
  analysis?: CompareAddedAnalysis | null;
}

export interface CompareResultData {
  summary: ClauseDiffSummary;
  overallVerdict: OverallCompareVerdict;
  overallSummary: string;
  info: { rows: CompareInfoRow[]; anyChanged: boolean };
  clauses: CompareClauseItem[];
}

const DELTA_LABEL: Record<DeltaVerdict, string> = {
  tot_hon: "Tốt hơn cho bạn",
  xau_hon: "Bất lợi hơn cho bạn",
  khong_doi: "Không đổi bản chất",
  can_luu_y: "Cần xem kỹ",
};

const DELTA_COLOR: Record<DeltaVerdict, string> = {
  tot_hon: "var(--risk-khong)",
  xau_hon: "var(--risk-cao)",
  khong_doi: "var(--ink-faint)",
  can_luu_y: "var(--risk-tb)",
};

/** Vạch màu bên trái của clause-card, suy ra từ verdict (hoặc "neutral" cho điều khoản không đổi). */
type Tone = "good" | "bad" | "watch" | "neutral";
const DELTA_TONE: Record<DeltaVerdict, Tone> = {
  tot_hon: "good",
  xau_hon: "bad",
  khong_doi: "neutral",
  can_luu_y: "watch",
};

const OVERALL_LABEL: Record<string, string> = {
  tot_hon: "Bản đã sửa CÓ LỢI hơn cho bạn",
  xau_hon: "Bản đã sửa BẤT LỢI hơn cho bạn",
  hon_hop: "Bản đã sửa vừa có lợi vừa có hại — cần xem kỹ",
  khong_doi: "Bản đã sửa không thay đổi đáng kể rủi ro",
};

const OVERALL_COLOR: Record<string, string> = {
  tot_hon: "var(--risk-khong)",
  xau_hon: "var(--risk-cao)",
  hon_hop: "var(--risk-tb)",
  khong_doi: "var(--ink-faint)",
};

export function DeltaBadge({ verdict }: { verdict: DeltaVerdict }) {
  const color = DELTA_COLOR[verdict];
  return (
    <span
      className="risk-badge"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)`, whiteSpace: "nowrap" }}
    >
      <span className="dot" />
      {DELTA_LABEL[verdict]}
    </span>
  );
}

/** Nhóm hiển thị cho một dòng "Thông tin chung" — suy từ nhãn cố định do buildInfoRows() tạo ra. */
function infoRowGroup(label: string): string {
  if (label.startsWith("Bên A") || label.startsWith("Bên B")) return "Bên A & Bên B";
  if (label === "Số hợp đồng" || label === "Thời hạn") return "Hợp đồng";
  return "Căn hộ";
}

/** Hai lớp lọc trên cùng một danh sách: theo loại thay đổi (tile thống kê) hoặc theo verdict (chip lọc). */
type ClauseFilter =
  | "all"
  | ClauseChangeKind
  | Extract<DeltaVerdict, "tot_hon" | "xau_hon" | "can_luu_y">
  | "neutral";

/** Lọc nhẹ, đơn giản, chỉ dùng để nhóm hiển thị — không đổi dữ liệu gốc. */
function matchesFilter(item: CompareClauseItem, filter: ClauseFilter): boolean {
  if (filter === "all") return true;
  if (filter === "neutral") return item.kind === "unchanged" || item.verdict === "khong_doi";
  if (filter === "modified" || filter === "added" || filter === "removed" || filter === "unchanged") {
    return item.kind === filter;
  }
  return item.verdict === filter;
}

function OldTextBlock({ text }: { text: string }) {
  return (
    <div className="cmp-old-block">
      <div className="cmp-block-label">Bản gốc</div>
      <p>{text}</p>
    </div>
  );
}

function NewTextBlock({ text }: { text: string }) {
  return (
    <div className="cmp-new-block">
      <div className="cmp-block-label">Bản đã sửa</div>
      <p>{text}</p>
    </div>
  );
}

/** Thẻ điều khoản hợp nhất — dùng cho cả 4 loại (sửa/mới/xoá/không đổi), vạch màu trái theo verdict. */
function ClauseCard({ item }: { item: CompareClauseItem }) {
  const tone: Tone = item.kind === "unchanged" ? "neutral" : item.verdict ? DELTA_TONE[item.verdict] : "neutral";
  return (
    <div className={`cmp-clause-card ${tone}`}>
      <div className="cmp-clause-head">
        <div>
          <span className="cmp-clause-article">{item.articleNo || "Điều khoản bổ sung"}</span>
          {item.articleTitle && <span className="cmp-clause-title">{item.articleTitle}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {item.kind === "added" && item.analysis && <RiskBadge level={item.analysis.mucRuiRo} size="sm" />}
          {item.verdict ? (
            <DeltaBadge verdict={item.verdict} />
          ) : (
            <span className="risk-badge" style={{ background: "var(--surface-2)", color: "var(--ink-faint)" }}>
              Không đổi
            </span>
          )}
        </div>
      </div>

      {item.oldText && <OldTextBlock text={item.oldText} />}
      {item.newText && <NewTextBlock text={item.newText} />}

      {item.giaiThich && (
        <p className="cmp-clause-note">
          <Icon.info style={{ width: 12, height: 12, marginRight: 4, verticalAlign: "-1px" }} />
          {item.giaiThich}
        </p>
      )}

      {item.analysis && (
        <>
          {item.analysis.giaiThich && !item.giaiThich && <p className="cmp-clause-note">{item.analysis.giaiThich}</p>}
          {item.analysis.ketLuan === "MATCH" && item.analysis.deXuatSua && (
            <div className="cmp-fix-block">
              <div className="cmp-block-label">Gợi ý điều chỉnh</div>
              <p>{item.analysis.deXuatSua}</p>
            </div>
          )}
          {item.analysis.canCu.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {item.analysis.canCu.map((c, i) => (
                <LawChip key={i} citation={c} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CompareResultView({
  data,
  headerTitle,
  headerSubtitle,
  onBack,
  warningMessage,
  comparisonId,
}: {
  data: CompareResultData;
  headerTitle: string;
  headerSubtitle?: string;
  onBack?: () => void;
  warningMessage?: string;
  comparisonId?: string;
}) {
  const [filter, setFilter] = useState<ClauseFilter>("all");

  const overallColor = OVERALL_COLOR[data.overallVerdict] ?? "var(--ink-faint)";
  const total = data.clauses.length || 1;

  const counts = {
    tot_hon: data.clauses.filter((c) => c.verdict === "tot_hon").length,
    xau_hon: data.clauses.filter((c) => c.verdict === "xau_hon").length,
    can_luu_y: data.clauses.filter((c) => c.verdict === "can_luu_y").length,
    neutral: data.clauses.filter((c) => c.kind === "unchanged" || c.verdict === "khong_doi").length,
  };

  const filters: Array<{ key: ClauseFilter; label: string; count: number }> = [
    { key: "all", label: "Tất cả", count: data.clauses.length },
    { key: "tot_hon", label: "Tốt hơn", count: counts.tot_hon },
    { key: "xau_hon", label: "Bất lợi hơn", count: counts.xau_hon },
    { key: "can_luu_y", label: "Cần xem kỹ", count: counts.can_luu_y },
    { key: "neutral", label: "Không đổi thực chất", count: counts.neutral },
  ];

  const visibleClauses = useMemo(
    () => data.clauses.filter((c) => matchesFilter(c, filter)),
    [data.clauses, filter],
  );

  const changedInfoLabels = data.info.rows.filter((r) => r.changed).map((r) => r.label);
  const infoGroups = useMemo(() => {
    const groups = new Map<string, CompareInfoRow[]>();
    for (const row of data.info.rows) {
      const g = infoRowGroup(row.label);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(row);
    }
    return Array.from(groups.entries());
  }, [data.info.rows]);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column" }}>
      {/* Topbar */}
      <div className="cmp-topbar">
        {onBack && (
          <button className="btn btn-ghost" onClick={onBack} style={{ gap: 6, padding: "6px 12px", width: "auto", height: "auto", marginTop: 0 }}>
            <Icon.arrow style={{ width: 14, height: 14, transform: "rotate(180deg)" }} />
            Quay lại
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>{headerTitle}</h2>
          {headerSubtitle && (
            <p style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {headerSubtitle}
            </p>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <span
          className="risk-badge"
          style={{ color: overallColor, background: `color-mix(in srgb, ${overallColor} 14%, transparent)`, whiteSpace: "nowrap" }}
        >
          <span className="dot" />
          {OVERALL_LABEL[data.overallVerdict] ?? data.overallVerdict}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 28px 60px", display: "flex", flexDirection: "column", gap: 18 }}>
        {warningMessage && (
          <div className="card" style={{ padding: "14px 18px", background: "var(--risk-cao-bg)", border: "1px solid var(--line)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon.warn style={{ width: 18, height: 18, color: "var(--risk-cao)", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{warningMessage}</span>
          </div>
        )}
        <div className="cmp-bento">
          {/* Đồng hồ sức khỏe */}
          <div className="card cmp-health">
            <div className="cmp-health-top">
              <div className="cmp-health-label">Đánh giá tổng quan thay đổi</div>
              <span className="risk-badge" style={{ color: overallColor, background: `color-mix(in srgb, ${overallColor} 14%, transparent)` }}>
                <span className="dot" />
                {OVERALL_LABEL[data.overallVerdict] ?? data.overallVerdict}
              </span>
            </div>
            <div className="cmp-health-bar">
              <span style={{ width: `${(data.summary.modified / total) * 100}%`, background: "var(--primary)" }} title={`${data.summary.modified} đã sửa`} />
              <span style={{ width: `${(data.summary.added / total) * 100}%`, background: "var(--risk-khong)" }} title={`${data.summary.added} mới`} />
              <span style={{ width: `${(data.summary.removed / total) * 100}%`, background: "var(--risk-cao)" }} title={`${data.summary.removed} bị xóa`} />
              <span style={{ width: `${(data.summary.unchanged / total) * 100}%`, background: "var(--ink-faint)" }} title={`${data.summary.unchanged} không đổi`} />
            </div>
            <div className="cmp-health-legend">
              <span><span className="sw" style={{ background: "var(--primary)" }} />{data.summary.modified} đã sửa</span>
              <span><span className="sw" style={{ background: "var(--risk-khong)" }} />{data.summary.added} mới</span>
              <span><span className="sw" style={{ background: "var(--risk-cao)" }} />{data.summary.removed} bị xóa</span>
              <span><span className="sw" style={{ background: "var(--ink-faint)" }} />{data.summary.unchanged} không đổi</span>
            </div>
            <p className="cmp-health-summary">{data.overallSummary}</p>
          </div>

          {/* Thông tin hợp đồng — nhanh */}
          <div className="card cmp-info-mini">
            <div className="cmp-info-mini-label">Thông tin hợp đồng</div>
            <div className="cmp-info-mini-stat">
              {changedInfoLabels.length}
              <span>/{data.info.rows.length} mục thay đổi</span>
            </div>
            <div className="cmp-info-mini-desc">
              {changedInfoLabels.length === 0
                ? "Toàn bộ thông tin căn hộ, hợp đồng và hai bên giữ nguyên."
                : `Chỉ ${changedInfoLabels.join(", ")} thay đổi. Các mục còn lại giữ nguyên.`}
            </div>
          </div>

          {/* Thống kê điều khoản — bấm để lọc */}
          <div className="cmp-stats-row">
            {[
              { key: "all" as ClauseFilter, num: data.clauses.length, label: "Tổng điều khoản", icon: <Icon.compare style={{ width: 18, height: 18 }} />, bg: "var(--primary-tint)", fg: "var(--primary)" },
              { key: "modified" as ClauseFilter, num: data.summary.modified, label: "Đã sửa", icon: <Icon.doc style={{ width: 18, height: 18 }} />, bg: "var(--primary-tint)", fg: "var(--primary)" },
              { key: "added" as ClauseFilter, num: data.summary.added, label: "Điều khoản mới", icon: <Icon.check style={{ width: 18, height: 18 }} />, bg: "var(--risk-khong-bg, color-mix(in srgb, var(--risk-khong) 14%, transparent))", fg: "var(--risk-khong)" },
              { key: "removed" as ClauseFilter, num: data.summary.removed, label: "Bị xóa", icon: <Icon.warn style={{ width: 18, height: 18 }} />, bg: "var(--risk-cao-bg)", fg: "var(--risk-cao)" },
              { key: "unchanged" as ClauseFilter, num: data.summary.unchanged, label: "Không đổi", icon: <Icon.check style={{ width: 18, height: 18 }} />, bg: "var(--surface-2)", fg: "var(--ink-faint)" },
            ].map((s, i) => (
              <button key={i} className={`card cmp-stat-tile${filter === s.key ? " selected" : ""}`} onClick={() => setFilter(s.key)}>
                <span className="cmp-stat-ic" style={{ background: s.bg, color: s.fg }}>{s.icon}</span>
                <div>
                  <div className="cmp-stat-num">{s.num}</div>
                  <div className="cmp-stat-lbl">{s.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Thông tin chung — căn hộ, hợp đồng, hai bên */}
        <div className="card cmp-info-card">
          <div className="cmp-info-card-head">
            <Icon.info style={{ width: 18, height: 18, color: "var(--primary)" }} />
            <h3>Thông tin chung</h3>
            <span
              className="risk-badge"
              style={{
                marginLeft: "auto",
                color: data.info.anyChanged ? "var(--risk-tb)" : "var(--ink-faint)",
                background: data.info.anyChanged ? "var(--risk-tb-bg, color-mix(in srgb, var(--risk-tb) 14%, transparent))" : "var(--surface-2)",
              }}
            >
              {changedInfoLabels.length}/{data.info.rows.length} mục thay đổi
            </span>
          </div>
          {infoGroups.map(([group, rows]) => (
            <div key={group}>
              <div className="cmp-info-group-label">{group}</div>
              {rows.map((row) => (
                <div key={row.label} className={`cmp-info-row${row.changed ? " changed" : ""}`}>
                  <span className="lbl">{row.label}</span>
                  <span className="old">{row.oldValue || "—"}</span>
                  <span className="new">{row.changed ? row.newValue || "—" : "— không đổi —"}</span>
                  {row.changed && <span className="status risk-badge" style={{ color: "var(--risk-tb)", background: "color-mix(in srgb, var(--risk-tb) 14%, transparent)" }}>Đã đổi</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Bộ lọc + danh sách điều khoản hợp nhất */}
        <div className="cmp-filter-row">
          {filters.map((f) => (
            <button key={f.key} className={`cmp-filter-chip${filter === f.key ? " active" : ""}`} onClick={() => setFilter(f.key)}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {visibleClauses.length === 0 ? (
          <div className="card" style={{ padding: "32px 24px", textAlign: "center", color: "var(--ink-faint)", fontSize: 14 }}>
            Không có điều khoản nào khớp bộ lọc này.
          </div>
        ) : (
          visibleClauses.map((item, idx) => <ClauseCard key={idx} item={item} />)
        )}

        {comparisonId && (
          <FeedbackWidget analysisType="compare" analysisId={comparisonId} />
        )}

        <Disclaimer />
      </div>
    </div>
  );
}
