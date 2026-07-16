"use client";

import { useEffect, useState } from "react";
import { BackendApiError, getLegalDocument, legalDocumentDownloadUrl } from "@/lib/api/client";
import type { LegalDocumentContent } from "@/lib/api/types";
import {
  findArticleAnchor,
  parseLegalMarkdown,
  type LegalArticle,
  type ParsedLegalDoc,
} from "../parse";

const DISCLAIMER =
  "Văn bản hiển thị phục vụ tra cứu và rà soát sơ bộ, có thể khác biệt về trình bày so với bản công bố chính thức. " +
  "Vui lòng đối chiếu bản chính thức trên Công báo hoặc Cơ sở dữ liệu quốc gia về văn bản pháp luật (vbpl.vn). " +
  "Sản phẩm không thay thế tư vấn pháp lý từ luật sư.";

function sanitizeDieu(value: string | null): string | null {
  const trimmed = (value ?? "").trim().toLowerCase();
  return /^\d+[a-z]?$/.test(trimmed) ? trimmed : null;
}

function sanitizeKhoan(value: string | null): string | null {
  const trimmed = (value ?? "").trim();
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

function ArticleBlock({
  article,
  isTarget,
  khoan,
}: {
  article: LegalArticle;
  isTarget: boolean;
  khoan: string | null;
}) {
  return (
    <article id={article.anchorId} className={isTarget ? "vb-article vb-target" : "vb-article"}>
      <h3 className="vb-article-heading">
        {article.heading}
        <a className="vb-anchor no-print" href={`#${article.anchorId}`} title="Liên kết tới điều này">
          #
        </a>
      </h3>
      {article.lines.map((line, i) => {
        const isTargetKhoan = isTarget && khoan !== null && line.startsWith(`${khoan}. `);
        return (
          <p key={i} className={isTargetKhoan ? "vb-line vb-khoan-target" : "vb-line"}>
            {line}
          </p>
        );
      })}
    </article>
  );
}

function Toc({ parsed }: { parsed: ParsedLegalDoc }) {
  return (
    <nav className="vb-toc no-print" aria-label="Mục lục">
      <div className="vb-toc-title">Mục lục</div>
      {parsed.chapters.map((chapter) => (
        <div key={chapter.anchorId} className="vb-toc-chapter">
          {chapter.heading ? (
            <a href={`#${chapter.anchorId}`} className="vb-toc-chapter-link">
              {chapter.heading}
              {chapter.introLines[0] ? ` — ${chapter.introLines[0]}` : ""}
            </a>
          ) : null}
          <div className="vb-toc-articles">
            {chapter.articles.map((article) =>
              article.dieuNum ? (
                <a
                  key={article.anchorId}
                  href={`#${article.anchorId}`}
                  className="vb-toc-dieu"
                  title={article.heading}
                >
                  {article.dieuNum}
                </a>
              ) : null,
            )}
          </div>
        </div>
      ))}
    </nav>
  );
}

function LoadingState() {
  return (
    <div className="vb-root">
      <div className="vb-error">
        <h1>Đang tải văn bản…</h1>
      </div>
    </div>
  );
}

function NotFoundState({ docId }: { docId: string }) {
  return (
    <div className="vb-root">
      <div className="vb-error">
        <h1>Không tìm thấy văn bản</h1>
        <p>Không có văn bản pháp luật nào với mã &quot;{docId}&quot; trong kho dữ liệu.</p>
      </div>
    </div>
  );
}

function BackendErrorState() {
  return (
    <div className="vb-root">
      <div className="vb-error">
        <h1>Không tải được văn bản</h1>
        <p>Hệ thống tra cứu văn bản đang tạm gián đoạn. Vui lòng thử lại sau ít phút.</p>
      </div>
    </div>
  );
}

export default function VanBanView({
  docId,
  dieuParam,
  khoanParam,
}: {
  docId: string;
  dieuParam: string | null;
  khoanParam: string | null;
}) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "not-found" } | { status: "error" } | { status: "ready"; doc: LegalDocumentContent }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getLegalDocument(docId)
      .then((doc) => {
        if (!cancelled) setState({ status: "ready", doc });
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof BackendApiError && error.status === 404) {
          setState({ status: "not-found" });
        } else {
          setState({ status: "error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [docId]);

  useEffect(() => {
    if (state.status !== "ready") return;
    const dieu = sanitizeDieu(dieuParam);
    if (!dieu) return;
    const parsed = parseLegalMarkdown(state.doc.content);
    const targetId = findArticleAnchor(parsed, dieu);
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ block: "start" });
  }, [state, dieuParam]);

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "not-found") return <NotFoundState docId={docId} />;
  if (state.status === "error") return <BackendErrorState />;

  const { doc } = state;
  const parsed = parseLegalMarkdown(doc.content);
  const dieu = sanitizeDieu(dieuParam);
  const khoan = sanitizeKhoan(khoanParam);
  const targetId = dieu ? findArticleAnchor(parsed, dieu) : null;

  return (
    <div className="vb-root">
      <header className="vb-header no-print">
        <div className="vb-header-inner">
          <div className="vb-title-block">
            <div className="vb-kicker">
              {doc.loai_van_ban || "Văn bản pháp luật"}
              {doc.co_quan_ban_hanh ? ` · ${doc.co_quan_ban_hanh}` : ""}
            </div>
            <h1 className="vb-title">{doc.title}</h1>
            <div className="vb-meta">
              {doc.so_hieu ? <span className="vb-chip">Số hiệu: {doc.so_hieu}</span> : null}
              {doc.trang_thai ? (
                <span
                  className={
                    doc.trang_thai.toLowerCase().includes("hiệu lực") &&
                    !doc.trang_thai.toLowerCase().includes("hết")
                      ? "vb-chip vb-chip-ok"
                      : "vb-chip vb-chip-warn"
                  }
                >
                  {doc.trang_thai}
                </span>
              ) : null}
              {doc.ngay_hieu_luc ? (
                <span className="vb-chip">Hiệu lực từ: {doc.ngay_hieu_luc}</span>
              ) : null}
            </div>
          </div>
          <div className="vb-actions">
            <a className="vb-btn" href={legalDocumentDownloadUrl(doc.doc_id)} download>
              Tải xuống PDF
            </a>
          </div>
        </div>
      </header>

      {dieu && !targetId ? (
        <div className="vb-notice no-print">
          Không tìm thấy Điều {dieu} trong văn bản này — có thể số điều được trích dẫn thuộc văn
          bản khác. Bạn có thể tra cứu bằng mục lục bên dưới.
        </div>
      ) : null}

      <div className="vb-body">
        <Toc parsed={parsed} />
        <main className="vb-content">
          {parsed.lawTitle ? <h2 className="vb-law-title">{parsed.lawTitle}</h2> : null}
          {parsed.preambleLines.map((line, i) => (
            <p key={i} className="vb-line vb-preamble">
              {line}
            </p>
          ))}
          {parsed.chapters.map((chapter) => (
            <section key={chapter.anchorId} id={chapter.anchorId} className="vb-chapter">
              {chapter.heading ? (
                <h2 className="vb-chapter-heading">
                  {chapter.heading}
                  {chapter.introLines.length ? (
                    <span className="vb-chapter-sub">{chapter.introLines.join(" · ")}</span>
                  ) : null}
                </h2>
              ) : null}
              {chapter.articles.map((article) => (
                <ArticleBlock
                  key={article.anchorId}
                  article={article}
                  isTarget={article.anchorId === targetId}
                  khoan={khoan}
                />
              ))}
            </section>
          ))}
          <footer className="vb-disclaimer">{DISCLAIMER}</footer>
        </main>
      </div>
    </div>
  );
}
