"use client";
/* ============================================================
   HopDongAI — So sánh hợp đồng: đối chiếu bản đã sửa với bản đã
   phân tích trước đó, đánh giá từng thay đổi có lợi/bất lợi cho Bên B.
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/icons";
import { Disclaimer, RiskBadge } from "../ui/primitives";
import type { Analysis, RiskLevel } from "../../lib/data";
import {
  contractAnalysisCreateErrorMessage,
  markContractAnalysisFailed,
  persistContractCompleted,
  persistOcrContractAnalysis,
} from "./ContractMode";
import { analyzeClausesStream, ocrAndStructureContract } from "@/lib/contractData";
import { BackendApiError, evaluateDelta } from "@/lib/api/client";
import type { DeltaVerdict, StructuredContractPayload } from "@/lib/api/types";
import { mapStructuredToArticles } from "@/lib/api/mappers";
import {
  AnalysisApiError,
  createContractAnalysis,
  createContractComparison,
  getAnalysisHistory,
  getContractAnalysis,
  type ContractAnalysisDetail,
  type HistoryItem,
  type OverallCompareVerdict,
} from "@/lib/analysis/analysis-api";
import {
  matchClauses,
  normalizeText,
  summarizeClauseDiff,
  type ClauseDiffEntry,
} from "@/lib/analysis/compare/clauseMatcher";
import {
  CompareResultView,
  type CompareAddedAnalysis,
  type CompareClauseItem,
  type CompareInfoRow,
  type CompareResultData,
} from "./CompareResultView";
import { getTemplateCompareResult } from "@/app/hop-dong-mau/template-compare";

type Stage =
  | "pick-base"
  | "loading-base"
  | "upload"
  | "processing"
  | "diffing"
  | "result"
  | "error";

function formatPickDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function normalizeRiskLevel(value: string | null | undefined): RiskLevel | null {
  return value === "cao" || value === "trung_binh" || value === "thap" || value === "khong" ? value : null;
}

interface OldVerdictInfo {
  riskLevel: string | null;
  conclusion: string | null;
  lyDo: string;
}

interface DeltaResult {
  entry: ClauseDiffEntry;
  verdict: DeltaVerdict;
  giaiThich: string;
}

/** Ẩn danh họ tên / số định danh trước khi hiển thị (giữ 2 ký tự đầu + 2 cuối). */
function maskName(value?: string | null): string {
  const t = (value ?? "").trim();
  if (!t) return "";
  if (t.length <= 4) return t;
  return t.slice(0, 2) + "•••" + t.slice(-2);
}

/** Dựng bảng đối chiếu thông tin tổng quan (căn hộ, Bên A, Bên B) giữa hai bản. */
function buildInfoRows(
  baseS: StructuredContractPayload | null | undefined,
  revS: StructuredContractPayload | null | undefined,
): { rows: CompareInfoRow[]; anyChanged: boolean } {
  const rows: CompareInfoRow[] = [];
  const push = (label: string, oldRaw?: string | null, newRaw?: string | null, mask = false) => {
    const o = (oldRaw ?? "").toString().trim();
    const n = (newRaw ?? "").toString().trim();
    // Phát hiện thay đổi trên giá trị GỐC, chỉ ẩn danh khi hiển thị.
    const changed = normalizeText(o) !== normalizeText(n);
    rows.push({ label, oldValue: mask ? maskName(o) : o, newValue: mask ? maskName(n) : n, changed });
  };

  const bi = baseS?.contract_info;
  const ri = revS?.contract_info;
  push("Địa chỉ căn hộ", bi?.property_address, ri?.property_address);
  push("Diện tích", bi?.area, ri?.area);
  push("Giá", bi?.rent_price, ri?.rent_price);
  push("Đặt cọc", bi?.deposit, ri?.deposit);
  push("Thời hạn", bi?.term_text, ri?.term_text);
  push("Số hợp đồng", bi?.contract_number, ri?.contract_number);

  push("Bên A — họ tên", baseS?.party_a?.full_name, revS?.party_a?.full_name, true);
  push("Bên A — CCCD/CMND", baseS?.party_a?.id_number, revS?.party_a?.id_number, true);
  push("Bên B — họ tên", baseS?.party_b?.full_name, revS?.party_b?.full_name, true);
  push("Bên B — CCCD/CMND", baseS?.party_b?.id_number, revS?.party_b?.id_number, true);

  return { rows, anyChanged: rows.some((r) => r.changed) };
}

/** Lấy phân tích evaluate-clause (đã chạy sẵn) cho một điều khoản mới, theo id đoạn. */
function buildAddedAnalysis(phanTich: Analysis[], paragraphId: string): CompareAddedAnalysis | null {
  const a = phanTich.find((x) => x.id === paragraphId);
  if (!a) return null;
  return {
    mucRuiRo: a.muc_rui_ro,
    ketLuan: a.ket_luan,
    dieuKhoanLamGi: a.dieu_khoan_lam_gi,
    giaiThich: a.giai_thich,
    lyDo: a.ly_do,
    deXuatSua: a.de_xuat_sua,
    canCu: a.can_cu,
  };
}

function extractLyDo(analysisResult: unknown): string {
  if (!analysisResult || typeof analysisResult !== "object") return "";
  const danhGia = (
    analysisResult as {
      danh_gia?: {
        matched_red_flags?: Array<{ ly_do?: string }>;
        matched_unfair_clauses?: Array<{ ly_do?: string }>;
      };
    }
  ).danh_gia;
  if (!danhGia) return "";
  const primary = danhGia.matched_red_flags?.[0] ?? danhGia.matched_unfair_clauses?.[0];
  return primary?.ly_do ?? "";
}

function buildOldVerdictIndex(base: ContractAnalysisDetail): Map<string, OldVerdictInfo> {
  const index = new Map<string, OldVerdictInfo>();
  for (const clause of base.clauses) {
    const key = `${(clause.articleNo ?? "").trim()}::${normalizeText(clause.clauseText)}`;
    index.set(key, {
      riskLevel: clause.riskLevel,
      conclusion: clause.conclusion,
      lyDo: extractLyDo(clause.analysisResult),
    });
  }
  return index;
}

function lookupOldVerdict(
  index: Map<string, OldVerdictInfo>,
  articleNo: string,
  text: string,
): OldVerdictInfo | undefined {
  return index.get(`${articleNo.trim()}::${normalizeText(text)}`);
}

function lookupNewVerdict(phanTich: Analysis[], paragraphId: string): Analysis | undefined {
  return phanTich.find((a) => a.id === paragraphId);
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, run));
  return results;
}

function computeOverallVerdict(deltas: DeltaResult[]): {
  overallVerdict: OverallCompareVerdict;
  overallSummary: string;
} {
  const better = deltas.filter((d) => d.verdict === "tot_hon").length;
  const worse = deltas.filter((d) => d.verdict === "xau_hon").length;
  const unclear = deltas.filter((d) => d.verdict === "can_luu_y").length;

  let overallVerdict: OverallCompareVerdict;
  if (better > 0 && worse === 0) overallVerdict = "tot_hon";
  else if (worse > 0 && better === 0) overallVerdict = "xau_hon";
  else if (better > 0 && worse > 0) overallVerdict = "hon_hop";
  else overallVerdict = "khong_doi";

  const parts: string[] = [];
  if (better > 0) parts.push(`${better} thay đổi có lợi`);
  if (worse > 0) parts.push(`${worse} thay đổi bất lợi`);
  if (unclear > 0) parts.push(`${unclear} thay đổi cần xem kỹ`);

  const overallSummary =
    parts.length > 0
      ? `Trong các điều khoản đã thay đổi: ${parts.join(", ")} cho bạn.`
      : "Các điều khoản thay đổi không làm thay đổi đáng kể rủi ro cho bạn.";

  return { overallVerdict, overallSummary };
}

export function CompareMode({
  baseAnalysisId,
  templateCompareId = null,
  onBack,
}: {
  /** Hợp đồng gốc đã chọn sẵn (từ trang chi tiết lịch sử); null → hiện danh sách để người dùng chọn. */
  baseAnalysisId: string | null;
  /** Cặp hợp đồng mẫu (hop-dong-mau/template-compare.ts) — phát lại kết quả so sánh dựng sẵn, không gọi backend. */
  templateCompareId?: string | null;
  onBack: () => void;
}) {
  const [stage, setStage] = useState<Stage>(
    templateCompareId ? "result" : baseAnalysisId ? "loading-base" : "pick-base",
  );
  const [error, setError] = useState<string | null>(null);
  const [base, setBase] = useState<ContractAnalysisDetail | null>(null);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<CompareResultData | null>(
    templateCompareId ? getTemplateCompareResult(templateCompareId) : null,
  );
  const [pickList, setPickList] = useState<HistoryItem[]>([]);
  const [pickLoading, setPickLoading] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [quotaData, setQuotaData] = useState<{
    used: number;
    limit: number;
    isUnlimited: boolean;
    resetDate?: string;
  } | null>(null);
  const [checkingQuota, setCheckingQuota] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const isOutOfQuota = !!(quotaData && !quotaData.isUnlimited && quotaData.used >= quotaData.limit);

  function loadBase(id: string) {
    setStage("loading-base");
    setError(null);
    getContractAnalysis(id)
      .then((detail) => {
        if (!detail.structuredData) {
          setError("Hợp đồng gốc chưa có dữ liệu cấu trúc để so sánh. Vui lòng phân tích lại hợp đồng gốc.");
          setStage("error");
          return;
        }
        setBase(detail);
        setStage("upload");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Không thể tải hợp đồng gốc để so sánh.");
        setStage("error");
      });
  }

  useEffect(() => {
    if (!templateCompareId && baseAnalysisId) loadBase(baseAnalysisId);
  }, [baseAnalysisId, templateCompareId]);

  useEffect(() => {
    if (stage !== "pick-base") return;
    let active = true;
    setPickLoading(true);
    setPickError(null);
    getAnalysisHistory({ type: "contract" })
      .then((items) => {
        if (!active) return;
        setPickList(items.filter((item) => item.status === "completed"));
      })
      .catch((err) => {
        if (!active) return;
        setPickError(err instanceof Error ? err.message : "Không thể tải danh sách hợp đồng.");
      })
      .finally(() => {
        if (active) setPickLoading(false);
      });
    return () => {
      active = false;
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== "upload") return;
    let active = true;
    setCheckingQuota(true);
    fetch("/api/usage/quota")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (active) {
          setQuotaData({
            used: data.comparisonCount ?? 0,
            limit: data.comparisonLimit ?? 5,
            isUnlimited: !!data.isUnlimited,
            resetDate: data.periodEnd,
          });
        }
      })
      .catch((err) => {
        console.warn("[CompareMode] Failed to fetch quota data:", err);
      })
      .finally(() => {
        if (active) setCheckingQuota(false);
      });
    return () => {
      active = false;
    };
  }, [stage]);

  async function handleFile(file: File) {
    if (!base) return;
    const runId = ++runIdRef.current;
    setStage("processing");
    setProgressLabel("Đang tạo lượt phân tích cho bản đã sửa…");

    let revisedId: string | undefined;
    try {
      const created = await createContractAnalysis({
        fileName: file.name,
        title: base.title ? `${base.title} (đã sửa)` : undefined,
        contractType: base.contractType,
        source: "comparison",
      });
      revisedId = created.id;
    } catch (err) {
      if (err instanceof AnalysisApiError) {
        setError(contractAnalysisCreateErrorMessage(err));
      } else {
        setError(err instanceof Error ? err.message : "Không thể tạo lượt phân tích cho bản đã sửa.");
      }
      setStage("error");
      return;
    }

    try {
      setProgressLabel("Đang trích xuất văn bản từ tệp đã sửa…");
      const ocrResult = await ocrAndStructureContract(file, (_step, detail) => {
        if (runId !== runIdRef.current) return;
        if (detail) setProgressLabel(detail);
      });
      if (runId !== runIdRef.current) return;

      persistOcrContractAnalysis(revisedId, ocrResult).catch(() => {
        /* OCR succeeded; persistence failure must not block the flow */
      });

      setProgressLabel("Đang phân tích từng điều khoản của bản đã sửa…");
      const phanTich: Analysis[] = [];
      const startedAt = performance.now();
      await analyzeClausesStream(
        ocrResult.data.loaiHopDong,
        ocrResult.clauseTasks,
        {
          onClauseDone: (analysis) => {
            phanTich.push(analysis);
          },
        },
        { contractAnalysisId: revisedId },
      );
      if (runId !== runIdRef.current) return;

      persistContractCompleted(
        revisedId,
        phanTich,
        ocrResult.clauseTasks.length,
        Math.round(performance.now() - startedAt),
      );

      setStage("diffing");
      setProgressLabel("Đang so sánh với bản gốc…");

      const baseStructured = base.structuredData as StructuredContractPayload;
      const baseArticles = mapStructuredToArticles(baseStructured);
      const diffEntries = matchClauses(baseArticles, ocrResult.data.contract);

      const oldVerdictIndex = buildOldVerdictIndex(base);
      const toJudge = diffEntries.filter((e) => e.kind !== "unchanged");

      setProgressLabel(`Đang đánh giá ${toJudge.length} thay đổi…`);
      const judged = await runWithConcurrency(toJudge, 3, async (entry): Promise<DeltaResult> => {
        const oldInfo = entry.oldParagraph
          ? lookupOldVerdict(
              oldVerdictIndex,
              entry.oldArticleNo ?? entry.articleNo,
              entry.oldParagraph.text,
            )
          : undefined;
        const newInfo = entry.newParagraph ? lookupNewVerdict(phanTich, entry.newParagraph.id) : undefined;

        try {
          const res = await evaluateDelta({
            loai_hop_dong: ocrResult.data.loaiHopDong,
            old_clause_text: entry.oldParagraph?.text ?? null,
            old_muc_rui_ro: oldInfo?.riskLevel ?? null,
            old_ket_luan: oldInfo?.conclusion ?? null,
            old_ly_do: oldInfo?.lyDo || null,
            new_clause_text: entry.newParagraph?.text ?? null,
            new_muc_rui_ro: newInfo?.muc_rui_ro ?? null,
            new_ket_luan: newInfo?.ket_luan ?? null,
            new_ly_do: newInfo?.ly_do || null,
          });
          return { entry, verdict: res.ket_luan_thay_doi, giaiThich: res.giai_thich };
        } catch (err) {
          console.error("[CompareMode] evaluate-delta failed:", err);
          return { entry, verdict: "can_luu_y", giaiThich: "Không thể đánh giá thay đổi này, vui lòng xem lại thủ công." };
        }
      });
      if (runId !== runIdRef.current) return;

      const deltaResults = judged;
      const overallInfo = computeOverallVerdict(deltaResults);
      const deltaByEntry = new Map(deltaResults.map((d) => [d.entry, d]));

      const clauses: CompareClauseItem[] = diffEntries.map((entry) => {
        const delta = deltaByEntry.get(entry);
        return {
          kind: entry.kind,
          articleNo: entry.articleNo,
          articleTitle: entry.articleTitle,
          oldText: entry.oldParagraph?.text ?? null,
          newText: entry.newParagraph?.text ?? null,
          verdict: delta?.verdict,
          giaiThich: delta?.giaiThich,
          analysis:
            entry.kind === "added" && entry.newParagraph
              ? buildAddedAnalysis(phanTich, entry.newParagraph.id)
              : null,
        };
      });

      const resultData: CompareResultData = {
        summary: summarizeClauseDiff(diffEntries),
        overallVerdict: overallInfo.overallVerdict,
        overallSummary: overallInfo.overallSummary,
        info: buildInfoRows(baseStructured, ocrResult.structuredData),
        clauses,
      };
      setResult(resultData);

      createContractComparison({
        baseAnalysisId: base.id,
        revisedAnalysisId: revisedId,
        diffResult: resultData,
        overallVerdict: overallInfo.overallVerdict,
        overallSummary: overallInfo.overallSummary,
      })
        .then((res) => {
          setSaveError(null);
          setComparisonId(res.id);
        })
        .catch((err) => {
          console.error("[CompareMode] Failed to persist comparison:", err);
          if (err instanceof AnalysisApiError && err.status === 403) {
            setSaveError("Bạn đã hết lượt so sánh hợp đồng miễn phí. Kết quả này không thể lưu vào lịch sử tài khoản.");
          } else {
            setSaveError(err instanceof Error ? err.message : "Không thể lưu kết quả so sánh vào lịch sử.");
          }
        });

      setStage("result");
    } catch (err) {
      if (revisedId) {
        markContractAnalysisFailed(revisedId).catch(() => {
          /* best-effort */
        });
      }
      const msg =
        err instanceof BackendApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Không thể xử lý hợp đồng đã sửa. Vui lòng thử lại.";
      setError(msg);
      setStage("error");
    }
  }

  if (stage === "pick-base") {
    return (
      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 680 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: "var(--ink)" }}>So sánh hợp đồng</h2>
          <p style={{ fontSize: 13.5, color: "var(--ink-faint)", margin: "6px 0 0", lineHeight: 1.55 }}>
            Chọn một hợp đồng đã phân tích trước đó, rồi tải lên phiên bản đã chỉnh sửa để xem điều
            khoản nào thay đổi và thay đổi đó có lợi hay bất lợi cho bạn.
          </p>
        </div>

        {pickLoading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-faint)", fontSize: 14 }}>
            Đang tải danh sách hợp đồng…
          </div>
        ) : pickError ? (
          <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--risk-cao)", fontSize: 14 }}>
            {pickError}
          </div>
        ) : pickList.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--ink-faint)", fontSize: 14 }}>
            Bạn chưa có hợp đồng nào phân tích thành công. Hãy phân tích một hợp đồng trước khi so sánh.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pickList.map((item) => {
              const risk = normalizeRiskLevel(item.riskLevel);
              return (
                <div
                  key={item.id}
                  className="card"
                  style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: "var(--primary-tint)",
                      color: "var(--primary)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon.doc style={{ width: 16, height: 16 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ink)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={item.title || item.fileName}
                    >
                      {item.title?.trim() || item.fileName || "Hợp đồng"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                      {item.fileName} · {formatPickDate(item.createdAt)}
                    </div>
                  </div>
                  {risk && <RiskBadge level={risk} size="sm" />}
                  <button
                    className="btn btn-primary"
                    style={{
                      width: "auto",
                      height: "auto",
                      marginTop: 0,
                      padding: "8px 18px",
                      fontSize: 13.5,
                      flexShrink: 0,
                    }}
                    onClick={() => loadBase(item.id)}
                  >
                    So sánh
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (stage === "loading-base") {
    return (
      <div className="wrap" style={{ padding: "80px 0", textAlign: "center", color: "var(--ink-faint)" }}>
        <div
          className="spinner"
          style={{
            border: "3px solid var(--line)",
            borderTop: "3px solid var(--primary)",
            borderRadius: "50%",
            width: 32,
            height: 32,
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        Đang tải hợp đồng gốc…
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="wrap" style={{ paddingTop: 64, maxWidth: 560 }}>
        <div className="card rise" style={{ padding: 28, textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--risk-cao-bg)",
              color: "var(--risk-cao)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon.warn style={{ width: 24, height: 24 }} />
          </div>
          <p style={{ fontSize: 14.5, color: "var(--ink)", marginBottom: 20 }}>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => (baseAnalysisId ? onBack() : setStage("pick-base"))}
          >
            {baseAnalysisId ? "Quay lại" : "Chọn hợp đồng khác"}
          </button>
        </div>
      </div>
    );
  }

  if (stage === "upload" && base) {
    return (
      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 600 }}>
        <button
          className="btn btn-ghost"
          onClick={() => (baseAnalysisId ? onBack() : setStage("pick-base"))}
          style={{ marginBottom: 16, gap: 6 }}
        >
          <Icon.arrow style={{ width: 14, height: 14, transform: "rotate(180deg)" }} />
          Quay lại
        </button>
        <div className="card rise" style={{ padding: "30px 30px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
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
              <Icon.compare style={{ width: 22, height: 22 }} />
            </span>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>So sánh hợp đồng</h2>
              <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: "2px 0 0" }}>
                So với: {base.title || base.fileName}
              </p>
            </div>
          </div>

          <p style={{ fontSize: 13.5, color: "var(--ink-faint)", marginBottom: 16, lineHeight: 1.55 }}>
            Tải lên phiên bản hợp đồng đã được chỉnh sửa (PDF / ảnh chụp). Hệ thống sẽ phân tích lại
            và chỉ ra những điều khoản đã sửa, thêm mới hoặc bị xóa — cùng đánh giá thay đổi đó có lợi
            hay bất lợi cho bạn.
          </p>

          {checkingQuota ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px", gap: 8, color: "var(--ink-faint)", fontSize: 13.5 }}>
              <div
                className="spinner"
                style={{
                  border: "2px solid var(--line)",
                  borderTop: "2px solid var(--primary)",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  animation: "spin 1s linear infinite",
                }}
              />
              <span>Đang kiểm tra lượt dùng còn lại…</span>
            </div>
          ) : isOutOfQuota ? (
            <>
              <div
                className="card"
                style={{
                  padding: "16px 20px",
                  background: "var(--risk-cao-bg)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  marginBottom: 16,
                  display: "flex",
                  gap: 10,
                  textAlign: "left",
                }}
              >
                <Icon.warn style={{ width: 18, height: 18, color: "var(--risk-cao)", flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.45 }}>
                  <b>Hết lượt so sánh miễn phí:</b> Bạn đã dùng hết {quotaData?.limit}/{quotaData?.limit} lượt so sánh trong tháng này.
                  {quotaData?.resetDate && (
                    <> Lượt mới sẽ được cấp vào ngày <b>{
                      new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(quotaData.resetDate))
                    }</b>.</>
                  )}
                </div>
              </div>

              <div
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "32px 20px",
                  border: "1.5px dashed var(--line)",
                  background: "var(--surface-2)",
                  opacity: 0.5,
                  cursor: "not-allowed",
                }}
              >
                <Icon.upload style={{ width: 26, height: 26, color: "var(--ink-faint)" }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-faint)" }}>
                  Chọn tệp hợp đồng đã sửa
                </span>
                <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>PDF, PNG hoặc JPG</span>
              </div>
            </>
          ) : (
            <>
              {quotaData && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, fontSize: 12, color: "var(--ink-faint)" }}>
                  <span>Số lượt so sánh còn lại: <b>{quotaData.isUnlimited ? "Vô hạn" : `${quotaData.limit - quotaData.used}/${quotaData.limit}`}</b></span>
                </div>
              )}
              <label
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "32px 20px",
                  cursor: "pointer",
                  border: "1.5px dashed var(--line)",
                  background: "var(--surface-2)",
                }}
              >
                <Icon.upload style={{ width: 26, height: 26, color: "var(--primary)" }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                  Chọn tệp hợp đồng đã sửa
                </span>
                <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>PDF, PNG hoặc JPG</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
              </label>
            </>
          )}
        </div>
        <div style={{ marginTop: 20 }}>
          <Disclaimer />
        </div>
      </div>
    );
  }

  if (stage === "processing" || stage === "diffing") {
    return (
      <div className="wrap" style={{ paddingTop: 64, paddingBottom: 80, maxWidth: 600 }}>
        <div className="card rise" style={{ padding: "40px 30px", textAlign: "center" }}>
          <div
            className="spinner"
            style={{
              border: "3px solid var(--line)",
              borderTop: "3px solid var(--primary)",
              borderRadius: "50%",
              width: 32,
              height: 32,
              animation: "spin 1s linear infinite",
              margin: "0 auto 18px",
            }}
          />
          <p style={{ fontSize: 14.5, fontWeight: 500, color: "var(--ink)" }}>{progressLabel}</p>
          <style jsx global>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // stage === "result"
  if (!result) return null;
  const headerTitle = templateCompareId ? "Ví dụ so sánh hợp đồng mẫu" : "Kết quả so sánh hợp đồng";
  const headerSubtitle = templateCompareId
    ? "Minh hoạ: Hợp đồng Mua bán Căn hộ Chung cư (mẫu) → bản đã chỉnh sửa"
    : base
      ? `So với: ${base.title || base.fileName}`
      : undefined;
  return (
    <div className="ft-result-scope">
      <CompareResultView
        data={result}
        headerTitle={headerTitle}
        headerSubtitle={headerSubtitle}
        onBack={onBack}
        warningMessage={saveError || undefined}
        comparisonId={comparisonId || undefined}
      />
    </div>
  );
}
