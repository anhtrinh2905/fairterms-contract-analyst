import prisma from "@/lib/prisma";

/** Mark long-running analyses as failed (full pipeline timeout). */
const STUCK_PROCESSING_MS = 15 * 60 * 1000;

/**
 * Remove abandoned shells: created in DB but never received OCR payload
 * (e.g. React Strict Mode double-mount in dev).
 */
const EMPTY_SHELL_MS = 3 * 60 * 1000;

/**
 * Auto-fail contract analyses that will never complete:
 * - stuck in `processing` for 15+ minutes, or
 * - still `processing` with no OCR data after 3+ minutes.
 */
export async function failStuckContractAnalyses(userId?: string): Promise<void> {
  const now = Date.now();
  const stuckBefore = new Date(now - STUCK_PROCESSING_MS);
  const emptyShellBefore = new Date(now - EMPTY_SHELL_MS);
  const ownerFilter = userId ? { userId } : {};

  await prisma.contractAnalysis.updateMany({
    where: {
      ...ownerFilter,
      status: "processing",
      createdAt: { lt: stuckBefore },
    },
    data: { status: "failed" },
  });

  await prisma.contractAnalysis.updateMany({
    where: {
      ...ownerFilter,
      status: "processing",
      ocrMarkdown: null,
      totalClauses: 0,
      analyzedClauses: 0,
      createdAt: { lt: emptyShellBefore },
    },
    data: { status: "failed" },
  });
}
