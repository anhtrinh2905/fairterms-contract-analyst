import "../../landing/landing.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CONTRACTS } from "../contracts";
import TemplateViewer from "./TemplateViewer";

type Props = { params: Promise<{ type: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const template = CONTRACTS[type];
  if (!template) return {};
  return {
    title: `${template.title} — FairTerms`,
    description: template.description,
  };
}

export function generateStaticParams() {
  return [{ type: "thue" }, { type: "mua-ban" }];
}

export default async function TemplatePage({ params }: Props) {
  const { type } = await params;
  const template = CONTRACTS[type];
  if (!template) notFound();
  return <TemplateViewer template={template} />;
}
