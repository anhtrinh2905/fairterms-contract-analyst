"use client";

import { useEffect, useState } from "react";
import { adminGetLangSmithDashboard } from "@/lib/api/client";
import type { AdminLangSmithDashboard } from "@/lib/api/types";

const RANGE_OPTIONS: { label: string; hours: number }[] = [
  { label: "24 giờ", hours: 24 },
  { label: "7 ngày", hours: 24 * 7 },
  { label: "30 ngày", hours: 24 * 30 },
];

function formatNumber(n: number): string {
  return n.toLocaleString("vi-VN");
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatLatency(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  return `${seconds.toFixed(2)} s`;
}

function formatCost(usd: number | null): string {
  if (usd === null) return "—";
  return `$${usd.toFixed(4)}`;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

function formatBucketLabel(iso: string, rangeHours: number): string {
  const d = new Date(iso);
  if (rangeHours <= 24) {
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function errorRateBadgeClass(rate: number): string {
  if (rate === 0) return "adm-badge--green";
  if (rate < 0.1) return "adm-badge--amber";
  return "adm-badge--red";
}

export default function ObservabilityPage() {
  const [hours, setHours] = useState(24);
  const [refreshToken, setRefreshToken] = useState(0);
  const [data, setData] = useState<AdminLangSmithDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const dashboard = await adminGetLangSmithDashboard(hours);
        if (active) {
          setData(dashboard);
          setLastLoadedAt(new Date());
          setErrorMsg("");
        }
      } catch (err: unknown) {
        console.error("Failed to load LangSmith dashboard:", err);
        if (active) {
          setErrorMsg(err instanceof Error ? err.message : "Không thể tải số liệu LangSmith.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDashboard();
    return () => { active = false; };
  }, [hours, refreshToken]);

  function handleRangeChange(newHours: number) {
    setLoading(true);
    setHours(newHours);
  }

  function handleRefresh() {
    setLoading(true);
    setRefreshToken((t) => t + 1);
  }

  const maxBucketCount = data
    ? Math.max(1, ...data.timeline.map((b) => b.run_count))
    : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="adm-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h2 className="adm-page-title">Giám sát LangSmith</h2>
          <p className="adm-page-sub">
            Số liệu thời gian chạy, tỷ lệ lỗi, token và chi phí ước tính của các pipeline AI, tổng hợp trực tiếp từ LangSmith.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="adm-range-row">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.hours}
                type="button"
                className={`adm-range-btn${hours === opt.hours ? " active" : ""}`}
                onClick={() => handleRangeChange(opt.hours)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="adm-btn adm-btn--ghost adm-btn--sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      {errorMsg && <div className="adm-alert adm-alert--error">{errorMsg}</div>}

      {loading && !data ? (
        <div style={{ color: "var(--ink-soft)", fontSize: "14px", padding: "32px" }}>
          Đang tải số liệu LangSmith...
        </div>
      ) : !data ? null : !data.enabled ? (
        <div className="adm-card">
          <div className="adm-empty">
            LangSmith tracing chưa được bật trên backend. Đặt <code>LANGSMITH_TRACING=true</code> và{" "}
            <code>LANGSMITH_API_KEY</code> trong file <code>.env</code>, sau đó khởi động lại backend để bắt đầu thu thập số liệu.
          </div>
        </div>
      ) : (
        <>
          {lastLoadedAt && (
            <div style={{ fontSize: "11.5px", color: "var(--ink-faint)", marginTop: "-12px" }}>
              Dự án LangSmith: <strong>{data.project}</strong> · Cập nhật lúc {lastLoadedAt.toLocaleTimeString("vi-VN")}
              {data.truncated ? " · Đã giới hạn 200 lượt chạy gần nhất mỗi loại" : ""}
            </div>
          )}

          {/* Overview cards */}
          <div className="adm-stat-grid">
            <div className="adm-stat-card">
              <div className="adm-stat-accent blue" />
              <div className="adm-stat-label">Tổng lượt chạy</div>
              <div className="adm-stat-value adm-num">{formatNumber(data.overview.total_runs)}</div>
              <div className="adm-stat-sub">Trong {hours >= 24 ? `${hours / 24} ngày` : `${hours} giờ`} qua</div>
            </div>
            <div className="adm-stat-card">
              <div className={`adm-stat-accent ${data.overview.error_count === 0 ? "green" : "amber"}`} />
              <div className="adm-stat-label">Tỷ lệ lỗi</div>
              <div className="adm-stat-value adm-num">{formatPercent(data.overview.error_rate)}</div>
              <div className="adm-stat-sub">{formatNumber(data.overview.error_count)} lượt lỗi</div>
            </div>
            <div className="adm-stat-card">
              <div className="adm-stat-accent blue" />
              <div className="adm-stat-label">Độ trễ P50 / P95</div>
              <div className="adm-stat-value adm-num" style={{ fontSize: "20px" }}>
                {formatLatency(data.overview.latency_p50_s)} / {formatLatency(data.overview.latency_p95_s)}
              </div>
              <div className="adm-stat-sub">Thời gian xử lý mỗi lượt chạy</div>
            </div>
            <div className="adm-stat-card">
              <div className="adm-stat-accent amber" />
              <div className="adm-stat-label">Tổng token</div>
              <div className="adm-stat-value adm-num">{formatNumber(data.overview.total_tokens)}</div>
              <div className="adm-stat-sub">Chi phí ước tính: {formatCost(data.overview.total_cost_usd)}</div>
            </div>
          </div>

          {/* Timeline */}
          <div className="adm-card">
            <div className="adm-card-header">
              <span className="adm-card-title">Lượt chạy theo thời gian</span>
            </div>
            {data.timeline.length === 0 || maxBucketCount === 0 ? (
              <div className="adm-empty">Chưa có dữ liệu trong khoảng thời gian này.</div>
            ) : (
              <>
                <div className="adm-timeline">
                  {data.timeline.map((bucket) => {
                    const okCount = bucket.run_count - bucket.error_count;
                    const totalHeightPct = (bucket.run_count / maxBucketCount) * 100;
                    const errorHeightPct = bucket.run_count > 0 ? (bucket.error_count / bucket.run_count) * 100 : 0;
                    return (
                      <div
                        key={bucket.bucket_start}
                        className="adm-timeline-col"
                        style={{ height: `${Math.max(totalHeightPct, bucket.run_count > 0 ? 4 : 0)}%` }}
                        title={`${formatTimestamp(bucket.bucket_start)} — ${bucket.run_count} lượt chạy, ${bucket.error_count} lỗi`}
                        aria-label={`${formatBucketLabel(bucket.bucket_start, hours)}: ${okCount} thành công, ${bucket.error_count} lỗi`}
                      >
                        {bucket.error_count > 0 && (
                          <div className="adm-timeline-error-seg" style={{ height: `${errorHeightPct}%` }} />
                        )}
                        <div className="adm-timeline-ok-seg" style={{ height: `${100 - errorHeightPct}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="adm-timeline-legend">
                  <span className="adm-timeline-legend-item">
                    <span className="adm-timeline-legend-dot" style={{ background: "var(--primary)" }} />
                    Thành công
                  </span>
                  <span className="adm-timeline-legend-item">
                    <span className="adm-timeline-legend-dot" style={{ background: "var(--risk-cao)" }} />
                    Lỗi
                  </span>
                  <span className="adm-timeline-legend-item">
                    {formatBucketLabel(data.timeline[0].bucket_start, hours)} → {formatBucketLabel(data.timeline[data.timeline.length - 1].bucket_start, hours)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="adm-2col">
            {/* Breakdown by tool (chain-level) */}
            <div className="adm-card">
              <div className="adm-card-header">
                <span className="adm-card-title">Theo tính năng</span>
              </div>
              {data.tools.length === 0 ? (
                <div className="adm-empty">Chưa có lượt chạy nào.</div>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Tính năng</th>
                        <th>Lượt chạy</th>
                        <th>Tỷ lệ lỗi</th>
                        <th>Độ trễ P50</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tools.map((tool) => (
                        <tr key={tool.name}>
                          <td style={{ color: "var(--ink)", fontWeight: 600, fontSize: "13px" }}>{tool.label}</td>
                          <td className="adm-num">{formatNumber(tool.run_count)}</td>
                          <td>
                            <span className={`adm-badge ${errorRateBadgeClass(tool.error_rate)}`}>
                              {formatPercent(tool.error_rate)} ({tool.error_count})
                            </span>
                          </td>
                          <td className="adm-num">{formatLatency(tool.latency_p50_s)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Breakdown by LLM call (token/cost-level) */}
            <div className="adm-card">
              <div className="adm-card-header">
                <span className="adm-card-title">Theo lệnh gọi LLM</span>
              </div>
              {data.llm_calls.length === 0 ? (
                <div className="adm-empty">Chưa có lệnh gọi LLM nào.</div>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Tên</th>
                        <th>Lượt gọi</th>
                        <th>Token</th>
                        <th>Chi phí</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.llm_calls.map((llm) => (
                        <tr key={llm.name}>
                          <td style={{ color: "var(--ink)", fontWeight: 600, fontSize: "13px" }}>{llm.name}</td>
                          <td className="adm-num">{formatNumber(llm.run_count)}</td>
                          <td className="adm-num">{formatNumber(llm.total_tokens)}</td>
                          <td className="adm-num">{formatCost(llm.total_cost_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent errors */}
          <div className="adm-card">
            <div className="adm-card-header">
              <span className="adm-card-title">Lỗi gần đây</span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "var(--paper-2)",
                  color: "var(--ink-faint)",
                }}
              >
                {data.recent_errors.length} bản ghi
              </span>
            </div>
            {data.recent_errors.length === 0 ? (
              <div className="adm-empty">Không có lỗi nào trong khoảng thời gian này. 🎉</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Tính năng</th>
                      <th>Lỗi</th>
                      <th>Thời gian</th>
                      <th>Độ trễ</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_errors.map((run) => (
                      <tr key={run.id}>
                        <td style={{ color: "var(--ink)", fontWeight: 600, fontSize: "13px", whiteSpace: "nowrap" }}>
                          {run.name}
                        </td>
                        <td style={{ fontSize: "12.5px", maxWidth: "360px" }}>{run.error}</td>
                        <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>{formatTimestamp(run.start_time)}</td>
                        <td className="adm-num" style={{ whiteSpace: "nowrap" }}>{formatLatency(run.latency_s)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {run.url && (
                            <a href={run.url} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn--ghost adm-btn--sm">
                              Xem trên LangSmith
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
