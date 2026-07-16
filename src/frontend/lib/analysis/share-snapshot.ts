import type {
  Analysis,
  Article,
  ChecklistCoverageItem,
  ContractInfo,
  Device,
  Party,
  RiskLevel,
} from "@/app/fairterms/lib/data";
import type { ContractData } from "@/lib/contractData";

/** Dữ liệu kết quả phân tích để hiển thị lại (ContractMode read-only). */
export interface ContractPrefilledResult {
  id?: string;
  data: ContractData;
  checklistCoverage: ChecklistCoverageItem[];
}

/** Phiên bản schema của snapshot — tăng khi đổi cấu trúc để xử lý tương thích. */
export const SHARE_SNAPSHOT_VERSION = 1 as const;

/** Tổng hợp mức rủi ro dùng cho bản chia sẻ (tính sẵn để trang public không cần logic). */
export interface ShareRiskSummary {
  tong: RiskLevel;
  redFlags: number;
  count: Record<RiskLevel, number>;
}

/**
 * Snapshot bất biến của một lần phân tích hợp đồng, dùng để chia sẻ read-only.
 * PII đã được mask ở tầng mapper trước khi vào `ContractData`, nên snapshot an toàn.
 */
export interface ContractShareSnapshot {
  version: typeof SHARE_SNAPSHOT_VERSION;
  type: "contract";
  title: string;
  fileName: string;
  loaiHopDong: string;
  documentTitle: string;
  contractInfo: ContractInfo;
  benA: Party;
  benB: Party;
  contract: Article[];
  phanTich: Analysis[];
  devices: Device[];
  summary: ShareRiskSummary;
  checklistCoverage?: ChecklistCoverageItem[];
  sharedAt: string;
}

/** Xây snapshot từ state client tại thời điểm bấm chia sẻ. */
export function buildContractSnapshot(
  data: ContractData,
  summary: ShareRiskSummary,
  checklistCoverage: ChecklistCoverageItem[] = [],
): ContractShareSnapshot {
  return {
    version: SHARE_SNAPSHOT_VERSION,
    type: "contract",
    title: data.documentTitle || data.fileName,
    fileName: data.fileName,
    loaiHopDong: data.loaiHopDong,
    documentTitle: data.documentTitle,
    contractInfo: data.contractInfo,
    benA: data.benA,
    benB: data.benB,
    contract: data.contract,
    phanTich: data.phanTich,
    devices: data.devices,
    summary,
    checklistCoverage,
    sharedAt: new Date().toISOString(),
  };
}

/** Chuyển snapshot chia sẻ → state hiển thị giống màn phân tích trong app. */
export function snapshotToPrefilledResult(
  snapshot: ContractShareSnapshot,
): ContractPrefilledResult {
  return {
    data: {
      fileName: snapshot.fileName,
      contractInfo: snapshot.contractInfo,
      benA: snapshot.benA,
      benB: snapshot.benB,
      contract: snapshot.contract,
      phanTich: snapshot.phanTich,
      devices: snapshot.devices,
      loaiHopDong: snapshot.loaiHopDong,
      documentTitle: snapshot.documentTitle,
    },
    checklistCoverage: snapshot.checklistCoverage ?? [],
  };
}

/** Kiểm tra tối thiểu để tin một object là ContractShareSnapshot hợp lệ. */
export function isContractShareSnapshot(
  value: unknown,
): value is ContractShareSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.type === "contract" &&
    typeof v.contractInfo === "object" &&
    v.contractInfo !== null &&
    Array.isArray(v.phanTich)
  );
}
