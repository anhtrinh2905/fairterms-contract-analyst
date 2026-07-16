import "server-only";
import prisma from "@/lib/prisma";
import {
  isContractShareSnapshot,
  type ContractShareSnapshot,
} from "@/lib/analysis/share-snapshot";

export interface ActiveShare {
  token: string;
  title: string | null;
  snapshot: ContractShareSnapshot;
  createdAt: Date;
  expiresAt: Date | null;
}

/**
 * Lấy bản chia sẻ còn hiệu lực theo token (public — không cần auth).
 * Trả null nếu không tồn tại, đã thu hồi, hết hạn, hoặc snapshot hỏng.
 * Tăng `viewCount` best-effort (không chặn nếu lỗi).
 */
export async function getActiveShareByToken(
  token: string,
): Promise<ActiveShare | null> {
  if (!token || token.length > 200) return null;

  const share = await prisma.analysisShare.findUnique({
    where: { token },
    select: {
      token: true,
      title: true,
      snapshot: true,
      revokedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  if (!share) return null;
  if (share.revokedAt) return null;
  if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) return null;
  if (!isContractShareSnapshot(share.snapshot)) return null;

  prisma.analysisShare
    .update({
      where: { token },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {
      /* view counting is best-effort */
    });

  return {
    token: share.token,
    title: share.title,
    snapshot: share.snapshot,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt,
  };
}
