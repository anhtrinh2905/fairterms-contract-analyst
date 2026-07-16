"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { getContractAnalysis } from "@/lib/analysis/analysis-api";
import { contractAnalysisDetailToPrefilled } from "@/lib/analysis/contract-prefilled";
import { ContractMode } from "@/app/fairterms/components/analysis/ContractMode";
import type { ContractPrefilledResult } from "@/lib/analysis/share-snapshot";
import { Icon } from "@/app/fairterms/components/ui/icons";
import Link from "next/link";
import "@/app/fairterms.css";

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState<ContractPrefilledResult | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getContractAnalysis(id)
      .then((res) => {
        setPrefilled(contractAnalysisDetailToPrefilled(res));
        setError(null);
      })
      .catch((err) => {
        console.error(`[GET /fairterms/history/contract/${id}] Error:`, err);
        setError(err.message || "Đã xảy ra lỗi khi tải thông tin hợp đồng.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="app-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--background)" }}>
        <div style={{ textAlign: "center", color: "var(--ink-faint)" }}>
          <div className="spinner" style={{ border: "3px solid var(--line)", borderTop: "3px solid var(--primary)", borderRadius: "50%", width: 36, height: 36, animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
          <p style={{ fontSize: 14.5, fontWeight: 500 }}>Đang tải kết quả rà soát hợp đồng...</p>
          <style jsx global>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error || !prefilled) {
    return (
      <div className="app-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--background)", padding: 24 }}>
        <div className="card" style={{ maxWidth: 500, width: "100%", padding: 32, textAlign: "center", borderColor: "var(--risk-cao)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--risk-cao-bg)", color: "var(--risk-cao)", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
            <Icon.warn style={{ width: 28, height: 28 }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "var(--ink)" }}>Không thể tải kết quả</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 14.5, lineHeight: 1.6, marginBottom: 24 }}>
            {error || "Kết quả phân tích hợp đồng không tìm thấy hoặc đã hết hạn lưu trữ."}
          </p>
          <Link href="/app" className="btn btn-primary" style={{ display: "inline-flex", textDecoration: "none" }}>
            Quay lại bảng điều khiển
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ContractMode
        readOnly
        enableShare
        prefilledResult={prefilled}
        onBack={() => router.push("/app")}
      />
    </SessionProvider>
  );
}
