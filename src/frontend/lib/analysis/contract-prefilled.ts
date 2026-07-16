import { mapOcrStructuredResponse, mapEvaluateResponseToAnalysis } from "@/lib/api/mappers";
import type { StructuredContractPayload, EvaluateClauseResponse } from "@/lib/api/types";
import type {
  Analysis,
  RiskLevel,
  LegalCitation,
  ChecklistCoverageItem,
  Conclusion,
  BenSide,
} from "@/app/fairterms/lib/data";
import type { ContractAnalysisDetail } from "@/lib/analysis/analysis-api";
import type { ContractPrefilledResult } from "@/lib/analysis/share-snapshot";

interface DBClause {
  id: string;
  articleNo: string | null;
  contractType: string;
  riskLevel: string | null;
  conclusion: string | null;
  suggestion: string | null;
  negotiationMessage: string | null;
  processingTimeMs: number | null;
  createdAt: string;
  clauseText?: string;
  analysisResult?: unknown;
  legalBasis?: unknown;
}

function mapDbClauseToAnalysis(c: DBClause, id: string): Analysis {
  const analysisResult = c.analysisResult as Record<string, unknown> | null;

  if (analysisResult && typeof analysisResult === "object" && "danh_gia" in analysisResult && analysisResult.danh_gia) {
    try {
      return mapEvaluateResponseToAnalysis(
        c.clauseText || "",
        analysisResult as unknown as EvaluateClauseResponse,
        id,
        c.articleNo || undefined,
      );
    } catch (err) {
      console.warn(
        `[mapDbClauseToAnalysis] Failed to map raw response for clause ${c.id}, falling back to DB fields:`,
        err,
      );
    }
  }

  if (analysisResult && typeof analysisResult === "object" && !("error" in analysisResult)) {
    return {
      id,
      so_dieu: c.articleNo || undefined,
      dieu_khoan_noi_ve_ben: (analysisResult.dieu_khoan_noi_ve_ben as BenSide) || "ben_b",
      dieu_khoan_lam_gi: (analysisResult.dieu_khoan_lam_gi as string) ?? c.conclusion ?? "Phân tích điều khoản",
      ket_luan: (analysisResult.ket_luan as Conclusion) || (c.conclusion === "MATCH" ? "MATCH" : "PASS"),
      muc_rui_ro: (analysisResult.muc_rui_ro as RiskLevel) || c.riskLevel || "khong",
      trich_dan: (analysisResult.trich_dan as string) ?? c.clauseText ?? "",
      giai_thich: (analysisResult.giai_thich as string) ?? "",
      ly_do: (analysisResult.ly_do as string) ?? "",
      can_cu: (analysisResult.can_cu as LegalCitation[]) || c.legalBasis || [],
      de_xuat_sua: (analysisResult.de_xuat_sua as string) ?? c.suggestion ?? "",
      tin_nhan: (analysisResult.tin_nhan as string) ?? c.negotiationMessage ?? "",
    };
  }

  return {
    id,
    so_dieu: c.articleNo || undefined,
    dieu_khoan_noi_ve_ben: "ben_b",
    dieu_khoan_lam_gi: "Phân tích điều khoản",
    ket_luan: c.conclusion === "MATCH" ? "MATCH" : "PASS",
    muc_rui_ro: (c.riskLevel || "khong") as RiskLevel,
    trich_dan: c.clauseText || "",
    giai_thich: "",
    ly_do: "",
    can_cu: (c.legalBasis || []) as LegalCitation[],
    de_xuat_sua: c.suggestion || "",
    tin_nhan: c.negotiationMessage || "",
  };
}

/** Chuyển bản ghi phân tích hợp đồng từ API → state hiển thị ContractMode / snapshot chia sẻ. */
export function contractAnalysisDetailToPrefilled(res: ContractAnalysisDetail): ContractPrefilledResult {
  const structuredDataRaw = res.structuredData as Record<string, unknown> | null;
  const savedCoverage = (
    structuredDataRaw && Array.isArray(structuredDataRaw.checklistCoverage)
      ? structuredDataRaw.checklistCoverage
      : []
  ) as ChecklistCoverageItem[];

  const structuredData = (res.structuredData || {
    contract_info: {
      contract_type: res.contractType,
      contract_number: "—",
      sign_date: "—",
      term_text: "—",
      rent_price: "—",
      deposit: "—",
      area: "—",
      property_address: "—",
    },
    party_a: { role_label: "BÊN A" },
    party_b: { role_label: "BÊN B" },
    appendix_equipment: [],
    clauses: res.clauses.map((c) => ({
      article_no: c.articleNo,
      title: "",
      items: [c.clauseText || ""],
    })),
  }) as StructuredContractPayload;

  const mappedOcr = mapOcrStructuredResponse({
    success: true,
    document_id: res.documentId || "",
    source_filename: res.fileName,
    markdown_filename: "",
    markdown: "",
    processing_time_ms: res.processingTimeMs || 0,
    structured: structuredData,
  });

  const allParagraphs = mappedOcr.contract.flatMap((art) =>
    art.paragraphs.map((p) => ({
      id: p.id,
      text: p.text.trim(),
    })),
  );

  const usedParagraphIds = new Set<string>();
  const phanTichMapped = res.clauses.map((c) => {
    const cleanText = (c.clauseText || "").trim();
    let matchedParagraph = allParagraphs.find((p) => p.text === cleanText && !usedParagraphIds.has(p.id));

    if (!matchedParagraph && cleanText) {
      matchedParagraph = allParagraphs.find(
        (p) => (p.text.includes(cleanText) || cleanText.includes(p.text)) && !usedParagraphIds.has(p.id),
      );
    }

    if (matchedParagraph) {
      usedParagraphIds.add(matchedParagraph.id);
    }

    const targetId = matchedParagraph ? matchedParagraph.id : c.id;
    return mapDbClauseToAnalysis(c, targetId);
  });

  return {
    id: res.id,
    data: {
      fileName: res.fileName,
      contractInfo: mappedOcr.contractInfo,
      benA: mappedOcr.benA,
      benB: mappedOcr.benB,
      contract: mappedOcr.contract,
      phanTich: phanTichMapped,
      devices: mappedOcr.devices,
      loaiHopDong: mappedOcr.loaiHopDong,
      documentTitle: mappedOcr.documentTitle,
      overallRisk: res.overallRisk as RiskLevel | null,
    },
    checklistCoverage: savedCoverage,
  };
}
