"use client";
/* Trang chia sẻ — tái sử dụng đúng UI kết quả phân tích trong ContractMode. */
import { SessionProvider } from "next-auth/react";
import { ContractMode } from "@/app/fairterms/components/analysis/ContractMode";
import {
  snapshotToPrefilledResult,
  type ContractShareSnapshot,
} from "@/lib/analysis/share-snapshot";

export function SharedAnalysisView({ snapshot }: { snapshot: ContractShareSnapshot }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ContractMode
        readOnly
        prefilledResult={snapshotToPrefilledResult(snapshot)}
      />
    </SessionProvider>
  );
}
