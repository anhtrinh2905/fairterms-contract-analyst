import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentActor } from "@/lib/auth/get-current-actor";
import { failStuckContractAnalyses } from "@/lib/analysis/contract-cleanup";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedFields = new Set([
  "documentId",
  "contractType",
  "overallRisk",
  "contractInfo",
  "ocrMarkdown",
  "structuredData",
  "status",
  "totalClauses",
  "analyzedClauses",
  "flaggedClauses",
  "processingTimeMs",
]);

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

export async function GET(request: Request, context: RouteContext) {
  const actor = await getCurrentActor(request);
  if (actor.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // Auto-fail if this analysis is stuck in "processing"
  try {
    await failStuckContractAnalyses(actor.userId);
  } catch (err) {
    console.error(`[GET /api/analysis/contract/${id}] Failed to auto-fail stuck analysis:`, err);
  }

  try {
    const analysis = await prisma.contractAnalysis.findFirst({
      where: {
        id,
        userId: actor.userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        documentId: true,
        contractType: true,
        overallRisk: true,
        contractInfo: true,
        structuredData: true,
        ocrMarkdown: true,
        status: true,
        totalClauses: true,
        analyzedClauses: true,
        flaggedClauses: true,
        processingTimeMs: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        clauses: {
          select: {
            id: true,
            articleNo: true,
            contractType: true,
            clauseText: true,
            riskLevel: true,
            conclusion: true,
            analysisResult: true,
            suggestion: true,
            negotiationMessage: true,
            processingTimeMs: true,
            createdAt: true,
            legalBasis: true,
          },
          orderBy: { createdAt: "asc" },
        },
        parties: {
          select: {
            id: true,
            side: true,
            roleLabel: true,
            nameHash: true,
            idNumberHash: true,
            missingFields: true,
          },
        },
        equipment: {
          select: {
            id: true,
            name: true,
            quantity: true,
            condition: true,
          },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Không tìm thấy hợp đồng hoặc đã hết hạn lưu trữ." },
        { status: 404 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error(
      `[GET /api/analysis/contract/${id}] Failed to retrieve contract analysis:`,
      error
    );
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi truy xuất hợp đồng." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await getCurrentActor(request);
  if (actor.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existingAnalysis = await prisma.contractAnalysis.findFirst({
    where: {
      id,
      userId: actor.userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingAnalysis) {
    return NextResponse.json(
      { error: "Contract analysis not found" },
      { status: 404 }
    );
  }

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
  const unsupportedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field)
  );

  if (unsupportedFields.length > 0) {
    return NextResponse.json(
      {
        error: "Request contains fields that cannot be updated",
        fields: unsupportedFields,
      },
      { status: 400 }
    );
  }

  if (Object.keys(body).length === 0) {
    return NextResponse.json(
      { error: "At least one update field is required" },
      { status: 400 }
    );
  }

  const data: Prisma.ContractAnalysisUpdateInput = {};
  const nullableStringFields = [
    "documentId",
    "overallRisk",
    "ocrMarkdown",
  ] as const;

  for (const field of nullableStringFields) {
    if (!hasOwn(body, field)) {
      continue;
    }

    const value = body[field];
    if (value !== null && typeof value !== "string") {
      return NextResponse.json(
        { error: `${field} must be a string or null` },
        { status: 400 }
      );
    }

    data[field] = value;
  }

  const requiredStringFields = ["contractType", "status"] as const;

  for (const field of requiredStringFields) {
    if (!hasOwn(body, field)) {
      continue;
    }

    const value = body[field];
    if (typeof value !== "string" || !value.trim()) {
      return NextResponse.json(
        { error: `${field} must be a non-empty string` },
        { status: 400 }
      );
    }

    data[field] = value.trim();
  }

  const countFields = [
    "totalClauses",
    "analyzedClauses",
    "flaggedClauses",
  ] as const;

  for (const field of countFields) {
    if (!hasOwn(body, field)) {
      continue;
    }

    const value = body[field];
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0
    ) {
      return NextResponse.json(
        { error: `${field} must be a non-negative integer` },
        { status: 400 }
      );
    }

    data[field] = value;
  }

  if (hasOwn(body, "processingTimeMs")) {
    const value = body.processingTimeMs;
    if (
      value !== null &&
      (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    ) {
      return NextResponse.json(
        { error: "processingTimeMs must be a non-negative number or null" },
        { status: 400 }
      );
    }

    data.processingTimeMs = value;
  }

  if (hasOwn(body, "contractInfo")) {
    const value = body.contractInfo;
    // TODO: Mask raw PII in contractInfo before persistence.
    data.contractInfo =
      value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
  }

  if (hasOwn(body, "structuredData")) {
    const value = body.structuredData;
    data.structuredData =
      value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
  }

  try {
    const updatedAnalysis = await prisma.contractAnalysis.update({
      where: {
        id: existingAnalysis.id,
      },
      data,
      select: {
        id: true,
        title: true,
        fileName: true,
        documentId: true,
        contractType: true,
        overallRisk: true,
        status: true,
        totalClauses: true,
        analyzedClauses: true,
        flaggedClauses: true,
        processingTimeMs: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json(updatedAnalysis);
  } catch (error) {
    console.error(
      `[api/analysis/contract/${id}] Failed to update contract analysis:`,
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
