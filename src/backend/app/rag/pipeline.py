"""RAG pipeline: ingest legal Markdown and retrieve relevant articles."""

from __future__ import annotations

import logging
from pathlib import Path

from langchain_core.documents import Document

from app.rag.parser import parse_legal_markdown
from app.rag.retriever import (
    add_parent_child_documents,
    retrieve_hybrid,
)

logger = logging.getLogger(__name__)


def ingest_legal_markdown(filepath: str | Path) -> dict[str, int]:
    """Parse and index a legal Markdown file.

    Returns a dict with counts::

        {"parents": 7, "children": 18}
    """
    filepath = Path(filepath)
    logger.info("Ingesting %s", filepath.name)

    parents, children = parse_legal_markdown(filepath)
    n_children = add_parent_child_documents(parents, children)

    logger.info(
        "Indexed %d parent articles, %d child clauses from %s",
        len(parents),
        n_children,
        filepath.name,
    )
    return {"parents": len(parents), "children": n_children}


def retrieve(
    query: str,
    *,
    top_k: int = 10,
    rerank_top_n: int = 5,
    hybrid: bool = True,
) -> list[Document]:
    """Retrieve the most relevant legal articles for *query*.

    Hybrid vector + BM25 search on child clauses, resolved to parent articles.
    """
    logger.info("Retrieval query top_k=%d", top_k)
    parent_docs = retrieve_hybrid(query, top_k=top_k, hybrid=hybrid)
    return parent_docs[:rerank_top_n]
