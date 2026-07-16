import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

export type AdminAuditAction =
  | "UPDATE_USER_QUOTA"
  | "UPDATE_CHECKLIST"
  | "INGEST_RAG_DOCUMENT"
  | "INGEST_RAG_TEXT"
  | "UPDATE_AI_CONFIG"
  | "FLUSH_CACHE"
  | "DELETE_CACHE_ENTRY";

export async function writeAdminAuditLog(input: {
  adminEmail: string;
  action: AdminAuditAction;
  target: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminEmail: input.adminEmail,
        action: input.action,
        target: input.target,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (err) {
    console.error("Failed to write admin audit log:", err);
  }
}
