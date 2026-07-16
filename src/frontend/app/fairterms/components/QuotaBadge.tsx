"use client";

import { useEffect, useState } from "react";
import { Icon } from "./ui/icons";

interface QuotaData {
  contractAnalysisCount: number;
  contractAnalysisLimit: number;
  clauseAnalysisCount: number;
  clauseAnalysisLimit: number;
  comparisonCount: number;
  comparisonLimit: number;
  periodStart: string;
  periodEnd: string;
  isUnlimited?: boolean;
}

export default function QuotaBadge() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load(showSpinner: boolean) {
      if (showSpinner) setLoading(true);
      try {
        const r = await fetch("/api/usage/quota", { cache: "no-store" });
        if (!r.ok) throw new Error("Không thể tải lượt dùng miễn phí");
        const data = (await r.json()) as QuotaData;
        if (!active) return;
        setQuota(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      } finally {
        if (active && showSpinner) setLoading(false);
      }
    }

    void load(true);

    // Silent refresh whenever the app announces a quota-changing action so the
    // badge never lags behind the backend counter (fixes "displayed 4/5 but
    // server rejected as 5/5").
    const onRefresh = () => void load(false);
    window.addEventListener("quota:refresh", onRefresh);

    // Refresh when the tab regains focus, e.g. after coming back from a long
    // analysis in another tab/window.
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load(false);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.removeEventListener("quota:refresh", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const styles = (
    <style>{`
      @keyframes spin-quota {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes gradient-move {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      .quota-box {
        padding: 12px 14px;
        margin: 8px 12px;
        background-color: var(--surface-2);
        border: 1px solid var(--line);
        border-radius: var(--radius);
        display: flex;
        flex-direction: column;
        gap: 10px;
        transition: all 0.3s ease;
      }

      .quota-box.unlimited {
        border-color: #8b5cf6;
        background: linear-gradient(to bottom, var(--surface-2), rgba(139, 92, 246, 0.04));
        box-shadow: 0 0 8px rgba(139, 92, 246, 0.08);
      }

      .quota-bar-fill.unlimited {
        background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
        background-size: 200% 200%;
        animation: gradient-move 3s ease infinite;
      }

      .quota-badge-vip {
        display: inline-flex;
        align-items: center;
        background: linear-gradient(90deg, #8b5cf6, #ec4899);
        color: white;
        padding: 2px 6px;
        font-size: 9px;
        font-weight: 800;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-left: auto;
      }
      
      .quota-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .05em;
        text-transform: uppercase;
        color: var(--ink-soft);
      }
      
      .quota-items {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .quota-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .quota-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: var(--ink);
      }
      
      .quota-label {
        font-weight: 500;
        color: var(--ink-soft);
      }
      
      .quota-value {
        font-size: 11.5px;
        color: var(--ink-faint);
      }
      
      .quota-bar-bg {
        height: 6px;
        width: 100%;
        background-color: var(--line);
        border-radius: 3px;
        overflow: hidden;
      }
      
      .quota-bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease-out;
      }
      
      .quota-reset {
        font-size: 10.5px;
        color: var(--ink-faint);
        text-align: right;
        margin-top: -2px;
      }
      
      .quota-info {
        font-size: 10px;
        color: var(--ink-faint);
        line-height: 1.4;
        border-top: 1px dashed var(--line);
        padding-top: 8px;
        margin-top: 2px;
      }
      
      .quota-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid var(--line-strong);
        border-top: 2px solid var(--primary);
        border-radius: 50%;
        animation: spin-quota 1s linear infinite;
        flex-shrink: 0;
      }

      @media (max-width: 600px) {
        .quota-box {
          margin: 8px 16px;
          padding: 10px 12px;
        }
      }
    `}</style>
  );

  if (loading) {
    return (
      <div className="quota-box">
        {styles}
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-faint)", fontSize: 12 }}>
          <span className="quota-spinner" />
          <span>Đang tải lượt dùng miễn phí...</span>
        </div>
      </div>
    );
  }

  if (error || !quota) {
    return (
      <div className="quota-box">
        {styles}
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--risk-cao)", fontSize: 12 }}>
          <Icon.warn style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span>Lỗi tải lượt phân tích miễn phí</span>
        </div>
      </div>
    );
  }

  const resetDate = new Date(quota.periodEnd);
  const formattedResetDate = Number.isNaN(resetDate.getTime())
    ? ""
    : new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(resetDate);

  const isUnlimited = quota.isUnlimited;
  const contractCount = quota.contractAnalysisCount ?? 0;
  const contractLimit = quota.contractAnalysisLimit ?? 5;
  const clauseCount = quota.clauseAnalysisCount ?? 0;
  const clauseLimit = quota.clauseAnalysisLimit ?? 10;
  const comparisonCount = quota.comparisonCount ?? 0;
  const comparisonLimit = quota.comparisonLimit ?? 5;

  const contractPct = isUnlimited ? 100 : Math.min(100, (contractCount / contractLimit) * 100);
  const clausePct = isUnlimited ? 100 : Math.min(100, (clauseCount / clauseLimit) * 100);
  const comparisonPct = isUnlimited ? 100 : Math.min(100, (comparisonCount / comparisonLimit) * 100);

  return (
    <div className={`quota-box ${isUnlimited ? "unlimited" : ""}`}>
      {styles}
      <div className="quota-title">
        <Icon.bolt style={{ width: 12, height: 12, color: isUnlimited ? "#8b5cf6" : "var(--primary)" }} />
        <span>Lượt dùng miễn phí</span>
        {isUnlimited && <span className="quota-badge-vip">Dev Vô Hạn</span>}
      </div>

      <div className="quota-items">
        {/* Hợp đồng */}
        <div className="quota-item">
          <div className="quota-row">
            <span className="quota-label">Phân tích hợp đồng</span>
            <span className="quota-value">
              <b style={{ color: "var(--ink)" }}>{contractCount}</b>/{isUnlimited ? "∞" : contractLimit}
            </span>
          </div>
          <div className="quota-bar-bg">
            <div
              className={`quota-bar-fill ${isUnlimited ? "unlimited" : ""}`}
              style={{
                width: `${contractPct}%`,
                backgroundColor: isUnlimited ? undefined : (contractPct >= 100 ? "var(--risk-cao)" : "var(--primary)"),
              }}
            />
          </div>
        </div>

        {/* Điều khoản */}
        <div className="quota-item">
          <div className="quota-row">
            <span className="quota-label">Phân tích điều khoản</span>
            <span className="quota-value">
              <b style={{ color: "var(--ink)" }}>{clauseCount}</b>/{isUnlimited ? "∞" : clauseLimit}
            </span>
          </div>
          <div className="quota-bar-bg">
            <div
              className={`quota-bar-fill ${isUnlimited ? "unlimited" : ""}`}
              style={{
                width: `${clausePct}%`,
                backgroundColor: isUnlimited ? undefined : (clausePct >= 100 ? "var(--risk-cao)" : "var(--primary)"),
              }}
            />
          </div>
        </div>

        {/* So sánh hợp đồng */}
        <div className="quota-item">
          <div className="quota-row">
            <span className="quota-label">So sánh hợp đồng</span>
            <span className="quota-value">
              <b style={{ color: "var(--ink)" }}>{comparisonCount}</b>/{isUnlimited ? "∞" : comparisonLimit}
            </span>
          </div>
          <div className="quota-bar-bg">
            <div
              className={`quota-bar-fill ${isUnlimited ? "unlimited" : ""}`}
              style={{
                width: `${comparisonPct}%`,
                backgroundColor: isUnlimited ? undefined : (comparisonPct >= 100 ? "var(--risk-cao)" : "var(--primary)"),
              }}
            />
          </div>
        </div>
      </div>

      {isUnlimited ? (
        <div className="quota-reset" style={{ color: "#8b5cf6", fontWeight: 500 }}>
          Hạn ngạch dành riêng cho nhà phát triển
        </div>
      ) : (
        formattedResetDate && (
          <div className="quota-reset">
            Làm mới: {formattedResetDate}
          </div>
        )
      )}

      <div className="quota-info">
        {isUnlimited
          ? "Tài khoản dev được mở khóa toàn bộ tính năng để phục vụ kiểm thử."
          : "Kết quả phân tích sẽ được lưu trữ trong 90 ngày."}
      </div>
    </div>
  );
}
