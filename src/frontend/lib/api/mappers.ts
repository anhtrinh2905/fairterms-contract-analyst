import {
  citationsFromLabels,
  type Analysis,
  type Article,
  type BenSide,
  type ChecklistCoverageItem,
  type ContractInfo,
  type Device,
  type Party,
  type PartyField,
  type RiskLevel,
} from "@/app/fairterms/lib/data";
import type {
  EvaluateClauseResponse,
  EvaluateCoverageResponse,
  LegalCitation,
  MissingFieldItem,
  OcrStructuredResponse,
  StructuredContractParty,
  StructuredContractPayload,
} from "./types";

const PARTY_FIELDS: PartyField[] = ["ho_ten", "cccd", "ngay_cap", "noi_cap", "sdt", "dia_chi"];

const PLACEHOLDER_RE = /^[\s.…_\-–—/\\:;,]+$/;

export function isPlaceholderValue(value: string | null | undefined): boolean {
  if (value == null) return true;
  const text = value.trim();
  if (!text) return true;
  if (PLACEHOLDER_RE.test(text)) return true;
  if (text.split(".").length >= 4 && /^[\s.…]+$/.test(text)) return true;
  return false;
}

function cleanField(value: string | null | undefined): string | null {
  if (isPlaceholderValue(value)) return null;
  return value!.trim();
}

function maskPii(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 4) return value;
  return value.slice(0, 2) + "•••" + value.slice(-2);
}

function mapParty(party: StructuredContractParty, label: string): Party {
  const raw: Record<PartyField, string | null> = {
    ho_ten: cleanField(party.full_name),
    cccd: cleanField(party.id_number),
    ngay_cap: cleanField(party.id_issue_date),
    noi_cap: cleanField(party.id_issue_place),
    sdt: cleanField(party.phone),
    dia_chi: cleanField(party.permanent_address),
  };

  const truong_thieu = PARTY_FIELDS.filter((f) => !raw[f]);

  return {
    nhan: party.role_label || label,
    ho_ten: maskPii(raw.ho_ten),
    cccd: maskPii(raw.cccd),
    ngay_cap: raw.ngay_cap,
    noi_cap: raw.noi_cap,
    sdt: maskPii(raw.sdt),
    dia_chi: maskPii(raw.dia_chi),
    truong_thieu,
  };
}

function displayField(value: string | null | undefined): string {
  const cleaned = cleanField(value);
  return cleaned ?? "—";
}

export function mapStructuredToContractInfo(structured: StructuredContractPayload): ContractInfo {
  const info = structured.contract_info;
  const price = displayField(cleanField(info.rent_price) ?? cleanField(info.sale_price));
  return {
    loai: displayField(info.contract_type),
    so_hd: displayField(info.contract_number),
    ngay_ky: displayField(info.sign_date),
    thoi_han: displayField(info.term_text),
    gia_thue: price,
    dat_coc: displayField(info.deposit),
    dia_chi: displayField(info.property_address),
    dien_tich: displayField(info.area),
  };
}

export function mapStructuredToArticles(structured: StructuredContractPayload): Article[] {
  return structured.clauses.map((clause, articleIndex) => ({
    so_dieu: clause.article_no ?? `ĐIỀU ${articleIndex + 1}`,
    tieu_de: clause.title ?? "",
    paragraphs: (clause.items ?? []).map((text, itemIndex) => ({
      id: `p${articleIndex + 1}-${itemIndex + 1}`,
      num: `${articleIndex + 1}.${itemIndex + 1}`,
      text,
    })),
  }));
}

export function mapStructuredToDevices(structured: StructuredContractPayload): Device[] {
  return (structured.appendix_equipment ?? []).map((item) => ({
    ten: item.name ?? "—",
    so_luong: item.quantity ?? 1,
    tinh_trang: item.condition ?? "—",
    dung_thuc_te: false,
  }));
}

/** Map contract_type / auto-detected kind → checklist loai_hop_dong slug */
export function resolveLoaiHopDong(
  contractType?: string | null,
  detectedKind?: string | null,
): string {
  const kind = (detectedKind || "").toLowerCase();
  if (kind === "mua_ban_can_ho_chung_cu" || kind === "cho_thue_can_ho_chung_cu") {
    return kind;
  }
  const lower = (contractType || "").toLowerCase();
  if (kind === "can_ho_chung_cu") {
    if (lower.includes("mua bán") || lower.includes("mua ban")) {
      return "mua_ban_can_ho_chung_cu";
    }
    return "cho_thue_can_ho_chung_cu";
  }

  if (!contractType) {
    if (kind.includes("mua_ban")) return "mua_ban_can_ho_chung_cu";
    if (kind.includes("cho_thue") || kind.includes("thue")) return "cho_thue_can_ho_chung_cu";
    return "cho_thue_can_ho_chung_cu";
  }

  if (lower.includes("mua bán") || lower.includes("mua ban") || lower.includes("chuyển nhượng")) {
    return "mua_ban_can_ho_chung_cu";
  }
  if (
    lower.includes("căn hộ chung cư") ||
    lower.includes("can ho chung cu") ||
    (lower.includes("cho thuê") && lower.includes("căn hộ"))
  ) {
    return "cho_thue_can_ho_chung_cu";
  }
  if (lower.includes("cho thuê") || lower.includes("cho thue") || lower.includes("thuê nhà")) {
    return "cho_thue_can_ho_chung_cu";
  }
  if (lower.includes("thuê") || lower.includes("thue")) {
    return "cho_thue_can_ho_chung_cu";
  }
  if (lower.includes("mua") || lower.includes("bán") || lower.includes("ban")) {
    return "mua_ban_can_ho_chung_cu";
  }
  return "cho_thue_can_ho_chung_cu";
}

export function mapEvaluateResponseToAnalysis(
  clauseText: string,
  response: EvaluateClauseResponse,
  id: string,
  soDieu?: string,
): Analysis {
  const danhGia = response?.danh_gia;
  const redFlags = danhGia?.matched_red_flags ?? [];
  const unfair = danhGia?.matched_unfair_clauses ?? [];
  const hasMatch = redFlags.length > 0 || unfair.length > 0;
  const primary = redFlags[0] ?? unfair[0];
  const phanTich =
    danhGia?.phan_tich?.find((p) => p.ket_luan === "MATCH") ?? danhGia?.phan_tich?.[0];

  // RAG-verified citations (full objects with quote/score) take priority;
  // plain can_cu strings are only a fallback for legacy responses.
  const legalBasis: LegalCitation[] = (primary?.legal_basis ?? []).filter(
    (c) => c.location || c.law_title || c.quote,
  );
  const canCu: LegalCitation[] = legalBasis.length
    ? legalBasis
    : citationsFromLabels(primary?.can_cu ?? []);

  const benSide: BenSide = phanTich?.dieu_khoan_noi_ve_ben ?? "ben_b";
  const mucRuiRo: RiskLevel = hasMatch ? (danhGia?.muc_rui_ro_tong ?? "khong") : "khong";

  return {
    id,
    so_dieu: soDieu,
    dieu_khoan_noi_ve_ben: benSide,
    dieu_khoan_lam_gi:
      phanTich?.dieu_khoan_lam_gi ?? danhGia?.nhan_xet ?? "Phân tích điều khoản",
    ket_luan: hasMatch ? "MATCH" : "PASS",
    muc_rui_ro: mucRuiRo,
    trich_dan: primary?.trich_dan ?? (clauseText.length > 220 ? clauseText.slice(0, 217) + "…" : clauseText),
    giai_thich: phanTich?.giai_thich ?? danhGia?.nhan_xet ?? "",
    ly_do: primary?.ly_do ?? "",
    can_cu: canCu,
    de_xuat_sua: danhGia?.de_xuat_sua ?? primary?.goi_y_thuong_luong ?? "",
    tin_nhan: primary?.goi_y_thuong_luong ?? "",
  };
}

export function mapCoverageResponseToItems(
  response: EvaluateCoverageResponse,
): ChecklistCoverageItem[] {
  return response.items.map((item) => ({
    id: item.id,
    ten: item.ten,
    thuocBen: item.thuoc_ben,
    batBuoc: item.bat_buoc,
    trangThai: item.trang_thai,
    trichDan: item.trich_dan,
    ghiChu: item.ghi_chu,
    goiYBoSung: item.goi_y_bo_sung,
    viTriDeXuat: item.vi_tri_de_xuat,
  }));
}

export interface MappedContractPayload {
  contractInfo: ContractInfo;
  benA: Party;
  benB: Party;
  contract: Article[];
  devices: Device[];
  loaiHopDong: string;
  documentTitle: string;
  missingFields: MissingFieldItem[];
}

export function mapOcrStructuredResponse(ocr: OcrStructuredResponse): MappedContractPayload {
  const structured = ocr.structured;
  const contractInfo = mapStructuredToContractInfo(structured);
  const detectedKind =
    typeof ocr.timings_ms?.supported_transaction === "string"
      ? ocr.timings_ms.supported_transaction
      : typeof ocr.timings_ms?.detected_contract_kind === "string"
        ? ocr.timings_ms.detected_contract_kind
        : null;

  return {
    contractInfo,
    benA: mapParty(structured.party_a, "Bên A"),
    benB: mapParty(structured.party_b, "Bên B — Bên được bảo vệ"),
    contract: mapStructuredToArticles(structured),
    devices: mapStructuredToDevices(structured),
    loaiHopDong: resolveLoaiHopDong(
      structured.contract_info.contract_type,
      detectedKind,
    ),
    documentTitle: contractInfo.loai.toUpperCase(),
    missingFields: ocr.missing_fields ?? [],
  };
}
