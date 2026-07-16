import "../../fairterms.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getActiveShareByToken } from "@/lib/share/get-share";
import { SharedAnalysisView } from "./SharedAnalysisView";

export const metadata: Metadata = {
  title: "Bản chia sẻ phân tích hợp đồng — HopDongAI",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function SharedAnalysisPage({ params }: PageProps) {
  const { token } = await params;
  const share = await getActiveShareByToken(token);

  if (!share) {
    return (
      <div className="wrap" style={{ maxWidth: 560, margin: "0 auto", paddingTop: 80, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, marginBottom: 10 }}>Link không khả dụng</h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.6 }}>
          Link chia sẻ này không tồn tại, đã hết hạn hoặc đã bị người chia sẻ thu hồi.
        </p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>
          Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <SharedAnalysisView snapshot={share.snapshot} />
  );
}
