"use client";
/* ============================================================
   HopDongAI — Hộp thoại chia sẻ kết quả phân tích (kiểu Drive)
   Tạo link công khai read-only từ snapshot tại thời điểm chia sẻ.
   ============================================================ */
import { useState } from "react";
import { Icon } from "../ui/icons";
import { CopyButton } from "../ui/primitives";
import type { ContractShareSnapshot } from "@/lib/analysis/share-snapshot";

type ExpiryOption = "7" | "30" | "90" | "none";

const EXPIRY_LABEL: Record<ExpiryOption, string> = {
  "7": "7 ngày",
  "30": "30 ngày",
  "90": "90 ngày",
  none: "Không hết hạn",
};

function expiryToDays(option: ExpiryOption): number | null {
  return option === "none" ? null : Number(option);
}

export function ShareDialog({
  open,
  onClose,
  buildSnapshot,
}: {
  open: boolean;
  onClose: () => void;
  buildSnapshot: () => ContractShareSnapshot;
}) {
  const [expiry, setExpiry] = useState<ExpiryOption>("30");
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const createLink = async () => {
    setCreating(true);
    setError(null);
    try {
      const snapshot = buildSnapshot();
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshot,
          title: snapshot.title,
          expiresInDays: expiryToDays(expiry),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || "Không tạo được link chia sẻ. Vui lòng thử lại.");
        return;
      }
      const data = (await res.json()) as { token: string; path: string };
      setToken(data.token);
      setUrl(`${window.location.origin}${data.path}`);
    } catch {
      setError("Không tạo được link chia sẻ. Vui lòng thử lại.");
    } finally {
      setCreating(false);
    }
  };

  const revokeLink = async () => {
    if (!token) return;
    setRevoking(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/${token}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Không dừng được chia sẻ. Vui lòng thử lại.");
        return;
      }
      setUrl(null);
      setToken(null);
    } catch {
      setError("Không dừng được chia sẻ. Vui lòng thử lại.");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="law-modal" onClick={onClose}>
      <div className="law-sheet rise" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
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
            <Icon.copy style={{ width: 18, height: 18 }} />
          </span>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 18 }}>Chia sẻ kết quả phân tích</h3>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
              Ai có link đều xem được (chỉ xem). Thông tin cá nhân đã được ẩn danh.
            </div>
          </div>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={onClose}>
            <Icon.x style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {!url ? (
          <>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
              Thời hạn link
            </label>
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value as ExpiryOption)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: 14,
                marginBottom: 16,
              }}
            >
              {(Object.keys(EXPIRY_LABEL) as ExpiryOption[]).map((opt) => (
                <option key={opt} value={opt}>
                  {EXPIRY_LABEL[opt]}
                </option>
              ))}
            </select>

            <button
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={createLink}
              disabled={creating}
            >
              {creating ? "Đang tạo link…" : "Tạo link chia sẻ"}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
              Link chia sẻ
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                marginBottom: 14,
              }}
            >
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  color: "var(--ink)",
                  fontSize: 13,
                  outline: "none",
                  minWidth: 0,
                }}
              />
              <CopyButton text={url} label="Sao chép" />
            </div>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
              style={{ width: "100%", justifyContent: "center", marginBottom: 10, textDecoration: "none" }}
            >
              Xem trước trong tab mới
            </a>

            <button
              className="btn btn-ghost"
              style={{ width: "100%", justifyContent: "center", color: "var(--risk-cao)" }}
              onClick={revokeLink}
              disabled={revoking}
            >
              {revoking ? "Đang dừng…" : "Dừng chia sẻ"}
            </button>
          </>
        )}

        {error ? (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--risk-cao)" }}>{error}</div>
        ) : null}

        <p style={{ margin: "14px 0 0", fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
          Link cho phép người khác xem nội dung phân tích và trích dẫn hợp đồng (đã ẩn thông tin cá nhân).
          Dùng &quot;Xem trước trong tab mới&quot; để không rời màn hình phân tích hiện tại.
        </p>
      </div>
    </div>
  );
}
