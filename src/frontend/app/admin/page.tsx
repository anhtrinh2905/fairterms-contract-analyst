import Link from "next/link";
import prisma from "@/lib/prisma";
import { fetchAdminBackend } from "@/lib/admin/server-backend";
import type { AdminBackendStats } from "@/lib/api/types";

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

async function getStats() {
  try {
    const todayStart = startOfToday();
    const [totalAnalyses, activeUsers, guestUseCount, analysesToday, completedCount, failedCount, timeAgg] =
      await Promise.all([
        prisma.contractAnalysis.count(),
        prisma.user.count(),
        prisma.usageEvent.count({
          where: { action: "ocr_contract", userId: { startsWith: "guest_" } },
        }),
        prisma.contractAnalysis.count({
          where: { createdAt: { gte: todayStart } },
        }),
        prisma.contractAnalysis.count({ where: { status: "completed" } }),
        prisma.contractAnalysis.count({ where: { status: "failed" } }),
        prisma.contractAnalysis.aggregate({
          _avg: { processingTimeMs: true },
        }),
      ]);

    const avgProcessingTimeMs = Math.round(timeAgg._avg.processingTimeMs || 0);
    const finishedCount = completedCount + failedCount;
    const successRatePct = finishedCount > 0 ? Math.round((completedCount / finishedCount) * 100) : null;

    let backendStats: AdminBackendStats = {
      parents: 0,
      children: 0,
      checklists_count: 0,
      indexed: false,
    };

    try {
      backendStats = await fetchAdminBackend<AdminBackendStats>("/stats");
    } catch (err) {
      console.error("Failed to fetch backend admin stats:", err);
    }

    return {
      totalAnalyses,
      activeUsers,
      guestUseCount,
      analysesToday,
      successRatePct,
      avgProcessingTimeMs,
      ...backendStats,
    };
  } catch (err) {
    console.error("Failed to query system stats:", err);
    return {
      totalAnalyses: 0,
      activeUsers: 0,
      guestUseCount: 0,
      analysesToday: 0,
      successRatePct: null,
      avgProcessingTimeMs: 0,
      parents: 0,
      children: 0,
      checklists_count: 0,
      indexed: false,
    };
  }
}

async function getAuditLogs() {
  try {
    return await prisma.adminAuditLog.findMany({ take: 10, orderBy: { createdAt: "desc" } });
  } catch (err) {
    console.error("Failed to query admin audit logs:", err);
    return [];
  }
}

const quickLinks = [
  { title: "Quản lý Người dùng", desc: "Điều chỉnh hạn mức, tier và quyền truy cập tài khoản.", icon: "◉", href: "/admin/users" },
  { title: "Checklist Hợp đồng", desc: "Chỉnh sửa bộ điều khoản rà soát bắt buộc và rủi ro.", icon: "☑", href: "/admin/checklists" },
  { title: "Văn bản luật (RAG)", desc: "Nạp tài liệu pháp lý mới vào cơ sở dữ liệu ChromaDB.", icon: "⊞", href: "/admin/rag" },
  { title: "RAG Playground", desc: "Kiểm thử truy vấn RAG và xem điểm similarity trực tiếp.", icon: "⚗", href: "/admin/playground" },
  { title: "Cấu hình AI", desc: "Quản lý API key, mô hình AI và hạn mức chi phí vận hành.", icon: "✦", href: "/admin/ai-config" },
  { title: "Giám sát LangSmith", desc: "Theo dõi số lượt chạy, tỷ lệ lỗi, độ trễ và chi phí token của các pipeline AI.", icon: "◈", href: "/admin/observability" },
  { title: "Quản lý Cache", desc: "Xem trạng thái Redis, số lượng key theo namespace và xóa cache khi cần.", icon: "⬡", href: "/admin/cache" },
];

export default async function AdminPage() {
  const stats = await getStats();
  const logs = await getAuditLogs();

  const statCards = [
    {
      label: "Rà soát hôm nay",
      value: stats.analysesToday.toLocaleString("vi-VN"),
      sub: `Tổng tích lũy: ${stats.totalAnalyses.toLocaleString("vi-VN")}`,
      accent: "blue",
    },
    {
      label: "Tỷ lệ thành công",
      value: stats.successRatePct !== null ? `${stats.successRatePct}%` : "—",
      sub: "Hoàn tất / (hoàn tất + lỗi)",
      accent: "green",
    },
    {
      label: "Người dùng đăng ký",
      value: stats.activeUsers.toLocaleString("vi-VN"),
      sub: `Khách: ${stats.guestUseCount} lượt OCR`,
      accent: "amber",
    },
    {
      label: "Thời gian OCR TB",
      value: stats.avgProcessingTimeMs > 0 ? `${(stats.avgProcessingTimeMs / 1000).toFixed(1)}s` : "—",
      sub: "Trung bình xử lý/hợp đồng",
      accent: "amber",
    },
    {
      label: "Chunks RAG đã index",
      value: stats.children.toLocaleString("vi-VN"),
      sub: `Từ ${stats.parents} văn bản · ${stats.indexed ? "✓ Đã index" : "○ Chưa index"}`,
      accent: "blue",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="adm-hero">
        <h2>Chào mừng trở lại, Administrator!</h2>
        <p>
          Hệ thống FairTerms đang vận hành. Dưới đây là các chỉ số thời gian thực được tổng hợp từ cơ sở dữ liệu và backend AI.
        </p>
      </div>

      <div className="adm-stat-grid">
        {statCards.map((s) => (
          <div key={s.label} className="adm-stat-card">
            <div className={`adm-stat-accent ${s.accent}`} />
            <div className="adm-stat-label">{s.label}</div>
            <div className="adm-stat-value">{s.value}</div>
            <div className="adm-stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="adm-2col">
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Nhật ký quản trị gần đây</span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "999px",
                background: "var(--paper-2)",
                color: "var(--ink-faint)",
              }}
            >
              {logs.length} bản ghi
            </span>
          </div>
          {logs.length === 0 ? (
            <div className="adm-empty">Chưa có hoạt động quản trị nào được ghi lại.</div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Quản trị viên</th>
                    <th>Hành động</th>
                    <th>Đối tượng</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ color: "var(--ink)", fontWeight: 600, fontSize: "13px" }}>
                        {log.adminEmail.split("@")[0]}
                      </td>
                      <td>
                        <span className="adm-badge adm-badge--primary">{log.action}</span>
                      </td>
                      <td style={{ fontSize: "13px" }}>{log.target}</td>
                      <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                        {new Date(log.createdAt).toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Phân hệ quản lý</span>
          </div>
          <div>
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="adm-quick-link">
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "var(--primary-tint)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    color: "var(--primary-ink)",
                    flexShrink: 0,
                  }}
                >
                  {link.icon}
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--ink)" }}>
                    {link.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "2px" }}>
                    {link.desc}
                  </div>
                </div>
                <div style={{ marginLeft: "auto", color: "var(--ink-faint)", fontSize: "16px" }}>→</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
