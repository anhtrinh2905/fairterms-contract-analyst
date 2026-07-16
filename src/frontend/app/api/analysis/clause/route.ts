import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAnalysisExpiresAt } from "@/lib/analysis/retention";
import { getCurrentActor } from "@/lib/auth/get-current-actor";
import { requireUsageAllowance } from "@/lib/auth/require-usage-allowance";

type ClauseSource = "standalone" | "contract";

export async function POST(request: Request) {
  let parsedBody: unknown;

  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof parsedBody !== "object" ||
    parsedBody === null ||
    Array.isArray(parsedBody)
  ) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const body = parsedBody as Record<string, unknown>;
  const source = body.source;
  const clauseText = body.clauseText;
  const contractType = body.contractType;
  const articleNo = body.articleNo;
  const contractAnalysisId = body.contractAnalysisId;

  if (source !== "standalone" && source !== "contract") {
    return NextResponse.json(
      { error: 'source must be either "standalone" or "contract"' },
      { status: 400 }
    );
  }

  if (typeof clauseText !== "string" || !clauseText.trim()) {
    return NextResponse.json(
      { error: "clauseText is required and must not be empty" },
      { status: 400 }
    );
  }

  if (typeof contractType !== "string" || !contractType.trim()) {
    return NextResponse.json(
      { error: "contractType is required and must not be empty" },
      { status: 400 }
    );
  }

  if (articleNo !== undefined && typeof articleNo !== "string") {
    return NextResponse.json(
      { error: "articleNo must be a string" },
      { status: 400 }
    );
  }

  if (
    source === "contract" &&
    (typeof contractAnalysisId !== "string" || !contractAnalysisId.trim())
  ) {
    return NextResponse.json(
      { error: "contractAnalysisId is required for contract source" },
      { status: 400 }
    );
  }

  const actor = await getCurrentActor(request);
  if (actor.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parentId: string | null = null;

  if (source === "standalone") {
    const allowance = await requireUsageAllowance({
      request,
      action: "clause_analysis_standalone",
    });

    if (!allowance.allowed) {
      return NextResponse.json(
        { error: allowance.error, code: allowance.code },
        { status: allowance.status }
      );
    }
  } else {
    const parent = await prisma.contractAnalysis.findFirst({
      where: {
        id: contractAnalysisId as string,
        userId: actor.userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    if (!parent) {
      return NextResponse.json(
        { error: "Contract analysis not found or expired" },
        { status: 404 }
      );
    }

    parentId = parent.id;
  }

  const expiresAt = getAnalysisExpiresAt();
  const data = {
    userId: actor.userId,
    source,
    contractAnalysisId: parentId,
    clauseText: clauseText.trim(),
    articleNo: articleNo ?? null,
    contractType: contractType.trim(),
    expiresAt,
  };

  try {
    const clauseAnalysis =
      source === "contract"
        ? await prisma.$transaction(async (tx) => {
            const clause = await tx.clauseAnalysis.create({
              data,
              select: {
                id: true,
                source: true,
                expiresAt: true,
              },
            });

            await tx.usageEvent.create({
              data: {
                userId: actor.userId,
                action: "clause_analysis_contract",
                resourceId: clause.id,
              },
            });

            return clause;
          })
        : await prisma.clauseAnalysis.create({
            data,
            select: {
              id: true,
              source: true,
              expiresAt: true,
            },
          });

    return NextResponse.json({
      id: clauseAnalysis.id,
      source: clauseAnalysis.source as ClauseSource,
      expiresAt: clauseAnalysis.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[api/analysis/clause] Failed to create clause analysis:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
