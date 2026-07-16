type ApiErrorBody = {
  error?: string;
  code?: string;
};

export class AnalysisApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "AnalysisApiError";
    this.code = code;
    this.status = status;
  }
}

function codeFromStatus(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 404:
      return "NOT_FOUND";
    case 500:
      return "INTERNAL_ERROR";
    default:
      return `HTTP_${status}`;
  }
}

/**
 * Notify the QuotaBadge (and any other listener) that server-side quota may
 * have changed so it can re-fetch instead of showing a stale count. Safe to
 * call on both success and failure paths — the badge just re-reads the
 * authoritative value from `/api/usage/quota`.
 */
function notifyQuotaChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("quota:refresh"));
  } catch {
    /* environments without CustomEvent constructor: ignore */
  }
}

async function parseApiResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    let code = codeFromStatus(res.status);

    try {
      const body = (await res.json()) as ApiErrorBody;
      if (typeof body.error === "string" && body.error) {
        message = body.error;
      }
      if (typeof body.code === "string" && body.code) {
        code = body.code;
      }
    } catch {
      // keep status-derived defaults
    }

    throw new AnalysisApiError(
      message || `HTTP ${res.status}`,
      code,
      res.status,
    );
  }

  return res.json() as Promise<T>;
}

/** POST /api/analysis/contract */
export async function createContractAnalysis(input: {
  fileName: string;
  title?: string;
  contractType?: string;
  source?: string;
}): Promise<{
  id: string;
  status: string;
  expiresAt?: string;
}> {
  const res = await fetch("/api/analysis/contract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  notifyQuotaChanged();
  return parseApiResponse(res);
}

/** PATCH /api/analysis/contract/[id] */
export async function updateContractAnalysis(
  id: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`/api/analysis/contract/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseApiResponse(res);
}

/** POST /api/analysis/clause */
export async function createClauseAnalysis(input: {
  source: "standalone" | "contract";
  contractAnalysisId?: string;
  clauseText: string;
  articleNo?: string;
  contractType: string;
}): Promise<{
  id: string;
  source: string;
  expiresAt?: string;
}> {
  const res = await fetch("/api/analysis/clause", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  notifyQuotaChanged();
  return parseApiResponse(res);
}

/** PATCH /api/analysis/clause/[id] */
export async function updateClauseAnalysis(
  id: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`/api/analysis/clause/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseApiResponse(res);
}

export interface ContractAnalysisDetail {
  id: string;
  title: string | null;
  fileName: string;
  documentId: string | null;
  contractType: string;
  overallRisk: string | null;
  contractInfo: unknown;
  structuredData: unknown;
  ocrMarkdown: string | null;
  status: string;
  totalClauses: number;
  analyzedClauses: number;
  flaggedClauses: number;
  processingTimeMs: number | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  clauses: Array<{
    id: string;
    articleNo: string | null;
    contractType: string;
    clauseText: string;
    riskLevel: string | null;
    conclusion: string | null;
    analysisResult: unknown;
    suggestion: string | null;
    negotiationMessage: string | null;
    processingTimeMs: number | null;
    createdAt: string;
    legalBasis?: unknown;
  }>;
  parties: Array<{
    id: string;
    side: string;
    roleLabel: string | null;
    nameHash: string | null;
    idNumberHash: string | null;
    missingFields: unknown;
  }>;
  equipment: Array<{
    id: string;
    name: string;
    quantity: number;
    condition: string | null;
  }>;
}

export interface ClauseAnalysisDetail {
  id: string;
  source: string;
  contractAnalysisId: string | null;
  clauseText: string;
  articleNo: string | null;
  contractType: string;
  riskLevel: string | null;
  conclusion: string | null;
  analysisResult: unknown;
  legalBasis: unknown;
  suggestion: string | null;
  negotiationMessage: string | null;
  processingTimeMs: number | null;
  expiresAt: string;
  createdAt: string;
  contract: {
    id: string;
    title: string | null;
    fileName: string;
  } | null;
}

/** GET /api/analysis/contract/[id] */
export async function getContractAnalysis(id: string): Promise<ContractAnalysisDetail> {
  const res = await fetch(`/api/analysis/contract/${id}`, {
    method: "GET",
  });
  return parseApiResponse<ContractAnalysisDetail>(res);
}

/** GET /api/analysis/clause/[id] */
export async function getClauseAnalysis(id: string): Promise<ClauseAnalysisDetail> {
  const res = await fetch(`/api/analysis/clause/${id}`, {
    method: "GET",
  });
  return parseApiResponse<ClauseAnalysisDetail>(res);
}

export type OverallCompareVerdict = "tot_hon" | "xau_hon" | "hon_hop" | "khong_doi";

/** POST /api/analysis/compare */
export async function createContractComparison(input: {
  baseAnalysisId: string;
  revisedAnalysisId: string;
  diffResult: unknown;
  overallVerdict: OverallCompareVerdict;
  overallSummary: string;
}): Promise<{
  id: string;
  overallVerdict: string;
  overallSummary: string;
  createdAt: string;
  expiresAt: string;
}> {
  const res = await fetch("/api/analysis/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  notifyQuotaChanged();
  return parseApiResponse(res);
}

export interface ContractComparisonDetail {
  id: string;
  diffResult: unknown;
  overallVerdict: string;
  overallSummary: string;
  createdAt: string;
  expiresAt: string;
  baseAnalysis: {
    id: string;
    title: string | null;
    fileName: string;
    contractType: string;
    contractInfo: unknown;
    createdAt: string;
  };
  revisedAnalysis: {
    id: string;
    title: string | null;
    fileName: string;
    contractType: string;
    createdAt: string;
  };
}

/** GET /api/analysis/compare/[id] */
export async function getContractComparison(id: string): Promise<ContractComparisonDetail> {
  const res = await fetch(`/api/analysis/compare/${id}`, {
    method: "GET",
  });
  return parseApiResponse<ContractComparisonDetail>(res);
}



export interface HistoryItem {
  id: string;
  type: "contract" | "clause" | "compare";
  title?: string | null;
  fileName?: string;
  clausePreview?: string;
  contractType: string;
  riskLevel: string | null;
  status?: string;
  overallVerdict?: string;
  expiresAt: string;
  createdAt: string;
  contractInfo?: unknown;
  conclusion?: string | null;
  analysisResult?: unknown;
}


export async function getAnalysisHistory(params?: {
  type?: "all" | "contract" | "clause" | "compare";
  riskLevel?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<HistoryItem[]> {
  const query = new URLSearchParams();
  if (params) {
    if (params.type) query.append("type", params.type);
    if (params.riskLevel) query.append("riskLevel", params.riskLevel);
    if (params.from) query.append("from", params.from);
    if (params.to) query.append("to", params.to);
    if (params.page !== undefined) query.append("page", String(params.page));
    if (params.limit !== undefined) query.append("limit", String(params.limit));
  }
  const queryString = query.toString();
  const url = `/api/analysis/history${queryString ? `?${queryString}` : ""}`;
  const res = await fetch(url);
  return parseApiResponse<HistoryItem[]>(res);
}

export async function deleteAnalysisHistory(
  items: Array<{ id: string; type: "contract" | "clause" | "compare" }>,
): Promise<{ success: boolean }> {
  const res = await fetch("/api/analysis/history", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  return parseApiResponse<{ success: boolean }>(res);
}

