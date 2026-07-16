"""Classify uploads and extract text without Gemini when possible."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
import unicodedata
from enum import Enum
from pathlib import Path

class DocumentValidationError(ValueError):
    """Raised when an upload cannot be validated or extracted locally."""


def detect_mime_from_bytes(file_bytes: bytes) -> str | None:
    if file_bytes.startswith(b"%PDF"):
        return "application/pdf"
    if file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if file_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    return None

SCANNED_PAGE_CHAR_THRESHOLD = 100
DOCX_EXTENSIONS = {".docx"}
DOC_EXTENSIONS = {".doc"}
WORD_EXTENSIONS = DOCX_EXTENSIONS | DOC_EXTENSIONS

MIME_BY_EXTENSION = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}
SUPPORTED_EXTENSIONS = set(MIME_BY_EXTENSION)


class DocumentKind(str, Enum):
    IMAGE = "image"
    DIGITAL_PDF = "digital_pdf"
    SCANNED_PDF = "scanned_pdf"
    MIXED_PDF = "mixed_pdf"
    DOCX = "docx"
    DOC = "doc"


def normalize_unicode(text: str) -> str:
    if not text:
        return ""
    return unicodedata.normalize("NFC", text)


def has_meaningful_text(text: str) -> bool:
    cleaned = text.strip()
    if not cleaned:
        return False
    if re.fullmatch(r"\d+", cleaned):
        return False
    letters = re.sub(r"[^\w]", "", cleaned, flags=re.UNICODE)
    return len(letters) >= 10


def is_page_scanned(page) -> bool:
    return len(page.get_text().strip()) < SCANNED_PAGE_CHAR_THRESHOLD


def classify_pdf_pages(document) -> list[bool]:
    return [is_page_scanned(document[index]) for index in range(document.page_count)]


def classify_pdf_kind(document) -> DocumentKind:
    scanned_flags = classify_pdf_pages(document)
    scanned_count = sum(scanned_flags)
    if scanned_count == 0:
        return DocumentKind.DIGITAL_PDF
    if scanned_count == len(scanned_flags):
        return DocumentKind.SCANNED_PDF
    return DocumentKind.MIXED_PDF


def classify_document(file_bytes: bytes, filename: str) -> DocumentKind:
    suffix = Path(filename).suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        return DocumentKind.IMAGE
    if suffix in DOCX_EXTENSIONS:
        return DocumentKind.DOCX
    if suffix in DOC_EXTENSIONS:
        return DocumentKind.DOC
    if suffix == ".pdf":
        try:
            import fitz
        except ImportError as exc:
            raise DocumentValidationError("PDF support is unavailable") from exc
        with fitz.open(stream=file_bytes, filetype="pdf") as document:
            return classify_pdf_kind(document)
    raise DocumentValidationError(
        "Unsupported format. Supported: PDF, DOC, DOCX, PNG, JPG, JPEG."
    )


def extract_pdf_page_text(page) -> str:
    return normalize_unicode(page.get_text("text"))


def plain_text_to_markdown(text: str) -> str:
    lines = [line.rstrip() for line in normalize_unicode(text).splitlines()]
    output: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if output and output[-1] != "":
                output.append("")
            continue
        if re.match(
            r"^(ĐIỀU|Điều|CHƯƠNG|Chương|MỤC|Mục|PHỤ LỤC|Phụ lục)\b",
            stripped,
            flags=re.IGNORECASE,
        ):
            if output and output[-1] != "":
                output.append("")
            output.append(f"## {stripped}")
            continue
        if re.match(r"^#{1,6}\s", stripped):
            output.append(stripped)
            continue
        output.append(stripped)
    markdown = "\n".join(output).strip()
    return re.sub(r"\n{3,}", "\n\n", markdown)


def extract_pdf_markdown(file_bytes: bytes, page_numbers: list[int] | None = None) -> str:
    try:
        import fitz
    except ImportError as exc:
        raise DocumentValidationError("PDF support is unavailable") from exc

    pages_text: list[str] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as document:
        indices = page_numbers if page_numbers is not None else list(range(document.page_count))
        for index in indices:
            if index < 0 or index >= document.page_count:
                continue
            text = extract_pdf_page_text(document[index])
            if has_meaningful_text(text):
                pages_text.append(plain_text_to_markdown(text))
    markdown = "\n\n".join(page for page in pages_text if page.strip()).strip()
    if not markdown:
        raise DocumentValidationError("Could not extract text from PDF")
    return markdown


def _escape_markdown_table_cell(text: str) -> str:
    return text.replace("|", "\\|")


def _docx_table_to_markdown(table) -> str:
    rows: list[list[str]] = []
    for row in table.rows:
        cells = [
            _escape_markdown_table_cell(normalize_unicode(cell.text).strip().replace("\n", " "))
            for cell in row.cells
        ]
        if any(cells):
            rows.append(cells)
    if not rows:
        return ""

    max_cols = max(len(row) for row in rows)
    lines: list[str] = []
    for index, row in enumerate(rows):
        padded = row + [""] * (max_cols - len(row))
        lines.append("| " + " | ".join(padded) + " |")
        if index == 0:
            lines.append("| " + " | ".join("---" for _ in range(max_cols)) + " |")
    return "\n".join(lines)


def _docx_paragraph_to_markdown(paragraph) -> str | None:
    text = normalize_unicode(paragraph.text).strip()
    if not text:
        return None
    style_name = (paragraph.style.name or "").lower() if paragraph.style else ""
    if "heading" in style_name:
        level = 2
        for digit in style_name:
            if digit.isdigit():
                level = min(int(digit), 6)
                break
        return f"{'#' * level} {text}"
    if re.match(
        r"^(ĐIỀU|Điều|CHƯƠNG|Chương|MỤC|Mục|PHỤ LỤC|Phụ lục)\b",
        text,
        flags=re.IGNORECASE,
    ):
        return f"## {text}"
    return text


def _iter_docx_blocks(document):
    from docx.oxml.ns import qn
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    for child in document.element.body:
        if child.tag == qn("w:p"):
            yield Paragraph(child, document)
        elif child.tag == qn("w:tbl"):
            yield Table(child, document)


def extract_docx_markdown(file_bytes: bytes) -> str:
    try:
        from docx import Document
        from docx.table import Table
        from docx.text.paragraph import Paragraph
        from io import BytesIO
    except ImportError as exc:
        raise DocumentValidationError("DOCX support is unavailable") from exc

    document = Document(BytesIO(file_bytes))
    blocks: list[str] = []
    for block in _iter_docx_blocks(document):
        if isinstance(block, Paragraph):
            line = _docx_paragraph_to_markdown(block)
            if line is None:
                if blocks and blocks[-1] != "":
                    blocks.append("")
                continue
            blocks.append(line)
            continue

        if isinstance(block, Table):
            table_md = _docx_table_to_markdown(block)
            if not table_md:
                continue
            if blocks and blocks[-1] != "":
                blocks.append("")
            blocks.append(table_md)
            blocks.append("")

    markdown = "\n".join(blocks).strip()
    if not markdown:
        raise DocumentValidationError("Could not extract text from DOCX")
    return re.sub(r"\n{3,}", "\n\n", markdown)


def resolve_libreoffice_binary() -> str | None:
    configured = os.getenv("LIBREOFFICE_BINARY", "").strip()
    if configured and Path(configured).is_file():
        return configured
    for candidate in ("soffice", "libreoffice", "soffice.exe"):
        found = shutil.which(candidate)
        if found:
            return found
    windows_candidates = [
        Path(r"C:\Program Files\LibreOffice\program\soffice.exe"),
        Path(r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"),
    ]
    for candidate in windows_candidates:
        if candidate.is_file():
            return str(candidate)
    linux_candidates = [
        Path("/usr/bin/soffice"),
        Path("/usr/lib/libreoffice/program/soffice"),
    ]
    for candidate in linux_candidates:
        if candidate.is_file():
            return str(candidate)
    return None


def extract_doc_markdown(file_bytes: bytes) -> str:
    binary = resolve_libreoffice_binary()
    if not binary:
        raise DocumentValidationError(
            "Cannot read .doc files without LibreOffice. "
            "Install LibreOffice or set LIBREOFFICE_BINARY, or upload DOCX instead."
        )

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        source_path = temp_path / "upload.doc"
        source_path.write_bytes(file_bytes)
        result = subprocess.run(
            [
                binary,
                "--headless",
                "--convert-to",
                "docx",
                "--outdir",
                str(temp_path),
                str(source_path),
            ],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        if result.returncode != 0:
            detail = (result.stderr or result.stdout or "conversion failed").strip()
            raise DocumentValidationError(f"Could not convert .doc file: {detail[:200]}")

        converted = temp_path / "upload.docx"
        if not converted.is_file():
            raise DocumentValidationError("LibreOffice did not produce a DOCX output")
        return extract_docx_markdown(converted.read_bytes())


SNIPPET_MAX_CHARS = 4000


def extract_contract_text_snippet(
    file_bytes: bytes,
    filename: str,
    doc_kind: DocumentKind,
    *,
    max_chars: int = SNIPPET_MAX_CHARS,
) -> str:
    """Fast local text sample for contract-kind detection (no Gemini)."""
    try:
        if doc_kind == DocumentKind.DOCX:
            text = extract_docx_markdown(file_bytes)
        elif doc_kind == DocumentKind.DOC:
            text = extract_doc_markdown(file_bytes)
        elif doc_kind == DocumentKind.DIGITAL_PDF:
            text = extract_pdf_markdown(file_bytes, page_numbers=[0])
        elif doc_kind in (DocumentKind.SCANNED_PDF, DocumentKind.MIXED_PDF):
            try:
                import fitz

                with fitz.open(stream=file_bytes, filetype="pdf") as document:
                    if document.page_count == 0:
                        return ""
                    page = document[0]
                    if is_page_scanned(page):
                        return ""
                    text = extract_pdf_page_text(page)
            except Exception:
                return ""
        else:
            return ""
    except DocumentValidationError:
        return ""

    snippet = normalize_unicode(text).strip()
    if len(snippet) > max_chars:
        return snippet[:max_chars]
    return snippet


def validate_contract_upload_extended(
    file_bytes: bytes,
    filename: str,
    content_type: str | None,
    max_upload_bytes: int,
) -> tuple[str, DocumentKind]:
    if not filename:
        raise DocumentValidationError("Upload file name is required")
    if not file_bytes:
        raise DocumentValidationError("Uploaded file is empty")
    if len(file_bytes) > max_upload_bytes:
        raise DocumentValidationError("Uploaded file is too large")

    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise DocumentValidationError(
            "Unsupported format. Supported: PDF, DOC, DOCX, PNG, JPG, JPEG."
        )

    expected_mime = MIME_BY_EXTENSION[suffix]
    declared_mime = (content_type or "").split(";")[0].strip().lower()
    permissive = {"", "application/octet-stream"}
    if suffix in WORD_EXTENSIONS:
        permissive = permissive | {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
            "application/vnd.ms-word",
        }
    if declared_mime not in permissive and declared_mime != expected_mime:
        raise DocumentValidationError(f"Invalid MIME type for {suffix}: expected {expected_mime}")

    detected_mime = detect_mime_from_bytes(file_bytes)
    if suffix == ".docx" and detected_mime is None:
        # DOCX is a zip container; magic-byte detection may not match image/pdf rules.
        if not file_bytes.startswith(b"PK"):
            raise DocumentValidationError("Uploaded file content does not match its extension")
    elif suffix == ".doc":
        if detected_mime not in (None, "application/pdf"):
            # Legacy .doc uses OLE header; allow if not clearly another supported type.
            if detected_mime in {"image/png", "image/jpeg"}:
                raise DocumentValidationError("Uploaded file content does not match its extension")
    elif detected_mime != expected_mime:
        raise DocumentValidationError("Uploaded file content does not match its extension")

    return expected_mime, classify_document(file_bytes, filename)
