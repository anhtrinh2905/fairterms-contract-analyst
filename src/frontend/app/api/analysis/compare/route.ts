import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentActor } from "@/lib/auth/get-current-actor";
import { requireUsageAllowance } from "@/lib/auth/require-usage-allowance";
import { getAnalysisExpiresAt } from "@/lib/analysis/retention";

const OVERALL_VERDICTS = new Set(["tot_hon", "xau_hon", "hon_hop", "khong_doi"]);

export async function POST(request: Request) {
  const actor = await getCurrentActor(request);
  if (actor.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    baseAnalysisId?: string;
    revisedAnalysisId?: string;
    diffResult?: unknown;
    overallVerdict?: string;
    overallSummary?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { baseAnalysisId, revisedAnalysisId, diffResult, overallVerdict, overallSummary } = body;

  if (typeof baseAnalysisId !== "string" || !baseAnalysisId.trim()) {
    return NextResponse.json(
      { error: "baseAnalysisId is required and must not be empty" },
      { status: 400 }
    );
  }

  if (typeof revisedAnalysisId !== "string" || !revisedAnalysisId.trim()) {
    return NextResponse.json(
      { error: "revisedAnalysisId is required and must not be empty" },
      { status: 400 }
    );
  }

  if (diffResult === undefined || diffResult === null) {
    return NextResponse.json({ error: "diffResult is required" }, { status: 400 });
  }

  if (typeof overallVerdict !== "string" || !OVERALL_VERDICTS.has(overallVerdict)) {
    return NextResponse.json(
      { error: `overallVerdict must be one of: ${[...OVERALL_VERDICTS].join(", ")}` },
      { status: 400 }
    );
  }

  if (typeof overallSummary !== "string" || !overallSummary.trim()) {
    return NextResponse.json(
      { error: "overallSummary is required and must not be empty" },
      { status: 400 }
    );
  }

  const allowance = await requireUsageAllowance({
    request,
    action: "contract_comparison",
  });

  if (!allowance.allowed) {
    return NextResponse.json(
      { error: allowance.error, code: allowance.code },
      { status: allowance.status }
    );
  }

  try {
    const [baseAnalysis, revisedAnalysis] = await Promise.all([
      prisma.contractAnalysis.findFirst({
        where: { id: baseAnalysisId, userId: actor.userId },
        select: { id: true },
      }),
      prisma.contractAnalysis.findFirst({
        where: { id: revisedAnalysisId, userId: actor.userId },
        select: { id: true },
      }),
    ]);

    if (!baseAnalysis || !revisedAnalysis) {
      return NextResponse.json(
        { error: "Không tìm thấy hợp đồng gốc hoặc hợp đồng đã sửa để so sánh." },
        { status: 404 }
      );
    }

    const comparison = await prisma.contractComparison.create({
      data: {
        userId: actor.userId,
        baseAnalysisId,
        revisedAnalysisId,
        diffResult: diffResult as Prisma.InputJsonValue,
        overallVerdict,
        overallSummary: overallSummary.trim(),
        expiresAt: getAnalysisExpiresAt(),
      },
      select: {
        id: true,
        overallVerdict: true,
        overallSummary: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json(comparison);
  } catch (error) {
    console.error("[POST /api/analysis/compare] Failed to create comparison:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
