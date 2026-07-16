import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentActor } from "@/lib/auth/get-current-actor";
import { isContractShareSnapshot } from "@/lib/analysis/share-snapshot";
import {
  generateShareToken,
  shareExpiresAt,
  SHARE_EXPIRY_DAYS,
  type ShareExpiryDays,
} from "@/lib/share/token";

const MAX_ACTIVE_SHARES = 100;

function parseExpiry(value: unknown): ShareExpiryDays | undefined {
  if (value === null || value === undefined) return null;
  if (
    typeof value === "number" &&
    (SHARE_EXPIRY_DAYS as readonly number[]).includes(value)
  ) {
    return value as ShareExpiryDays;
  }
  return undefined;
}

export async function POST(request: Request) {
  const actor = await getCurrentActor(request);
  if (actor.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { snapshot, title } = body;

  if (!isContractShareSnapshot(snapshot)) {
    return NextResponse.json(
      { error: "snapshot không hợp lệ" },
      { status: 400 },
    );
  }

  const expiresInDays = parseExpiry(body.expiresInDays);
  if (expiresInDays === undefined) {
    return NextResponse.json(
      { error: "expiresInDays phải là 7, 30, 90 hoặc null" },
      { status: 400 },
    );
  }

  if (title !== undefined && title !== null && typeof title !== "string") {
    return NextResponse.json(
      { error: "title phải là chuỗi" },
      { status: 400 },
    );
  }

  const activeShares = await prisma.analysisShare.count({
    where: { ownerId: actor.userId, revokedAt: null },
  });
  if (activeShares >= MAX_ACTIVE_SHARES) {
    return NextResponse.json(
      { error: "Bạn đã đạt giới hạn số link chia sẻ đang hoạt động" },
      { status: 429 },
    );
  }

  try {
    const created = await prisma.analysisShare.create({
      data: {
        token: generateShareToken(),
        ownerId: actor.userId,
        analysisType: "contract",
        title: (title as string | undefined)?.trim() || snapshot.title,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        expiresAt: shareExpiresAt(expiresInDays),
      },
      select: { token: true, expiresAt: true, createdAt: true },
    });

    return NextResponse.json({
      token: created.token,
      path: `/chia-se/${created.token}`,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("[api/share] Failed to create share:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const actor = await getCurrentActor(request);
  if (actor.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const shares = await prisma.analysisShare.findMany({
      where: { ownerId: actor.userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        token: true,
        title: true,
        analysisType: true,
        viewCount: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      shares.map((s) => ({
        token: s.token,
        path: `/chia-se/${s.token}`,
        title: s.title,
        analysisType: s.analysisType,
        viewCount: s.viewCount,
        expiresAt: s.expiresAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    console.error("[api/share] Failed to list shares:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
