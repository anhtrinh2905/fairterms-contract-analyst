import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret");

  if (!cronSecret || !providedSecret || providedSecret !== cronSecret) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const now = new Date();

    const deletedClauses = await prisma.clauseAnalysis.deleteMany({
      where: {
        expiresAt: { lte: now },
        source: "standalone",
      },
    });

    const deletedContracts = await prisma.contractAnalysis.deleteMany({
      where: {
        expiresAt: { lte: now },
      },
    });

    const deletedFeedbacks = await prisma.analysisFeedback.deleteMany({
      where: {
        expiresAt: { lte: now },
      },
    });

    return NextResponse.json({
      ok: true,
      deletedClauses: deletedClauses.count,
      deletedContracts: deletedContracts.count,
      deletedFeedbacks: deletedFeedbacks.count,
    });
  } catch (error) {
    console.error("[POST /api/cron/cleanup] Cleanup failed", error);
    return NextResponse.json(
      { error: "Cleanup failed", code: "CLEANUP_FAILED" },
      { status: 500 },
    );
  }
}
