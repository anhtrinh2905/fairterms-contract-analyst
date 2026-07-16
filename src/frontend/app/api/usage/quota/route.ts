import { NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/auth/get-current-actor";
import { getOrCreateMonthlyQuota, isDevUser } from "@/lib/auth/quota";

export async function GET(request: Request) {
  try {
    const actor = await getCurrentActor(request);
    if (actor.type !== "user") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quota = await getOrCreateMonthlyQuota(actor.userId);
    const isUnlimited = isDevUser(actor.email);

    return NextResponse.json({
      contractAnalysisCount: quota.contractAnalysisCount,
      contractAnalysisLimit: quota.contractAnalysisLimit,
      clauseAnalysisCount: quota.clauseAnalysisCount,
      clauseAnalysisLimit: quota.clauseAnalysisLimit,
      comparisonCount: quota.comparisonCount,
      comparisonLimit: quota.comparisonLimit,
      periodStart: quota.periodStart,
      periodEnd: quota.periodEnd,
      isUnlimited,
    });
  } catch (error) {
    console.error("[GET /api/usage/quota] Failed to retrieve quota:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi truy xuất hạn ngạch sử dụng." },
      { status: 500 }
    );
  }
}
