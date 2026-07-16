import Link from "next/link";
import type { AdminChecklistMeta } from "@/lib/api/types";
import { fetchAdminBackend } from "@/lib/admin/server-backend";

export default async function AdminChecklistsPage() {
  let checklists: AdminChecklistMeta[] = [];
  let errorMsg = "";

  try {
    checklists = await fetchAdminBackend<AdminChecklistMeta[]>("/checklists");
  } catch (err: unknown) {
    console.error("Failed to load checklists:", err);
    errorMsg = err instanceof Error ? err.message : "Không thể kết nối với dịch vụ backend.";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="adm-page-header">
        <h2 className="adm-page-title">Cấu hình Checklist rà soát</h2>
        <p className="adm-page-sub">
          Xem và chỉnh sửa danh sách điều khoản bắt buộc, dấu hiệu rủi ro và cơ sở pháp lý cho từng loại hợp đồng.
        </p>
      </div>

      {errorMsg && <div className="adm-alert adm-alert--error">{errorMsg}</div>}

      {checklists.length === 0 && !errorMsg ? (
        <div className="adm-card">
          <div className="adm-empty">Không tìm thấy checklist nào từ backend.</div>
        </div>
      ) : (
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Danh sách loại hợp đồng</span>
            <span className="adm-badge adm-badge--primary">{checklists.length} loại</span>
          </div>
          <div>
            {checklists.map((cl) => (
              <div key={cl.id} className="adm-checklist-card">
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      background: "var(--primary-tint)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      color: "var(--primary-ink)",
                      flexShrink: 0,
                    }}
                  >
                    ☑
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>
                      {cl.ten_hien_thi}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "2px" }}>
                      {cl.loai_hop_dong} · v{cl.phien_ban}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span className="adm-badge adm-badge--gray">{cl.items_count} điều khoản</span>
                  <Link
                    href={`/admin/checklists/${cl.loai_hop_dong}`}
                    className="adm-btn adm-btn--primary adm-btn--sm"
                  >
                    Chỉnh sửa →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          padding: "16px 20px",
          background: "var(--paper-2)",
          border: "1px solid var(--line)",
          borderRadius: "10px",
          fontSize: "13px",
          color: "var(--ink-soft)",
        }}
      >
        <strong style={{ color: "var(--ink)" }}>Lưu ý:</strong>{" "}
        Mỗi checklist được lưu dưới dạng file Markdown trong backend. Mọi thay đổi sẽ được hot-reload ngay lập tức mà không cần khởi động lại server.
      </div>
    </div>
  );
}
