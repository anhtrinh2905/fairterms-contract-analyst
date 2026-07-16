import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentActor } from "@/lib/auth/get-current-actor";
import { failStuckContractAnalyses } from "@/lib/analysis/contract-cleanup";

type HistoryType = "all" | "contract" | "clause" | "compare";
type RiskLevel = "cao" | "trung_binh" | "thap" | "khong";

const historyTypes = new Set<HistoryType>(["all", "contract", "clause", "compare"]);
const riskLevels = new Set<RiskLevel>([
  "cao",
  "trung_binh",
  "thap",
  "khong",
]);

const invalidRequest = () =>
  NextResponse.json(
    { error: "Invalid request", code: "INVALID_REQUEST" },
    { status: 400 }
  );

export async function GET(request: Request) {
  const actor = await getCurrentActor(request);
  if (actor.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Auto-fail analyses stuck in "processing" (full timeout or empty shell)
  try {
    await failStuckContractAnalyses(actor.userId);
  } catch (err) {
    console.error("[GET /api/analysis/history] Failed to auto-fail stuck analyses:", err);
  }

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type") ?? "all";
  const riskLevelParam = searchParams.get("riskLevel");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (!historyTypes.has(typeParam as HistoryType)) {
    return invalidRequest();
  }

  if (
    riskLevelParam !== null &&
    !riskLevels.has(riskLevelParam as RiskLevel)
  ) {
    return invalidRequest();
  }

  const from = fromParam === null ? null : parseDate(fromParam, false);
  const to = toParam === null ? null : parseDate(toParam, true);

  if (
    (fromParam !== null && from === null) ||
    (toParam !== null && to === null) ||
    (from !== null && to !== null && from > to)
  ) {
    return invalidRequest();
  }

  const type = typeParam as HistoryType;
  const riskLevel = riskLevelParam as RiskLevel | null;
  const page = parsePositiveInteger(searchParams.get("page"), 1);
  const limit = Math.min(
    parsePositiveInteger(searchParams.get("limit"), 20),
    50
  );
  const now = new Date();
  const createdAt: Prisma.DateTimeFilter = {};

  if (from) {
    createdAt.gte = from;
  }

  if (to) {
    createdAt.lte = to;
  }

  const hasDateFilter = from !== null || to !== null;
  const includeContracts = type === "all" || type === "contract";
  const includeClauses = type === "all" || type === "clause";
  // Comparisons have no muc_rui_ro-style risk level of their own, so the
  // riskLevel filter (which only applies to contract/clause) excludes them.
  const includeComparisons = (type === "all" || type === "compare") && !riskLevel;

  try {
    const [contracts, clauses, comparisons] = await Promise.all([
      includeContracts
        ? prisma.contractAnalysis.findMany({
            where: {
              userId: actor.userId,
              expiresAt: {
                gt: now,
              },
              // Bản hợp đồng đã sửa (dùng cho so sánh) không hiện trong lịch sử
              // "Phân tích hợp đồng" — chỉ xuất hiện dưới dạng một lần so sánh.
              comparisonsAsRevised: { none: {} },
              ...(riskLevel ? { overallRisk: riskLevel } : {}),
              ...(hasDateFilter ? { createdAt } : {}),
            },
            select: {
              id: true,
              title: true,
              fileName: true,
              contractType: true,
              overallRisk: true,
              status: true,
              expiresAt: true,
              createdAt: true,
              contractInfo: true,
            },
          })
        : Promise.resolve([]),
      includeClauses
        ? prisma.clauseAnalysis.findMany({
            where: {
              userId: actor.userId,
              source: "standalone",
              expiresAt: {
                gt: now,
              },
              ...(riskLevel ? { riskLevel } : {}),
              ...(hasDateFilter ? { createdAt } : {}),
            },
            select: {
              id: true,
              clauseText: true,
              contractType: true,
              riskLevel: true,
              expiresAt: true,
              createdAt: true,
              conclusion: true,
              analysisResult: true,
            },
          })
        : Promise.resolve([]),
      includeComparisons
        ? prisma.contractComparison.findMany({
            where: {
              userId: actor.userId,
              expiresAt: {
                gt: now,
              },
              ...(hasDateFilter ? { createdAt } : {}),
            },
            select: {
              id: true,
              overallVerdict: true,
              overallSummary: true,
              expiresAt: true,
              createdAt: true,
              baseAnalysis: {
                select: { title: true, fileName: true, contractType: true, contractInfo: true },
              },
              revisedAnalysis: {
                select: { title: true, fileName: true },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const contractItems = contracts.map((contract) => ({
      id: contract.id,
      type: "contract" as const,
      title: contract.title,
      fileName: contract.fileName,
      contractType: contract.contractType,
      riskLevel: contract.overallRisk,
      status: contract.status,
      expiresAt: contract.expiresAt,
      createdAt: contract.createdAt,
      contractInfo: contract.contractInfo,
    }));

    const clauseItems = clauses.map((clause) => ({
      id: clause.id,
      type: "clause" as const,
      clausePreview: truncate(clause.clauseText, 60),
      contractType: clause.contractType,
      riskLevel: clause.riskLevel,
      expiresAt: clause.expiresAt,
      createdAt: clause.createdAt,
      conclusion: clause.conclusion,
      analysisResult: clause.analysisResult,
    }));

    const comparisonItems = comparisons.map((comparison) => ({
      id: comparison.id,
      type: "compare" as const,
      // Tên hiển thị (loại hợp đồng + địa chỉ) do frontend dựng từ contractType + contractInfo.
      title: null,
      fileName: comparison.baseAnalysis.fileName,
      contractType: comparison.baseAnalysis.contractType,
      contractInfo: comparison.baseAnalysis.contractInfo,
      riskLevel: null,
      overallVerdict: comparison.overallVerdict,
      conclusion: comparison.overallSummary,
      expiresAt: comparison.expiresAt,
      createdAt: comparison.createdAt,
    }));

    const items = [...contractItems, ...clauseItems, ...comparisonItems].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    const offset = (page - 1) * limit;

    return NextResponse.json(items.slice(offset, offset + limit));
  } catch (error) {
    console.error("[api/analysis/history] Failed to fetch history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function parseDate(value: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  const date = new Date(`${value}T${time}Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (value === null || !/^\d+$/.test(value)) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function truncate(value: string, maxLength: number): string {
  const trimmed = value.trim();
  return trimmed.length > maxLength
    ? `${trimmed.slice(0, maxLength - 1)}...`
    : trimmed;
}

export async function DELETE(request: Request) {
  const actor = await getCurrentActor(request);
  if (actor.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { items } = body as { items: Array<{ id: string; type: "contract" | "clause" | "compare" }> };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const contractIds = items.filter(item => item.type === "contract").map(item => item.id);
    const clauseIds = items.filter(item => item.type === "clause").map(item => item.id);
    const compareIds = items.filter(item => item.type === "compare").map(item => item.id);

    await prisma.$transaction([
      ...(contractIds.length > 0 ? [
        prisma.contractAnalysis.deleteMany({
          where: {
            id: { in: contractIds },
            userId: actor.userId
          }
        })
      ] : []),
      ...(clauseIds.length > 0 ? [
        prisma.clauseAnalysis.deleteMany({
          where: {
            id: { in: clauseIds },
            userId: actor.userId,
            source: "standalone"
          }
        })
      ] : []),
      ...(compareIds.length > 0 ? [
        prisma.contractComparison.deleteMany({
          where: {
            id: { in: compareIds },
            userId: actor.userId
          }
        })
      ] : [])
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/analysis/history] Failed to delete history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
