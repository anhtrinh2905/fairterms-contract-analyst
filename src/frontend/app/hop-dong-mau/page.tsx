import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, FileText, Info, ShieldCheck } from "lucide-react";
import { LogoMark } from "../fairterms/components/ui/LogoMark";
import { THUE_CAN_HO, MUA_BAN_CAN_HO } from "./contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Hợp đồng mẫu — FairTerms",
  description:
    "Tải hợp đồng thuê & mua bán căn hộ chung cư chuẩn pháp lý, chỉnh sửa trực tiếp và phân tích bằng AI.",
};

const TEMPLATES = [
  {
    template: THUE_CAN_HO,
    icon: FileText,
    tags: ["Luật Nhà ở 2023", "BLDS 2015", "Miễn phí"],
    highlights: [
      "Giá thuê cố định suốt thời hạn",
      "Cọc có điều kiện loại trừ bất khả kháng",
      "Quyền riêng tư Bên B được bảo vệ",
    ],
  },
  {
    template: MUA_BAN_CAN_HO,
    icon: ShieldCheck,
    tags: ["Luật Nhà ở 2023", "Luật KD BĐS 2023", "Công chứng"],
    highlights: [
      "Cam kết pháp lý đầy đủ từ Bên bán",
      "Tiến độ thanh toán rõ ràng",
      "Phạt vi phạm cân xứng hai chiều",
    ],
  },
];

export default function TemplatePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3.5">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-80"
          >
            <LogoMark size={28} />
            <span className="text-[15px] font-semibold">
              Fair<b>Terms</b>
            </span>
          </Link>
          <Separator orientation="vertical" className="hidden h-4 sm:block" />
          <span className="hidden text-sm text-muted-foreground sm:inline">Hợp đồng mẫu</span>
          <Button asChild size="sm" variant="secondary" className="ml-auto">
            <Link href="/app">
              <span className="sm:hidden">Phân tích</span>
              <span className="hidden sm:inline">Phân tích hợp đồng của tôi</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-14 pb-10 text-center md:pt-20 md:pb-12">
        <Badge
          variant="outline"
          className="mb-4 border-border text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Tài nguyên · Templates
        </Badge>
        <h1 className="mx-auto max-w-xl text-[clamp(28px,4vw,42px)] leading-[1.15] font-light tracking-tight text-foreground">
          Hợp đồng mẫu{" "}
          <span className="font-medium text-primary">chuẩn pháp lý</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15.5px] leading-relaxed text-muted-foreground md:max-w-lg md:text-base">
          Xem, điền thông tin và tải xuống — hoặc phân tích ngay bằng AI để kiểm tra trước khi dùng.
        </p>
      </section>

      {/* Cards */}
      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {TEMPLATES.map(({ template, icon: TemplateIcon, tags, highlights }) => (
            <Link
              key={template.id}
              href={`/hop-dong-mau/${template.id}`}
              className="group block h-full focus-visible:outline-none"
            >
              <Card className="h-full border-border py-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md group-focus-visible:ring-[3px] group-focus-visible:ring-ring/50">
                <CardHeader className="gap-3 px-5">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <TemplateIcon className="size-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-lg font-semibold">
                      {template.title}
                    </CardTitle>
                    <CardDescription className="mt-1.5 text-[13px] leading-relaxed">
                      {template.description}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4 px-5">
                  <ul className="space-y-2">
                    {highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-2 text-[13px] text-muted-foreground"
                      >
                        <CheckCircle2
                          className="mt-0.5 size-3.5 shrink-0 text-primary"
                          strokeWidth={2}
                        />
                        {h}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[11px] font-medium">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="mt-auto border-t border-border px-5 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    Xem & chỉnh sửa
                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mx-auto mt-10 flex max-w-2xl items-start gap-3 rounded-lg border border-border bg-muted/60 px-4 py-3.5 text-left">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">Lưu ý pháp lý:</strong> Đây là mẫu
            tham khảo, không phải tư vấn pháp lý. Với giao dịch quan trọng, hãy tham khảo luật sư
            hoặc công chứng viên trước khi ký.
          </p>
        </div>
      </section>
    </div>
  );
}
