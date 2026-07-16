"use client";
/* ============================================================
   HopDongAI — Chế độ 1: Phân tích 1 điều khoản
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/icons";
import {
  RiskBadge,
  ConclusionTag,
  LawChip,
  CopyButton,
  Disclaimer,
  RISK_VAR,
  lblStyle,
  pStyle,
} from "../ui/primitives";
import { LawPopover } from "../ui/LawPopover";
import { clause_examples, type Analysis } from "../../lib/data";
import { evaluateClause, fetchChecklistTypes, BackendApiError } from "@/lib/api/client";
import { mapEvaluateResponseToAnalysis } from "@/lib/api/mappers";
import type { ChecklistSummary, EvaluateClauseResponse } from "@/lib/api/types";
import {
  AnalysisApiError,
  createClauseAnalysis,
  updateClauseAnalysis,
} from "@/lib/analysis/analysis-api";
import { FeedbackWidget } from "../FeedbackWidget";

/* Reusable rich result card (dùng cả ở Chế độ 1) */
export function ResultCard({ r }: { r: Analysis }) {
  const match = r.ket_luan === "MATCH";
  const benLabel = {
    ben_a: "Liên quan Bên A",
    ben_b: "Liên quan Bên B",
    ca_hai: "Liên quan cả hai bên",
  }[r.dieu_khoan_noi_ve_ben];
  return (
    <div className="card rise" style={{ overflow: "hidden" }}>
      {/* top accent strip by risk */}
      <div style={{ height: 5, background: RISK_VAR[r.muc_rui_ro] }}></div>
      <div style={{ padding: "22px 26px 26px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <RiskBadge level={r.muc_rui_ro} />
          <ConclusionTag value={r.ket_luan} />
          <span style={{ fontSize: 12.5, color: "var(--ink-faint)", fontWeight: 600 }}>{benLabel}</span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              color: "var(--ink-faint)",
              fontFamily: "var(--font-display)",
              letterSpacing: ".04em",
            }}
          >
            #{r.id}
          </span>
        </div>

        <h3 style={{ fontSize: 21, marginBottom: 14, color: "var(--ink)" }}>{r.dieu_khoan_lam_gi}</h3>

        {/* Trích dẫn */}
        <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
          <div style={{ width: 3, borderRadius: 3, background: RISK_VAR[r.muc_rui_ro], flex: "0 0 auto" }}></div>
          <div>
            <div style={lblStyle}>Trích dẫn trong điều khoản</div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: 16.5,
                fontStyle: "italic",
                lineHeight: 1.5,
                color: "var(--ink)",
              }}
            >
              &ldquo;{r.trich_dan}&rdquo;
            </p>
          </div>
        </div>

        {/* Giải thích / lý do */}
        <div style={{ marginBottom: 16 }}>
          <div style={lblStyle}>{match ? "Vì sao bất lợi cho Bên B" : "Nhận định"}</div>
          <p style={pStyle}>{r.giai_thich}</p>
          {r.ly_do ? (
            <p style={{ ...pStyle, marginTop: 8, color: match ? "var(--risk-cao)" : "var(--ink-soft)" }}>
              {r.ly_do}
            </p>
          ) : null}
        </div>

        {/* Căn cứ */}
        {r.can_cu && r.can_cu.length ? (
          <div style={{ marginBottom: r.de_xuat_sua ? 18 : 4 }}>
            <div style={lblStyle}>Căn cứ pháp lý</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {r.can_cu.map((c, i) => (
                <LawChip key={i} citation={c} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Đề xuất sửa */}
        {r.de_xuat_sua ? (
          <div
            style={{
              marginTop: 6,
              background: "var(--primary-tint)",
              border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
              borderRadius: "var(--radius-sm)",
              padding: "16px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Icon.spark style={{ width: 16, height: 16, color: "var(--primary)" }} />
              <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--primary-ink)" }}>
                Đề xuất chỉnh sửa
              </span>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 14.5, lineHeight: 1.55, color: "var(--ink)" }}>
              {r.de_xuat_sua}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CopyButton text={r.de_xuat_sua} label="Sao chép đề xuất" />
              {r.tin_nhan ? <CopyButton text={r.tin_nhan} label="Sao chép tin nhắn thương lượng" /> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const FALLBACK_TYPES: ChecklistSummary[] = [
  {
    loai_hop_dong: "cho_thue_can_ho_chung_cu",
    ten_hien_thi: "Hợp đồng cho thuê căn hộ chung cư",
    phien_ban: "2.0",
    ben_a: "Bên cho thuê",
    ben_b: "Bên thuê",
    ben_duoc_bao_ve: "ben_b",
    so_dieu_khoan: 0,
    so_red_flags: 0,
    so_unfair: 0,
  },
  {
    loai_hop_dong: "mua_ban_can_ho_chung_cu",
    ten_hien_thi: "Hợp đồng mua bán căn hộ chung cư",
    phien_ban: "2.0",
    ben_a: "Bên bán",
    ben_b: "Bên mua",
    ben_duoc_bao_ve: "ben_b",
    so_dieu_khoan: 0,
    so_red_flags: 0,
    so_unfair: 0,
  },
];

function clauseAnalysisCreateErrorMessage(err: AnalysisApiError): string {
  if (err.code === "UNAUTHORIZED") {
    return "Vui lòng đăng nhập bằng Google để tiếp tục.";
  }
  if (err.code === "CLAUSE_QUOTA_EXCEEDED") {
    return "Bạn đã hết lượt phân tích điều khoản miễn phí trong tháng này.";
  }
  return err.message;
}

function buildStandaloneClauseUpdate(
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

export function ClauseMode({ onBack }: { onBack?: () => void } = {}) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [result, setResult] = useState<Analysis | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [contractTypes, setContractTypes] = useState<ChecklistSummary[]>(FALLBACK_TYPES);
  const [loaiHopDong, setLoaiHopDong] = useState("cho_thue_can_ho_chung_cu");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const analyzeRunIdRef = useRef(0);

  const STEPS = ["Đang đọc nội dung điều khoản…", "Đối chiếu red flags & điều luật…", "Tổng hợp kết quả…"];

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    try {
      const preload = localStorage.getItem("fairterms.preload_clause");
      if (preload) {
        setText(preload);
        localStorage.removeItem("fairterms.preload_clause");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchChecklistTypes()
      .then((types) => {
        if (types.length) setContractTypes(types);
      })
      .catch(() => {
        // keep fallback list
      });
  }, []);

  const pickExample = (ex: (typeof clause_examples)[number]) => {
    setText(ex.text);
    setResult(null);
    setPhase("idle");
    setError(null);
  };

  const analyze = async () => {
    if (!text.trim()) return;
    const runId = ++analyzeRunIdRef.current;
    const startedAt = performance.now();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("running");
    setStep(0);
    setError(null);
    timers.current.push(setTimeout(() => setStep(1), 400));

    try {
      const clauseText = text.trim();
      let clauseAnalysisId: string;

      try {
        const created = await createClauseAnalysis({
          source: "standalone",
          clauseText,
          contractType: loaiHopDong,
        });
        clauseAnalysisId = created.id;
        setAnalysisId(created.id);
      } catch (err) {
        if (err instanceof AnalysisApiError) {
          throw new BackendApiError(
            clauseAnalysisCreateErrorMessage(err),
            err.status,
          );
        }
        throw err;
      }

      const response = await evaluateClause(loaiHopDong, clauseText);
      const mapped = mapEvaluateResponseToAnalysis(
        clauseText,
        response,
        "CLAUSE-1",
      );
      const processingTimeMs = Math.round(performance.now() - startedAt);

      try {
        await updateClauseAnalysis(
          clauseAnalysisId,
          buildStandaloneClauseUpdate(mapped, response, processingTimeMs),
        );
      } catch (err) {
        console.error(
          "[ClauseMode] Failed to update clause analysis:",
          err instanceof Error ? err.message : err,
        );
      }

      if (runId !== analyzeRunIdRef.current) return;
      timers.current.push(setTimeout(() => setStep(2), 200));
      setResult(mapped);
      setPhase("done");
    } catch (err) {
      if (runId !== analyzeRunIdRef.current) return;
      const msg =
        err instanceof BackendApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Không thể phân tích điều khoản. Vui lòng thử lại.";
      setError(msg);
      setPhase("idle");
    }
  };

  return (
    <div className="wrap" style={{ paddingTop: 36, paddingBottom: 64, maxWidth: 880 }}>
      <header style={{ marginBottom: 26 }}>
        {onBack ? (
          <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16, gap: 6 }}>
            <Icon.arrow style={{ width: 14, height: 14, transform: "rotate(180deg)" }} />
            Lịch sử điều khoản
          </button>
        ) : null}
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
          <Icon.clause style={{ width: 16, height: 16 }} /> Chế độ nhanh
        </div>
        <h1 style={{ fontSize: 34, marginBottom: 8 }}>Phân tích một điều khoản</h1>
        <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 16, maxWidth: 620 }}>
          Dán nội dung một điều khoản để kiểm tra nhanh mức rủi ro, căn cứ pháp lý và gợi ý chỉnh sửa — luôn
          đứng về phía Bên B.
        </p>
      </header>

      <div className="card" style={{ padding: 20, marginBottom: 18 }}>
        <div style={{ marginBottom: 14 }}>
          <label
            htmlFor="contract-type"
            style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink-faint)", marginBottom: 6 }}
          >
            Loại hợp đồng
          </label>
          <select
            id="contract-type"
            value={loaiHopDong}
            onChange={(e) => setLoaiHopDong(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 420,
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              color: "var(--ink)",
              fontSize: 14,
            }}
          >
            {contractTypes.map((t) => (
              <option key={t.loai_hop_dong} value={t.loai_hop_dong}>
                {t.ten_hien_thi}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <span
            style={{
              fontSize: 12.5,
              color: "var(--ink-faint)",
              fontWeight: 600,
              alignSelf: "center",
              marginRight: 2,
            }}
          >
            Thử nhanh:
          </span>
          {clause_examples.map((ex, i) => (
            <button key={i} className="copy-btn" style={{ borderStyle: "dashed" }} onClick={() => pickExample(ex)}>
              {ex.label}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (phase === "done") setPhase("idle");
            setError(null);
          }}
          placeholder="Dán nội dung điều khoản vào đây… (ví dụ: 'Bên B đặt cọc 02 tháng tiền thuê; nếu đơn phương chấm dứt thì mất toàn bộ cọc…')"
          style={{
            width: "100%",
            minHeight: 130,
            resize: "vertical",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface-2)",
            color: "var(--ink)",
            padding: "14px 16px",
            fontFamily: "var(--font-display)",
            fontSize: 16,
            lineHeight: 1.55,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
          <button
            className="btn btn-primary btn-lg"
            disabled={phase === "running" || !text.trim()}
            onClick={analyze}
          >
            {phase === "running" ? <span className="spinner"></span> : <Icon.scale style={{ width: 18, height: 18 }} />}
            {phase === "running" ? "Đang phân tích…" : "Phân tích điều khoản"}
          </button>
          {text ? (
            <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--ink-faint)" }}>
              {text.trim().split(/\s+/).length} từ
            </span>
          ) : null}
        </div>
        {error ? (
          <p style={{ margin: "12px 0 0", fontSize: 13.5, color: "var(--risk-cao)" }}>{error}</p>
        ) : null}
      </div>

      {phase === "running" ? (
        <div className="card rise" style={{ padding: "22px 24px", marginBottom: 18 }}>
          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "7px 0",
                opacity: i <= step ? 1 : 0.4,
                transition: "opacity .3s",
              }}
            >
              {i < step ? (
                <Icon.check style={{ width: 18, height: 18, color: "var(--risk-khong)" }} />
              ) : i === step ? (
                <span className="spinner"></span>
              ) : (
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "2px solid var(--line-strong)",
                    display: "block",
                  }}
                ></span>
              )}
              <span
                style={{
                  fontSize: 14.5,
                  color: i <= step ? "var(--ink)" : "var(--ink-faint)",
                  fontWeight: i === step ? 600 : 400,
                }}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {phase === "done" && result ? (
        <div className="ft-result-scope" style={{ display: "grid", gap: 16 }}>
          <ResultCard r={result} />
          {analysisId && (
            <FeedbackWidget analysisType="clause" analysisId={analysisId} />
          )}
          <Disclaimer />
        </div>
      ) : null}
      <LawPopover />
    </div>
  );
}
