import prisma from "@/lib/prisma";
import { getCurrentActor } from "@/lib/auth/get-current-actor";
import { getOrCreateMonthlyQuota, isDevUser } from "@/lib/auth/quota";
import { getRequestIpHash, getUserAgentHash } from "@/lib/security/hash";

export type UsageAction =
  | "contract_analysis"
  | "clause_analysis_standalone"
  | "contract_comparison";

type UsageAllowance =
  | { allowed: true; actorType: "user"; userId: string }
  | { allowed: false; status: number; error: string; code: string };

const UNAUTHORIZED_ERROR = {
  error: "Vui lòng đăng nhập bằng Google để tiếp tục.",
  code: "UNAUTHORIZED",
} as const;

const CONTRACT_QUOTA_EXCEEDED_ERROR = {
  error: "Bạn đã hết lượt phân tích hợp đồng miễn phí trong tháng này.",
  code: "CONTRACT_QUOTA_EXCEEDED",
} as const;

const CLAUSE_QUOTA_EXCEEDED_ERROR = {
  error: "Bạn đã hết lượt phân tích điều khoản miễn phí trong tháng này.",
  code: "CLAUSE_QUOTA_EXCEEDED",
} as const;

const COMPARISON_QUOTA_EXCEEDED_ERROR = {
  error: "Bạn đã hết lượt so sánh hợp đồng miễn phí trong tháng này.",
  code: "COMPARISON_QUOTA_EXCEEDED",
} as const;

function getQuotaExceededError(action: UsageAction) {
  if (action === "contract_analysis") {
    return CONTRACT_QUOTA_EXCEEDED_ERROR;
  }
  if (action === "clause_analysis_standalone") {
    return CLAUSE_QUOTA_EXCEEDED_ERROR;
  }
  return COMPARISON_QUOTA_EXCEEDED_ERROR;
}

/**
 * Read-only pre-flight quota check. Does NOT increment the counter and does
 * NOT log a usage event. Use this when the real quota consumption happens
 * later in the flow (e.g. the compare feature increments comparison quota on
 * the final `/api/analysis/compare` save), but you still want to fail fast
 * before running expensive work like OCR + LLM evaluation.
 */
export async function checkUsageAllowance(params: {
  request: Request;
  action: UsageAction;
}): Promise<UsageAllowance> {
  const actor = await getCurrentActor(params.request);
  if (actor.type === "anonymous") {
    return { allowed: false, status: 401, ...UNAUTHORIZED_ERROR };
  }

  if (isDevUser(actor.email)) {
    return { allowed: true, actorType: "user", userId: actor.userId };
  }

  try {
    const quota = await getOrCreateMonthlyQuota(actor.userId);
    const quotaExceededError = getQuotaExceededError(params.action);

    const exceeded =
      (params.action === "contract_analysis" &&
        quota.contractAnalysisCount >= quota.contractAnalysisLimit) ||
      (params.action === "clause_analysis_standalone" &&
        quota.clauseAnalysisCount >= quota.clauseAnalysisLimit) ||
      (params.action === "contract_comparison" &&
        quota.comparisonCount >= quota.comparisonLimit);

    if (exceeded) {
      return { allowed: false, status: 403, ...quotaExceededError };
    }

    return { allowed: true, actorType: "user", userId: actor.userId };
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.warn("[auth] Failed to check usage allowance.", { error: errorName });
    return {
      allowed: false,
      status: 500,
      error: "Unable to verify usage allowance. Please try again.",
      code: "USAGE_ALLOWANCE_FAILED",
    };
  }
}

export async function requireUsageAllowance(params: {
  request: Request;
  action: UsageAction;
}): Promise<UsageAllowance> {
  const actor = await getCurrentActor(params.request);
  const ipHash = getRequestIpHash(params.request);
  const userAgentHash = getUserAgentHash(params.request);

  if (actor.type === "anonymous") {
    return {
      allowed: false,
      status: 401,
      ...UNAUTHORIZED_ERROR,
    };
  }

  const isDev = isDevUser(actor.email);
  if (isDev) {
    try {
      await prisma.usageEvent.create({
        data: {
          userId: actor.userId,
          action: params.action,
          resourceId: null,
          ipHash,
          userAgentHash,
          metadata: { isDev: true },
        },
      });
    } catch (error) {
      console.warn("[auth] Failed to log usage event for dev user:", error);
    }

    return {
      allowed: true,
      actorType: "user",
      userId: actor.userId,
    };
  }

  let quota;
  try {
    quota = await getOrCreateMonthlyQuota(actor.userId);
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("[auth] Failed to load user quota:", errorName, error);
    return {
      allowed: false,
      status: 500,
      error: "Unable to verify usage allowance. Please try again.",
      code: "USAGE_ALLOWANCE_FAILED",
    };
  }
  const quotaExceededError = getQuotaExceededError(params.action);

  if (
    params.action === "contract_analysis" &&
    quota.contractAnalysisCount >= quota.contractAnalysisLimit
  ) {
    return {
      allowed: false,
      status: 403,
      ...quotaExceededError,
    };
  }

  if (
    params.action === "clause_analysis_standalone" &&
    quota.clauseAnalysisCount >= quota.clauseAnalysisLimit
  ) {
    return {
      allowed: false,
      status: 403,
      ...quotaExceededError,
    };
  }

  if (
    params.action === "contract_comparison" &&
    quota.comparisonCount >= quota.comparisonLimit
  ) {
    return {
      allowed: false,
      status: 403,
      ...quotaExceededError,
    };
  }

  try {
    const incremented = await prisma.$transaction(async (tx) => {
      const updateResult =
        params.action === "contract_analysis"
          ? await tx.userQuota.updateMany({
              where: {
                userId: actor.userId,
                contractAnalysisCount: { lt: quota.contractAnalysisLimit },
              },
              data: {
                contractAnalysisCount: { increment: 1 },
              },
            })
          : params.action === "clause_analysis_standalone"
          ? await tx.userQuota.updateMany({
              where: {
                userId: actor.userId,
                clauseAnalysisCount: { lt: quota.clauseAnalysisLimit },
              },
              data: {
                clauseAnalysisCount: { increment: 1 },
              },
            })
          : await tx.userQuota.updateMany({
              where: {
                userId: actor.userId,
                comparisonCount: { lt: quota.comparisonLimit },
              },
              data: {
                comparisonCount: { increment: 1 },
              },
            });

      if (updateResult.count === 0) {
        return false;
      }

      await tx.usageEvent.create({
        data: {
          userId: actor.userId,
          action: params.action,
          resourceId: null,
          ipHash,
          userAgentHash,
        },
      });

      return true;
    });

    if (!incremented) {
      return {
        allowed: false,
        status: 403,
        ...quotaExceededError,
      };
    }

    return {
      allowed: true,
      actorType: "user",
      userId: actor.userId,
    };
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.warn("[auth] Failed to verify usage allowance.", {
      error: errorName,
    });

    return {
      allowed: false,
      status: 500,
      error: "Unable to verify usage allowance. Please try again.",
      code: "USAGE_ALLOWANCE_FAILED",
    };
  }
}
