import type {
  ChecklistSummary,
  EvaluateClauseResponse,
  EvaluateCoverageResponse,
  EvaluateDeltaRequest,
  EvaluateDeltaResponse,
  LegalDocumentContent,
  OcrStructuredResponse,
  AdminChecklistMeta,
  AdminRAGDocInfo,
  AdminRAGSearchResult,
  AdminAIConfig,
  AdminAIConfigSave,
  AdminAIPingResult,
  AdminLangSmithDashboard,
  AdminCacheOverview,
  AdminCacheFlushResult,
  AdminCacheEntriesPage,
  AdminCacheEntryDeleteResult,
} from "./types";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8010";

export function getBackendUrl(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/$/, "");
}

function adminProxyUrl(path: string): string {
  // Keep relative path so server-side calls preserve current session cookies.
  return `/api/admin${path}`;
}

export class BackendApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BackendApiError";
    this.status = status;
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string | { msg?: string }[] };
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body.detail) && body.detail[0]?.msg) {
        detail = body.detail.map((d) => d.msg).join("; ");
      }
    } catch {
      // keep statusText
    }
    throw new BackendApiError(detail || `HTTP ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

/** POST /api/ocr/contract/structured — OCR + structured JSON */
export async function ocrContractStructured(file: File): Promise<OcrStructuredResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${getBackendUrl()}/api/ocr/contract/structured`, {
    method: "POST",
    body: form,
  });

  return parseResponse<OcrStructuredResponse>(res);
}

export interface OcrImagesOptions {
  pageOrder?: number[];
  autoSort?: boolean;
}

/** POST /api/ocr/contract/images/structured — OCR nhiều ảnh + structured JSON */
export async function ocrContractImagesStructured(
  files: File[],
  options?: OcrImagesOptions,
): Promise<OcrStructuredResponse> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  if (options?.pageOrder?.length) {
    form.append("page_order", JSON.stringify(options.pageOrder));
  }
  if (options?.autoSort !== undefined) {
    form.append("auto_sort", String(options.autoSort));
  }

  const res = await fetch(`${getBackendUrl()}/api/ocr/contract/images/structured`, {
    method: "POST",
    body: form,
  });

  return parseResponse<OcrStructuredResponse>(res);
}

/** POST /checklist/evaluate-clause — đánh giá một điều khoản */
export async function evaluateClause(
  loaiHopDong: string,
  clauseText: string,
): Promise<EvaluateClauseResponse> {
  const res = await fetch(`${getBackendUrl()}/checklist/evaluate-clause`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loai_hop_dong: loaiHopDong, clause_text: clauseText }),
  });

  return parseResponse<EvaluateClauseResponse>(res);
}

/** POST /checklist/evaluate-coverage — điều khoản bắt buộc còn thiếu trong toàn hợp đồng */
export async function evaluateCoverage(
  loaiHopDong: string,
  fullText: string,
): Promise<EvaluateCoverageResponse> {
  const res = await fetch(`${getBackendUrl()}/checklist/evaluate-coverage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loai_hop_dong: loaiHopDong, full_text: fullText }),
  });

  return parseResponse<EvaluateCoverageResponse>(res);
}

/** POST /checklist/evaluate-delta — đánh giá một thay đổi (sửa/thêm/xóa điều khoản) giữa 2 phiên bản */
export async function evaluateDelta(req: EvaluateDeltaRequest): Promise<EvaluateDeltaResponse> {
  const res = await fetch(`${getBackendUrl()}/checklist/evaluate-delta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  return parseResponse<EvaluateDeltaResponse>(res);
}

/** GET /checklist/types — danh sách loại hợp đồng */
export async function fetchChecklistTypes(): Promise<ChecklistSummary[]> {
  const res = await fetch(`${getBackendUrl()}/checklist/types`);
  return parseResponse<ChecklistSummary[]>(res);
}

/** GET /health — kiểm tra backend */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getBackendUrl()}/health`);
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string };
    return body.status === "ok";
  } catch {
    return false;
  }
}

/** GET /rag/documents/{docId} — văn bản pháp luật đầy đủ (metadata + markdown) */
export async function getLegalDocument(docId: string): Promise<LegalDocumentContent> {
  const res = await fetch(`${getBackendUrl()}/rag/documents/${encodeURIComponent(docId)}`);
  return parseResponse<LegalDocumentContent>(res);
}

/** URL tải văn bản pháp luật dạng PDF (render từ backend) */
export function legalDocumentDownloadUrl(docId: string): string {
  return `${getBackendUrl()}/rag/documents/${encodeURIComponent(docId)}/download`;
}

// --- Admin System APIs ---

/** GET /admin/checklists — danh sách checklist quản trị */
export async function adminFetchChecklists(): Promise<AdminChecklistMeta[]> {
  const res = await fetch(adminProxyUrl("/checklists"), { cache: "no-store" });
  return parseResponse<AdminChecklistMeta[]>(res);
}

/** GET /admin/checklists/{id} — chi tiết checklist để sửa */
export async function adminGetChecklistDetail(loaiHopDong: string): Promise<Record<string, unknown>> {
  const res = await fetch(adminProxyUrl(`/checklists/${encodeURIComponent(loaiHopDong)}`), { cache: "no-store" });
  return parseResponse<Record<string, unknown>>(res);
}

/** POST /admin/checklists/{id} — lưu checklist sửa đổi */
export async function adminSaveChecklist(loaiHopDong: string, data: Record<string, unknown>): Promise<{ success: boolean }> {
  const res = await fetch(adminProxyUrl(`/checklists/${encodeURIComponent(loaiHopDong)}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return parseResponse<{ success: boolean }>(res);
}

/** GET /admin/rag/documents — danh sách tài liệu RAG quản trị */
export async function adminFetchRAGDocuments(): Promise<AdminRAGDocInfo[]> {
  const res = await fetch(adminProxyUrl("/rag/documents"), { cache: "no-store" });
  return parseResponse<AdminRAGDocInfo[]>(res);
}

/** POST /admin/rag/ingest — nạp tài liệu luật mới */
export async function adminIngestRAGDocument(file: File): Promise<{ success: boolean; parents: number; children: number }> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(adminProxyUrl("/rag/ingest"), {
    method: "POST",
    body: form,
  });
  return parseResponse<{ success: boolean; parents: number; children: number }>(res);
}

/** POST /admin/rag/search-test — truy vấn kiểm thử RAG */
export async function adminSearchTestRAG(query: string, topK: number = 5): Promise<AdminRAGSearchResult[]> {
  const res = await fetch(adminProxyUrl("/rag/search-test"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK }),
  });
  return parseResponse<AdminRAGSearchResult[]>(res);
}

/** GET /admin/ai-config — lấy thông tin cấu hình AI */
export async function adminGetAIConfig(): Promise<AdminAIConfig> {
  const res = await fetch(adminProxyUrl("/ai-config"), { cache: "no-store" });
  return parseResponse<AdminAIConfig>(res);
}

/** POST /admin/rag/ingest-text — nạp văn bản luật dán trực tiếp */
export async function adminIngestRAGText(
  title: string,
  content: string,
): Promise<{ success: boolean; parents: number; children: number; title?: string }> {
  const res = await fetch(adminProxyUrl("/rag/ingest-text"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content }),
  });
  return parseResponse(res);
}

/** POST /admin/ai-config — lưu thông tin cấu hình AI */
export async function adminSaveAIConfig(data: AdminAIConfigSave): Promise<{ success: boolean }> {
  const res = await fetch(adminProxyUrl("/ai-config"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return parseResponse<{ success: boolean }>(res);
}

/** POST /admin/ai-config/ping/openai — kiểm tra kết nối OpenAI */
export async function adminPingOpenAI(): Promise<AdminAIPingResult> {
  const res = await fetch(adminProxyUrl("/ai-config/ping/openai"), { method: "POST" });
  return parseResponse<AdminAIPingResult>(res);
}

/** POST /admin/ai-config/ping/gemini — kiểm tra kết nối Gemini */
export async function adminPingGemini(): Promise<AdminAIPingResult> {
  const res = await fetch(adminProxyUrl("/ai-config/ping/gemini"), { method: "POST" });
  return parseResponse<AdminAIPingResult>(res);
}

/** GET /admin/langsmith/dashboard — số liệu quan sát LangSmith (runs, lỗi, token, chi phí) */
export async function adminGetLangSmithDashboard(hours: number = 24): Promise<AdminLangSmithDashboard> {
  const res = await fetch(adminProxyUrl(`/langsmith/dashboard?hours=${hours}`), { cache: "no-store" });
  return parseResponse<AdminLangSmithDashboard>(res);
}

/** GET /admin/cache/overview — trạng thái Redis + số key theo từng namespace cache */
export async function adminGetCacheOverview(): Promise<AdminCacheOverview> {
  const res = await fetch(adminProxyUrl("/cache/overview"), { cache: "no-store" });
  return parseResponse<AdminCacheOverview>(res);
}

/** POST /admin/cache/{namespace}/flush — xóa toàn bộ key của 1 namespace cache (yêu cầu gõ lại tên để xác nhận) */
export async function adminFlushCacheNamespace(namespace: string): Promise<AdminCacheFlushResult> {
  const res = await fetch(adminProxyUrl(`/cache/${encodeURIComponent(namespace)}/flush`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm_namespace: namespace }),
  });
  return parseResponse<AdminCacheFlushResult>(res);
}

/** GET /admin/cache/{namespace}/entries — trang danh sách điều khoản đã cache trong 1 namespace */
export async function adminListCacheEntries(
  namespace: string,
  cursor: number = 0,
  limit: number = 50
): Promise<AdminCacheEntriesPage> {
  const res = await fetch(
    adminProxyUrl(`/cache/${encodeURIComponent(namespace)}/entries?cursor=${cursor}&limit=${limit}`),
    { cache: "no-store" }
  );
  return parseResponse<AdminCacheEntriesPage>(res);
}

/** DELETE /admin/cache/{namespace}/entries/{digest} — xóa 1 điều khoản đã cache */
export async function adminDeleteCacheEntry(
  namespace: string,
  digest: string
): Promise<AdminCacheEntryDeleteResult> {
  const res = await fetch(
    adminProxyUrl(`/cache/${encodeURIComponent(namespace)}/entries/${encodeURIComponent(digest)}`),
    { method: "DELETE" }
  );
  return parseResponse<AdminCacheEntryDeleteResult>(res);
}

