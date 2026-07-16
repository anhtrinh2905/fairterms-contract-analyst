import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentActor } from "@/lib/auth/get-current-actor";
import { getActiveShareByToken } from "@/lib/share/get-share";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const share = await getActiveShareByToken(token);

  if (!share) {
    return NextResponse.json(
      { error: "Link chia sẻ không tồn tại hoặc đã hết hạn" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    title: share.title,
    snapshot: share.snapshot,
    createdAt: share.createdAt.toISOString(),
    expiresAt: share.expiresAt?.toISOString() ?? null,
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const actor = await getCurrentActor(request);
  if (actor.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await context.params;

  const existing = await prisma.analysisShare.findFirst({
    where: { token, ownerId: actor.userId },
    select: { id: true, revokedAt: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy link chia sẻ" },
      { status: 404 },
    );
  }

  if (!existing.revokedAt) {
    await prisma.analysisShare.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
  }

  return NextResponse.json({ revoked: true });
}
