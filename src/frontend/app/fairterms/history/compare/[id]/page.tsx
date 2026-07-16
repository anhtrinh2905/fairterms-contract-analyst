"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import {
  getContractComparison,
  type ContractComparisonDetail,
  type OverallCompareVerdict,
} from "@/lib/analysis/analysis-api";
import { Icon } from "@/app/fairterms/components/ui/icons";
import {
  CompareResultView,
  type CompareResultData,
} from "@/app/fairterms/components/analysis/CompareResultView";
import { AppSidebar, type AppAuth, type View } from "@/app/fairterms/components/AppSidebar";
import "@/app/fairterms.css";

function getFriendlyContractType(type: string): string {
  const typeMap: Record<string, string> = {
    cho_thue_can_ho_chung_cu: "Thuê căn hộ chung cư",
    mua_ban_can_ho_chung_cu: "Mua bán căn hộ chung cư",
    unknown: "Hợp đồng bất động sản",
  };
  return typeMap[type] || type;
}

function CompareDetailInner({ id }: { id: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ContractComparisonDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getContractComparison(id)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        console.error(`[GET /fairterms/history/compare/${id}] Error:`, err);
        setError(err.message || "Đã xảy ra lỗi khi tải kết quả so sánh.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="app-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--background)" }}>
        <div style={{ textAlign: "center", color: "var(--ink-faint)" }}>
          <div className="spinner" style={{ border: "3px solid var(--line)", borderTop: "3px solid var(--primary)", borderRadius: "50%", width: 32, height: 32, animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 14.5, fontWeight: 500 }}>Đang tải kết quả so sánh...</p>
          <style jsx global>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      </div>
    );
  }

  const stored = data?.diffResult as CompareResultData | undefined;
  const compatible = stored && Array.isArray(stored.clauses) && stored.info;

  if (error || !data || !compatible) {
    return (
      <div className="app-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--background)", padding: 24 }}>
        <div className="card" style={{ maxWidth: 500, width: "100%", padding: 32, textAlign: "center", borderColor: "var(--risk-cao)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--risk-cao-bg)", color: "var(--risk-cao)", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
            <Icon.warn style={{ width: 28, height: 28 }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "var(--ink)" }}>Không thể tải kết quả</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 14.5, lineHeight: 1.6, marginBottom: 24 }}>
            {error || "Kết quả so sánh không tìm thấy, đã hết hạn lưu trữ, hoặc thuộc phiên bản cũ không tương thích."}
          </p>
          <Link href="/app" className="btn btn-primary" style={{ display: "inline-flex", textDecoration: "none" }}>
            Quay lại bảng điều khiển
          </Link>
        </div>
      </div>
    );
  }

  const viewData: CompareResultData = {
    summary: stored!.summary,
    overallVerdict: (data.overallVerdict as OverallCompareVerdict) ?? stored!.overallVerdict,
    overallSummary: data.overallSummary ?? stored!.overallSummary,
    info: stored!.info,
    clauses: stored!.clauses,
  };

  const friendlyType = getFriendlyContractType(data.baseAnalysis.contractType);
  const address = (data.baseAnalysis.contractInfo as { dia_chi?: string } | null)?.dia_chi;
  const hasAddress = typeof address === "string" && address !== "—" && address.trim().length > 0;
  const headerTitle = hasAddress
    ? `So sánh hợp đồng ${friendlyType.toLowerCase()} tại ${address}`
    : `So sánh hợp đồng ${friendlyType.toLowerCase()}`;
  const revisedName = data.revisedAnalysis.title || data.revisedAnalysis.fileName;

  const auth: AppAuth = {
    name: session?.user?.name || session?.user?.email || "Người dùng",
    email: session?.user?.email || undefined,
    plan: "free",
  };
  // Trang standalone không có state "view" nội bộ — mọi mục điều hướng khác đưa về /app.
  const goToApp = (_v: View) => router.push("/app");
  const logout = () => {
    router.push("/app");
    void signOut({ callbackUrl: "/app" });
  };

  return (
    <div className="app-shell">
      <AppSidebar auth={auth} view="compare" setView={goToApp} onLogout={logout} />
      <main className="app-main">
        <CompareResultView
          data={viewData}
          headerTitle={headerTitle}
          headerSubtitle={`Bản đã sửa: ${revisedName}`}
          onBack={() => router.push("/app")}
          comparisonId={id}
        />
      </main>
    </div>
  );
}

export default function CompareDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <CompareDetailInner id={id} />
    </SessionProvider>
  );
}
