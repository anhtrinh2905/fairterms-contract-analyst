import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { writeAdminAuditLog } from "@/lib/auth/admin-audit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserWithQuota = any;

interface UsersPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const searchEmail = params.email || "";
  const session = await auth();
  const adminEmail = session?.user?.email || "Unknown Admin";

  // Server Action for updating user tier + all 3 tool quotas
  async function handleUpdateQuota(formData: FormData) {
    "use server";
    const userId = formData.get("userId") as string;
    const email = formData.get("email") as string;
    const tier = formData.get("tier") as string;
    const contractLimit = parseInt(formData.get("contractLimit") as string, 10);
    const clauseLimit = parseInt(formData.get("clauseLimit") as string, 10);
    const comparisonLimit = parseInt(formData.get("comparisonLimit") as string, 10);

    if (!userId || isNaN(contractLimit) || isNaN(clauseLimit) || isNaN(comparisonLimit)) return;

    try {
      await prisma.user.update({ where: { id: userId }, data: { tier } });

      const existingQuota = await prisma.userQuota.findUnique({ where: { userId } });
      const limits = {
        contractAnalysisLimit: contractLimit,
        clauseAnalysisLimit: clauseLimit,
        comparisonLimit: comparisonLimit,
      };

      if (existingQuota) {
        await prisma.userQuota.update({ where: { userId }, data: limits });
      } else {
        await prisma.userQuota.create({
          data: {
            userId,
            ...limits,
            periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }

      await writeAdminAuditLog({
        adminEmail,
        action: "UPDATE_USER_QUOTA",
        target: email,
        metadata: { tier, contractLimit, clauseLimit, comparisonLimit },
      });

      revalidatePath("/admin/users");
      revalidatePath("/admin");
    } catch (err) {
      console.error("Failed to update user quota:", err);
    }
  }

  let users: UserWithQuota[] = [];
  let dbError = "";
  try {
    users = await prisma.user.findMany({
      where: searchEmail
        ? { email: { contains: searchEmail, mode: "insensitive" } }
        : {},
      include: { quota: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch (err) {
    console.error("Failed to query users:", err);
    dbError = "Không thể kết nối cơ sở dữ liệu. Vui lòng đảm bảo PostgreSQL đang hoạt động.";
  }

  const tierColors: Record<string, string> = {
    admin: "adm-badge--red",
    premium: "adm-badge--primary",
    free: "adm-badge--gray",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page header */}
      <div className="adm-page-header">
        <h2 className="adm-page-title">Quản lý người dùng</h2>
        <p className="adm-page-sub">
          Thiết lập phân hạng tài khoản (Tier), điều chỉnh hạn mức phân tích và xem lịch sử sử dụng.
        </p>
      </div>

      {dbError && <div className="adm-alert adm-alert--error">{dbError}</div>}

      {/* Search + stats bar */}
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">Danh sách tài khoản</span>
          <form method="GET" action="/admin/users" className="adm-search-row">
            <input
              type="text"
              name="email"
              defaultValue={searchEmail}
              placeholder="Tìm theo email..."
              className="adm-search-input"
            />
            <button type="submit" className="adm-btn adm-btn--primary adm-btn--sm">
              Tìm kiếm
            </button>
            {searchEmail && (
              <a href="/admin/users" className="adm-btn adm-btn--ghost adm-btn--sm">
                Xóa lọc ✕
              </a>
            )}
          </form>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Ngày đăng ký</th>
                <th>Phân hạng</th>
                <th>Hạn mức sử dụng</th>
                <th>Cập nhật quyền</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center" }}>
                    <div className="adm-empty">Không tìm thấy người dùng nào phù hợp.</div>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const quotaMetrics = [
                    {
                      key: "contractLimit",
                      label: "Hợp đồng",
                      used: user.quota?.contractAnalysisCount ?? 0,
                      limit: user.quota?.contractAnalysisLimit ?? 5,
                    },
                    {
                      key: "clauseLimit",
                      label: "Điều khoản",
                      used: user.quota?.clauseAnalysisCount ?? 0,
                      limit: user.quota?.clauseAnalysisLimit ?? 10,
                    },
                    {
                      key: "comparisonLimit",
                      label: "So sánh",
                      used: user.quota?.comparisonCount ?? 0,
                      limit: user.quota?.comparisonLimit ?? 5,
                    },
                  ];

                  return (
                    <tr key={user.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "13.5px" }}>
                          {user.name || "Chưa đặt tên"}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--ink-faint)", marginTop: "2px" }}>
                          {user.email}
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td>
                        <span className={`adm-badge ${tierColors[user.tier] || "adm-badge--gray"}`}>
                          {user.tier.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {user.quota ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "140px" }}>
                            {quotaMetrics.map((m) => {
                              const pct = Math.min(100, Math.round((m.used / m.limit) * 100));
                              return (
                                <div key={m.key}>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                    <span style={{ color: "var(--ink-faint)" }}>{m.label}</span>
                                    <span style={{ color: "var(--ink)" }}>
                                      <strong>{m.used}</strong>
                                      <span style={{ color: "var(--ink-faint)" }}> / {m.limit}</span>
                                    </span>
                                  </div>
                                  <div className="adm-progress-wrap">
                                    <div
                                      className="adm-progress-bar"
                                      style={{
                                        width: `${pct}%`,
                                        background: pct >= 90 ? "var(--risk-cao)" : "var(--primary)",
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>
                            Chưa cấu hình (mặc định: 5 / 10 / 5)
                          </span>
                        )}
                      </td>
                      <td>
                        <form
                          action={handleUpdateQuota}
                          style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "220px" }}
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="email" value={user.email || ""} />
                          <select
                            name="tier"
                            defaultValue={user.tier}
                            className="adm-select"
                            style={{ fontSize: "12.5px", padding: "7px 10px" }}
                          >
                            <option value="free">Free</option>
                            <option value="premium">Premium</option>
                            <option value="admin">Admin</option>
                          </select>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {quotaMetrics.map((m) => (
                              <label
                                key={m.key}
                                style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "10.5px", color: "var(--ink-faint)" }}
                              >
                                {m.label}
                                <input
                                  type="number"
                                  name={m.key}
                                  defaultValue={m.limit}
                                  className="adm-input"
                                  style={{ width: "60px", padding: "6px 8px", fontSize: "12px" }}
                                  min={1}
                                  max={9999}
                                />
                              </label>
                            ))}
                          </div>
                          <button type="submit" className="adm-btn adm-btn--primary adm-btn--sm">
                            Lưu
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {users.length > 0 && (
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid var(--line)",
              fontSize: "12px",
              color: "var(--ink-faint)",
            }}
          >
            Hiển thị {users.length} tài khoản{searchEmail ? ` phù hợp với "${searchEmail}"` : " gần nhất"}.
          </div>
        )}
      </div>
    </div>
  );
}
