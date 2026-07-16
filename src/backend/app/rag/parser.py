"""Hierarchical Markdown parser for Vietnamese legal documents.

Reads Markdown files structured with YAML frontmatter and heading
hierarchy (H1=Law, H2=Chapter, H3=Article) and produces LangChain
Document objects suitable for a Parent-Child RAG retriever.

Usage::

    from app.rag.parser import parse_legal_markdown

    parents, children = parse_legal_markdown(
        "app/rag/data/luat_kinh_doanh_bat_dong_san_2023.md"
    )
"""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Any

import yaml
from langchain_core.documents import Document

# ---------------------------------------------------------------------------
# Regex patterns for Vietnamese legal structure
# ---------------------------------------------------------------------------
_RE_FRONTMATTER = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
_RE_H1 = re.compile(r"^#\s+(.+)$", re.MULTILINE)
_RE_H2 = re.compile(r"^##\s+(.+)$", re.MULTILINE)
_RE_H3 = re.compile(r"^###\s+(.+)$", re.MULTILINE)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    """Return (metadata_dict, body_without_frontmatter)."""
    match = _RE_FRONTMATTER.match(text)
    if match:
        meta = yaml.safe_load(match.group(1)) or {}
        body = text[match.end():]
        return meta, body
    return {}, text


def _split_by_pattern(text: str, pattern: re.Pattern) -> list[tuple[str, str]]:
    """Split *text* at every match of *pattern*.

    Returns a list of (heading_text, body_text) tuples.
    The content before the first match is silently discarded because
    it typically contains only the law title (already captured as H1).
    """
    positions = [(m.start(), m.group(1)) for m in pattern.finditer(text)]
    if not positions:
        return []

    sections: list[tuple[str, str]] = []
    for idx, (start, heading) in enumerate(positions):
        # body runs from end-of-heading-line to next heading (or EOF)
        line_end = text.index("\n", start) + 1 if "\n" in text[start:] else len(text)
        next_start = positions[idx + 1][0] if idx + 1 < len(positions) else len(text)
        body = text[line_end:next_start].strip()
        sections.append((heading.strip(), body))
    return sections


def _split_article_into_clauses(article_body: str) -> list[str]:
    """Split an article body into individual clauses (khoản).

    A clause starts with a line beginning with ``<number>.`` at the
    top indentation level.  Sub-items (a), b), …) stay attached to
    their parent clause.
    """
    lines = article_body.split("\n")
    clauses: list[str] = []
    current: list[str] = []

    for line in lines:
        # Detect a new top-level numbered item (e.g. "1. ...", "2. ...")
        if re.match(r"^\d+\.\s", line.strip()):
            if current:
                clauses.append("\n".join(current).strip())
            current = [line]
        else:
            current.append(line)

    if current:
        clauses.append("\n".join(current).strip())

    # If the article had no numbered clauses, treat whole body as one chunk
    if not clauses and article_body.strip():
        clauses.append(article_body.strip())

    return clauses


def _clean_id(text: str) -> str:
    """Normalize Vietnamese text and remove spaces/special characters to create a stable ID."""
    text = text.lower().replace("đ", "d")
    nfkd_form = unicodedata.normalize('NFKD', text)
    only_ascii = nfkd_form.encode('ASCII', 'ignore').decode('ASCII')
    cleaned = re.sub(r"[^\w\s-]", "", only_ascii).strip().lower()
    return re.sub(r"[-\s]+", "_", cleaned)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_legal_markdown(
    filepath: str | Path,
) -> tuple[list[Document], list[Document]]:
    """Parse a legal Markdown file into parent and child documents.

    Parameters
    ----------
    filepath:
        Path to a ``.md`` file following the project's legal document
        convention (YAML frontmatter + ``# / ## / ###`` headings).

    Returns
    -------
    parents:
        One ``Document`` per **Điều** (Article).  The ``page_content``
        contains the full article text.  ``metadata`` carries
        ``doc_id``, ``law``, ``chapter``, ``article``, and every field
        from the YAML frontmatter.
    children:
        One ``Document`` per **Khoản** (Clause) inside each article.
        ``metadata`` inherits everything from its parent plus a
        ``clause`` field and a ``parent_id`` linking back.
    """
    filepath = Path(filepath)
    raw = filepath.read_text(encoding="utf-8")

    frontmatter, body = _extract_frontmatter(raw)

    # --- Detect law title (H1) -------------------------------------------
    h1_match = _RE_H1.search(body)
    law_title = h1_match.group(1).strip() if h1_match else frontmatter.get("title", filepath.stem)

    # --- Get stable law ID -----------------------------------------------
    law_id = frontmatter.get("id")
    if not law_id:
        law_id = _clean_id(law_title)

    # --- Split into chapters (H2) then articles (H3) ---------------------
    chapters = _split_by_pattern(body, _RE_H2)

    parents: list[Document] = []
    children: list[Document] = []
    seen_parent_ids: dict[str, int] = {}

    for chapter_title, chapter_body in chapters:
        articles = _split_by_pattern(chapter_body, _RE_H3)

        for article_title, article_body in articles:
            base_parent_id = f"{law_id}_{_clean_id(article_title)}"
            seen_parent_ids[base_parent_id] = seen_parent_ids.get(base_parent_id, 0) + 1
            parent_id = base_parent_id
            if seen_parent_ids[base_parent_id] > 1:
                parent_id = f"{base_parent_id}_{seen_parent_ids[base_parent_id]}"

            base_meta = {
                **frontmatter,
                "source": str(filepath),
                "law": law_title,
                "chapter": chapter_title,
                "article": article_title,
                "doc_id": parent_id,
            }

            # Parent = full article
            parent_doc = Document(
                page_content=f"### {article_title}\n\n{article_body}",
                metadata={**base_meta, "doc_type": "parent"},
            )
            parents.append(parent_doc)

            # Children = individual clauses
            clauses = _split_article_into_clauses(article_body)
            for idx, clause_text in enumerate(clauses, start=1):
                child_id = f"{parent_id}_clause_{idx}"
                child_doc = Document(
                    page_content=clause_text,
                    metadata={
                        **base_meta,
                        "doc_type": "child",
                        "parent_id": parent_id,
                        "doc_id": child_id,
                        "clause": idx,
                    },
                )
                children.append(child_doc)

    return parents, children
