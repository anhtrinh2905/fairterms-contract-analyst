"use client";
/* ============================================================
   HopDongAI — Chế độ 2: Phân tích cả hợp đồng (5 Cục)
   ============================================================ */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Icon } from "../ui/icons";
import { RiskBadge, ConclusionTag, LawChip, CopyButton, Disclaimer, MissingTag, RISK_VAR, RISK_LABEL } from "../ui/primitives";
import { ChatPanel } from "./ChatPanel";
import { ContractDocPanel } from "./ContractDocPanel";
import { ShareDialog } from "./ShareDialog";
import { LawPopover } from "../ui/LawPopover";
import { buildContractSnapshot, type ContractPrefilledResult } from "@/lib/analysis/share-snapshot";
import { FeedbackWidget } from "../FeedbackWidget";
import { isPlaceholderValue } from "@/lib/api/mappers";
import {
  demoChecklistCoverage,
  FIELD_LABELS,
  tinhTong,
  type Analysis,
  type Article,
  type ChecklistCoverageItem,
  type ContractInfo,
  type Party,
  type PartyField,
  type RiskLevel,
  type Summary,
  type Device,
} from "../../lib/data";
import {
  analyzeClausesStream,
  evaluateChecklistCoverage,
  getMockContractData,
  getMockOcrPhase,
  ocrAndStructureContract,
  ocrAndStructureContractImages,
  type ClauseTask,
  type ContractData,
  type OcrPhaseResult,
} from "@/lib/contractData";
import { BackendApiError } from "@/lib/api/client";
import type { StructuredContractPayload } from "@/lib/api/types";
import {
  getTemplateContractData,
  getTemplateCoverage,
  getTemplateOcrPhase,
} from "@/app/hop-dong-mau/template-analysis";
import {
  AnalysisApiError,
  createContractAnalysis,
  updateContractAnalysis,
} from "@/lib/analysis/analysis-api";

/* scroll tới element trong vùng cuộn gần nhất (không dùng scrollIntoView) */
function scrollToEl(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  let p = el.parentElement;
  while (p && p !== document.body) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight + 4) break;
    p = p.parentElement;
  }
  if (p && p !== document.body) {
    const top = el.getBoundingClientRect().top - p.getBoundingClientRect().top + p.scrollTop - 16;
    p.scrollTo({ top, behavior: "smooth" });
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

export type UploadInput =
  | { kind: "file"; file: File }
  | { kind: "images"; files: File[]; pageOrder: number[] }
  | { kind: "demo" }
  /** Hợp đồng mẫu có kết quả phân tích chạy sẵn (template-analysis.ts) — không gọi backend. */
  | { kind: "template"; templateId: string; fileName: string };

const MAX_CONTRACT_IMAGES = 30;
const MAX_CONTRACT_UPLOAD_MB = 50;
const MAX_CONTRACT_UPLOAD_BYTES = MAX_CONTRACT_UPLOAD_MB * 1024 * 1024;
const IMAGE_ACCEPT = ".png,.jpg,.jpeg";

function sortFilesByCaptureHint(files: File[]): File[] {
  return [...files].sort((left, right) => {
    if (left.lastModified !== right.lastModified) return left.lastModified - right.lastModified;
    return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" });
  });
}

function uploadLabel(input: UploadInput): string {
  if (input.kind === "demo") return "HopDong_ChoThue_CanHo_Mau.pdf";
  if (input.kind === "template") return input.fileName;
  if (input.kind === "images") {
    return input.files.length === 1 ? input.files[0].name : `${input.files.length} ảnh hợp đồng`;
  }
  return input.file.name;
}

function buildClauseTasksFromData(data: ContractData): ClauseTask[] {
  const tasks: ClauseTask[] = [];
  data.contract.forEach((art) => {
    art.paragraphs.forEach((p) => {
      if (p.text.trim()) {
        tasks.push({ id: p.id, soDieu: art.so_dieu, text: p.text });
      }
    });
  });
  return tasks;
}

function buildAnalyzedMap(phanTich: Analysis[]): Record<string, Analysis> {
  return Object.fromEntries(phanTich.map((p) => [p.id, p]));
}

export type { ContractPrefilledResult };

export function contractAnalysisCreateErrorMessage(err: AnalysisApiError): string {
  if (err.code === "UNAUTHORIZED") {
    return "Vui lòng đăng nhập bằng Google để tiếp tục.";
  }
  if (err.code === "CONTRACT_QUOTA_EXCEEDED") {
    return "Bạn đã hết lượt phân tích hợp đồng miễn phí trong tháng này.";
  }
  if (err.code === "COMPARISON_QUOTA_EXCEEDED") {
    return "Bạn đã hết lượt so sánh hợp đồng miễn phí trong tháng này.";
  }
  return err.message;
}

export async function persistOcrContractAnalysis(
  contractAnalysisId: string,
  result: OcrPhaseResult,
): Promise<void> {
  const payload: Record<string, unknown> = {
    status: "processing",
    totalClauses: result.clauseTasks.length,
  };

  if (result.documentId) payload.documentId = result.documentId;
  if (result.data.loaiHopDong) payload.contractType = result.data.loaiHopDong;
  if (result.data.contractInfo) payload.contractInfo = result.data.contractInfo;
  if (result.ocrMarkdown) payload.ocrMarkdown = result.ocrMarkdown;
  if (result.structuredData != null) payload.structuredData = result.structuredData;

  await updateContractAnalysis(contractAnalysisId, payload);
}

export async function markContractAnalysisFailed(contractAnalysisId: string): Promise<void> {
  await updateContractAnalysis(contractAnalysisId, { status: "failed" });
}

export async function persistContractCompleted(
  contractAnalysisId: string,
  items: Analysis[],
  totalClauses: number,
  processingTimeMs?: number,
): Promise<void> {
  const summary = tinhTong(items);
  const payload: Record<string, unknown> = {
    status: "completed",
    overallRisk: summary.tong,
    analyzedClauses: items.length,
    flaggedClauses: summary.redFlags,
    totalClauses,
  };
  if (processingTimeMs != null) {
    payload.processingTimeMs = processingTimeMs;
  }
  await updateContractAnalysis(contractAnalysisId, payload);
}

type ImageDraft = { id: string; file: File; previewUrl: string };

/* ---------- Bộ chọn nguồn: Tệp / Ảnh (hai option cân bằng) ---------- */
function UploadModeTabs({
  mode,
  onMode,
}: {
  mode: "file" | "images";
  onMode: (mode: "file" | "images") => void;
}) {
  const options: { key: "file" | "images"; title: string; hint: string; icon: ReactNode }[] = [
    { key: "file", title: "Tệp hợp đồng", hint: "PDF · DOCX", icon: <Icon.doc style={{ width: 20, height: 20 }} /> },
    { key: "images", title: "Ảnh chụp", hint: "1 hoặc nhiều ảnh", icon: <Icon.upload style={{ width: 20, height: 20 }} /> },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
      {options.map((opt) => {
        const active = opt.key === mode;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onMode(opt.key)}
            aria-pressed={active}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 12,
              border: active ? "1.5px solid var(--primary)" : "1px solid var(--line)",
              background: active ? "var(--primary-tint)" : "var(--surface)",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              transition: "border-color .15s, background .15s",
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                flex: "0 0 auto",
                display: "grid",
                placeItems: "center",
                background: active ? "var(--surface)" : "var(--primary-tint)",
                color: "var(--primary)",
              }}
            >
              {opt.icon}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: active ? "var(--primary-ink)" : "var(--ink)" }}>
                {opt.title}
              </span>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-faint)" }}>{opt.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Multi-image upload ---------- */
function ImageUploadStage({
  onStart,
  onBack,
}: {
  onStart: (input: Extract<UploadInput, { kind: "images" }>) => void;
  onBack?: () => void;
}) {
  const [items, setItems] = useState<ImageDraft[]>([]);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [items]);

  const addFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).filter((file) =>
      /\.(png|jpe?g)$/i.test(file.name),
    );
    if (!incoming.length) {
      setError("Chỉ hỗ trợ ảnh PNG hoặc JPG.");
      return;
    }
    const oversized = incoming.find((file) => file.size > MAX_CONTRACT_UPLOAD_BYTES);
    if (oversized) {
      setError(`Mỗi ảnh tối đa ${MAX_CONTRACT_UPLOAD_MB}MB (${oversized.name}).`);
      return;
    }
    setError(null);
    setItems((prev) => {
      const merged = sortFilesByCaptureHint([
        ...prev.map((item) => item.file),
        ...incoming,
      ]);
      if (merged.length > MAX_CONTRACT_IMAGES) {
        setError(`Tối đa ${MAX_CONTRACT_IMAGES} ảnh mỗi lần tải lên.`);
        return prev;
      }
      const totalBytes = merged.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > MAX_CONTRACT_UPLOAD_BYTES) {
        setError(`Tổng dung lượng ảnh tối đa ${MAX_CONTRACT_UPLOAD_MB}MB.`);
        return prev;
      }
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return merged.map((file) => ({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
    });
  };

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const handleStart = () => {
    if (items.length < 1) {
      setError("Cần ít nhất 1 ảnh.");
      return;
    }
    onStart({
      kind: "images",
      files: items.map((item) => item.file),
      pageOrder: items.map((_, index) => index),
    });
  };

  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 64, maxWidth: 760 }}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--primary)", fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
          <Icon.doc style={{ width: 16, height: 16 }} /> OCR ảnh chụp
        </div>
        <h1 style={{ fontSize: 34, marginBottom: 8 }}>Tải ảnh chụp hợp đồng</h1>
        <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 16, maxWidth: 600 }}>
          Tải 1 hoặc nhiều ảnh chụp từng trang. Nếu nhiều ảnh, hãy sắp đúng thứ tự (trang 1 → cuối) rồi OCR và phân tích.
        </p>
      </header>

      <UploadModeTabs mode="images" onMode={(m) => m === "file" && onBack?.()} />

      <div
        className="dropzone"
        data-drag={drag}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        style={{ marginBottom: 18 }}
      >
        <span className="dz-icon"><Icon.upload style={{ width: 28, height: 28 }} /></span>
        <h3 style={{ fontSize: 18, margin: "4px 0 6px" }}>Kéo & thả nhiều ảnh vào đây</h3>
        <p style={{ margin: "0 0 16px", color: "var(--ink-soft)", fontSize: 14 }}>
          PNG · JPG — 1 hoặc nhiều ảnh, tối đa {MAX_CONTRACT_IMAGES} ảnh · {MAX_CONTRACT_UPLOAD_MB}MB/lần
        </p>
        <label className="btn btn-primary" style={{ cursor: "pointer" }}>
          <Icon.upload style={{ width: 17, height: 17 }} /> Chọn ảnh
          <input type="file" hidden multiple accept={IMAGE_ACCEPT} onChange={(e) => e.target.files && addFiles(e.target.files)} />
        </label>
      </div>

      {items.length > 0 && (
        <div className="card" style={{ padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Thứ tự trang ({items.length})</div>
          <p style={{ margin: "0 0 14px", color: "var(--ink-soft)", fontSize: 13 }}>
            Kéo thả hoặc dùng mũi tên để sắp xếp từ trang đầu đến trang cuối.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => { dragIndexRef.current = index; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragIndexRef.current;
                  dragIndexRef.current = null;
                  if (from == null || from === index) return;
                  moveItem(from, index);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  background: "var(--surface)",
                }}
              >
                <span style={{ width: 28, fontWeight: 700, color: "var(--primary)" }}>{index + 1}</span>
                <img src={item.previewUrl} alt="" style={{ width: 52, height: 68, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.file.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{Math.round(item.file.size / 1024)} KB</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" className="copy-btn" onClick={() => moveItem(index, index - 1)} disabled={index === 0} aria-label="Lên">↑</button>
                  <button type="button" className="copy-btn" onClick={() => moveItem(index, index + 1)} disabled={index === items.length - 1} aria-label="Xuống">↓</button>
                  <button type="button" className="copy-btn" onClick={() => removeItem(index)} aria-label="Xóa">✕</button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 18, width: "100%" }} onClick={handleStart}>
            Bắt đầu OCR & phân tích
          </button>
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: "12px 16px", marginBottom: 12, borderColor: "var(--risk-cao)", color: "var(--risk-cao)" }}>
          {error}
        </div>
      )}

      <Disclaimer />
    </div>
  );
}

/* ---------- Upload stage ---------- */
function UploadStage({ onStart }: { onStart: (input: UploadInput) => void }) {
  const [mode, setMode] = useState<"file" | "images">("file");
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rejectOversized = (files: File[]): boolean => {
    const oversized = files.find((file) => file.size > MAX_CONTRACT_UPLOAD_BYTES);
    if (oversized) {
      setError(`Tệp tối đa ${MAX_CONTRACT_UPLOAD_MB}MB (${oversized.name}).`);
      return true;
    }
    return false;
  };

  if (mode === "images") {
    return <ImageUploadStage onStart={onStart} onBack={() => setMode("file")} />;
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (!dropped.length) return;
    setError(null);
    // Ảnh luôn đi qua luồng ảnh (OCR → ghép Markdown → structured), kể cả khi thả vào ô tệp.
    const images = dropped.filter((f) => /\.(png|jpe?g)$/i.test(f.name));
    if (images.length) {
      if (rejectOversized(images)) return;
      const totalBytes = images.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > MAX_CONTRACT_UPLOAD_BYTES) {
        setError(`Tổng dung lượng ảnh tối đa ${MAX_CONTRACT_UPLOAD_MB}MB.`);
        return;
      }
      const sorted = sortFilesByCaptureHint(images);
      onStart({ kind: "images", files: sorted, pageOrder: sorted.map((_, i) => i) });
      return;
    }
    if (rejectOversized(dropped)) return;
    onStart({ kind: "file", file: dropped[0] });
  };
  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 64, maxWidth: 760 }}>
      <header style={{ marginBottom: 26 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "var(--primary)",
            fontWeight: 600,
            fontSize: 13,
            marginBottom: 10,
          }}
        >
          <Icon.doc style={{ width: 16, height: 16 }} /> Phân tích toàn diện
        </div>
        <h1 style={{ fontSize: 34, marginBottom: 8 }}>Phân tích cả hợp đồng</h1>
        <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 16, maxWidth: 600 }}>
          Tải lên hợp đồng để trực quan hóa toàn bộ điều khoản, phát hiện rủi ro và đối chiếu căn cứ pháp luật.
        </p>
      </header>

      <UploadModeTabs mode="file" onMode={setMode} />

      <div
        className="dropzone"
        data-drag={drag}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <span className="dz-icon">
          <Icon.upload style={{ width: 30, height: 30 }} />
        </span>
        <h3 style={{ fontSize: 19, margin: "4px 0 6px" }}>Kéo & thả tệp vào đây</h3>
        <p style={{ margin: "0 0 18px", color: "var(--ink-soft)", fontSize: 14 }}>
          Hỗ trợ PDF · DOCX — tối đa {MAX_CONTRACT_UPLOAD_MB}MB · Ảnh chụp dùng tab &quot;Ảnh chụp&quot;
        </p>
        <label className="btn btn-primary" style={{ cursor: "pointer" }}>
          <Icon.upload style={{ width: 17, height: 17 }} /> Chọn tệp hợp đồng
          <input
            type="file"
            hidden
            accept=".pdf,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setError(null);
              if (rejectOversized([file])) return;
              onStart({ kind: "file", file });
            }}
          />
        </label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "22px 0 4px",
            color: "var(--ink-faint)",
            fontSize: 12.5,
          }}
        >
          <span style={{ flex: 1, height: 1, background: "var(--line)" }}></span> hoặc{" "}
          <span style={{ flex: 1, height: 1, background: "var(--line)" }}></span>
        </div>
        <button
          className="copy-btn"
          style={{ borderStyle: "dashed", margin: "8px auto 0" }}
          onClick={() => onStart({ kind: "demo" })}
        >
          <Icon.spark style={{ width: 14, height: 14 }} /> Dùng hợp đồng mẫu để xem demo
        </button>
      </div>

      {error && (
        <div className="card" style={{ padding: "12px 16px", marginTop: 12, borderColor: "var(--risk-cao)", color: "var(--risk-cao)" }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Disclaimer />
      </div>
    </div>
  );
}

/* ---------- Processing stage ---------- */
function ProcessingStage({
  fileName,
  input,
  onDone,
  onError,
}: {
  fileName: string;
  input: UploadInput;
  onDone: (result: OcrPhaseResult, contractAnalysisId?: string) => void;
  onError: (message: string) => void;
}) {
  const STEPS = [
    { t: "Đang trích xuất văn bản từ tệp…", s: "OCR / đọc nội dung" },
    { t: "Nhận diện loại hợp đồng & dựng điều khoản…", s: "Phân loại & cấu trúc hợp đồng" },
    { t: "Ẩn danh thông tin cá nhân (PII)…", s: "CCCD, SĐT, địa chỉ" },
  ];

  const [step, setStep] = useState(0);
  const [stepDetail, setStepDetail] = useState(STEPS[0].s);
  const runIdRef = useRef(0);
  const demoTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Guards the quota-consuming pipeline (create + OCR) so it runs EXACTLY once
  // for this component instance. React Strict Mode intentionally mounts →
  // unmounts → mounts effects in development on the *same* fiber, so this ref
  // survives the double-invoke and makes the second run a no-op. This is what
  // prevents a duplicate ContractAnalysis row and a double quota charge.
  const startedRef = useRef(false);

  useEffect(() => {
    const runId = ++runIdRef.current;
    demoTimersRef.current.forEach(clearTimeout);
    demoTimersRef.current = [];

    async function run() {
      let contractAnalysisId: string | undefined;

      try {
        // Demo / template: no backend call, no quota — safe to re-run on a
        // Strict Mode remount, so it keeps the lightweight runId guard.
        if (input.kind === "demo" || input.kind === "template") {
          demoTimersRef.current.push(setTimeout(() => setStep(1), 650));
          demoTimersRef.current.push(setTimeout(() => setStep(2), 1300));
          demoTimersRef.current.push(
            setTimeout(() => {
              if (runId !== runIdRef.current) return;
              if (input.kind === "template") {
                const phase = getTemplateOcrPhase(input.templateId);
                if (!phase) {
                  onError("Hợp đồng mẫu này chưa có sẵn kết quả phân tích.");
                  return;
                }
                onDone(phase);
                return;
              }
              onDone(getMockOcrPhase(fileName));
            }, 1900),
          );
          return;
        }

        // Real pipeline: bail out on the second Strict Mode invocation so the
        // record is created (and quota consumed) only once.
        if (startedRef.current) return;
        startedRef.current = true;

        try {
          const created = await createContractAnalysis({ fileName });
          contractAnalysisId = created.id;
        } catch (err) {
          if (err instanceof AnalysisApiError) {
            onError(contractAnalysisCreateErrorMessage(err));
            return;
          }
          onError(
            err instanceof Error
              ? err.message
              : "Không thể tạo lượt phân tích hợp đồng. Vui lòng thử lại.",
          );
          return;
        }

        const result =
          input.kind === "images"
            ? await ocrAndStructureContractImages(input.files, {
                pageOrder: input.pageOrder,
                onProgress: (s, detail) => {
                  setStep(s);
                  if (detail) setStepDetail(detail);
                },
              })
            : await ocrAndStructureContract(input.file, (s, detail) => {
                setStep(s);
                if (detail) setStepDetail(detail);
              });

        if (contractAnalysisId) {
          persistOcrContractAnalysis(contractAnalysisId, result).catch(() => {
            /* OCR succeeded; persistence failure must not block the UI */
          });
        }

        onDone(result, contractAnalysisId);
      } catch (err) {
        if (contractAnalysisId) {
          markContractAnalysisFailed(contractAnalysisId).catch(() => {
            /* best-effort status update */
          });
        }
        const msg =
          err instanceof BackendApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Không thể xử lý hợp đồng. Vui lòng thử lại.";
        onError(msg);
      }
    }

    run();
    // The real pipeline must complete exactly once, so cleanup only clears the
    // demo timers — it never cancels an in-flight create/OCR run (that would
    // reintroduce orphaned "processing" rows under Strict Mode).
    return () => {
      demoTimersRef.current.forEach(clearTimeout);
      demoTimersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="wrap" style={{ paddingTop: 64, paddingBottom: 80, maxWidth: 600 }}>
      <div className="card rise" style={{ padding: "30px 30px 26px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 22,
            paddingBottom: 20,
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              background: "var(--seal-tint)",
              color: "var(--seal)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon.doc style={{ width: 22, height: 22 }} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 15,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {fileName}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Đang xử lý…</div>
          </div>
        </div>
        {STEPS.map((s, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              padding: "9px 0",
              opacity: i <= step ? 1 : 0.38,
              transition: "opacity .35s",
            }}
          >
            {i < step ? (
              <Icon.check style={{ width: 19, height: 19, color: "var(--risk-khong)" }} />
            ) : i === step ? (
              <span className="spinner"></span>
            ) : (
              <span
                style={{
                  width: 19,
                  height: 19,
                  borderRadius: "50%",
                  border: "2px solid var(--line-strong)",
                  display: "block",
                }}
              ></span>
            )}
            <div>
              <div
                style={{
                  fontSize: 14.5,
                  color: i <= step ? "var(--ink)" : "var(--ink-faint)",
                  fontWeight: i === step ? 600 : 500,
                }}
              >
                {s.t}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                {i === 1 && step >= 1 ? stepDetail : s.s}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Risk dashboard (Tính năng 1) ---------- */
function RiskDashboard({ summary }: { summary: Summary }) {
  const lamps: RiskLevel[] = ["cao", "trung_binh", "khong"]; // red / amber / green
  const overall = summary.tong;
  const verdict: Record<RiskLevel, string> = {
    cao: "Cân nhắc rất kỹ — có điều khoản rủi ro CAO cần thương lượng trước khi ký.",
    trung_binh: "Cân nhắc kỹ trước khi ký — một số điều khoản bất lợi cho Bên B.",
    thap: "Tương đối an toàn — còn vài điểm nhỏ nên rà lại.",
    khong: "Hợp đồng an toàn — không phát hiện red flag đáng kể.",
  };
  const litIndex: Record<RiskLevel, number> = { cao: 0, trung_binh: 1, thap: 1, khong: 2 };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 0 }} className="dash-grid">
        {/* traffic light */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "22px 26px",
            borderRight: "1px solid var(--line)",
            background: "var(--surface-2)",
          }}
          className="dash-light"
        >
          <div className="traffic">
            {lamps.map((lv, i) => (
              <span
                key={lv}
                className="lamp"
                style={{
                  background:
                    i === litIndex[overall]
                      ? RISK_VAR[lv]
                      : "color-mix(in srgb, var(--ink) 8%, transparent)",
                  boxShadow:
                    i === litIndex[overall]
                      ? `0 0 0 4px color-mix(in srgb, ${RISK_VAR[lv]} 22%, transparent), 0 0 18px ${RISK_VAR[lv]}`
                      : "none",
                }}
              ></span>
            ))}
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
                marginBottom: 4,
              }}
            >
              Mức rủi ro tổng
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 25,
                fontWeight: 700,
                color: RISK_VAR[overall],
                lineHeight: 1.1,
              }}
            >
              {RISK_LABEL[overall]}
            </div>
          </div>
        </div>
        {/* counts + verdict */}
        <div
          style={{
            padding: "20px 26px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            {([["cao", "Cao"], ["trung_binh", "Trung bình"], ["thap", "Thấp"]] as [RiskLevel, string][]).map(
              ([lv, lb]) => (
                <div key={lv} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 30,
                      fontWeight: 700,
                      color: RISK_VAR[lv],
                      minWidth: 22,
                      textAlign: "right",
                    }}
                    className="tnum"
                  >
                    {summary.flags.filter((f) => f.muc_rui_ro === lv).length}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 600, lineHeight: 1.1 }}>
                    red flag
                    <br />
                    {lb}
                  </span>
                </div>
              ),
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginLeft: "auto" }}>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 30,
                  fontWeight: 700,
                  color: "var(--ink)",
                  minWidth: 22,
                  textAlign: "right",
                }}
                className="tnum"
              >
                {summary.flags.length}
              </span>
              <span style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 600, lineHeight: 1.1 }}>
                tổng
                <br />
                cảnh báo
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              fontSize: 14.5,
              color: "var(--ink)",
              fontWeight: 500,
              paddingTop: 12,
              borderTop: "1px solid var(--line)",
            }}
          >
            <Icon.warn style={{ width: 17, height: 17, color: RISK_VAR[overall], flex: "0 0 auto", marginTop: 1 }} />
            <span>{verdict[overall]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Section heading ---------- */
function CucHead({ no: _no, title, icon, right }: { no: string; title: string; icon: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 16 }}>
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: "var(--primary-tint)",
          color: "var(--primary)",
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
        }}
      >
        {icon}
      </span>
      <div>
        <h2 style={{ fontSize: 21, whiteSpace: "nowrap" }}>{title}</h2>
      </div>
      {right ? <div style={{ marginLeft: "auto" }}>{right}</div> : null}
    </div>
  );
}

/* ---------- Cục 1 ---------- */
function InfoBlock({ info, loaiHopDong }: { info: ContractInfo; loaiHopDong?: string }) {
  const isSale = loaiHopDong === "mua_ban_can_ho_chung_cu";
  const rows: [string, string][] = [
    ["Loại hợp đồng", info.loai],
    ["Số hợp đồng", info.so_hd],
    ["Ngày ký", info.ngay_ky],
    ...(isSale ? [] : [["Thời hạn thuê", info.thoi_han] as [string, string]]),
    [isSale ? "Giá bán" : "Giá thuê", info.gia_thue],
    ["Tiền đặt cọc", info.dat_coc],
    ["Diện tích", info.dien_tich],
    ["Địa chỉ tài sản", info.dia_chi],
  ];

  return (
    <div className="card" style={{ padding: "8px 4px" }}>
      <div className="info-grid">
        {rows.map(([k, v], i) => (
          <div
            key={i}
            className="info-cell"
            style={i >= rows.length - 1 ? { gridColumn: "1 / -1" } : undefined}
          >
            <div style={{ fontSize: 11.5, color: "var(--ink-faint)", fontWeight: 600, marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Cục 2 & 3 ---------- */
function PartyBlock({ party, protect }: { party: Party; protect: boolean }) {
  const fields: PartyField[] = ["ho_ten", "cccd", "ngay_cap", "noi_cap", "sdt", "dia_chi"];
  return (
    <div
      className="card"
      style={{
        padding: "20px 22px",
        borderColor: protect ? "color-mix(in srgb, var(--primary) 35%, var(--line))" : "var(--line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 17,
            fontWeight: 700,
            color: protect ? "var(--primary)" : "var(--ink)",
          }}
        >
          {party.nhan}
        </span>
        {protect ? (
          <span className="pii-badge" style={{ fontSize: 11 }}>
            <Icon.shield />
            Bên được bảo vệ
          </span>
        ) : null}
        {party.truong_thieu.length ? (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--risk-cao)", fontWeight: 600 }}>
            {party.truong_thieu.length} trường thiếu
          </span>
        ) : null}
      </div>
      <div className="party-grid">
        {fields.map((f) => {
          const missing = isPlaceholderValue(party[f]);
          return (
            <div
              key={f}
              className="party-cell"
              data-missing={missing}
              style={f === "dia_chi" ? { gridColumn: "1 / -1" } : undefined}
            >
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--ink-faint)",
                  fontWeight: 600,
                  marginBottom: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                {FIELD_LABELS[f]} {missing ? <MissingTag /> : null}
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: missing ? "var(--risk-cao)" : "var(--ink)" }}>
                {missing ? "— Chưa có trong hợp đồng —" : party[f]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Nội dung chi tiết một điều khoản (dùng chung) ---------- */
function ClauseDetail({ r }: { r: Analysis }) {
  const match = r.ket_luan === "MATCH";
  const [openSug, setOpenSug] = useState(false);
  return (
    <>
      <p style={{ margin: "0 0 9px", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-soft)" }}>{r.giai_thich}</p>
      {r.ly_do ? (
        <div
          style={{
            display: "flex",
            gap: 7,
            fontSize: 13,
            color: match ? "var(--risk-cao)" : "var(--ink-soft)",
            marginBottom: 11,
            lineHeight: 1.5,
          }}
        >
          <Icon.warn style={{ width: 14, height: 14, flex: "0 0 auto", marginTop: 2 }} />
          <span>{r.ly_do}</span>
        </div>
      ) : null}
      {r.can_cu && r.can_cu.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: r.de_xuat_sua ? 11 : 0 }}>
          {r.can_cu.map((c, i) => (
            <LawChip key={i} citation={c} />
          ))}
        </div>
      ) : null}
      {r.de_xuat_sua ? (
        <div className="sug-box">
          <button className="sug-toggle" onClick={() => setOpenSug((v) => !v)}>
            <Icon.spark style={{ width: 14, height: 14 }} /> Gợi ý sửa & tin nhắn thương lượng
            <Icon.chevron
              style={{
                width: 15,
                height: 15,
                marginLeft: "auto",
                transform: openSug ? "rotate(180deg)" : "none",
                transition: "transform .2s",
              }}
            />
          </button>
          {openSug ? (
            <div className="sug-content">
              <p style={{ margin: "0 0 8px", fontSize: 13.5, lineHeight: 1.55 }}>
                <b style={{ color: "var(--primary-ink)" }}>Đề xuất: </b>
                {r.de_xuat_sua}
              </p>
              {r.tin_nhan ? (
                <div className="msg-quote">
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ink-faint)",
                      marginBottom: 5,
                      letterSpacing: ".04em",
                    }}
                  >
                    TIN NHẮN GỬI BÊN A
                  </div>
                  <p style={{ margin: "0 0 9px", fontSize: 13, fontStyle: "italic", lineHeight: 1.55 }}>
                    {r.tin_nhan}
                  </p>
                  <CopyButton text={r.tin_nhan} label="Sao chép tin nhắn" />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/* ---------- Analysis card (cột phải / split layout) ---------- */
function AnalysisCard({ r, active, onClickQuote }: { r: Analysis; active: boolean; onClickQuote: () => void }) {
  return (
    <div id={"ana-" + r.id} className={"ana-card" + (active ? " active" : "")} data-risk={r.muc_rui_ro}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9, flexWrap: "wrap" }}>
        <RiskBadge level={r.muc_rui_ro} size="sm" />
        <ConclusionTag value={r.ket_luan} />
        <button className="trace-link" onClick={onClickQuote} title="Xem trong hợp đồng gốc">
          <Icon.link style={{ width: 12, height: 12 }} /> xem điều khoản
        </button>
      </div>
      <h4
        style={{
          fontSize: 15.5,
          marginBottom: 8,
          color: "var(--ink)",
          fontFamily: "var(--font-body)",
          fontWeight: 700,
        }}
      >
        {r.dieu_khoan_lam_gi}
      </h4>
      <ClauseDetail r={r} />
    </div>
  );
}

/* ---------- Điều khoản rủi ro: sổ xuống xem chi tiết ---------- */
function RiskyClauseDisclosure({
  r,
  defaultOpen,
  active,
  onActivate,
  onDocJump,
}: {
  r: Analysis;
  defaultOpen: boolean;
  active: boolean;
  onActivate: () => void;
  onDocJump?: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={"ana-" + r.id} className={"clause-item risk" + (active ? " active" : "")} data-risk={r.muc_rui_ro}>
      <button
        className="clause-head"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          onActivate();
          onDocJump?.(r.id);
        }}
      >
        <RiskBadge level={r.muc_rui_ro} size="sm" />
        <span className="clause-title">{r.dieu_khoan_lam_gi}</span>
        <Icon.chevron
          style={{
            width: 17,
            height: 17,
            marginLeft: "auto",
            color: "var(--ink-faint)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .2s",
            flex: "0 0 auto",
          }}
        />
      </button>
      {open ? (
        <div className="clause-body">
          <ClauseDetail r={r} />
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Điều khoản an toàn: dòng gọn, không sổ ---------- */
function SafeClauseRow({ r, onDocJump }: { r: Analysis; onDocJump?: (id: string) => void }) {
  return (
    <div
      id={"ana-" + r.id}
      className="clause-item safe"
      data-risk={r.muc_rui_ro}
      onClick={() => onDocJump?.(r.id)}
      style={onDocJump ? { cursor: "pointer" } : undefined}
    >
      <div className="clause-head static">
        <span className="concl concl-pass" style={{ fontSize: 11, flex: "0 0 auto" }}>
          <Icon.check style={{ width: 12, height: 12 }} />
          An toàn
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="clause-title">{r.dieu_khoan_lam_gi}</div>
          {r.giai_thich ? <div className="clause-sub">{r.giai_thich}</div> : null}
        </div>
      </div>
    </div>
  );
}

/* ---------- Original document (cột trái) ---------- */
function OriginalDoc({
  contract,
  analyzedIds,
  active,
  onClickPara,
  title,
  contractNumber,
}: {
  contract: Article[];
  analyzedIds: Record<string, Analysis>;
  active: string | null;
  onClickPara: (id: string) => void;
  title: string;
  contractNumber?: string;
}) {
  return (
    <div className="doc-paper">
      <div className="doc-title">
        <h3 style={{ fontSize: 17, textAlign: "center", letterSpacing: ".02em" }}>{title}</h3>
        {contractNumber ? (
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--ink-faint)", marginTop: 4 }}>
            Số: {contractNumber}
          </div>
        ) : null}
      </div>
      {contract.map((art) => (
        <div key={art.so_dieu} className="doc-article">
          <h4 className="doc-art-head">
            {art.so_dieu}: {art.tieu_de}
          </h4>
          {art.paragraphs.map((p) => {
            const analyzed = analyzedIds[p.id];
            const isFlag = analyzed && analyzed.ket_luan === "MATCH";
            return (
              <p
                key={p.id}
                id={"orig-" + p.id}
                className={"doc-para" + (analyzed ? " analyzed" : "") + (active === p.id ? " active" : "")}
                data-risk={analyzed ? analyzed.muc_rui_ro : ""}
                onClick={analyzed ? () => onClickPara(p.id) : undefined}
                title={analyzed ? "Bấm để xem phân tích" : undefined}
              >
                <span className="para-num">{p.num}</span>
                <span>{p.text}</span>
                {isFlag ? (
                  <span className="para-flag">
                    <Icon.warn style={{ width: 13, height: 13 }} />
                  </span>
                ) : null}
              </p>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface Group {
  tieu_de: string;
  items: Analysis[];
}

/* ---------- Cục 4 workspace ---------- */
function ClauseWorkspace({
  layout,
  active,
  setActive,
  contractArticles,
  phanTichItems,
  documentTitle,
  contractNumber,
  analyzingIds,
  analysisDone,
  onDocJump,
}: {
  layout: "accordion" | "split";
  active: string | null;
  setActive: (id: string) => void;
  contractArticles: Article[];
  phanTichItems: Analysis[];
  documentTitle: string;
  contractNumber?: string;
  analyzingIds: Set<string>;
  analysisDone: boolean;
  onDocJump?: (id: string) => void;
}) {
  const analyzedIds: Record<string, Analysis> = {};
  phanTichItems.forEach((p) => {
    analyzedIds[p.id] = p;
  });

  // group analysis by article
  const groups: Record<string, Group> = {};
  contractArticles.forEach((a) => {
    groups[a.so_dieu] = { tieu_de: a.tieu_de, items: [] };
  });
  phanTichItems.forEach((p) => {
    if (p.so_dieu && groups[p.so_dieu]) groups[p.so_dieu].items.push(p);
  });
  const groupList = contractArticles.filter((a) => groups[a.so_dieu].items.length).map((a) => ({
    so_dieu: a.so_dieu,
    ...groups[a.so_dieu],
  }));

  const clickPara = (id: string) => {
    setActive(id);
    setTimeout(() => scrollToEl("ana-" + id), 20);
  };
  const clickAna = (id: string) => {
    setActive(id);
    setTimeout(() => scrollToEl("orig-" + id), 20);
  };

  if (layout === "accordion") {
    return (
      <ClauseListView
        contract={contractArticles}
        active={active}
        setActive={setActive}
        phanTichItems={phanTichItems}
        analyzingIds={analyzingIds}
        analysisDone={analysisDone}
        onDocJump={onDocJump}
      />
    );
  }

  // split layout
  return (
    <div className="split-grid">
      <div className="split-col">
        <div className="col-label">
          <Icon.doc style={{ width: 14, height: 14 }} /> Bản hợp đồng gốc
        </div>
        <div className="col-scroll">
          <OriginalDoc
            contract={contractArticles}
            analyzedIds={analyzedIds}
            active={active}
            onClickPara={clickPara}
            title={documentTitle}
            contractNumber={contractNumber}
          />
        </div>
      </div>
      <div className="split-col">
        <div className="col-label">
          <Icon.scale style={{ width: 14, height: 14 }} /> Phân tích của AI
        </div>
        <div className="col-scroll">
          {groupList.map((g) => (
            <div key={g.so_dieu} style={{ marginBottom: 18 }}>
              <div className="ana-group-head">
                {g.so_dieu}: {g.tieu_de}
              </div>
              <div style={{ display: "grid", gap: 11 }}>
                {g.items.map((r) => (
                  <AnalysisCard key={r.id} r={r} active={active === r.id} onClickQuote={() => clickAna(r.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Điều khoản chưa phân tích xong: xem trước nội dung gốc ---------- */
function PendingClauseRow({ num, text, analyzing }: { num: string; text: string; analyzing: boolean }) {
  return (
    <div className="clause-item pending" data-analyzing={analyzing}>
      <div className="clause-pending-head">
        {analyzing ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <span className="sk-dot" />}
        <span className="clause-pending-status">
          {analyzing ? "AI đang phân tích…" : "Chờ phân tích"}
        </span>
      </div>
      <p className="clause-pending-text">
        <span className="para-num">{num}</span>
        <span>{text}</span>
      </p>
    </div>
  );
}

/* ---------- Clause list view: mỗi điều khoản sổ riêng, nhóm theo Điều ---------- */
function ClauseListView({
  contract,
  active,
  setActive,
  phanTichItems,
  analyzingIds,
  analysisDone,
  onDocJump,
}: {
  contract: Article[];
  active: string | null;
  setActive: (id: string) => void;
  phanTichItems: Analysis[];
  analyzingIds: Set<string>;
  analysisDone: boolean;
  onDocJump?: (id: string) => void;
}) {
  const analyzedIds: Record<string, Analysis> = {};
  phanTichItems.forEach((p) => {
    analyzedIds[p.id] = p;
  });

  return (
    <div className="clause-list">
      {contract.map((art) => {
        // Chỉ những đoạn có nội dung mới là điều khoản cần hiển thị.
        const paras = art.paragraphs.filter((p) => p.text.trim());
        // Bỏ qua Điều đã xong nhưng không có điều khoản nào được phân tích.
        const hasVisible =
          paras.some((p) => analyzedIds[p.id]) || (!analysisDone && paras.length > 0);
        if (!paras.length || !hasVisible) return null;

        const flagCount = paras.filter((p) => analyzedIds[p.id]?.ket_luan === "MATCH").length;

        return (
          <section key={art.so_dieu} className="clause-group">
            <div className="clause-group-head">
              <span className="clause-group-title">
                {art.so_dieu}: {art.tieu_de}
              </span>
              {flagCount > 0 ? (
                <span className="clause-group-flag">
                  <Icon.warn style={{ width: 12, height: 12 }} />
                  {flagCount} rủi ro
                </span>
              ) : null}
            </div>
            <div className="clause-group-body">
              {paras.map((p) => {
                const a = analyzedIds[p.id];
                if (a) {
                  return a.ket_luan === "MATCH" ? (
                    <RiskyClauseDisclosure
                      key={p.id}
                      r={a}
                      defaultOpen={false}
                      active={active === a.id}
                      onActivate={() => setActive(a.id)}
                      onDocJump={onDocJump}
                    />
                  ) : (
                    <SafeClauseRow key={p.id} r={a} onDocJump={onDocJump} />
                  );
                }
                if (!analysisDone) {
                  return (
                    <PendingClauseRow key={p.id} num={p.num} text={p.text} analyzing={analyzingIds.has(p.id)} />
                  );
                }
                return null;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ---------- Checklist điều khoản bắt buộc còn thiếu (Tính năng 4) ---------- */
function ChecklistBlock({ items, loading }: { items: ChecklistCoverageItem[]; loading: boolean }) {
  const total = items.length;
  const missing = items.filter((i) => i.trangThai === "thieu");
  const coCount = total - missing.length;
  const pct = total ? Math.round((coCount / total) * 100) : 0;

  if (loading && total === 0) {
    return (
      <div className="card" style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 10 }}>
        <span className="spinner" style={{ width: 16, height: 16 }} />
        <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>Đang đối chiếu điều khoản bắt buộc…</span>
      </div>
    );
  }

  if (total === 0) return null;

  return (
    <div className="card" style={{ padding: "20px 22px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>Điều khoản bắt buộc còn thiếu</span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 700,
            color: missing.length === 0 ? "var(--risk-khong)" : "var(--risk-tb)",
          }}
        >
          {coCount}/{total} điều khoản bắt buộc đã có
        </span>
      </div>
      <div className="ck-bar">
        <span style={{ width: pct + "%" }}></span>
      </div>
      {missing.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 13.5, color: "var(--ink-soft)" }}>
          <Icon.check style={{ width: 15, height: 15, color: "var(--risk-khong)" }} />
          Đã có đầy đủ {total}/{total} điều khoản bắt buộc — không phát hiện thiếu sót.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {missing.map((it) => (
            <MissingChecklistRow key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- 1 dòng điều khoản còn thiếu, bấm để xem gợi ý bổ sung ---------- */
function MissingChecklistRow({ item }: { item: ChecklistCoverageItem }) {
  const [open, setOpen] = useState(false);
  const color = item.batBuoc ? "var(--risk-cao)" : "var(--risk-tb)";
  const hasSuggestion = !!(item.goiYBoSung || item.viTriDeXuat);

  return (
    <div className={"ck-row " + (item.batBuoc ? "ck-thieu" : "ck-rui")} style={{ flexDirection: "column", alignItems: "stretch" }}>
      <button
        type="button"
        onClick={() => hasSuggestion && setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          textAlign: "left",
          cursor: hasSuggestion ? "pointer" : "default",
          font: "inherit",
          color: "inherit",
        }}
      >
        <span className="ck-mark" style={{ color }}>
          {item.batBuoc ? <Icon.x style={{ width: 13, height: 13 }} /> : <Icon.warn style={{ width: 13, height: 13 }} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{item.ten}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
            {item.ghiChu || "Không tìm thấy nội dung tương ứng trong hợp đồng."}
          </div>
        </div>
        <span className="ck-status" style={{ color, flex: "0 0 auto" }}>
          {item.batBuoc ? "Thiếu — bắt buộc" : "Nên bổ sung"}
        </span>
        {hasSuggestion ? (
          <Icon.chevron
            style={{
              width: 16,
              height: 16,
              color: "var(--ink-faint)",
              flex: "0 0 auto",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform .2s",
            }}
          />
        ) : null}
      </button>
      {open && hasSuggestion ? (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px dashed var(--line)",
            display: "grid",
            gap: 8,
            fontSize: 13,
          }}
        >
          {item.viTriDeXuat ? (
            <div>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>Nên thêm vào: </span>
              <span style={{ color: "var(--ink-soft)" }}>{item.viTriDeXuat}</span>
            </div>
          ) : null}
          {item.goiYBoSung ? (
            <div>
              <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Gợi ý nội dung cần bổ sung:</div>
              <div
                style={{
                  color: "var(--ink-soft)",
                  background: "var(--surface, #fff)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontStyle: "italic",
                }}
              >
                “{item.goiYBoSung}”
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Cục 5: Phụ lục thiết bị ---------- */
function DeviceTable({ initialDevices }: { initialDevices: Device[] }) {
  const [rows, setRows] = useState<Device[]>(() => initialDevices.map((r) => ({ ...r })));
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ ten: string; dvt: string; so_luong: number | string; tinh_trang: string }>({
    ten: "",
    dvt: "",
    so_luong: 1,
    tinh_trang: "",
  });
  const checked = rows.filter((r) => r.dung_thuc_te).length;
  const hasDvt = rows.some((r) => r.dvt);

  const toggle = (i: number) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, dung_thuc_te: !r.dung_thuc_te } : r)));
  const addRow = () => {
    if (!draft.ten.trim()) return;
    setRows((rs) => [...rs, { ten: draft.ten, dvt: draft.dvt.trim() || undefined, tinh_trang: draft.tinh_trang, so_luong: Number(draft.so_luong) || 1, dung_thuc_te: false }]);
    setDraft({ ten: "", dvt: "", so_luong: 1, tinh_trang: "" });
    setAdding(false);
  };

  return (
    <div className="card" style={{ padding: "8px 6px 14px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px 4px",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Tích vào cột cuối nếu thiết bị <b style={{ color: "var(--ink)" }}>đúng với thực tế bàn giao</b>.
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: checked === rows.length ? "var(--risk-khong)" : "var(--ink-soft)",
          }}
        >
          Đã đối chiếu {checked}/{rows.length}
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="dev-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Tên thiết bị</th>
              {hasDvt ? <th style={{ width: 64 }}>ĐVT</th> : null}
              <th style={{ width: 70 }}>SL</th>
              <th>Tình trạng (theo HĐ)</th>
              <th style={{ width: 130, textAlign: "center" }}>Đúng thực tế</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} data-on={r.dung_thuc_te}>
                <td style={{ color: "var(--ink-faint)" }}>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{r.ten}</td>
                {hasDvt ? <td style={{ color: "var(--ink-soft)" }}>{r.dvt ?? "—"}</td> : null}
                <td className="tnum">{r.so_luong}</td>
                <td style={{ color: "var(--ink-soft)" }}>{r.tinh_trang}</td>
                <td style={{ textAlign: "center" }}>
                  <button
                    className={"tick" + (r.dung_thuc_te ? " on" : "")}
                    onClick={() => toggle(i)}
                    aria-label="Đúng thực tế"
                    style={
                      r.dung_thuc_te
                        ? { background: "var(--risk-khong)", borderColor: "var(--risk-khong)", color: "#fff" }
                        : undefined
                    }
                  >
                    {r.dung_thuc_te ? <Icon.check style={{ width: 15, height: 15 }} /> : null}
                  </button>
                </td>
              </tr>
            ))}
            {adding ? (
              <tr className="dev-add">
                <td style={{ color: "var(--ink-faint)" }}>{rows.length + 1}</td>
                <td>
                  <input
                    value={draft.ten}
                    onChange={(e) => setDraft({ ...draft, ten: e.target.value })}
                    placeholder="Tên thiết bị"
                    autoFocus
                  />
                </td>
                {hasDvt ? (
                  <td>
                    <input
                      value={draft.dvt}
                      onChange={(e) => setDraft({ ...draft, dvt: e.target.value })}
                      placeholder="ĐVT"
                      style={{ width: 48 }}
                    />
                  </td>
                ) : null}
                <td>
                  <input
                    type="number"
                    min="1"
                    value={draft.so_luong}
                    onChange={(e) => setDraft({ ...draft, so_luong: e.target.value })}
                    style={{ width: 50 }}
                  />
                </td>
                <td>
                  <input
                    value={draft.tinh_trang}
                    onChange={(e) => setDraft({ ...draft, tinh_trang: e.target.value })}
                    placeholder="Tình trạng / ghi chú"
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={addRow}>
                    Thêm
                  </button>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div style={{ padding: "10px 16px 4px" }}>
        {adding ? (
          <button className="copy-btn" onClick={() => setAdding(false)}>
            <Icon.x style={{ width: 13, height: 13 }} /> Hủy
          </button>
        ) : (
          <button className="copy-btn" onClick={() => setAdding(true)} style={{ borderStyle: "dashed" }}>
            <Icon.plus style={{ width: 14, height: 14 }} /> Thêm thiết bị
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Thanh tiến trình phân tích (stream) ---------- */
function AnalysisProgressBar({
  done,
  total,
  currentArticle,
}: {
  done: number;
  total: number;
  currentArticle: Article | null;
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="card analysis-progress rise" style={{ padding: "14px 18px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
        <span className="spinner" style={{ width: 18, height: 18 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
            {currentArticle
              ? `AI đang phân tích ${currentArticle.so_dieu}: ${currentArticle.tieu_de}`
              : "AI đang phân tích các điều khoản…"}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
            Đối chiếu checklist &amp; căn cứ pháp luật · {done}/{total} điều khoản
          </div>
        </div>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--primary)",
          }}
          className="tnum"
        >
          {pct}%
        </span>
      </div>
      <div className="ck-bar">
        <span style={{ width: pct + "%" }}></span>
      </div>
    </div>
  );
}

function ContractShareButton({
  visible,
  onShare,
}: {
  visible: boolean;
  onShare: () => void;
}) {
  if (!visible) return null;
  return (
    <button className="btn btn-ghost" onClick={onShare}>
      <Icon.copy style={{ width: 16, height: 16 }} /> Chia sẻ
    </button>
  );
}

/* ---------- Contract document panel (bên phải màn hình kết quả) ---------- */
/* ---------- Contract mode shell ---------- */
export function ContractMode({
  layout = "accordion",
  onBack,
  onStageChange,
  autoStart,
  prefilledResult,
  readOnly = false,
  enableShare = false,
}: {
  layout?: "accordion" | "split";
  onBack?: () => void;
  onStageChange?: (stage: "upload" | "processing" | "result") => void;
  autoStart?: UploadInput;
  /** Hiển thị kết quả phân tích có sẵn (trang chia sẻ). */
  prefilledResult?: ContractPrefilledResult;
  /** Ẩn upload/chat — chỉ xem kết quả. */
  readOnly?: boolean;
  /** Cho phép chia sẻ khi readOnly (trang lịch sử). */
  enableShare?: boolean;
}) {
  const { status: authStatus } = useSession();
  const [stage, setStage] = useState<"upload" | "processing" | "result">(
    prefilledResult ? "result" : "upload",
  );

  useEffect(() => {
    onStageChange?.(stage);
  }, [stage, onStageChange]);
  const [uploadInput, setUploadInput] = useState<UploadInput | null>(null);
  const [fileName, setFileName] = useState("");
  const [processError, setProcessError] = useState<string | null>(null);
  const [orderWarnings, setOrderWarnings] = useState<string[]>([]);

  // Auto-start processing when a pre-built file is passed in (e.g. from template analyzer)
  useEffect(() => {
    if (!autoStart) return;
    setUploadInput(autoStart);
    setFileName(uploadLabel(autoStart));
    setProcessError(null);
    setOrderWarnings([]);
    setStage("processing");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [contractData, setContractData] = useState<ContractData | null>(
    prefilledResult?.data ?? null,
  );
  const [contractAnalysisId, setContractAnalysisId] = useState<string | null>(
    prefilledResult?.id ?? null,
  );
  const [structuredData, setStructuredData] = useState<StructuredContractPayload | null>(null);
  const [evaluated, setEvaluated] = useState(!!prefilledResult);
  const [clauseTasks, setClauseTasks] = useState<ClauseTask[]>(() =>
    prefilledResult ? buildClauseTasksFromData(prefilledResult.data) : [],
  );
  const [analyzed, setAnalyzed] = useState<Record<string, Analysis>>(() =>
    prefilledResult ? buildAnalyzedMap(prefilledResult.data.phanTich) : {},
  );
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(() => new Set());
  const [analysisDone, setAnalysisDone] = useState(!!prefilledResult);
  const [active, setActive] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [docHighlight, setDocHighlight] = useState<string | null>(null);
  const [checklistCoverage, setChecklistCoverage] = useState<ChecklistCoverageItem[]>(
    prefilledResult?.checklistCoverage ?? [],
  );
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const contractAnalysisStartedAtRef = useRef<number | null>(null);

  const showShareButton = useMemo(() => {
    if (authStatus !== "authenticated" || !analysisDone) return false;
    if (enableShare) return true;
    if (readOnly) return false;
    if (uploadInput?.kind === "demo" || uploadInput?.kind === "template") return false;
    return true;
  }, [authStatus, analysisDone, enableShare, readOnly, uploadInput]);

  // Kết quả phân tích theo thứ tự văn bản (chỉ những điều khoản đã xong).
  const phanTich = useMemo(
    () => clauseTasks.map((t) => analyzed[t.id]).filter(Boolean) as Analysis[],
    [clauseTasks, analyzed],
  );
  const summary = useMemo(() => {
    const baseSummary = tinhTong(phanTich);
    if (prefilledResult && contractData?.overallRisk) {
      baseSummary.tong = contractData.overallRisk;
    }
    return baseSummary;
  }, [phanTich, prefilledResult, contractData]);
  const doneCount = phanTich.length;
  const totalCount = clauseTasks.length;
  const currentTask = clauseTasks.find((t) => analyzingIds.has(t.id)) ?? null;
  const currentArticle = currentTask
    ? contractData?.contract.find((a) => a.so_dieu === currentTask.soDieu) ?? null
    : null;

  const resetAnalysis = () => {
    setAnalyzed({});
    setAnalyzingIds(new Set());
    setAnalysisDone(false);
    setContractAnalysisId(null);
    contractAnalysisStartedAtRef.current = null;
  };

  // Giai đoạn 2: stream phân tích từng điều khoản sau khi đã dựng xong hợp đồng.
  useEffect(() => {
    if (stage !== "result" || !contractData || !uploadInput) return;
    if (!clauseTasks.length) {
      setAnalysisDone(true);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    const parentContractId =
      uploadInput.kind === "demo" || uploadInput.kind === "template"
        ? undefined
        : contractAnalysisId ?? undefined;

    const markStart = (id: string) =>
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    const markDone = (analysis: Analysis) => {
      setAnalyzed((prev) => ({ ...prev, [analysis.id]: analysis }));
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(analysis.id);
        return next;
      });
    };

    async function run() {
      if (uploadInput!.kind === "demo" || uploadInput!.kind === "template") {
        const sleep = (ms: number) =>
          new Promise<void>((resolve) => {
            const id = setTimeout(resolve, ms);
            signal.addEventListener("abort", () => {
              clearTimeout(id);
              resolve();
            });
          });
        const cannedData =
          uploadInput!.kind === "template"
            ? getTemplateContractData(uploadInput!.templateId)
            : getMockContractData();
        const mockById: Record<string, Analysis> = {};
        cannedData?.phanTich.forEach((a) => {
          mockById[a.id] = a;
        });
        for (const task of clauseTasks) {
          if (signal.aborted) return;
          const analysis = mockById[task.id];
          if (!analysis) continue;
          markStart(task.id);
          await sleep(430);
          if (signal.aborted) return;
          markDone(analysis);
          await sleep(150);
        }
        if (!signal.aborted) setAnalysisDone(true);
        return;
      }

      contractAnalysisStartedAtRef.current = performance.now();

      await analyzeClausesStream(
        contractData!.loaiHopDong,
        clauseTasks,
        {
          onClauseStart: (task) => markStart(task.id),
          onClauseDone: (analysis) => markDone(analysis),
        },
        {
          signal,
          contractAnalysisId: parentContractId,
        },
      );
      if (!signal.aborted) setAnalysisDone(true);
    }

    run();
    return () => controller.abort();
  // contractAnalysisId is captured inside the async closure; it must not be a
  // trigger dependency — adding it would restart the whole stream on ID changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, contractData, clauseTasks, uploadInput]);

  // Giai đoạn 3: đối chiếu 1 lần cho cả hợp đồng xem điều khoản bắt buộc nào còn
  // thiếu — chạy song song, độc lập với luồng phân tích từng điều khoản ở trên.
  useEffect(() => {
    if (stage !== "result" || !contractData || evaluated) return;

    if (uploadInput?.kind === "demo") {
      setChecklistCoverage(demoChecklistCoverage);
      setCoverageLoading(false);
      setEvaluated(true);
      return;
    }

    if (uploadInput?.kind === "template") {
      setChecklistCoverage(getTemplateCoverage(uploadInput.templateId) ?? []);
      setCoverageLoading(false);
      setEvaluated(true);
      return;
    }

    if (checklistCoverage.length > 0 && !uploadInput) {
      setCoverageLoading(false);
      setEvaluated(true);
      return;
    }

    let cancelled = false;
    setCoverageLoading(true);
    evaluateChecklistCoverage(contractData.loaiHopDong, contractData.contract)
      .then((items) => {
        if (!cancelled) {
          setChecklistCoverage(items);
          setEvaluated(true);

          if (contractAnalysisId && uploadInput) {
            const updatedStructured = {
              ...(structuredData || {}),
              checklistCoverage: items,
            };
            updateContractAnalysis(contractAnalysisId, {
              structuredData: updatedStructured,
            }).catch((err) => {
              console.error("[ContractMode] Failed to save checklist coverage to DB:", err);
            });
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChecklistCoverage([]);
          setEvaluated(true);
        }
      })
      .finally(() => {
        if (!cancelled) setCoverageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stage, contractData, uploadInput, checklistCoverage, evaluated, contractAnalysisId, structuredData]);

  // Giai đoạn 2 hoàn tất: cập nhật trạng thái hợp đồng sang "completed".
  useEffect(() => {
    if (
      readOnly ||
      prefilledResult ||
      !analysisDone ||
      !contractAnalysisId ||
      uploadInput?.kind === "demo" ||
      uploadInput?.kind === "template"
    )
      return;

    const startedAt = contractAnalysisStartedAtRef.current;
    const processingTimeMs =
      startedAt != null ? Math.round(performance.now() - startedAt) : undefined;

    persistContractCompleted(
      contractAnalysisId,
      phanTich,
      totalCount,
      processingTimeMs,
    ).catch((err) => {
      console.error("[ContractMode] Failed to persist completed status:", err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisDone, contractAnalysisId]);

  const jump = (id: string) => {
    setActive(id);
    setChatOpen(false);
    setTimeout(() => {
      scrollToEl("orig-" + id);
      scrollToEl("ana-" + id);
    }, 60);
  };

  if (stage === "upload")
    return (
      <>
        <UploadStage
          onStart={(input) => {
            setUploadInput(input);
            setFileName(uploadLabel(input));
            setProcessError(null);
            setOrderWarnings([]);
            setStage("processing");
          }}
        />
        {processError ? (
          <div className="wrap" style={{ paddingBottom: 40 }}>
            <div className="card" style={{ padding: "16px 20px", borderColor: "var(--risk-cao)", color: "var(--risk-cao)" }}>
              {processError}
            </div>
          </div>
        ) : null}
      </>
    );
  if (stage === "processing" && uploadInput)
    return (
      <ProcessingStage
        fileName={fileName}
        input={uploadInput}
        onDone={(result, analysisId) => {
          resetAnalysis();
          setEvaluated(false);
          setContractData(result.data);
          setClauseTasks(result.clauseTasks);
          setOrderWarnings(result.orderWarnings ?? []);
          setContractAnalysisId(analysisId ?? null);
          setStructuredData(result.structuredData ?? null);
          setStage("result");
        }}
        onError={(msg) => {
          setProcessError(msg);
          setStage("upload");
        }}
      />
    );

  if (!contractData) return null;

  const data = contractData;

  return (
    <>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        {/* ===== Left: analysis results (unchanged layout) ===== */}
        <div style={{ flex: "1 1 55%", overflowY: "auto", minWidth: 0 }}>
          <div className="wrap" style={{ paddingTop: 26, paddingBottom: 90 }}>
            <div className="rise" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              {onBack && (
                <button className="btn btn-ghost" style={{ gap: 6, paddingLeft: 8 }} onClick={onBack}>
                  <Icon.arrow style={{ width: 15, height: 15, transform: "rotate(180deg)" }} />
                  Quay lại
                </button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "var(--seal-tint)",
                    color: "var(--seal)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon.doc style={{ width: 20, height: 20 }} />
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15.5, fontFamily: "var(--font-display)" }}>
                    {data.fileName || "Hợp đồng mẫu"}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>
                    {data.contractInfo.loai} · {analysisDone ? "phân tích xong" : `đang phân tích ${doneCount}/${totalCount}`}
                  </div>
                </div>
              </div>
              <span className="pii-badge" style={{ marginLeft: 4 }}>
                <Icon.eye />
                PII đã ẩn danh
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <ContractShareButton
                  visible={showShareButton}
                  onShare={() => setShareOpen(true)}
                />
                {!readOnly ? (
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setContractData(null);
                    setClauseTasks([]);
                    setUploadInput(null);
                    setOrderWarnings([]);
                    setEvaluated(false);
                    setStructuredData(null);
                    resetAnalysis();
                    setStage("upload");
                  }}
                >
                  <Icon.upload style={{ width: 16, height: 16 }} /> Tải hợp đồng khác
                </button>
                ) : null}
              </div>
            </div>

            {!readOnly && orderWarnings.length > 0 && (
              <div
                className="card rise"
                style={{
                  marginBottom: 16,
                  padding: "14px 18px",
                  borderColor: "var(--risk-trung-binh)",
                  background: "var(--seal-tint)",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--seal)" }}>
                  Lưu ý thứ tự ảnh
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink-soft)", fontSize: 14 }}>
                  {orderWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {!readOnly && !analysisDone && (
              <AnalysisProgressBar done={doneCount} total={totalCount} currentArticle={currentArticle} />
            )}

            <div className="rise">
              <RiskDashboard summary={summary} />
            </div>

            <div className="rise" style={{ marginBottom: 30 }}>
              <CucHead no="1" title="Thông tin hợp đồng" icon={<Icon.info style={{ width: 18, height: 18 }} />} />
              <InfoBlock info={data.contractInfo} loaiHopDong={data.loaiHopDong} />
            </div>

            <div className="rise parties-grid" style={{ marginBottom: 30 }}>
              <div>
                <CucHead
                  no="2"
                  title="Thông tin Bên A"
                  icon={<span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>A</span>}
                />
                <PartyBlock party={data.benA} protect={false} />
              </div>
              <div>
                <CucHead
                  no="3"
                  title="Thông tin Bên B"
                  icon={<span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>B</span>}
                />
                <PartyBlock party={data.benB} protect={true} />
              </div>
            </div>

            <div className="rise" style={{ marginBottom: 30 }}>
              <CucHead no="+" title="Điều khoản bắt buộc còn thiếu" icon={<Icon.shield style={{ width: 18, height: 18 }} />} />
              <ChecklistBlock items={checklistCoverage} loading={coverageLoading} />
            </div>

            <div className="rise" style={{ marginBottom: 30 }}>
              <CucHead
                no="4"
                title="Các điều khoản"
                icon={<Icon.scale style={{ width: 18, height: 18 }} />}
                right={
                  <span style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>
                    {layout === "accordion" ? "Dạng accordion" : "Bấm câu được tô để truy vết →"}
                  </span>
                }
              />
              <ClauseWorkspace
                layout={layout}
                active={active}
                setActive={setActive}
                contractArticles={data.contract}
                phanTichItems={phanTich}
                documentTitle={data.documentTitle}
                contractNumber={data.contractInfo.so_hd !== "—" ? data.contractInfo.so_hd : undefined}
                analyzingIds={analyzingIds}
                analysisDone={analysisDone}
                onDocJump={setDocHighlight}
              />
            </div>

            {(data.loaiHopDong !== "mua_ban_can_ho_chung_cu" || data.devices.length > 0) && (
              <div className="rise" style={{ marginBottom: 30 }}>
                <CucHead no="5" title="Phụ lục danh sách thiết bị" icon={<Icon.clause style={{ width: 18, height: 18 }} />} />
                <DeviceTable initialDevices={data.devices} />
              </div>
            )}

            {analysisDone && contractAnalysisId && (
              <FeedbackWidget analysisType="contract" analysisId={contractAnalysisId} />
            )}

            <Disclaimer />
          </div>
        </div>

        {/* ===== Right: original contract document ===== */}
        <div style={{ flex: "0 0 45%", borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <ContractDocPanel data={data} highlightId={docHighlight} />
        </div>
      </div>

      {!readOnly ? (
        <>
          <button className="chat-fab" onClick={() => setChatOpen((v) => !v)} aria-label="Hỏi đáp">
            {chatOpen ? <Icon.x style={{ width: 22, height: 22 }} /> : <Icon.chat style={{ width: 22, height: 22 }} />}
          </button>
          <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} onJump={jump} />
        </>
      ) : null}
      {showShareButton ? (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          buildSnapshot={() =>
            buildContractSnapshot({ ...data, phanTich }, summary, checklistCoverage)
          }
        />
      ) : null}
      <LawPopover />
    </>
  );
}
