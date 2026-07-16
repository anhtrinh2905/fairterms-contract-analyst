import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentActor } from "@/lib/auth/get-current-actor";

export async function POST(request: Request) {
  const actor = await getCurrentActor(request);
  if (actor.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { analysisType, analysisId, rating } = body;

    // Validation
    if (!analysisType || !analysisId || typeof rating !== "number") {
      return NextResponse.json(
        { error: "Missing required fields", code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    if (!["clause", "contract", "compare"].includes(analysisType)) {
      return NextResponse.json(
        { error: "Invalid analysisType", code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5", code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year expiry

    // Create the feedback record
    const feedback = await prisma.analysisFeedback.create({
      data: {
        userId: actor.userId,
        analysisType,
        analysisId,
        rating,
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        id: feedback.id,
        rating: feedback.rating,
        createdAt: feedback.createdAt,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    // Unique constraint violation in Prisma (P2002)
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "You have already rated this analysis", code: "ALREADY_RATED" },
        { status: 409 }
      );
    }

    console.error("[POST /api/feedback] Error creating feedback:", error);
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

  const { searchParams } = new URL(request.url);
  const analysisType = searchParams.get("analysisType");
  const analysisId = searchParams.get("analysisId");

  if (!analysisType || !analysisId) {
    return NextResponse.json(
      { error: "Missing query parameters", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  try {
    const feedback = await prisma.analysisFeedback.findUnique({
      where: {
        userId_analysisType_analysisId: {
          userId: actor.userId,
          analysisType,
          analysisId,
        },
      },
      select: {
        rating: true,
        createdAt: true,
      },
    });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error("[GET /api/feedback] Error fetching feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
