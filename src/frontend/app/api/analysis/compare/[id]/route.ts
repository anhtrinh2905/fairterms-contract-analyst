import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentActor } from "@/lib/auth/get-current-actor";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const actor = await getCurrentActor(request);
  if (actor.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const comparison = await prisma.contractComparison.findFirst({
      where: {
        id,
        userId: actor.userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        diffResult: true,
        overallVerdict: true,
        overallSummary: true,
        createdAt: true,
        expiresAt: true,
        baseAnalysis: {
          select: {
            id: true,
            title: true,
            fileName: true,
            contractType: true,
            contractInfo: true,
            createdAt: true,
          },
        },
        revisedAnalysis: {
          select: {
            id: true,
            title: true,
            fileName: true,
            contractType: true,
            createdAt: true,
          },
        },
      },
    });

    if (!comparison) {
      return NextResponse.json(
        { error: "Không tìm thấy kết quả so sánh hoặc đã hết hạn lưu trữ." },
        { status: 404 }
      );
    }

    return NextResponse.json(comparison);
  } catch (error) {
    console.error(
      `[GET /api/analysis/compare/${id}] Failed to retrieve comparison:`,
      error
    );
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi truy xuất kết quả so sánh." },
      { status: 500 }
    );
  }
}
