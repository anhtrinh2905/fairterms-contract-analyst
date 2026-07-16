"""Registry of legal source documents — serve full text and metadata.

Read-only companion to the RAG pipeline: scans ``app/rag/data/*.md`` once,
parses YAML frontmatter, and resolves a document by its stable frontmatter
``id`` or by its filename stem (the ``source_file`` seen in citations).
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.rag.parser import _extract_frontmatter

DATA_DIR = Path(__file__).resolve().parent / "data"


@dataclass(frozen=True)
class LegalDocumentInfo:
    doc_id: str
    source_file: str
    title: str
    so_hieu: str | None = None
    loai_van_ban: str | None = None
    co_quan_ban_hanh: str | None = None
    ngay_ban_hanh: str | None = None
    ngay_hieu_luc: str | None = None
    trang_thai: str | None = None
    linh_vuc: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class LegalDocumentNotFoundError(KeyError):
    status_code = 404


def _opt_str(value: Any) -> str | None:
    return None if value is None else str(value)


def _info_from_file(path: Path) -> LegalDocumentInfo:
    frontmatter, _ = _extract_frontmatter(path.read_text(encoding="utf-8"))
    return LegalDocumentInfo(
        doc_id=str(frontmatter.get("id") or path.stem),
        source_file=path.name,
        title=str(frontmatter.get("title") or path.stem),
        so_hieu=_opt_str(frontmatter.get("so_hieu")),
        loai_van_ban=_opt_str(frontmatter.get("loai_van_ban")),
        co_quan_ban_hanh=_opt_str(frontmatter.get("co_quan_ban_hanh")),
        ngay_ban_hanh=_opt_str(frontmatter.get("ngay_ban_hanh")),
        ngay_hieu_luc=_opt_str(frontmatter.get("ngay_hieu_luc")),
        trang_thai=_opt_str(frontmatter.get("trang_thai")),
        linh_vuc=_opt_str(frontmatter.get("linh_vuc")),
    )


@lru_cache(maxsize=1)
def _registry() -> dict[str, tuple[LegalDocumentInfo, Path]]:
    """Map both frontmatter id and filename stem to (info, path).

    Lookup keys are fixed at startup scan time — a raw ``doc_id`` from the
    URL is only ever used as a dict key, never joined into a filesystem path.
    """
    registry: dict[str, tuple[LegalDocumentInfo, Path]] = {}
    for path in sorted(DATA_DIR.glob("*.md")):
        info = _info_from_file(path)
        registry.setdefault(info.doc_id, (info, path))
        registry.setdefault(path.stem, (info, path))
    return registry


def list_documents() -> list[LegalDocumentInfo]:
    seen: set[str] = set()
    documents: list[LegalDocumentInfo] = []
    for info, _ in _registry().values():
        if info.doc_id in seen:
            continue
        seen.add(info.doc_id)
        documents.append(info)
    return sorted(documents, key=lambda d: d.title)


def _lookup(doc_id: str) -> tuple[LegalDocumentInfo, Path]:
    entry = _registry().get(doc_id)
    if entry is None:
        raise LegalDocumentNotFoundError(f"Không tìm thấy văn bản: {doc_id}")
    return entry


def get_document(doc_id: str) -> tuple[LegalDocumentInfo, str]:
    """Return (info, markdown body without frontmatter) for *doc_id*."""
    info, path = _lookup(doc_id)
    _, body = _extract_frontmatter(path.read_text(encoding="utf-8"))
    return info, body.strip()


def get_document_path(doc_id: str) -> tuple[LegalDocumentInfo, Path]:
    return _lookup(doc_id)
