import Link from "next/link";
import prisma from "@/lib/prisma";

interface FeedbackPageProps {
  searchParams: Promise<{ type?: string; period?: string; page?: string }>;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

const TYPE_LABELS: Record<string, string> = {
  contract: "Hợp đồng",
  clause: "Điều khoản",
  compare: "So sánh",
};

export default async function AdminFeedbackPage({ searchParams }: FeedbackPageProps) {
  const params = await searchParams;
  const type = params.type || "all";
  const period = params.period || "all";
  const page = parseInt(params.page || "1", 10) || 1;

  // Build Filters
  const filters: {
    analysisType?: string;
    createdAt?: { gte: Date };
  } = {};

  if (type !== "all") {
    filters.analysisType = type;
  }
  if (period === "today") {
    filters.createdAt = { gte: startOfToday() };
  } else if (period === "7d") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    filters.createdAt = { gte: sevenDaysAgo };
  } else if (period === "30d") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filters.createdAt = { gte: thirtyDaysAgo };
  }

  // Database Queries
  const [totalCount, todayCount, distributionAgg, avgAgg, items] = await Promise.all([
    // Total matching filters
    prisma.analysisFeedback.count({ where: filters }),
    // Today matching filters
    prisma.analysisFeedback.count({
      where: { ...filters, createdAt: { gte: startOfToday() } },
    }),
    // Star distribution
    prisma.analysisFeedback.groupBy({
      by: ["rating"],
      _count: { rating: true },
      where: filters,
    }),
    // Average rating
    prisma.analysisFeedback.aggregate({
      _avg: { rating: true },
      where: filters,
    }),
    // List with pagination
    prisma.analysisFeedback.findMany({
      where: filters,
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
      skip: (page - 1) * 10,
    }),
  ]);

  const averageRating = avgAgg._avg.rating || 0;

  // Compute distribution percentages
  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distributionAgg.forEach((item) => {
    ratingCounts[item.rating] = item._count.rating;
  });

  const totalPages = Math.ceil(totalCount / 10) || 1;

  // helper to generate query URLs
  const getQueryUrl = (newParams: { type?: string; period?: string; page?: number }) => {
    const p = { type, period, page: 1, ...newParams };
    const query = new URLSearchParams();
    if (p.type !== "all") query.set("type", p.type);
    if (p.period !== "all") query.set("period", p.period);
    if (p.page > 1) query.set("page", String(p.page));
    const str = query.toString();
    return str ? `/admin/feedback?${str}` : "/admin/feedback";
  };

  const activeTabStyle = {
    padding: "6px 14px",
    background: "var(--primary-tint, #e0f2fe)",
    color: "var(--primary-ink, #0369a1)",
    fontWeight: 600,
    borderRadius: "6px",
    fontSize: "13px",
    textDecoration: "none",
    border: "1px solid transparent",
    transition: "all 0.15s ease",
  };

  const inactiveTabStyle = {
    padding: "6px 14px",
    background: "var(--surface, #ffffff)",
    color: "var(--ink-soft, #475569)",
    borderRadius: "6px",
    fontSize: "13px",
    textDecoration: "none",
    border: "1px solid var(--line, #e2e8f0)",
    transition: "all 0.15s ease",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Hero Header */}
      <div className="adm-hero">
        <h2>📊 Phản hồi người dùng</h2>
        <p>
          Xem thống kê điểm đánh giá chất lượng và lịch sử phản hồi thời gian thực từ phía người dùng.
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="adm-stat-grid">
        <div className="adm-stat-card">
          <div className="adm-stat-accent amber" />
          <div className="adm-stat-label">Điểm trung bình</div>
          <div className="adm-stat-value">⭐ {averageRating > 0 ? averageRating.toFixed(1) : "—"}</div>
          <div className="adm-stat-sub">Tính trên tất cả bộ lọc đã chọn</div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-accent blue" />
          <div className="adm-stat-label">Tổng số phản hồi</div>
          <div className="adm-stat-value">{totalCount.toLocaleString("vi-VN")} lượt</div>
          <div className="adm-stat-sub">Đã ghi nhận trong cơ sở dữ liệu</div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-accent green" />
          <div className="adm-stat-label">Đánh giá hôm nay</div>
          <div className="adm-stat-value">{todayCount.toLocaleString("vi-VN")} lượt</div>
          <div className="adm-stat-sub">Tính từ 00:00 ngày hôm nay</div>
        </div>
      </div>

      <div className="adm-2col">
        {/* Left Card: Star Distribution Chart */}
        <div className="adm-card" style={{ flex: "0 0 35%", display: "flex", flexDirection: "column", justifySelf: "stretch" }}>
          <div className="adm-card-header">
            <span className="adm-card-title">Phân bố xếp hạng</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px 0" }}>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingCounts[stars] || 0;
              const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              return (
                <div key={stars} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ width: "32px", fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                    {stars} ★
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "16px",
                      backgroundColor: "var(--paper-2, #f1f5f9)",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${percent}%`,
                        height: "100%",
                        backgroundColor: "#F59E0B",
                        borderRadius: "8px",
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      width: "80px",
                      fontSize: "12.5px",
                      color: "var(--ink-faint)",
                      textAlign: "right",
                    }}
                  >
                    {count} ({percent}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Card: Filter Toolbar & Detailed Feedback Table */}
        <div className="adm-card" style={{ flex: 1 }}>
          <div className="adm-card-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <span className="adm-card-title">Danh sách chi tiết</span>
          </div>

          {/* Filter Panels */}
          <div
            style={{
              padding: "16px",
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            {/* Type Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--ink-faint)", fontWeight: 600 }}>Loại:</span>
              <div style={{ display: "flex", gap: "4px" }}>
                {["all", "contract", "clause", "compare"].map((t) => (
                  <Link
                    key={t}
                    href={getQueryUrl({ type: t })}
                    style={type === t ? activeTabStyle : inactiveTabStyle}
                  >
                    {t === "all" ? "Tất cả" : TYPE_LABELS[t]}
                  </Link>
                ))}
              </div>
            </div>

            {/* Period Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--ink-faint)", fontWeight: 600 }}>Thời gian:</span>
              <div style={{ display: "flex", gap: "4px" }}>
                {[
                  { key: "all", label: "Tất cả" },
                  { key: "today", label: "Hôm nay" },
                  { key: "7d", label: "7 ngày qua" },
                  { key: "30d", label: "30 ngày qua" },
                ].map((p) => (
                  <Link
                    key={p.key}
                    href={getQueryUrl({ period: p.key })}
                    style={period === p.key ? activeTabStyle : inactiveTabStyle}
                  >
                    {p.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* List Table */}
          {items.length === 0 ? (
            <div className="adm-empty" style={{ padding: "48px 16px" }}>
              Không tìm thấy đánh giá nào khớp với điều kiện lọc.
            </div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th style={{ width: "120px" }}>Đánh giá</th>
                    <th style={{ width: "120px" }}>Loại phân tích</th>
                    <th>Email người dùng</th>
                    <th style={{ width: "180px" }}>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ color: "#F59E0B", fontWeight: 700, fontSize: "15px" }}>
                        {"★".repeat(item.rating)}
                        <span style={{ opacity: 0.25 }}>{"☆".repeat(5 - item.rating)}</span>
                      </td>
                      <td>
                        <span
                          className={`adm-badge ${
                            item.analysisType === "contract"
                              ? "adm-badge--primary"
                              : item.analysisType === "clause"
                                ? ""
                                : "adm-badge--secondary"
                          }`}
                          style={{
                            backgroundColor:
                              item.analysisType === "contract"
                                ? "var(--primary-tint, #e0f2fe)"
                                : item.analysisType === "clause"
                                  ? "var(--paper-2, #f1f5f9)"
                                  : "#fef3c7",
                            color:
                              item.analysisType === "contract"
                                ? "var(--primary, #0284c7)"
                                : item.analysisType === "clause"
                                  ? "var(--ink-soft, #475569)"
                                  : "#d97706",
                            border: "none",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {TYPE_LABELS[item.analysisType] || item.analysisType}
                        </span>
                      </td>
                      <td style={{ fontSize: "13.5px", color: "var(--ink)" }}>
                        {item.user?.email || "Unknown User"}
                      </td>
                      <td style={{ fontSize: "12.5px", color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                        {new Intl.DateTimeFormat("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(item.createdAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                padding: "16px",
                borderTop: "1px solid var(--line)",
              }}
            >
              {page > 1 && (
                <Link
                  href={getQueryUrl({ page: page - 1 })}
                  style={{
                    ...inactiveTabStyle,
                    padding: "4px 10px",
                    fontWeight: 600,
                  }}
                >
                  &larr; Trước
                </Link>
              )}

              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                // Show simple pagination window
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  Math.abs(pageNum - page) <= 2
                ) {
                  return (
                    <Link
                      key={pageNum}
                      href={getQueryUrl({ page: pageNum })}
                      style={page === pageNum ? activeTabStyle : inactiveTabStyle}
                    >
                      {pageNum}
                    </Link>
                  );
                }
                if (
                  pageNum === 2 ||
                  pageNum === totalPages - 1
                ) {
                  return (
                    <span key={pageNum} style={{ color: "var(--ink-faint)", padding: "0 4px" }}>
                      ...
                    </span>
                  );
                }
                return null;
              })}

              {page < totalPages && (
                <Link
                  href={getQueryUrl({ page: page + 1 })}
                  style={{
                    ...inactiveTabStyle,
                    padding: "4px 10px",
                    fontWeight: 600,
                  }}
                >
                  Sau &rarr;
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
