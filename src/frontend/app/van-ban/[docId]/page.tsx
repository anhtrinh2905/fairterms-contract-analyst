import "../../fairterms.css";
import "../van-ban.css";
import type { Metadata } from "next";
import VanBanView from "./VanBanView";

type Props = {
  params: Promise<{ docId: string }>;
  searchParams: Promise<{ dieu?: string; khoan?: string }>;
};

export function generateMetadata(): Metadata {
  return { title: "Văn bản pháp luật — FairTerms" };
}

export default async function VanBanPage({ params, searchParams }: Props) {
  const { docId } = await params;
  const query = await searchParams;

  return (
    <VanBanView docId={docId} dieuParam={query.dieu ?? null} khoanParam={query.khoan ?? null} />
  );
}
