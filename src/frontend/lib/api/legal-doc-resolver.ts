/* Resolve a LegalCitation to a /van-ban/... trace link.

   Two citation shapes exist in the app:
   1. RAG citations — have `source_file` (e.g. "bo_luat_dan_su_2015_91_2015_qh13.md");
      the backend registry resolves the filename stem directly.
   2. Label-only citations (template/chat, via citationFromLabel) — only a display
      string like "BLDS 2015 Điều 472"; matched against the alias map below. */

import type { LegalCitation } from "./types";

export interface CitationLink {
  docId: string;
  dieu: string | null;
  khoan: string | null;
  href: string;
}

/** Lowercase, strip Vietnamese diacritics, đ→d, collapse whitespace. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* Alias (normalized, diacritic-free) → doc_id trong kho văn bản backend.
   Chỉ cần alias phân biệt được văn bản; năm không bắt buộc vì mỗi luật
   chỉ có một phiên bản trong kho. */
const LAW_ALIASES: [string, string][] = [
  ["bo luat to tung dan su", "bo_luat_to_tung_dan_su_2015"],
  ["blttds", "bo_luat_to_tung_dan_su_2015"],
  ["bo luat dan su", "bo_luat_dan_su_2015"],
  ["blds", "bo_luat_dan_su_2015"],
  ["hien phap", "hien_phap_2013"],
  ["bao ve quyen loi nguoi tieu dung", "luat_bao_ve_quyen_loi_nguoi_tieu_dung_2023"],
  ["bvqlntd", "luat_bao_ve_quyen_loi_nguoi_tieu_dung_2023"],
  ["luat cong chung", "luat_cong_chung_2024"],
  ["luat dat dai", "luat_dat_dai_2024"],
  ["kinh doanh bat dong san", "luat_kinh_doanh_bat_dong_san_2023"],
  ["lkdbds", "luat_kinh_doanh_bat_dong_san_2023"],
  ["luat nha o", "luat_nha_o_2023"],
  ["quan ly thue", "luat_quan_ly_thue_2025"],
  ["thue thu nhap ca nhan", "luat_thue_thu_nhap_ca_nhan_2025"],
  ["101/2024/nd-cp", "nghi_dinh_101_2024_nd_cp"],
  ["nghi dinh 101", "nghi_dinh_101_2024_nd_cp"],
  ["10/2022/nd-cp", "nghi_dinh_10_2022_le_phi_truoc_ba"],
  ["le phi truoc ba", "nghi_dinh_10_2022_le_phi_truoc_ba"],
  ["55/2024/nd-cp", "nghi_dinh_quy_dinh_chi_tiet_luat_bvntd_55_2024_ndcp"],
  ["nghi dinh 55", "nghi_dinh_quy_dinh_chi_tiet_luat_bvntd_55_2024_ndcp"],
  ["95/2024/nd-cp", "nghi_dinh_95_2024_nd_cp"],
  ["nghi dinh 95", "nghi_dinh_95_2024_nd_cp"],
  ["96/2024/nd-cp", "nghi_dinh_2024"],
  ["nghi dinh 96", "nghi_dinh_2024"],
].sort((a, b) => b[0].length - a[0].length) as [string, string][];

function docIdFromLabel(label: string): string | null {
  const normalized = normalize(label);
  if (!normalized) return null;
  for (const [alias, docId] of LAW_ALIASES) {
    if (normalized.includes(alias)) return docId;
  }
  return null;
}

function extractDieu(citation: LegalCitation, label: string): string | null {
  const fromArticle = /dieu\s*(\d+[a-z]?)\b/.exec(normalize(citation.article ?? ""));
  if (fromArticle) return fromArticle[1];
  const fromLabel = /dieu\s*(\d+[a-z]?)\b/.exec(normalize(label));
  return fromLabel ? fromLabel[1] : null;
}

function extractKhoan(citation: LegalCitation, label: string): string | null {
  const clause = (citation.clause ?? "").trim();
  if (/^\d+$/.test(clause)) return clause;
  const fromLabel = /khoan\s*(\d+)\b/.exec(normalize(label));
  return fromLabel ? fromLabel[1] : null;
}

/** Build a trace link for a citation, or null when the source law is unknown. */
export function resolveCitationLink(citation: LegalCitation): CitationLink | null {
  const label = [citation.location, citation.law_title, citation.article]
    .filter(Boolean)
    .join(" ");

  let docId: string | null = null;
  if (citation.source_file) {
    docId = citation.source_file.replace(/\.md$/i, "").trim() || null;
  }
  if (!docId) docId = docIdFromLabel(label);
  if (!docId) return null;

  const dieu = extractDieu(citation, label);
  const khoan = extractKhoan(citation, label);

  const params = new URLSearchParams();
  if (dieu) params.set("dieu", dieu);
  if (dieu && khoan) params.set("khoan", khoan);
  const query = params.toString();

  return {
    docId,
    dieu,
    khoan: dieu ? khoan : null,
    href: `/van-ban/${encodeURIComponent(docId)}${query ? `?${query}` : ""}`,
  };
}
