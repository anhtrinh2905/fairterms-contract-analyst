"""Render a legal source document (frontmatter-stripped markdown) to PDF.

Uses PyMuPDF's ``Story`` (HTML/CSS reflow) — no extra dependency, and its
bundled fonts (Noto Serif / Charis SIL) already cover Vietnamese diacritics,
so no system font needs to be installed or referenced.
"""

from __future__ import annotations

import html as html_lib
import io
import re
from functools import lru_cache

import fitz

from app.rag.documents import LegalDocumentInfo, get_document

_RE_H1 = re.compile(r"^#\s+(.+)$")
_RE_H2 = re.compile(r"^##\s+(.+)$")
_RE_H3 = re.compile(r"^###\s+(.+)$")

_CSS = """
body { font-size: 11pt; line-height: 1.5; }
h1 { font-size: 16pt; text-align: center; margin: 0 0 4pt; }
h2 { font-size: 13pt; margin: 16pt 0 4pt; border-top: 0.5pt solid #999; padding-top: 8pt; }
h3 { font-size: 11.5pt; margin: 10pt 0 2pt; }
p { margin: 3pt 0; }
.vb-pdf-meta { text-align: center; font-size: 9.5pt; color: #555; margin-bottom: 14pt; }
.vb-pdf-disclaimer {
  margin-top: 20pt; padding-top: 8pt; border-top: 0.5pt solid #999;
  font-size: 8.5pt; font-style: italic; color: #666;
}
"""

_DISCLAIMER = (
    "Văn bản hiển thị phục vụ tra cứu và rà soát sơ bộ, có thể khác biệt về trình bày so với "
    "bản công bố chính thức. Vui lòng đối chiếu bản chính thức trên Công báo hoặc Cơ sở dữ liệu "
    "quốc gia về văn bản pháp luật (vbpl.vn). Sản phẩm không thay thế tư vấn pháp lý từ luật sư."
)


def _escape(text: str) -> str:
    return html_lib.escape(text, quote=False)


def _meta_line(info: LegalDocumentInfo) -> str | None:
    bits = [
        info.so_hieu,
        info.trang_thai,
        f"Hiệu lực từ {info.ngay_hieu_luc}" if info.ngay_hieu_luc else None,
    ]
    bits = [b for b in bits if b]
    return " · ".join(bits) if bits else None


def _build_html(info: LegalDocumentInfo, content: str) -> str:
    parts: list[str] = []
    meta = _meta_line(info)
    if meta:
        parts.append(f'<p class="vb-pdf-meta">{_escape(meta)}</p>')

    for raw_line in content.split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        if (m := _RE_H3.match(line)) is not None:
            parts.append(f"<h3>{_escape(m.group(1).strip())}</h3>")
        elif (m := _RE_H2.match(line)) is not None:
            parts.append(f"<h2>{_escape(m.group(1).strip())}</h2>")
        elif (m := _RE_H1.match(line)) is not None:
            parts.append(f"<h1>{_escape(m.group(1).strip())}</h1>")
        else:
            parts.append(f"<p>{_escape(line)}</p>")

    parts.append(f'<p class="vb-pdf-disclaimer">{_escape(_DISCLAIMER)}</p>')
    return "\n".join(parts)


def _story_to_pdf_bytes(html: str) -> bytes:
    story = fitz.Story(html=html, user_css=_CSS)
    buffer = io.BytesIO()
    writer = fitz.DocumentWriter(buffer)
    mediabox = fitz.paper_rect("a4")
    where = mediabox + (36, 36, -36, -36)
    more = True
    while more:
        device = writer.begin_page(mediabox)
        more, _ = story.place(where)
        story.draw(device)
        writer.end_page()
    writer.close()
    return buffer.getvalue()


@lru_cache(maxsize=32)
def render_document_pdf(doc_id: str) -> bytes:
    """Render the full legal document identified by *doc_id* to PDF bytes.

    Cached in memory — legal source documents are static repo files, so a
    given ``doc_id`` always produces the same PDF for the process lifetime.
    """
    info, content = get_document(doc_id)
    html = _build_html(info, content)
    return _story_to_pdf_bytes(html)
