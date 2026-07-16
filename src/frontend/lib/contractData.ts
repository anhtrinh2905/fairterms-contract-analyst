import {
  ben_a,
  ben_b,
  contract,
  phan_tich,
  phu_luc_thiet_bi,
  thong_tin_hop_dong,
  type Analysis,
  type Article,
  type ChecklistCoverageItem,
  type ContractInfo,
  type Device,
  type Party,
  type RiskLevel,
} from "@/app/fairterms/lib/data";
import {
  evaluateClause,
  evaluateCoverage,
  ocrContractImagesStructured,
  ocrContractStructured,
} from "@/lib/api/client";
import type { EvaluateClauseResponse, StructuredContractPayload } from "@/lib/api/types";
import {
  mapCoverageResponseToItems,
  mapEvaluateResponseToAnalysis,
  mapOcrStructuredResponse,
} from "@/lib/api/mappers";
import {
  createClauseAnalysis,
  updateClauseAnalysis,
} from "@/lib/analysis/analysis-api";

export interface ContractData {
  fileName: string;
  contractInfo: ContractInfo;
  benA: Party;
  benB: Party;
  contract: Article[];
  phanTich: Analysis[];
  devices: Device[];
  loaiHopDong: string;
  documentTitle: string;
  overallRisk?: RiskLevel | null;
}

/** Một điều khoản cần phân tích (1 đoạn trong hợp đồng). */
export interface ClauseTask {
  id: string;
  soDieu: string;
  text: string;
}

/**
 * Kết quả của giai đoạn OCR + dựng lại hợp đồng.
 * `data.phanTich` rỗng — phần phân tích điều khoản chạy stream sau đó.
 */
export interface OcrPhaseResult {
  data: ContractData;
  clauseTasks: ClauseTask[];
  orderWarnings?: string[];
  orderConfidence?: number;
  documentId?: string;
  ocrMarkdown?: string;
  structuredData?: StructuredContractPayload;
  missingFields?: import("./api/types").MissingFieldItem[];
}

export interface ClauseStreamHandlers {
  /** Gọi khi bắt đầu phân tích một điều khoản. */
  onClauseStart?: (task: ClauseTask, index: number) => void;
  /** Gọi khi một điều khoản phân tích xong (kể cả khi lỗi → fallback). */
  onClauseDone?: (analysis: Analysis, task: ClauseTask, index: number) => void;
}

export function getMockContractData(fileName = "HopDong_ChoThue_CanHo_Mau.pdf"): ContractData {
  return {
    fileName,
    contractInfo: thong_tin_hop_dong,
    benA: ben_a,
    benB: ben_b,
    contract,
    phanTich: phan_tich,
    devices: phu_luc_thiet_bi.map((d) => ({ ...d })),
    loaiHopDong: "cho_thue_can_ho_chung_cu",
    documentTitle: "HỢP ĐỒNG CHO THUÊ CĂN HỘ CHUNG CƯ",
  };
}

/** Hợp đồng mẫu cho chế độ demo, ở dạng giai đoạn OCR (chưa có phân tích). */
export function getMockOcrPhase(fileName = "HopDong_ChoThue_CanHo_Mau.pdf"): OcrPhaseResult {
  const full = getMockContractData(fileName);
  const clauseTasks: ClauseTask[] = full.phanTich.map((a) => ({
    id: a.id,
    soDieu: a.so_dieu ?? "",
    text: a.trich_dan,
  }));
  return { data: { ...full, phanTich: [] }, clauseTasks };
}

export type ProcessProgress = (step: number, detail?: string) => void;

const DEFAULT_CLAUSE_CONCURRENCY = 3;

/** Số luồng phân tích điều khoản song song — từ `NEXT_PUBLIC_CLAUSE_CONCURRENCY`. */
export function getClauseConcurrency(): number {
  const raw = process.env.NEXT_PUBLIC_CLAUSE_CONCURRENCY;
  if (!raw?.trim()) return DEFAULT_CLAUSE_CONCURRENCY;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CLAUSE_CONCURRENCY;
}

function makeFallbackAnalysis(task: ClauseTask): Analysis {
  return {
    id: task.id,
    so_dieu: task.soDieu,
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Không thể phân tích điều khoản này",
    ket_luan: "PASS",
    muc_rui_ro: "khong",
    trich_dan: task.text.length > 220 ? task.text.slice(0, 217) + "…" : task.text,
    giai_thich: "Phân tích tạm thời không khả dụng. Vui lòng thử lại sau.",
    ly_do: "",
    can_cu: [],
    de_xuat_sua: "",
    tin_nhan: "",
  };
}

/**
 * Giai đoạn 1: OCR + dựng lại cấu trúc hợp đồng (nhanh, 1 lượt gọi Gemini).
 * Trả về cấu trúc hợp đồng để hiển thị ngay, kèm danh sách điều khoản cần phân tích.
 */
export async function ocrAndStructureContract(
  file: File,
  onProgress?: ProcessProgress,
): Promise<OcrPhaseResult> {
  onProgress?.(0, "Đang trích xuất văn bản từ tệp…");

  const ocr = await ocrContractStructured(file);
  const mapped = mapOcrStructuredResponse(ocr);

  onProgress?.(1, mapped.contractInfo.loai || "Đã nhận diện loại hợp đồng");
  onProgress?.(2, "Ẩn danh thông tin cá nhân (PII)…");

  const clauseTasks: ClauseTask[] = [];
  mapped.contract.forEach((art) => {
    art.paragraphs.forEach((p) => {
      if (p.text.trim()) {
        clauseTasks.push({ id: p.id, soDieu: art.so_dieu, text: p.text });
      }
    });
  });

  return {
    data: {
      fileName: file.name,
      contractInfo: mapped.contractInfo,
      benA: mapped.benA,
      benB: mapped.benB,
      contract: mapped.contract,
      phanTich: [],
      devices: mapped.devices,
      loaiHopDong: mapped.loaiHopDong,
      documentTitle: mapped.documentTitle,
    },
    clauseTasks,
    documentId: ocr.document_id,
    ocrMarkdown: ocr.markdown,
    structuredData: ocr.structured,
    missingFields: mapped.missingFields,
  };
}

/**
 * Giai đoạn 1 (nhiều ảnh): OCR song song từng ảnh, ghép hợp đồng, rồi structuring.
 */
export async function ocrAndStructureContractImages(
  files: File[],
  options?: {
    pageOrder?: number[];
    onProgress?: ProcessProgress;
  },
): Promise<OcrPhaseResult> {
  options?.onProgress?.(0, `Đang OCR ${files.length} ảnh…`);

  const ocr = await ocrContractImagesStructured(files, {
    pageOrder: options?.pageOrder,
    autoSort: options?.pageOrder == null,
  });
  const mapped = mapOcrStructuredResponse(ocr);

  options?.onProgress?.(1, mapped.contractInfo.loai || "Đã nhận diện loại hợp đồng");
  options?.onProgress?.(2, "Ẩn danh thông tin cá nhân (PII)…");

  const clauseTasks: ClauseTask[] = [];
  mapped.contract.forEach((art) => {
    art.paragraphs.forEach((p) => {
      if (p.text.trim()) {
        clauseTasks.push({ id: p.id, soDieu: art.so_dieu, text: p.text });
      }
    });
  });

  return {
    data: {
      fileName: files.length === 1 ? files[0].name : `${files.length} ảnh hợp đồng`,
      contractInfo: mapped.contractInfo,
      benA: mapped.benA,
      benB: mapped.benB,
      contract: mapped.contract,
      phanTich: [],
      devices: mapped.devices,
      loaiHopDong: mapped.loaiHopDong,
      documentTitle: mapped.documentTitle,
    },
    clauseTasks,
    orderWarnings: ocr.order_warnings,
    orderConfidence: ocr.order_confidence,
    documentId: ocr.document_id,
    ocrMarkdown: ocr.markdown,
    structuredData: ocr.structured,
    missingFields: mapped.missingFields,
  };
}

function logClausePersistError(
  action: "create" | "update",
  taskId: string,
  err: unknown,
): void {
  const detail =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "unknown error";
  console.error(
    `[analyzeClausesStream] Failed to ${action} clause analysis (task ${taskId}):`,
    detail,
  );
}

function buildClausePersistUpdate(
  mapped: Analysis,
  rawResponse: EvaluateClauseResponse,
  processingTimeMs: number,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    analysisResult: rawResponse,
    processingTimeMs,
  };

  if (mapped.muc_rui_ro) payload.riskLevel = mapped.muc_rui_ro;
  if (mapped.ket_luan) payload.conclusion = mapped.ket_luan;
  if (mapped.can_cu.length > 0) payload.legalBasis = mapped.can_cu;
  if (mapped.de_xuat_sua) payload.suggestion = mapped.de_xuat_sua;
  if (mapped.tin_nhan) payload.negotiationMessage = mapped.tin_nhan;

  return payload;
}

function buildClausePersistFallbackUpdate(
  mapped: Analysis,
  processingTimeMs: number,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    analysisResult: { error: "EVALUATE_FAILED" },
    processingTimeMs,
  };

  if (mapped.muc_rui_ro) payload.riskLevel = mapped.muc_rui_ro;
  if (mapped.ket_luan) payload.conclusion = mapped.ket_luan;

  return payload;
}

/**
 * Giai đoạn 2: phân tích từng điều khoản theo thứ tự văn bản, với số luồng song
 * song giới hạn. Mỗi điều khoản xong sẽ gọi `onClauseDone` để UI cập nhật dần.
 */
export async function analyzeClausesStream(
  loaiHopDong: string,
  tasks: ClauseTask[],
  handlers: ClauseStreamHandlers,
  opts: {
    concurrency?: number;
    signal?: AbortSignal;
    contractAnalysisId?: string;
  } = {},
): Promise<void> {
  if (!tasks.length) return;
  const concurrency = Math.max(
    1,
    Math.min(opts.concurrency ?? getClauseConcurrency(), tasks.length),
  );
  const { signal, contractAnalysisId } = opts;
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      if (signal?.aborted) return;
      const index = cursor++;
      const task = tasks[index];
      const startedAt = performance.now();
      handlers.onClauseStart?.(task, index);

      let clauseAnalysisId: string | undefined;
      if (contractAnalysisId) {
        try {
          const created = await createClauseAnalysis({
            source: "contract",
            contractAnalysisId,
            clauseText: task.text,
            articleNo: task.soDieu.trim() || undefined,
            contractType: loaiHopDong,
          });
          clauseAnalysisId = created.id;
        } catch (err) {
          logClausePersistError("create", task.id, err);
        }
      }

      let analysis: Analysis;
      let rawResponse: EvaluateClauseResponse | undefined;
      try {
        rawResponse = await evaluateClause(loaiHopDong, task.text);
        analysis = mapEvaluateResponseToAnalysis(
          task.text,
          rawResponse,
          task.id,
          task.soDieu,
        );
      } catch {
        analysis = makeFallbackAnalysis(task);
      }

      if (clauseAnalysisId) {
        const processingTimeMs = Math.round(performance.now() - startedAt);
        try {
          await updateClauseAnalysis(
            clauseAnalysisId,
            rawResponse
              ? buildClausePersistUpdate(analysis, rawResponse, processingTimeMs)
              : buildClausePersistFallbackUpdate(analysis, processingTimeMs),
          );
        } catch (err) {
          logClausePersistError("update", task.id, err);
        }
      }

      if (signal?.aborted) return;
      handlers.onClauseDone?.(analysis, task, index);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

/** Nối toàn văn các điều khoản đã dựng lại thành 1 đoạn text để đối chiếu checklist bắt buộc. */
export function buildFullContractText(articles: Article[]): string {
  return articles
    .map((article) => {
      const body = article.paragraphs.map((p) => p.text).join("\n");
      return `${article.so_dieu} — ${article.tieu_de}\n${body}`;
    })
    .join("\n\n");
}

/**
 * Giai đoạn 3: kiểm tra 1 lần cho cả hợp đồng xem những nghĩa vụ/quyền bắt buộc
 * nào còn thiếu. Chạy song song, độc lập với `analyzeClausesStream`.
 */
export async function evaluateChecklistCoverage(
  loaiHopDong: string,
  articles: Article[],
): Promise<ChecklistCoverageItem[]> {
  const fullText = buildFullContractText(articles);
  if (!fullText.trim()) return [];
  const response = await evaluateCoverage(loaiHopDong, fullText);
  return mapCoverageResponseToItems(response);
}
