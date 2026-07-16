import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentActor } from "@/lib/auth/get-current-actor";
import { checkUsageAllowance, requireUsageAllowance } from "@/lib/auth/require-usage-allowance";
import { getAnalysisExpiresAt } from "@/lib/analysis/retention";
import { failStuckContractAnalyses } from "@/lib/analysis/contract-cleanup";

export async function POST(request: Request) {
  const actor = await getCurrentActor(request);
  if (actor.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    fileName?: string;
    title?: string;
    contractType?: string;
    source?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { fileName, title, contractType, source } = body;

  if (typeof fileName !== "string" || !fileName.trim()) {
    return NextResponse.json(
      { error: "fileName is required and must not be empty" },
      { status: 400 }
    );
  }

  if (title !== undefined && typeof title !== "string") {
    return NextResponse.json(
      { error: "title must be a string" },
      { status: 400 }
    );
  }

  if (contractType !== undefined && typeof contractType !== "string") {
    return NextResponse.json(
      { error: "contractType must be a string" },
      { status: 400 }
    );
  }

  let isAllowed = true;
  let allowanceError: string | undefined;
  let allowanceCode: string | undefined;
  let allowanceStatus: number = 200;

  if (source === "comparison") {
    // Fail fast if the user is already out of comparison quota so we don't
    // burn OCR + LLM tokens on a run that cannot be persisted. The real
    // increment happens later in POST /api/analysis/compare.
    const preflight = await checkUsageAllowance({
      request,
      action: "contract_comparison",
    });

    if (!preflight.allowed) {
      isAllowed = false;
      allowanceError = preflight.error;
      allowanceCode = preflight.code;
      allowanceStatus = preflight.status;
    } else {
      try {
        const { getRequestIpHash, getUserAgentHash } = await import("@/lib/security/hash");
        const ipHash = getRequestIpHash(request);
        const userAgentHash = getUserAgentHash(request);
        await prisma.usageEvent.create({
          data: {
            userId: actor.userId,
            action: "contract_analysis_comparison",
            resourceId: null,
            ipHash,
            userAgentHash,
            metadata: { source: "comparison" },
          },
        });
      } catch (error) {
        console.warn("[api/analysis/contract] Failed to log comparison contract usage event:", error);
      }
    }
  } else {
    const allowance = await requireUsageAllowance({
      request,
      action: "contract_analysis",
    });

    if (!allowance.allowed) {
      isAllowed = false;
      allowanceError = allowance.error;
      allowanceCode = allowance.code;
      allowanceStatus = allowance.status;
    }
  }

  if (!isAllowed) {
    return NextResponse.json(
      { error: allowanceError, code: allowanceCode },
      { status: allowanceStatus }
    );
  }

  const expiresAt = getAnalysisExpiresAt();

  try {
    const analysis = await prisma.contractAnalysis.create({
      data: {
        userId: actor.userId,
        fileName: fileName.trim(),
        title: title ?? null,
        contractType: contractType || "unknown",
        status: "processing",
        expiresAt,
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({
      id: analysis.id,
      status: analysis.status,
      expiresAt: analysis.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[api/analysis/contract] Failed to create contract analysis:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const actor = await getCurrentActor(request);
  if (actor.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Auto-fail analyses stuck in "processing" (full timeout or empty shell)
  try {
    await failStuckContractAnalyses(actor.userId);
  } catch (err) {
    console.error("[GET /api/analysis/contract] Failed to auto-fail stuck analyses:", err);
  }

  const { searchParams } = new URL(request.url);
  const pageStr = searchParams.get("page");
  const limitStr = searchParams.get("limit");

  let page = 1;
  if (pageStr) {
    const parsedPage = parseInt(pageStr, 10);
    if (!isNaN(parsedPage) && parsedPage > 0) {
      page = parsedPage;
    }
  }

  let limit = 20;
  if (limitStr) {
    const parsedLimit = parseInt(limitStr, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 50);
    }
  }

  const skip = (page - 1) * limit;
  const now = new Date();

  try {
    const items = await prisma.contractAnalysis.findMany({
      where: {
        userId: actor.userId,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        fileName: true,
        documentId: true,
        contractType: true,
        overallRisk: true,
        status: true,
        contractInfo: true,
        totalClauses: true,
        analyzedClauses: true,
        flaggedClauses: true,
        processingTimeMs: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("[api/analysis/contract] Failed to fetch contract analyses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
