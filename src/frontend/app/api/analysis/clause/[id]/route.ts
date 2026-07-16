import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentActor } from "@/lib/auth/get-current-actor";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedFields = new Set([
  "riskLevel",
  "conclusion",
  "analysisResult",
  "legalBasis",
  "suggestion",
  "negotiationMessage",
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

  try {
    const analysis = await prisma.clauseAnalysis.findFirst({
      where: {
        id,
        userId: actor.userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        source: true,
        contractAnalysisId: true,
        clauseText: true,
        articleNo: true,
        contractType: true,
        riskLevel: true,
        conclusion: true,
        analysisResult: true,
        legalBasis: true,
        suggestion: true,
        negotiationMessage: true,
        processingTimeMs: true,
        expiresAt: true,
        createdAt: true,
        contractAnalysis: {
          select: {
            id: true,
            title: true,
            fileName: true,
          },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Không tìm thấy kết quả phân tích điều khoản hoặc thông tin đã hết hạn lưu trữ." },
        { status: 404 }
      );
    }

    const { contractAnalysis, ...rest } = analysis;
    const responseData = {
      ...rest,
      contract: rest.source === "contract" && contractAnalysis ? {
        id: contractAnalysis.id,
        title: contractAnalysis.title,
        fileName: contractAnalysis.fileName,
      } : null,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error(
      `[GET /api/analysis/clause/${id}] Failed to retrieve clause analysis:`,
      error
    );
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi truy xuất phân tích điều khoản." },
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
  const existingAnalysis = await prisma.clauseAnalysis.findFirst({
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
      { error: "Clause analysis not found" },
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

  const data: Prisma.ClauseAnalysisUpdateInput = {};
  const nullableStringFields = [
    "riskLevel",
    "conclusion",
    "suggestion",
    "negotiationMessage",
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

  if (hasOwn(body, "analysisResult")) {
    const value = body.analysisResult;
    data.analysisResult =
      value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
  }

  if (hasOwn(body, "legalBasis")) {
    const value = body.legalBasis;
    data.legalBasis =
      value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
  }

  try {
    const updatedAnalysis = await prisma.clauseAnalysis.update({
      where: {
        id: existingAnalysis.id,
      },
      data,
      select: {
        id: true,
        source: true,
        contractAnalysisId: true,
        articleNo: true,
        contractType: true,
        riskLevel: true,
        conclusion: true,
        suggestion: true,
        negotiationMessage: true,
        processingTimeMs: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json(updatedAnalysis);
  } catch (error) {
    console.error(
      `[api/analysis/clause/${id}] Failed to update clause analysis:`,
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
