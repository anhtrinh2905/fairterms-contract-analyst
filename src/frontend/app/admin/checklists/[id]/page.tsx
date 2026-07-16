"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminGetChecklistDetail, adminSaveChecklist } from "@/lib/api/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface RoleInfo {
  ma: string;
  ten: string;
  vi_the: string;
}

interface ChecklistDetail {
  checklist_id: string;
  ten_hien_thi: string;
  phien_ban: string;
  luu_y: string;
  van_ban_phap_luat_tham_chieu?: string[];
  quy_uoc_vai_tro?: {
    ben_a?: RoleInfo;
    ben_b?: RoleInfo;
    protected_party?: string;
  };
  machine_block?: Record<string, unknown>;
}

export default function EditChecklistPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [checklistId, setChecklistId] = useState("");
  const [tenHienThi, setTenHienThi] = useState("");
  const [phienBan, setPhienBan] = useState("");
  const [luuY, setLuuY] = useState("");
  const [lawsText, setLawsText] = useState("");
  const [roleA, setRoleA] = useState<RoleInfo>({ ma: "", ten: "", vi_the: "" });
  const [roleB, setRoleB] = useState<RoleInfo>({ ma: "", ten: "", vi_the: "" });
  const [protectedParty, setProtectedParty] = useState("ben_b");
  const [machineBlockText, setMachineBlockText] = useState("");
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const rawData = await adminGetChecklistDetail(id);
        const data = rawData as unknown as ChecklistDetail;
        setChecklistId(data.checklist_id || "");
        setTenHienThi(data.ten_hien_thi || "");
        setPhienBan(data.phien_ban || "");
        setLuuY(data.luu_y || "");
        setLawsText((data.van_ban_phap_luat_tham_chieu || []).join("\n"));
        setRoleA(data.quy_uoc_vai_tro?.ben_a || { ma: "", ten: "", vi_the: "" });
        setRoleB(data.quy_uoc_vai_tro?.ben_b || { ma: "", ten: "", vi_the: "" });
        setProtectedParty(data.quy_uoc_vai_tro?.protected_party || "ben_b");
        setMachineBlockText(JSON.stringify(data.machine_block || {}, null, 2));
      } catch (err: unknown) {
        console.error("Failed to load checklist detail:", err);
        setErrorMsg(err instanceof Error ? err.message : "Không thể tải chi tiết checklist.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleJsonChange = (val: string) => {
    setMachineBlockText(val);
    try {
      if (val.trim()) {
        JSON.parse(val);
      }
      setJsonError("");
    } catch (err: unknown) {
      setJsonError(`JSON Syntax Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonError) return;

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const lawsList = lawsText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const machineBlock = machineBlockText.trim() ? JSON.parse(machineBlockText) : {};

      const payload = {
        checklist_id: checklistId,
        ten_hien_thi: tenHienThi,
        phien_ban: phienBan,
        luu_y: luuY,
        van_ban_phap_luat_tham_chieu: lawsList,
        quy_uoc_vai_tro: {
          ben_a: roleA,
          ben_b: roleB,
          protected_party: protectedParty,
        },
        machine_block: machineBlock,
      };

      await adminSaveChecklist(id, payload);
      setSuccessMsg("Checklist đã được cập nhật và hot-reload thành công!");
      router.refresh();
    } catch (err: unknown) {
      console.error("Failed to save checklist:", err);
      setErrorMsg(err instanceof Error ? err.message : "Không thể lưu cấu hình checklist.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ color: "var(--ink-soft)", fontSize: "14px" }}>Đang tải cấu hình checklist...</div>;
  }

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <style>{`
        .form-section {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius, 12px);
          padding: 28px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
        }
        .admin-input {
          padding: 10px 16px;
          border: 1px solid var(--line);
          border-radius: var(--radius-sm, 6px);
          background: var(--surface);
          color: var(--ink);
          font-family: inherit;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .admin-input:focus {
          border-color: var(--primary);
        }
        .admin-btn {
          padding: 12px 24px;
          background: var(--primary);
          color: #ffffff;
          border: none;
          border-radius: var(--radius-sm, 6px);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .admin-btn:hover {
          background: var(--primary-2);
        }
        .admin-btn:disabled {
          background: var(--line-strong);
          cursor: not-allowed;
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Link
            href="/admin/checklists"
            style={{ fontSize: "13px", color: "var(--primary)", textDecoration: "none" }}
          >
            ← Quay lại danh sách Checklist
          </Link>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginTop: "8px" }}>
            Chỉnh sửa: {tenHienThi || id}
          </h2>
        </div>
        <button type="submit" disabled={saving || !!jsonError} className="admin-btn">
          {saving ? "Đang lưu cấu hình..." : "Lưu thay đổi"}
        </button>
      </div>

      {successMsg && (
        <div
          style={{
            padding: "16px 20px",
            background: "var(--risk-khong-bg)",
            color: "var(--risk-khong)",
            border: "1px solid var(--risk-khong)",
            borderRadius: "var(--radius, 12px)",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: "16px 20px",
            background: "var(--risk-cao-bg)",
            color: "var(--risk-cao)",
            border: "1px solid var(--risk-cao)",
            borderRadius: "var(--radius, 12px)",
            fontSize: "14px",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Metadata Section */}
      <div className="form-section">
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--ink)", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
          Thông tin chung (Metadata)
        </h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Tên hiển thị</label>
            <input
              type="text"
              value={tenHienThi}
              onChange={(e) => setTenHienThi(e.target.value)}
              className="admin-input"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phiên bản</label>
            <input
              type="text"
              value={phienBan}
              onChange={(e) => setPhienBan(e.target.value)}
              className="admin-input"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Lưu ý / Disclaimer</label>
          <textarea
            value={luuY}
            onChange={(e) => setLuuY(e.target.value)}
            className="admin-input"
            rows={2}
            required
            style={{ resize: "vertical" }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Văn bản pháp luật tham chiếu (Mỗi dòng một văn bản)</label>
          <textarea
            value={lawsText}
            onChange={(e) => setLawsText(e.target.value)}
            className="admin-input"
            rows={4}
            style={{ resize: "vertical", fontFamily: "monospace" }}
          />
        </div>
      </div>

      {/* Roles Section */}
      <div className="form-section">
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--ink)", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
          Quy ước vai trò
        </h3>
        <div className="form-grid">
          {/* Bên A */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--primary)" }}>Bên A (Bên soạn hợp đồng)</h4>
            <div className="form-group">
              <label className="form-label">Mã vai trò (ma)</label>
              <input
                type="text"
                value={roleA.ma}
                onChange={(e) => setRoleA({ ...roleA, ma: e.target.value })}
                className="admin-input"
                placeholder="ben_ban"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tên hiển thị (ten)</label>
              <input
                type="text"
                value={roleA.ten}
                onChange={(e) => setRoleA({ ...roleA, ten: e.target.value })}
                className="admin-input"
                placeholder="Bên bán"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Vị thế (vi_the)</label>
              <input
                type="text"
                value={roleA.vi_the}
                onChange={(e) => setRoleA({ ...roleA, vi_the: e.target.value })}
                className="admin-input"
                placeholder="Người bán / chủ nhà"
              />
            </div>
          </div>

          {/* Bên B */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--primary)" }}>Bên B (Bên được bảo vệ)</h4>
            <div className="form-group">
              <label className="form-label">Mã vai trò (ma)</label>
              <input
                type="text"
                value={roleB.ma}
                onChange={(e) => setRoleB({ ...roleB, ma: e.target.value })}
                className="admin-input"
                placeholder="ben_mua"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tên hiển thị (ten)</label>
              <input
                type="text"
                value={roleB.ten}
                onChange={(e) => setRoleB({ ...roleB, ten: e.target.value })}
                className="admin-input"
                placeholder="Bên mua"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Vị thế (vi_the)</label>
              <input
                type="text"
                value={roleB.vi_the}
                onChange={(e) => setRoleB({ ...roleB, vi_the: e.target.value })}
                className="admin-input"
                placeholder="Người mua / người thuê"
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Bên được bảo vệ (protected_party)</label>
          <select
            value={protectedParty}
            onChange={(e) => setProtectedParty(e.target.value)}
            className="admin-input"
          >
            <option value="ben_a">{roleA.ten || "Bên A"} (ben_a)</option>
            <option value="ben_b">{roleB.ten || "Bên B"} (ben_b)</option>
          </select>
        </div>
      </div>

      {/* Machine readable block Section */}
      <div className="form-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
            Cấu hình chi tiết Checklist Items (JSON block)
          </h3>
          <span style={{ fontSize: "11px", color: "var(--ink-faint)", fontWeight: 600 }}>
            Chứa danh sách nghĩa vụ bắt buộc và tín hiệu rủi ro
          </span>
        </div>

        {jsonError && (
          <div
            style={{
              padding: "10px 16px",
              background: "var(--risk-cao-bg)",
              color: "var(--risk-cao)",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "monospace",
            }}
          >
            {jsonError}
          </div>
        )}

        <div className="form-group">
          <textarea
            value={machineBlockText}
            onChange={(e) => handleJsonChange(e.target.value)}
            className="admin-input"
            rows={20}
            style={{
              fontFamily: "monospace",
              fontSize: "13px",
              lineHeight: "1.5",
              resize: "vertical",
              background: "var(--paper)",
              borderColor: jsonError ? "var(--risk-cao)" : "var(--line)",
            }}
            required
          />
        </div>
      </div>
    </form>
  );
}
