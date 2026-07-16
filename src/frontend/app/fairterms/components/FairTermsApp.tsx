"use client";
/* ============================================================
   HopDongAI — App shell v3 (sidebar + Tổng quan + per-tool workspaces)
   Mỗi công cụ có trang riêng: lịch sử + nút "Phân tích mới".
   ============================================================ */
import { useEffect, useMemo, useRef, useState } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "./ui/icons";
import { RiskBadge, Disclaimer, RISK_VAR, RISK_LABEL } from "./ui/primitives";
import { AuthLanding } from "./auth/AuthLanding";
import { ClauseMode } from "./analysis/ClauseMode";
import { CompareMode } from "./analysis/CompareMode";
import { ContractMode, type UploadInput } from "./analysis/ContractMode";
import { TemplatesView } from "./TemplatesView";
import { type RiskLevel } from "../lib/data";
import { CONTRACTS } from "../../hop-dong-mau/contracts";
import { hasTemplateAnalysis } from "../../hop-dong-mau/template-analysis";
import { AppSidebar, type AppAuth, type View } from "./AppSidebar";
import { getAnalysisHistory, deleteAnalysisHistory, type HistoryItem } from "@/lib/analysis/analysis-api";

type Tool = "clause" | "contract" | "compare";

/** Cờ do trang /hop-dong-mau/[type] đặt để mở thẳng phân tích hợp đồng mẫu. */
const PRELOAD_TEMPLATE_KEY = "fairterms.preload_template";
/** Cờ do trang /fairterms/history/contract/[id] đặt để mở thẳng chế độ so sánh. */
const PRELOAD_COMPARE_BASE_KEY = "fairterms.preload_compare_base";

/* ============================================================
   Helpers
   ============================================================ */

function formatHistoryDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

/** "Hôm nay" / "Hôm qua" / "N ngày trước" / dd/mm/yyyy cho mốc cũ hơn. */
function relativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const day = 86_400_000;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((startToday - startDate) / day);
  if (diff <= 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  if (diff < 7) return `${diff} ngày trước`;
  return formatHistoryDate(value);
}

function normalizeRiskLevel(value: string | null): RiskLevel | null {
  return value === "cao" || value === "trung_binh" || value === "thap" || value === "khong" ? value : null;
}

const OVERALL_VERDICT_LABEL: Record<string, string> = {
  tot_hon: "Có lợi hơn",
  xau_hon: "Bất lợi hơn",
  hon_hop: "Vừa lợi vừa hại",
  khong_doi: "Không đổi",
};

const OVERALL_VERDICT_COLOR: Record<string, string> = {
  tot_hon: "var(--risk-khong)",
  xau_hon: "var(--risk-cao)",
  hon_hop: "var(--risk-tb)",
  khong_doi: "var(--ink-faint)",
};

function getFriendlyContractType(type: string): string {
  const typeMap: Record<string, string> = {
    cho_thue_can_ho_chung_cu: "Thuê căn hộ chung cư",
    mua_ban_can_ho_chung_cu: "Mua bán căn hộ chung cư",
    unknown: "Hợp đồng bất động sản",
  };
  return typeMap[type] || type;
}

function getFriendlyClauseDescription(p: HistoryItem): string | null {
  if (p.type !== "clause" || !p.analysisResult) return null;
  try {
    const res = p.analysisResult as Record<string, unknown>;
    if (res.danh_gia && typeof res.danh_gia === "object") {
      const danhGia = res.danh_gia as {
        nhan_xet?: string;
        phan_tich?: Array<{ ket_luan?: string; dieu_khoan_lam_gi?: string }>;
      };
      const phanTich =
        danhGia.phan_tich?.find((item) => item.ket_luan === "MATCH") ?? danhGia.phan_tich?.[0];
      return phanTich?.dieu_khoan_lam_gi ?? danhGia.nhan_xet ?? null;
    }
    if (typeof res.dieu_khoan_lam_gi === "string") return res.dieu_khoan_lam_gi;
    return null;
  } catch {
    return null;
  }
}

function deriveTitle(p: HistoryItem): string {
  const friendlyType = getFriendlyContractType(p.contractType);
  const address = (p.contractInfo as { dia_chi?: string })?.dia_chi;
  const hasAddress = typeof address === "string" && address !== "—" && Boolean(address.trim());
  if (p.type === "contract")
    return (
      p.title?.trim() ||
      (hasAddress ? `Hợp đồng ${friendlyType.toLowerCase()} tại ${address}` : `Hợp đồng ${friendlyType.toLowerCase()}`)
    );
  if (p.type === "compare")
    return hasAddress
      ? `So sánh ${friendlyType.toLowerCase()} tại ${address}`
      : `So sánh hợp đồng ${friendlyType.toLowerCase()}`;
  return getFriendlyClauseDescription(p) || p.clausePreview || "Điều khoản";
}

/** Phụ đề gọn cho hàng lịch sử. `withType` thêm nhãn loại (dùng ở Tổng quan). */
function deriveSubtitle(p: HistoryItem, withType = false): string {
  const friendlyType = getFriendlyContractType(p.contractType);
  const date = formatHistoryDate(p.createdAt);
  if (p.type === "contract") {
    const body = `${p.fileName || "Tệp tải lên"} · ${date}`;
    return withType ? `Hợp đồng · ${body}` : body;
  }
  if (p.type === "compare") {
    const body = `${p.conclusion || "Đối chiếu bản sửa"} · ${date}`;
    return withType ? `So sánh · ${body}` : body;
  }
  const body = `${friendlyType} · "${p.clausePreview || "nội dung"}"`;
  return withType ? `Điều khoản · ${body}` : `${body} · ${date}`;
}

function detailHref(p: HistoryItem): string {
  if (p.type === "contract") return `/fairterms/history/contract/${p.id}`;
  if (p.type === "compare") return `/fairterms/history/compare/${p.id}`;
  return `/fairterms/history/clause/${p.id}`;
}

function isHighRisk(p: HistoryItem): boolean {
  return p.riskLevel === "cao" || (p.type === "compare" && p.overallVerdict === "xau_hon");
}

/** Thứ tự mức độ nghiêm trọng — dùng cho donut + legend rủi ro ở Tổng quan. */
const RISK_DONUT_ORDER: RiskLevel[] = ["cao", "trung_binh", "thap", "khong"];

const TOOL_ORDER: Tool[] = ["clause", "contract", "compare"];

const TOOL_META: Record<
  Tool,
  {
    icon: typeof Icon.clause;
    title: string;
    short: string;
    subtitle: string;
    newLabel: string;
    emptyTitle: string;
    emptyDesc: string;
    featured?: boolean;
  }
> = {
  clause: {
    icon: Icon.clause,
    title: "Phân tích điều khoản",
    short: "Điều khoản",
    subtitle: "Dán một điều khoản để kiểm tra nhanh mức rủi ro, căn cứ pháp lý và gợi ý chỉnh sửa.",
    newLabel: "Phân tích điều khoản mới",
    emptyTitle: "Chưa có điều khoản nào",
    emptyDesc: "Dán nội dung một điều khoản để nhận đánh giá rủi ro trong vòng một phút.",
  },
  contract: {
    icon: Icon.contract,
    title: "Phân tích hợp đồng",
    short: "Hợp đồng",
    subtitle: "Tải toàn bộ hợp đồng (PDF / DOCX / ảnh) để rà soát mọi điều khoản kèm trích dẫn luật.",
    newLabel: "Phân tích hợp đồng mới",
    emptyTitle: "Chưa có hợp đồng nào",
    emptyDesc: "Tải lên hợp đồng của bạn — hệ thống sẽ OCR, bóc tách và đánh giá từng điều khoản.",
    featured: true,
  },
  compare: {
    icon: Icon.compare,
    title: "So sánh hợp đồng",
    short: "So sánh",
    subtitle: "Đối chiếu bản đã chỉnh sửa với một hợp đồng đã phân tích trước đó để xem thay đổi lợi hay hại.",
    newLabel: "So sánh hợp đồng mới",
    emptyTitle: "Chưa có lần so sánh nào",
    emptyDesc: "Cần một hợp đồng đã phân tích làm gốc. Tải bản sửa để đối chiếu từng thay đổi.",
  },
};

/* ============================================================
   Presentational bits
   ============================================================ */

function HistoryBadge({ p }: { p: HistoryItem }) {
  if (p.type === "compare" && p.overallVerdict) {
    const color = OVERALL_VERDICT_COLOR[p.overallVerdict] ?? "var(--ink-faint)";
    return (
      <span
        className="risk-badge"
        style={{
          color,
          background: `color-mix(in srgb, ${color} 14%, transparent)`,
          fontSize: 11,
          padding: "3px 9px",
        }}
      >
        {OVERALL_VERDICT_LABEL[p.overallVerdict] ?? p.overallVerdict}
      </span>
    );
  }
  if (p.type === "contract" && p.status === "processing") {
    return (
      <span className="risk-badge" style={{ color: "var(--primary)", background: "var(--primary-tint)", fontSize: 11, padding: "3px 9px" }}>
        Đang xử lý
      </span>
    );
  }
  if (p.type === "contract" && p.status === "failed") {
    return (
      <span className="risk-badge" style={{ color: "var(--risk-cao)", background: "var(--risk-cao-bg)", fontSize: 11, padding: "3px 9px" }}>
        Lỗi phân tích
      </span>
    );
  }
  const risk = normalizeRiskLevel(p.riskLevel);
  if (risk) return <RiskBadge level={risk} size="sm" />;
  return (
    <span className="risk-badge" style={{ color: "var(--ink-faint)", background: "var(--surface-2)", fontSize: 11, padding: "3px 9px" }}>
      <span className="dot" />
      Chưa đánh giá
    </span>
  );
}

function HistoryRow({
  p,
  index = 0,
  withType = false,
  selectMode = false,
  selected = false,
  deleting = false,
  onOpen,
  onToggle,
  onDelete,
}: {
  p: HistoryItem;
  index?: number;
  withType?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  deleting?: boolean;
  onOpen: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
}) {
  const Ic = p.type === "contract" ? Icon.contract : p.type === "compare" ? Icon.compare : Icon.clause;
  return (
    <div
      className={`project-item-wrapper ${deleting ? "deleting" : ""} row-in`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div
        className="project-item"
        style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: "12px 16px" }}
        onClick={() => (selectMode && onToggle ? onToggle() : onOpen())}
      >
        {selectMode && (
          <div
            style={{ marginRight: 12, display: "flex", alignItems: "center", cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                border: `2px solid ${selected ? "var(--primary)" : "var(--line)"}`,
                background: selected ? "var(--primary)" : "transparent",
                display: "grid",
                placeItems: "center",
                color: "white",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              {selected && <Icon.check style={{ width: 12, height: 12, strokeWidth: 3 }} />}
            </div>
          </div>
        )}

        <div className={"proj-type-ic " + p.type}>
          <Ic style={{ width: 15, height: 15 }} />
        </div>
        <div className="proj-info" style={{ flex: 1, minWidth: 0 }}>
          <div className="proj-name" title={deriveTitle(p)}>
            {deriveTitle(p)}
          </div>
          <div
            className="proj-meta"
            title={deriveSubtitle(p, withType)}
            style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {deriveSubtitle(p, withType)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <HistoryBadge p={p} />
          {!selectMode && onDelete && (
            <button
              className="trash-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                color: "var(--ink-faint)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Xóa"
            >
              <Icon.trash style={{ width: 15, height: 15 }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HistorySkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="project-list" style={{ maxHeight: "none" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="sk-row">
          <div className="sk-box" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <div className="sk-box" style={{ width: "48%", height: 11, borderRadius: 5 }} />
            <div className="sk-box" style={{ width: "72%", height: 9, borderRadius: 5 }} />
          </div>
          <div className="sk-box" style={{ width: 74, height: 22, borderRadius: 999 }} />
        </div>
      ))}
    </div>
  );
}

function EmptyIllustration({ tool }: { tool: Tool }) {
  // Line-art minh hoạ on-brand (indigo). Không dùng emoji làm icon.
  return (
    <svg width="132" height="112" viewBox="0 0 132 112" fill="none" aria-hidden="true">
      <rect x="30" y="14" width="58" height="74" rx="8" fill="var(--primary-tint)" stroke="var(--primary)" strokeOpacity="0.35" strokeWidth="1.5" />
      <rect x="42" y="10" width="58" height="74" rx="8" fill="var(--surface)" stroke="var(--primary)" strokeWidth="1.6" />
      <path d="M52 30h38M52 41h38M52 52h26" stroke="var(--primary)" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" />
      {tool === "compare" ? (
        <path d="M52 63h30" stroke="var(--risk-khong)" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path d="M52 63h18" stroke="var(--primary)" strokeOpacity="0.35" strokeWidth="2.2" strokeLinecap="round" />
      )}
      <circle cx="96" cy="74" r="17" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.4" />
      <path d="m108 86 8 8" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
      <path d="m90 74 4 4 8-9" stroke="var(--risk-khong)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  icon: Ic,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: typeof Icon.clause;
  tone?: "default" | "risk" | "brand";
}) {
  const color = tone === "risk" ? "var(--risk-cao)" : tone === "brand" ? "var(--primary)" : "var(--ink-soft)";
  const bg = tone === "risk" ? "var(--risk-cao-bg)" : tone === "brand" ? "var(--primary-tint)" : "var(--surface-2)";
  return (
    <div className="stat-card">
      <span className="stat-ic" style={{ color, background: bg }}>
        <Ic style={{ width: 16, height: 16 }} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="stat-value tnum">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

/* ============================================================
   Function workspace (lịch sử riêng của một công cụ)
   ============================================================ */
function FunctionWorkspace({ tool, onNew }: { tool: Tool; onNew: () => void }) {
  const router = useRouter();
  const meta = TOOL_META[tool];
  const Ic = meta.icon;

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: string; type: Tool } | null>(null);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAnalysisHistory({ type: tool })
      .then((data) => active && setItems(data))
      .catch((err) => {
        console.error("[FunctionWorkspace] Failed to fetch history:", err);
        if (active) setItems([]);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tool]);

  const stats = useMemo(() => {
    const total = items.length;
    const high = items.filter(isHighRisk).length;
    const latest = items[0]?.createdAt ? relativeTime(items[0].createdAt) : "—";
    return { total, high, latest };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) => deriveTitle(p).toLowerCase().includes(q) || deriveSubtitle(p).toLowerCase().includes(q),
    );
  }, [items, query]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSelectAll = () =>
    setSelectedIds((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id))));

  const executeSingleDelete = async (id: string, type: Tool) => {
    setDeleteConfirmItem(null);
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteAnalysisHistory([{ id, type }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((p) => p.id !== id));
        setDeletingIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
        showToast("Đã xóa bản phân tích.");
      }, 350);
    } catch (err) {
      console.error("Failed to delete history item:", err);
      showToast("Đã xảy ra lỗi khi xóa dữ liệu.", "error");
      setDeletingIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  const executeBatchDelete = async () => {
    setShowBatchConfirm(false);
    const ids = new Set(selectedIds);
    const toDelete = items.filter((p) => ids.has(p.id)).map((p) => ({ id: p.id, type: p.type }));
    setDeletingIds((prev) => {
      const n = new Set(prev);
      ids.forEach((id) => n.add(id));
      return n;
    });
    try {
      await deleteAnalysisHistory(toDelete);
      setTimeout(() => {
        setItems((prev) => prev.filter((p) => !ids.has(p.id)));
        setDeletingIds((prev) => {
          const n = new Set(prev);
          ids.forEach((id) => n.delete(id));
          return n;
        });
        setSelectedIds(new Set());
        setIsSelectMode(false);
        showToast("Đã xóa các mục đã chọn.");
      }, 350);
    } catch (err) {
      console.error("Failed to delete batch history items:", err);
      showToast("Đã xảy ra lỗi khi xóa dữ liệu.", "error");
      setDeletingIds((prev) => {
        const n = new Set(prev);
        ids.forEach((id) => n.delete(id));
        return n;
      });
    }
  };

  return (
    <div className="ft-workspace">
      {/* Header */}
      <header className="ws-header rise">
        <div className="ws-head-main">
          <span className={"ws-head-ic" + (meta.featured ? " featured" : "")}>
            <Ic style={{ width: 24, height: 24 }} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 className="ws-title">{meta.title}</h1>
            <p className="ws-subtitle">{meta.subtitle}</p>
          </div>
        </div>
        <button className="btn btn-primary ws-new-btn" onClick={onNew}>
          <Icon.plus style={{ width: 16, height: 16 }} />
          {meta.newLabel}
        </button>
      </header>

      {/* Stats */}
      {!loading && items.length > 0 && (
        <div className="ws-stats rise2">
          <StatCard label="Tổng phân tích" value={stats.total} icon={Icon.trending} tone="brand" />
          <StatCard label="Rủi ro cao" value={stats.high} icon={Icon.warn} tone={stats.high > 0 ? "risk" : "default"} />
          <StatCard label="Gần nhất" value={stats.latest} icon={Icon.clock} />
        </div>
      )}

      {/* Toolbar */}
      <div className="ws-toolbar rise2">
        <div className="recent-label" style={{ margin: 0 }}>
          Lịch sử phân tích
        </div>
        {items.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="ws-search">
              <Icon.search style={{ width: 15, height: 15 }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm trong lịch sử…"
                aria-label="Tìm trong lịch sử"
              />
            </div>
            <button
              onClick={() => {
                setIsSelectMode((v) => !v);
                setSelectedIds(new Set());
              }}
              className="btn btn-ghost"
              style={{ padding: "6px 12px", fontSize: 13, height: "auto", fontWeight: 600, color: isSelectMode ? "var(--ink-soft)" : "var(--primary)" }}
            >
              {isSelectMode ? "Hủy" : "Quản lý"}
            </button>
          </div>
        )}
      </div>

      {/* Select bar */}
      {isSelectMode && (
        <div className="ws-selectbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleSelectAll}
              className="btn btn-ghost"
              style={{ padding: 0, height: "auto", fontSize: 13, color: "var(--primary)", fontWeight: 600, border: "none", background: "transparent" }}
            >
              {selectedIds.size === filtered.length && filtered.length > 0 ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
            <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>
              Đã chọn {selectedIds.size} / {filtered.length}
            </span>
          </div>
          <button
            onClick={() => selectedIds.size > 0 && setShowBatchConfirm(true)}
            disabled={selectedIds.size === 0}
            className="btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              height: "auto",
              background: selectedIds.size === 0 ? "var(--line)" : "var(--risk-cao-bg)",
              color: selectedIds.size === 0 ? "var(--ink-faint)" : "var(--risk-cao)",
              borderColor: "transparent",
              cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
            }}
          >
            <Icon.trash style={{ width: 14, height: 14 }} />
            Xóa {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <HistorySkeleton rows={4} />
      ) : items.length === 0 ? (
        <div className="ws-empty rise2">
          <EmptyIllustration tool={tool} />
          <h3 className="ws-empty-title">{meta.emptyTitle}</h3>
          <p className="ws-empty-desc">{meta.emptyDesc}</p>
          <button className="btn btn-primary btn-lg" onClick={onNew}>
            <Icon.plus style={{ width: 17, height: 17 }} />
            {meta.newLabel}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "28px 0", textAlign: "center", color: "var(--ink-faint)", fontSize: 14 }}>
          Không tìm thấy kết quả cho “{query}”.
        </div>
      ) : (
        <div className="project-list" style={{ maxHeight: "none" }}>
          {filtered.map((p, i) => (
            <HistoryRow
              key={p.id}
              p={p}
              index={i}
              selectMode={isSelectMode}
              selected={selectedIds.has(p.id)}
              deleting={deletingIds.has(p.id)}
              onOpen={() => router.push(detailHref(p))}
              onToggle={() => toggleSelect(p.id)}
              onDelete={() => setDeleteConfirmItem({ id: p.id, type: p.type })}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <Disclaimer />
      </div>

      {/* Confirm modal */}
      {(deleteConfirmItem || showBatchConfirm) && (
        <div
          className="ft-modal-scrim"
          onClick={() => {
            setDeleteConfirmItem(null);
            setShowBatchConfirm(false);
          }}
        >
          <div className="ft-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: "var(--risk-cao-bg)", color: "var(--risk-cao)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon.trash style={{ width: 20, height: 20 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px 0", color: "var(--ink)" }}>Xác nhận xóa</h3>
                <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                  {deleteConfirmItem
                    ? "Bạn có chắc chắn muốn xóa bản ghi phân tích này? Hành động này không thể hoàn tác."
                    : `Bạn có chắc chắn muốn xóa ${selectedIds.size} bản ghi đã chọn? Hành động này không thể hoàn tác.`}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => {
                  setDeleteConfirmItem(null);
                  setShowBatchConfirm(false);
                }}
                className="btn btn-ghost"
                style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, height: "auto" }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => (deleteConfirmItem ? executeSingleDelete(deleteConfirmItem.id, deleteConfirmItem.type) : executeBatchDelete())}
                className="btn"
                style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, height: "auto", background: "var(--risk-cao)", color: "white", border: "none" }}
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: toast.type === "success" ? "#e6f6ec" : "var(--risk-cao-bg)",
            color: toast.type === "success" ? "#0d9488" : "var(--risk-cao)",
            border: `1px solid ${toast.type === "success" ? "#b2f5ea" : "var(--line)"}`,
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)",
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 1100,
            animation: "slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {toast.type === "success" ? <Icon.check style={{ width: 16, height: 16 }} /> : <Icon.info style={{ width: 16, height: 16 }} />}
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{toast.text}</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Overview (Tổng quan)
   ============================================================ */
function OverviewPage({
  auth,
  onGoTool,
  onOpenTemplates,
}: {
  auth: AppAuth;
  onGoTool: (t: Tool) => void;
  onOpenTemplates: () => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAnalysisHistory({ type: "all", limit: 100 })
      .then((data) => active && setItems(data))
      .catch((err) => {
        console.error("[OverviewPage] Failed to fetch history:", err);
        if (active) setItems([]);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<Tool, number> = { clause: 0, contract: 0, compare: 0 };
    for (const p of items) if (p.type in c) c[p.type as Tool] += 1;
    return c;
  }, [items]);

  /** Phân bố rủi ro trên toàn bộ lịch sử — nguồn cho donut + cảnh báo "cần chú ý". */
  const riskSnapshot = useMemo(() => {
    const c: Record<RiskLevel, number> = { cao: 0, trung_binh: 0, thap: 0, khong: 0 };
    let rated = 0;
    for (const p of items) {
      const lvl = normalizeRiskLevel(p.riskLevel);
      if (lvl) {
        c[lvl] += 1;
        rated += 1;
      }
    }
    return { c, rated, attention: items.filter(isHighRisk).length };
  }, [items]);

  const donutGradient = useMemo(() => {
    if (riskSnapshot.rated === 0) return "";
    let cum = 0;
    const segments: string[] = [];
    for (const lvl of RISK_DONUT_ORDER) {
      const count = riskSnapshot.c[lvl];
      if (!count) continue;
      const from = cum;
      cum += (count / riskSnapshot.rated) * 100;
      segments.push(`${RISK_VAR[lvl]} ${from}% ${cum}%`);
    }
    return segments.join(", ");
  }, [riskSnapshot]);

  const recent = useMemo(() => items.slice(0, 5), [items]);
  const displayName = auth.name?.trim() || "bạn";

  const featuredTool = TOOL_ORDER.find((t) => TOOL_META[t].featured) ?? TOOL_ORDER[0];
  const toolArea: Partial<Record<Tool, string>> = { [featuredTool]: "feat" };
  TOOL_ORDER.filter((t) => t !== featuredTool).forEach((t, i) => {
    toolArea[t] = i === 0 ? "clause" : "comp";
  });

  return (
    <div className="overview-page">
      <div className="ov-bento">
        <header className="ov-box ov-greeting rise">
          <h1 className="ov-title">Chào {displayName}</h1>
          <p className="ov-sub">
            {loading ? (
              "Chọn một công cụ để bắt đầu, hoặc mở lại một phân tích gần đây."
            ) : items.length === 0 ? (
              "Chọn một công cụ bên dưới để bắt đầu phân tích đầu tiên của bạn."
            ) : riskSnapshot.attention > 0 ? (
              <>
                Bạn có <b className="attn">{riskSnapshot.attention} phân tích rủi ro cao</b> nên xem lại kỹ trước khi
                ký.
              </>
            ) : (
              <>
                Chưa phát hiện rủi ro cao nào trong <b>{items.length} phân tích</b> gần đây.
              </>
            )}
          </p>
        </header>

        {/* Risk snapshot */}
        <section className="ov-box ov-risk rise2">
          <p className="ov-box-h">Tình trạng rủi ro</p>
          {loading ? (
            <div className="ov-risk-empty">Đang tải…</div>
          ) : riskSnapshot.rated === 0 ? (
            <div className="ov-risk-empty">
              <Icon.shield style={{ width: 26, height: 26, opacity: 0.5 }} />
              Chưa có dữ liệu rủi ro. Phân tích một hợp đồng để xem thống kê tại đây.
            </div>
          ) : (
            <>
              <div className="ov-donut-wrap">
                <div className="ov-donut" style={{ background: `conic-gradient(${donutGradient})` }}>
                  <div className="ov-donut-ctr">
                    <div className="n tnum">{riskSnapshot.rated}</div>
                    <div className="l">phân tích</div>
                  </div>
                </div>
              </div>
              <div className="ov-legend">
                {RISK_DONUT_ORDER.map((lvl) => (
                  <div className="ov-legend-row" key={lvl}>
                    <span className="dot" style={{ background: RISK_VAR[lvl] }} />
                    <span className="nm">{RISK_LABEL[lvl]}</span>
                    <span className="v tnum">{riskSnapshot.c[lvl]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Tool cards */}
        {TOOL_ORDER.map((t) => {
          const m = TOOL_META[t];
          const Ic = m.icon;
          const featured = Boolean(m.featured);
          return (
            <button
              key={t}
              className={"ov-tool-card rise2" + (featured ? " featured" : "")}
              style={{ gridArea: toolArea[t] }}
              onClick={() => onGoTool(t)}
            >
              <span className="ov-tool-ic">
                <Ic style={{ width: featured ? 24 : 20, height: featured ? 24 : 20 }} />
              </span>
              <div className="ov-tool-body">
                <div className="ov-tool-title">{m.title}</div>
                {featured && <p className="ov-tool-desc">{m.subtitle}</p>}
                <div className="ov-tool-count tnum">
                  {loading ? "…" : counts[t] > 0 ? `${counts[t]} phân tích` : "Chưa có phân tích"}
                </div>
              </div>
              <Icon.arrow className="ov-tool-arrow" style={{ width: featured ? 18 : 17, height: featured ? 18 : 17 }} />
            </button>
          );
        })}

        {/* Recent across all */}
        <section className="ov-box ov-recent rise3">
          <p className="ov-box-h">Gần đây</p>
          {loading ? (
            <HistorySkeleton rows={3} />
          ) : recent.length === 0 ? (
            <div className="ov-recent-empty">
              <EmptyIllustration tool="contract" />
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--ink-faint)" }}>
                Chưa có phân tích nào. Chọn một công cụ phía trên để bắt đầu.
              </p>
            </div>
          ) : (
            <div className="project-list" style={{ maxHeight: "none" }}>
              {recent.map((p, i) => (
                <HistoryRow key={p.id} p={p} index={i} withType onOpen={() => router.push(detailHref(p))} />
              ))}
            </div>
          )}
        </section>

        {/* Resource */}
        <button className="ov-resource rise3" onClick={onOpenTemplates}>
          <span className="ov-resource-ic">
            <Icon.template style={{ width: 20, height: 20 }} />
          </span>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div className="ov-tool-title">Hợp đồng mẫu</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Xem các mẫu hợp đồng đã được rà soát sẵn.</div>
          </div>
          <Icon.arrow style={{ width: 16, height: 16, color: "var(--ink-faint)" }} />
        </button>

        {/* Tip */}
        <section className="ov-box ov-tip rise3">
          <span className="ov-tip-ic">
            <Icon.spark style={{ width: 18, height: 18 }} />
          </span>
          <div className="ov-tip-title">Mẹo rà soát</div>
          <p>
            Luôn kiểm tra điều khoản đặt cọc: mức phạt vi phạm nên áp dụng công bằng cho cả hai bên. Nếu hợp đồng chỉ
            phạt cọc một chiều, đó thường là dấu hiệu bất lợi cần lưu ý.
          </p>
          <div className="ov-tip-src">Điều 328 Bộ luật Dân sự 2015 — Đặt cọc</div>
        </section>

        <Disclaimer />
      </div>
    </div>
  );
}

/* ---------- App ---------- */
function FairTermsAppInner() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [view, setViewRaw] = useState<View>("overview");
  const [runningTool, setRunningTool] = useState<Tool | null>(null);
  const [contractStage, setContractStage] = useState<"upload" | "processing" | "result">("upload");
  const [contractAutoStart, setContractAutoStart] = useState<UploadInput | undefined>(undefined);
  const [compareBaseAnalysisId, setCompareBaseAnalysisId] = useState<string | null>(null);
  const [compareTemplateId, setCompareTemplateId] = useState<string | null>(null);
  const initialNavDoneRef = useRef(false);

  /** Điều hướng tới một view (trở về danh sách, dọn state phụ). */
  const goTo = (v: View) => {
    setViewRaw(v);
    setRunningTool(null);
    setContractStage("upload");
    setContractAutoStart(undefined);
    setCompareBaseAnalysisId(null);
    setCompareTemplateId(null);
  };

  /** Bắt đầu một phân tích mới cho công cụ. */
  const startRun = (t: Tool) => {
    setViewRaw(t);
    setRunningTool(t);
    if (t !== "contract") {
      setContractStage("upload");
      setContractAutoStart(undefined);
    }
    if (t !== "compare") setCompareBaseAnalysisId(null);
    if (t === "compare") setCompareTemplateId(null);
  };

  /** Mở thẳng kết quả so sánh dựng sẵn cho một cặp hợp đồng mẫu (Hợp đồng mẫu → So sánh hợp đồng). */
  const openTemplateCompare = (templateId: string) => {
    setCompareTemplateId(templateId);
    setViewRaw("compare");
    setRunningTool("compare");
  };

  const sessionAuth: AppAuth | null = useMemo(
    () =>
      session?.user
        ? {
            name: session.user.name || session.user.email || "Google user",
            email: session.user.email || undefined,
            plan: "free",
          }
        : null,
    [session],
  );
  const auth = sessionAuth;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status !== "loading") setAuthReady(true);
  }, [status]);

  useEffect(() => {
    if (!mounted || !sessionAuth || initialNavDoneRef.current) return;
    initialNavDoneRef.current = true;

    // Trang hợp đồng mẫu standalone có thể yêu cầu mở thẳng phân tích chạy sẵn.
    let templateId: string | null = null;
    try {
      templateId = localStorage.getItem(PRELOAD_TEMPLATE_KEY);
      if (templateId) localStorage.removeItem(PRELOAD_TEMPLATE_KEY);
    } catch {
      /* ignore */
    }
    const template = templateId ? CONTRACTS[templateId] : undefined;
    if (templateId && template && hasTemplateAnalysis(templateId)) {
      setContractAutoStart({ kind: "template", templateId, fileName: template.filename });
      setViewRaw("contract");
      setRunningTool("contract");
      return;
    }

    // Trang lịch sử hợp đồng có thể yêu cầu mở thẳng chế độ so sánh.
    let compareBaseId: string | null = null;
    try {
      compareBaseId = localStorage.getItem(PRELOAD_COMPARE_BASE_KEY);
      if (compareBaseId) localStorage.removeItem(PRELOAD_COMPARE_BASE_KEY);
    } catch {
      /* ignore */
    }
    if (compareBaseId) {
      setCompareBaseAnalysisId(compareBaseId);
      setViewRaw("compare");
      setRunningTool("compare");
      return;
    }

    setViewRaw("overview");
  }, [mounted, sessionAuth]);

  const logout = () => {
    const wasUser = Boolean(sessionAuth);
    goTo("overview");
    if (wasUser) void signOut({ callbackUrl: "/app" });
  };

  useEffect(() => {
    if (!mounted) return;
    const r = document.documentElement;
    r.setAttribute("data-theme", "light");
    r.setAttribute("data-density", "compact");
    r.style.setProperty("--heading-weight", "700");
  }, [mounted]);

  useEffect(() => {
    const reveal = () => {
      if (document.visibilityState === "visible") document.body.classList.add("anim-ready");
    };
    reveal();
    document.addEventListener("visibilitychange", reveal);
    return () => document.removeEventListener("visibilitychange", reveal);
  }, []);

  // Avoid hydration mismatch: render nothing until persisted state is read.
  if (!mounted) return null;

  // Only block the first session check — keep UI mounted during background refetch.
  if (!authReady && status === "loading") return null;

  if (!auth) return <AuthLanding />;

  const contractResult = view === "contract" && runningTool === "contract" && contractStage === "result";

  return (
    <div className={"app-shell" + (contractResult ? " no-sidebar" : "")}>
      {!contractResult && <AppSidebar auth={auth} view={view} setView={goTo} onLogout={logout} />}

      <main className="app-main">
        {view === "overview" && (
          <OverviewPage auth={auth} onGoTool={(t) => goTo(t)} onOpenTemplates={() => goTo("templates")} />
        )}

        {view === "clause" &&
          (runningTool === "clause" ? (
            <ClauseMode onBack={() => setRunningTool(null)} />
          ) : (
            <FunctionWorkspace tool="clause" onNew={() => startRun("clause")} />
          ))}

        {view === "contract" &&
          (runningTool === "contract" ? (
            <ContractMode
              key={
                contractAutoStart
                  ? JSON.stringify({
                      kind: contractAutoStart.kind,
                      name:
                        contractAutoStart.kind === "file"
                          ? contractAutoStart.file.name
                          : contractAutoStart.kind === "template"
                            ? contractAutoStart.templateId
                            : "",
                    })
                  : "manual"
              }
              layout="accordion"
              onBack={() => {
                setContractStage("upload");
                setContractAutoStart(undefined);
                setRunningTool(null);
              }}
              onStageChange={setContractStage}
              autoStart={contractAutoStart}
            />
          ) : (
            <FunctionWorkspace tool="contract" onNew={() => startRun("contract")} />
          ))}

        {view === "templates" && (
          <TemplatesView
            onAnalyze={(input) => {
              setContractAutoStart(input);
              setViewRaw("contract");
              setRunningTool("contract");
            }}
            onCompareTemplate={openTemplateCompare}
          />
        )}

        {view === "compare" &&
          (runningTool === "compare" ? (
            <CompareMode
              key={compareTemplateId ?? compareBaseAnalysisId ?? "pick"}
              baseAnalysisId={compareBaseAnalysisId}
              templateCompareId={compareTemplateId}
              onBack={() => {
                setRunningTool(null);
                setCompareTemplateId(null);
              }}
            />
          ) : (
            <FunctionWorkspace tool="compare" onNew={() => startRun("compare")} />
          ))}
      </main>
    </div>
  );
}

export default function FairTermsApp() {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <FairTermsAppInner />
    </SessionProvider>
  );
}
