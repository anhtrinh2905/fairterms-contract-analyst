import type { Session } from "next-auth";
import prisma from "@/lib/prisma";

function parseEmailList(raw: string): string[] {
  const value = raw.trim();
  if (!value) return [];
  if (value.startsWith("[") && value.endsWith("]")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
      }
    } catch {
      // Fall through to CSV parsing.
    }
  }
  return value
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdminSession(session: Session | null): Promise<boolean> {
  const email = session?.user?.email;
  if (!email) return false;
  const adminEmails = [
    ...parseEmailList(process.env.ADMIN_EMAILS || ""),
    ...parseEmailList(process.env.DEV_UNLIMITED_EMAILS || ""),
  ];
  if (adminEmails.includes(email.toLowerCase())) {
    return true;
  }
  if (!session.user?.id) return false;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true },
    });
    return user?.tier === "admin";
  } catch {
    return false;
  }
}

export function allowMockAdminInCurrentEnv(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_MOCK_ADMIN === "true";
}
