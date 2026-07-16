"use client";

import { Fragment, useEffect, useState } from "react";
import {
  adminGetCacheOverview,
  adminFlushCacheNamespace,
  adminListCacheEntries,
  adminDeleteCacheEntry,
} from "@/lib/api/client";
import type { AdminCacheOverview, AdminCacheNamespaceInfo, AdminCacheEntryPreview } from "@/lib/api/types";

const ENTRIES_PAGE_SIZE = 20;
// Redis SCAN can return an empty page before a cursor cycle completes — keep
// asking for the next page (bounded) instead of showing a false "no entries".
const MAX_EMPTY_SCAN_HOPS = 20;

function riskBadgeClass(level: string | null): string {
  switch (level) {
    case "cao": return "adm-badge--red";
    case "trung_binh": return "adm-badge--amber";
    case "khong": return "adm-badge--green";
    default: return "adm-badge--gray";
  }
}

function riskLabel(level: string | null): string {
  switch (level) {
    case "cao": return "Cao";
    case "trung_binh": return "Trung bình";
    case "thap": return "Thấp";
    case "khong": return "Không";
    default: return "—";
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString("vi-VN");
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatDuration(seconds: number): string {
  if (seconds >= 86400 && seconds % 86400 === 0) return `${seconds / 86400} ngày`;
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600} giờ`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} phút`;
  return `${seconds} giây`;
}

function formatUptime(seconds: number | null): string {
  if (seconds === null) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days} ngày ${hours} giờ`;
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}

type FlushTarget = { namespace: string; label: string };

export default function CacheManagementPage() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [data, setData] = useState<AdminCacheOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const [flushTarget, setFlushTarget] = useState<FlushTarget | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [flushing, setFlushing] = useState(false);
  const [flushError, setFlushError] = useState("");
  const [flushSuccess, setFlushSuccess] = useState("");

  const [expandedNamespace, setExpandedNamespace] = useState<string | null>(null);
  const [entries, setEntries] = useState<AdminCacheEntryPreview[]>([]);
  const [entriesCursor, setEntriesCursor] = useState(0);
  const [entriesDone, setEntriesDone] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState("");
  const [confirmingDigest, setConfirmingDigest] = useState<string | null>(null);
  const [deletingDigest, setDeletingDigest] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadOverview() {
      try {
        const overview = await adminGetCacheOverview();
        if (active) {
          setData(overview);
          setLastLoadedAt(new Date());
          setErrorMsg("");
        }
      } catch (err: unknown) {
        console.error("Failed to load cache overview:", err);
        if (active) {
          setErrorMsg(err instanceof Error ? err.message : "Không thể tải thông tin cache.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadOverview();
    return () => { active = false; };
  }, [refreshToken]);

  useEffect(() => {
    if (!flushTarget) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !flushing) {
        setFlushTarget(null);
        setConfirmInput("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flushTarget, flushing]);

  function handleRefresh() {
    setLoading(true);
    setRefreshToken((t) => t + 1);
  }

  function openFlushModal(ns: AdminCacheNamespaceInfo) {
    setFlushTarget({ namespace: ns.namespace, label: ns.label });
    setConfirmInput("");
    setFlushError("");
  }

  function closeFlushModal() {
    if (flushing) return;
    setFlushTarget(null);
    setConfirmInput("");
    setFlushError("");
  }

  async function handleConfirmFlush() {
    if (!flushTarget) return;
    setFlushing(true);
    setFlushError("");
    try {
      const result = await adminFlushCacheNamespace(flushTarget.namespace);
      setFlushSuccess(
        `Đã xóa ${formatNumber(result.deleted_count)} key trong namespace "${result.namespace}".`
      );
      setFlushTarget(null);
      setConfirmInput("");
      setRefreshToken((t) => t + 1);
    } catch (err: unknown) {
      console.error("Failed to flush cache namespace:", err);
      setFlushError(err instanceof Error ? err.message : "Không thể xóa cache.");
    } finally {
      setFlushing(false);
    }
  }

  async function loadEntries(namespace: string, cursor: number, replace: boolean) {
    setEntriesLoading(true);
    setEntriesError("");
    try {
      let nextCursor = cursor;
      let collected: AdminCacheEntryPreview[] = [];
      let done = false;
      for (let hop = 0; hop < MAX_EMPTY_SCAN_HOPS; hop++) {
        const page = await adminListCacheEntries(namespace, nextCursor, ENTRIES_PAGE_SIZE);
        collected = collected.concat(page.entries);
        nextCursor = page.next_cursor;
        done = page.done;
        if (collected.length > 0 || done) break;
      }
      setEntries((prev) => (replace ? collected : [...prev, ...collected]));
      setEntriesCursor(nextCursor);
      setEntriesDone(done);
    } catch (err: unknown) {
      console.error("Failed to load cache entries:", err);
      setEntriesError(err instanceof Error ? err.message : "Không thể tải danh sách điều khoản đã cache.");
    } finally {
      setEntriesLoading(false);
    }
  }

  function toggleNamespaceEntries(namespace: string) {
    if (expandedNamespace === namespace) {
      setExpandedNamespace(null);
      return;
    }
    setExpandedNamespace(namespace);
    setEntries([]);
    setEntriesCursor(0);
    setEntriesDone(false);
    setConfirmingDigest(null);
    void loadEntries(namespace, 0, true);
  }

  async function handleDeleteEntry(namespace: string, digest: string) {
    setDeletingDigest(digest);
    setEntriesError("");
    try {
      const result = await adminDeleteCacheEntry(namespace, digest);
      if (result.deleted) {
        setEntries((prev) => prev.filter((e) => e.digest !== digest));
        setRefreshToken((t) => t + 1);
      }
      setConfirmingDigest(null);
    } catch (err: unknown) {
      console.error("Failed to delete cache entry:", err);
      setEntriesError(err instanceof Error ? err.message : "Không thể xóa điều khoản này.");
    } finally {
      setDeletingDigest(null);
    }
  }

  const redis = data?.redis ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="adm-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h2 className="adm-page-title">Quản lý Cache</h2>
          <p className="adm-page-sub">
            Trạng thái Redis và các namespace cache của hệ thống. Redis hoạt động theo cơ chế fail-open — nếu Redis
            gián đoạn, ứng dụng vẫn chạy bình thường, chỉ là các kết quả sẽ không được lưu tạm.
          </p>
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

      {flushSuccess && <div className="adm-alert adm-alert--success">{flushSuccess}</div>}
      {errorMsg && <div className="adm-alert adm-alert--error">{errorMsg}</div>}

      {loading && !data ? (
        <div style={{ color: "var(--ink-soft)", fontSize: "14px", padding: "32px" }}>
          Đang tải thông tin cache...
        </div>
      ) : !data || !redis ? null : (
        <>
          {lastLoadedAt && (
            <div style={{ fontSize: "11.5px", color: "var(--ink-faint)", marginTop: "-12px" }}>
              Cập nhật lúc {lastLoadedAt.toLocaleTimeString("vi-VN")}
            </div>
          )}

          {/* Redis connection status */}
          <div className="adm-card">
            <div className="adm-card-header">
              <span className="adm-card-title">Trạng thái Redis</span>
              <span className={`adm-badge ${redis.connected ? "adm-badge--green" : "adm-badge--red"}`}>
                {redis.connected ? "● Đã kết nối" : "○ Không kết nối"}
              </span>
            </div>

            {!redis.connected ? (
              <div className="adm-empty">
                Redis hiện không kết nối được. Chức năng phân tích hợp đồng vẫn hoạt động bình thường (thiết kế
                fail-open) — chỉ là kết quả sẽ không được cache lại, khiến các lượt xử lý lặp lại chậm hơn.
              </div>
            ) : (
              <div className="adm-stat-grid">
                <div className="adm-stat-card">
                  <div className="adm-stat-accent blue" />
                  <div className="adm-stat-label">Bộ nhớ sử dụng</div>
                  <div className="adm-stat-value adm-num">{redis.used_memory_human ?? "—"}</div>
                  <div className="adm-stat-sub">{formatNumber(redis.connected_clients ?? 0)} kết nối hiện tại</div>
                </div>
                <div className="adm-stat-card">
                  <div className="adm-stat-accent blue" />
                  <div className="adm-stat-label">Thời gian hoạt động</div>
                  <div className="adm-stat-value adm-num" style={{ fontSize: "20px" }}>
                    {formatUptime(redis.uptime_in_seconds)}
                  </div>
                  <div className="adm-stat-sub">Kể từ lần khởi động gần nhất</div>
                </div>
                <div className="adm-stat-card">
                  <div className={`adm-stat-accent ${redis.hit_rate === null ? "amber" : "green"}`} />
                  <div className="adm-stat-label">Tỷ lệ cache hit</div>
                  <div className="adm-stat-value adm-num">
                    {redis.hit_rate === null ? "—" : formatPercent(redis.hit_rate)}
                  </div>
                  <div className="adm-stat-sub">
                    {formatNumber(redis.keyspace_hits)} hit / {formatNumber(redis.keyspace_misses)} miss · toàn bộ
                    Redis instance, không tách theo từng namespace
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Namespace table */}
          <div className="adm-card">
            <div className="adm-card-header">
              <span className="adm-card-title">Namespace cache</span>
            </div>
            {data.namespaces.length === 0 ? (
              <div className="adm-empty">Chưa có namespace cache nào được đăng ký.</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Chức năng</th>
                      <th>Namespace</th>
                      <th>Trạng thái</th>
                      <th>TTL</th>
                      <th>Số lượng key</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.namespaces.map((ns) => (
                      <Fragment key={ns.namespace}>
                        <tr>
                          <td style={{ color: "var(--ink)", fontWeight: 600, fontSize: "13px" }}>{ns.label}</td>
                          <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "12px", color: "var(--ink-soft)" }}>
                            {ns.namespace}
                          </td>
                          <td>
                            <span className={`adm-badge ${ns.enabled ? "adm-badge--green" : "adm-badge--gray"}`}>
                              {ns.enabled ? "Bật" : "Tắt"}
                            </span>
                          </td>
                          <td className="adm-num">{formatDuration(ns.ttl_seconds)}</td>
                          <td className="adm-num">
                            {ns.key_count === null ? "Không xác định" : formatNumber(ns.key_count)}
                          </td>
                          <td style={{ whiteSpace: "nowrap", display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              className="adm-btn adm-btn--ghost adm-btn--sm"
                              onClick={() => toggleNamespaceEntries(ns.namespace)}
                              disabled={!redis.connected}
                            >
                              {expandedNamespace === ns.namespace ? "Ẩn điều khoản" : "Xem điều khoản"}
                            </button>
                            <button
                              type="button"
                              className="adm-btn adm-btn--danger adm-btn--sm"
                              onClick={() => openFlushModal(ns)}
                              disabled={!redis.connected}
                            >
                              Xóa cache
                            </button>
                          </td>
                        </tr>
                        {expandedNamespace === ns.namespace && (
                          <tr>
                            <td colSpan={6} style={{ padding: 0, background: "var(--paper-2)" }}>
                              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                {entriesError && (
                                  <div className="adm-alert adm-alert--error">{entriesError}</div>
                                )}
                                {entriesLoading && entries.length === 0 ? (
                                  <div style={{ color: "var(--ink-soft)", fontSize: "13px" }}>
                                    Đang tải danh sách điều khoản...
                                  </div>
                                ) : entries.length === 0 ? (
                                  <div className="adm-empty" style={{ padding: "16px" }}>
                                    Namespace này hiện chưa có điều khoản nào trong cache.
                                  </div>
                                ) : (
                                  <div className="adm-table-wrap">
                                    <table className="adm-table">
                                      <thead>
                                        <tr>
                                          <th>Loại hợp đồng</th>
                                          <th>Mức rủi ro</th>
                                          <th>Số dấu hiệu khớp</th>
                                          <th>Trích dẫn (rút gọn)</th>
                                          <th>TTL còn lại</th>
                                          <th></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {entries.map((entry) => (
                                          <tr key={entry.digest}>
                                            <td style={{ fontSize: "12.5px" }}>{entry.loai_hop_dong ?? "—"}</td>
                                            <td>
                                              <span className={`adm-badge ${riskBadgeClass(entry.muc_rui_ro_tong)}`}>
                                                {riskLabel(entry.muc_rui_ro_tong)}
                                              </span>
                                            </td>
                                            <td className="adm-num">{entry.red_flags_count + entry.unfair_count}</td>
                                            <td style={{ fontSize: "12px", color: "var(--ink-soft)", maxWidth: "360px" }}>
                                              {entry.trich_dan_preview ?? "—"}
                                            </td>
                                            <td className="adm-num">
                                              {entry.ttl_seconds === null ? "—" : formatUptime(entry.ttl_seconds)}
                                            </td>
                                            <td style={{ whiteSpace: "nowrap" }}>
                                              {confirmingDigest === entry.digest ? (
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                  <button
                                                    type="button"
                                                    className="adm-btn adm-btn--danger adm-btn--sm"
                                                    onClick={() => handleDeleteEntry(ns.namespace, entry.digest)}
                                                    disabled={deletingDigest === entry.digest}
                                                  >
                                                    {deletingDigest === entry.digest ? "Đang xóa..." : "Xác nhận xóa"}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="adm-btn adm-btn--ghost adm-btn--sm"
                                                    onClick={() => setConfirmingDigest(null)}
                                                    disabled={deletingDigest === entry.digest}
                                                  >
                                                    Hủy
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  type="button"
                                                  className="adm-btn adm-btn--ghost adm-btn--sm"
                                                  onClick={() => setConfirmingDigest(entry.digest)}
                                                >
                                                  Xóa
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                                {!entriesDone && entries.length > 0 && (
                                  <button
                                    type="button"
                                    className="adm-btn adm-btn--ghost adm-btn--sm"
                                    onClick={() => loadEntries(ns.namespace, entriesCursor, false)}
                                    disabled={entriesLoading}
                                    style={{ alignSelf: "flex-start" }}
                                  >
                                    {entriesLoading ? "Đang tải..." : "Tải thêm"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {flushTarget && (
        <div
          className="adm-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cache-flush-title"
          onClick={closeFlushModal}
        >
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div id="cache-flush-title" className="adm-modal-title">
              Xóa toàn bộ cache &ldquo;{flushTarget.label}&rdquo;?
            </div>
            <div className="adm-modal-body">
              Thao tác này xóa vĩnh viễn tất cả key thuộc namespace <code>{flushTarget.namespace}</code> trên Redis
              và <strong>không thể hoàn tác</strong>. Các lượt phân tích tiếp theo sẽ phải tính toán lại từ đầu
              (chậm hơn) cho tới khi cache được tạo lại.
              <br />
              <br />
              Gõ chính xác <code>{flushTarget.namespace}</code> để xác nhận:
            </div>
            <input
              type="text"
              className="adm-input"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={flushTarget.namespace}
              autoFocus
              disabled={flushing}
            />
            {flushError && (
              <div className="adm-alert adm-alert--error" style={{ marginTop: "12px" }}>
                {flushError}
              </div>
            )}
            <div className="adm-modal-actions">
              <button
                type="button"
                className="adm-btn adm-btn--ghost adm-btn--sm"
                onClick={closeFlushModal}
                disabled={flushing}
              >
                Hủy
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--danger adm-btn--sm"
                onClick={handleConfirmFlush}
                disabled={confirmInput !== flushTarget.namespace || flushing}
              >
                {flushing ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
