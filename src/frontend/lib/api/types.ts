/** Backend API response types */

export interface StructuredContractParty {
  role_label?: string | null;
  full_name?: string | null;
  id_number?: string | null;
  id_issue_date?: string | null;
  id_issue_place?: string | null;
  phone?: string | null;
  permanent_address?: string | null;
}

export interface MissingFieldItem {
  path: string;
  label: string;
}

export interface StructuredContractInfo {
  contract_type?: string | null;
  contract_number?: string | null;
  sign_date?: string | null;
  term_text?: string | null;
  rent_price?: string | null;
  sale_price?: string | null;
  deposit?: string | null;
  area?: string | null;
  property_address?: string | null;
  can_ho_so?: string | null;
  toa_nha?: string | null;
  payment_schedule?: string[];
  certificate_no?: string | null;
  certificate_issue?: string | null;
  notarization?: string | null;
  thua_dat_so?: string | null;
  to_ban_do_so?: string | null;
  muc_dich_su_dung?: string | null;
}

export interface StructuredEquipmentItem {
  index?: number | null;
  name?: string | null;
  quantity?: number | null;
  condition?: string | null;
}

export interface StructuredClause {
  article_no?: string | null;
  title?: string | null;
  items: string[];
}

export interface StructuredContractPayload {
  contract_info: StructuredContractInfo;
  party_a: StructuredContractParty;
  party_b: StructuredContractParty;
  appendix_equipment: StructuredEquipmentItem[];
  clauses: StructuredClause[];
}

export interface OcrStructuredResponse {
  success: boolean;
  document_id: string;
  source_filename: string;
  markdown_filename: string;
  markdown: string;
  processing_time_ms: number;
  timings_ms?: Record<string, number | string | string[] | null> | null;
  structured: StructuredContractPayload;
  missing_fields?: MissingFieldItem[];
  page_count?: number;
  image_order_used?: number[];
  order_confidence?: number;
  order_warnings?: string[];
}

export interface ChecklistSummary {
  loai_hop_dong: string;
  ten_hien_thi: string;
  phien_ban: string;
  ben_a: string;
  ben_b: string;
  ben_duoc_bao_ve: string;
  so_dieu_khoan: number;
  so_red_flags: number;
  so_unfair: number;
}

export interface EvaluatePhanTichItem {
  id: string;
  dieu_khoan_noi_ve_ben: "ben_a" | "ben_b" | "ca_hai";
  dieu_khoan_lam_gi: string;
  ket_luan: "MATCH" | "PASS";
  giai_thich: string;
}

/** One retrieved-and-verified legal citation (mirrors backend LegalCitation). */
export interface LegalCitation {
  source_file?: string;
  law_title?: string;
  article?: string;
  clause?: string | null;
  point?: string | null;
  quote?: string;
  location?: string;
  score?: number;
  selection_confidence?: "high" | "medium" | "low" | null;
}

export interface EvaluateMatchedFlag {
  id: string;
  muc_rui_ro: "cao" | "trung_binh" | "thap";
  trich_dan: string;
  ly_do: string;
  /** Transitional: v1 checklist strings / v2 mirror of legal_basis locations. */
  can_cu?: string[];
  goi_y_thuong_luong?: string;
  legal_basis?: LegalCitation[];
  evidence_status?: string;
}

export interface EvaluateDanhGia {
  phan_tich?: EvaluatePhanTichItem[];
  muc_rui_ro_tong: "cao" | "trung_binh" | "thap" | "khong";
  matched_red_flags: EvaluateMatchedFlag[];
  matched_unfair_clauses: EvaluateMatchedFlag[];
  nhan_xet?: string;
  de_xuat_sua?: string;
}

export interface EvaluateClauseResponse {
  loai_hop_dong: string;
  checklist_id: string;
  model: string;
  ben_duoc_bao_ve: string;
  danh_gia: EvaluateDanhGia;
  evidence_status: string;
  luu_y: string;
}

/** One mandatory obligation/right checked against the whole contract. */
export interface RequiredItemResult {
  id: string;
  ten: string;
  thuoc_ben: "ben_a" | "ben_b";
  bat_buoc: boolean;
  trang_thai: "co" | "thieu";
  trich_dan: string;
  ghi_chu: string;
  goi_y_bo_sung: string;
  vi_tri_de_xuat: string;
}

export interface EvaluateCoverageResponse {
  loai_hop_dong: string;
  model: string;
  ben_duoc_bao_ve: string;
  items: RequiredItemResult[];
  luu_y: string;
}

/** Request payload for POST /checklist/evaluate-delta — one side may be null (added/removed clause). */
export interface EvaluateDeltaRequest {
  loai_hop_dong: string;
  old_clause_text?: string | null;
  old_muc_rui_ro?: string | null;
  old_ket_luan?: string | null;
  old_ly_do?: string | null;
  new_clause_text?: string | null;
  new_muc_rui_ro?: string | null;
  new_ket_luan?: string | null;
  new_ly_do?: string | null;
}

export type DeltaVerdict = "tot_hon" | "xau_hon" | "khong_doi" | "can_luu_y";

export interface EvaluateDeltaResponse {
  ket_luan_thay_doi: DeltaVerdict;
  giai_thich: string;
  model: string;
}

/** Metadata of one legal source document in the RAG corpus. */
export interface LegalDocumentInfo {
  doc_id: string;
  source_file: string;
  title: string;
  so_hieu?: string | null;
  loai_van_ban?: string | null;
  co_quan_ban_hanh?: string | null;
  ngay_ban_hanh?: string | null;
  ngay_hieu_luc?: string | null;
  trang_thai?: string | null;
  linh_vuc?: string | null;
}

/** Full legal document: metadata + markdown body (frontmatter stripped). */
export interface LegalDocumentContent extends LegalDocumentInfo {
  content: string;
}

// --- Admin System Types ---

export interface AdminChecklistMeta {
  id: string;
  loai_hop_dong: string;
  ten_hien_thi: string;
  phien_ban: string;
  items_count: number;
}

export interface AdminChecklistItem {
  id: string;
  category: string;
  title_vi: string;
  required: boolean;
  description_vi: string;
}

export interface AdminRAGDocInfo {
  doc_id: string;
  source_file: string;
  title: string;
  so_hieu?: string | null;
  loai_van_ban?: string | null;
  ngay_ban_hanh?: string | null;
  ngay_hieu_luc?: string | null;
}

export interface AdminRAGSearchResult {
  text: string;
  doc_id: string;
  article?: string | null;
  score: number;
}

export interface AdminAIConfig {
  openai_api_key_configured: boolean;
  gemini_api_key_configured: boolean;
  default_model: string;
  gemini_model: string;
  gemini_structuring_model: string;
  embedding_model: string;
  concurrency_limit: number;
}

export interface AdminAIConfigSave {
  openai_api_key?: string;
  gemini_api_key?: string;
  default_model: string;
  gemini_model: string;
  gemini_structuring_model: string;
  embedding_model: string;
  concurrency_limit: number;
}

export interface AdminBackendStats {
  parents: number;
  children: number;
  checklists_count: number;
  indexed: boolean;
}

export interface AdminAIPingResult {
  ok: boolean;
  latency_ms: number;
  provider: string;
}

// --- LangSmith Observability Types ---

export interface AdminLangSmithOverview {
  total_runs: number;
  error_count: number;
  error_rate: number;
  latency_p50_s: number | null;
  latency_p95_s: number | null;
  total_tokens: number;
  total_cost_usd: number | null;
}

export interface AdminLangSmithToolStat {
  name: string;
  label: string;
  run_count: number;
  error_count: number;
  error_rate: number;
  latency_p50_s: number | null;
}

export interface AdminLangSmithLLMStat {
  name: string;
  run_count: number;
  total_tokens: number;
  total_cost_usd: number | null;
}

export interface AdminLangSmithErrorRun {
  id: string;
  name: string;
  error: string;
  start_time: string | null;
  latency_s: number | null;
  url: string | null;
}

export interface AdminLangSmithTimelineBucket {
  bucket_start: string;
  run_count: number;
  error_count: number;
}

export interface AdminLangSmithDashboard {
  enabled: boolean;
  project: string;
  range_hours: number;
  overview: AdminLangSmithOverview;
  tools: AdminLangSmithToolStat[];
  llm_calls: AdminLangSmithLLMStat[];
  recent_errors: AdminLangSmithErrorRun[];
  timeline: AdminLangSmithTimelineBucket[];
  truncated: boolean;
}

// --- Cache Management Types ---

export interface AdminCacheRedisStats {
  connected: boolean;
  used_memory_human: string | null;
  connected_clients: number | null;
  uptime_in_seconds: number | null;
  keyspace_hits: number;
  keyspace_misses: number;
  hit_rate: number | null;
}

export interface AdminCacheNamespaceInfo {
  namespace: string;
  label: string;
  enabled: boolean;
  ttl_seconds: number;
  key_count: number | null;
}

export interface AdminCacheOverview {
  redis: AdminCacheRedisStats;
  namespaces: AdminCacheNamespaceInfo[];
}

export interface AdminCacheFlushResult {
  namespace: string;
  deleted_count: number;
}

export interface AdminCacheEntryPreview {
  digest: string;
  ttl_seconds: number | null;
  loai_hop_dong: string | null;
  model: string | null;
  muc_rui_ro_tong: string | null;
  red_flags_count: number;
  unfair_count: number;
  trich_dan_preview: string | null;
}

export interface AdminCacheEntriesPage {
  entries: AdminCacheEntryPreview[];
  next_cursor: number;
  done: boolean;
}

export interface AdminCacheEntryDeleteResult {
  digest: string;
  deleted: boolean;
}


