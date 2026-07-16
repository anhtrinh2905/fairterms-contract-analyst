"""Citation helpers for legal RAG responses."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from langchain_core.documents import Document


@dataclass
class Citation:
    source_file: str
    law_title: str
    article: str
    clause: str | None
    point: str | None
    quote: str
    location: str
    score: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _compact(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _quote(text: str, *, max_chars: int = 420) -> str:
    text = _compact(text)
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3].rstrip() + "..."


def _location(metadata: dict[str, Any]) -> str:
    parts: list[str] = []
    article = metadata.get("article")
    clause = metadata.get("clause")
    point = metadata.get("point")
    if article:
        parts.append(str(article))
    if clause:
        parts.append(f"Khoan {clause}")
    if point:
        parts.append(f"Diem {point}")
    return ", ".join(parts)


def citation_from_document(doc: Document, *, score: float | None = None) -> Citation:
    metadata = doc.metadata or {}
    raw_source = str(metadata.get("source") or metadata.get("source_file") or "")
    source_file = Path(raw_source).name if raw_source else ""
    doc_score = score if score is not None else metadata.get("_score", 0)

    return Citation(
        source_file=source_file,
        law_title=str(metadata.get("law") or metadata.get("title") or ""),
        article=str(metadata.get("article") or ""),
        clause=str(metadata.get("clause")) if metadata.get("clause") else None,
        point=str(metadata.get("point")) if metadata.get("point") else None,
        quote=_quote(doc.page_content),
        location=_location(metadata),
        score=round(float(doc_score or 0), 4),
    )


def build_citations(docs: list[Document], *, max_citations: int = 5) -> list[Citation]:
    citations: list[Citation] = []
    seen: set[tuple[str, str, str | None, str]] = set()

    for doc in docs:
        citation = citation_from_document(doc)
        key = (
            citation.source_file,
            citation.article,
            citation.clause,
            citation.quote[:120],
        )
        if key in seen:
            continue
        seen.add(key)
        citations.append(citation)
        if len(citations) >= max_citations:
            break

    return citations
