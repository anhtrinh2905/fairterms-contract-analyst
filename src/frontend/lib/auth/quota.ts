import prisma from "@/lib/prisma";
import { getCurrentQuotaPeriod } from "@/lib/auth/quota-period";

const DEFAULT_CONTRACT_ANALYSIS_LIMIT = 5;
const DEFAULT_CLAUSE_ANALYSIS_LIMIT = 10;
const DEFAULT_COMPARISON_LIMIT = 5;

export function isDevUser(email?: string | null): boolean {
  if (!email) return false;
  const devEmailsEnv = process.env.DEV_UNLIMITED_EMAILS;
  if (!devEmailsEnv) return false;

  const devEmails = devEmailsEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return devEmails.includes(email.toLowerCase());
}

export async function getOrCreateMonthlyQuota(userId: string) {
  const now = new Date();
  const { periodStart, periodEnd } = getCurrentQuotaPeriod(now);

  const quota = await prisma.userQuota.findUnique({
    where: { userId },
  });

  if (!quota) {
    return prisma.userQuota.create({
      data: {
        userId,
        contractAnalysisCount: 0,
        contractAnalysisLimit: DEFAULT_CONTRACT_ANALYSIS_LIMIT,
        clauseAnalysisCount: 0,
        clauseAnalysisLimit: DEFAULT_CLAUSE_ANALYSIS_LIMIT,
        comparisonCount: 0,
        comparisonLimit: DEFAULT_COMPARISON_LIMIT,
        periodStart,
        periodEnd,
      },
    });
  }

  if (now > quota.periodEnd) {
    return prisma.userQuota.update({
      where: { userId },
      data: {
        contractAnalysisCount: 0,
        clauseAnalysisCount: 0,
        comparisonCount: 0,
        periodStart,
        periodEnd,
      },
    });
  }

  return quota;
}
