"""Persistent BM25 index for parent legal documents."""

from __future__ import annotations

import logging
import pickle
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from langchain_core.documents import Document

from app.core.config import settings

logger = logging.getLogger(__name__)

_TOKEN_RE = re.compile(r"[\w]+", re.UNICODE)
_bm25_index: "BM25Index | None" = None


def _index_path() -> Path:
    return Path(settings.chroma_persist_dir) / "bm25_parent_index.pkl"


def _normalize(text: str) -> str:
    text = text.lower().replace("đ", "d")
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def tokenize(text: str) -> list[str]:
    """Tokenize Vietnamese legal text for keyword search."""
    normalized = _normalize(text)
    return [token for token in _TOKEN_RE.findall(normalized) if token]


@dataclass
class BM25Index:
    """Serializable BM25 index over parent documents."""

    doc_ids: list[str]
    documents: list[Document]
    tokenized_corpus: list[list[str]]
    bm25: Any

    @classmethod
    def build(cls, items: list[tuple[str, Document]]) -> "BM25Index":
        try:
            from rank_bm25 import BM25Okapi
        except ImportError as exc:
            raise RuntimeError(
                "rank-bm25 is required for hybrid search. "
                "Install dependencies with `uv sync` or `uv add rank-bm25`."
            ) from exc

        doc_ids = [doc_id for doc_id, _ in items]
        documents = [
            Document(page_content=doc.page_content, metadata=dict(doc.metadata))
            for _, doc in items
        ]
        tokenized_corpus = [tokenize(doc.page_content) for doc in documents]
        bm25 = BM25Okapi(tokenized_corpus or [[]])
        return cls(
            doc_ids=doc_ids,
            documents=documents,
            tokenized_corpus=tokenized_corpus,
            bm25=bm25,
        )

    def search(self, query: str, *, top_k: int) -> list[tuple[Document, float]]:
        if not self.documents:
            return []

        scores = self.bm25.get_scores(tokenize(query))
        ranked = sorted(
            ((idx, float(score)) for idx, score in enumerate(scores)),
            key=lambda item: item[1],
            reverse=True,
        )

        results: list[tuple[Document, float]] = []
        for idx, score in ranked[:top_k]:
            if score <= 0:
                continue
            doc = self.documents[idx]
            results.append(
                (Document(page_content=doc.page_content, metadata=dict(doc.metadata)), score)
            )
        return results

    def save(self) -> None:
        path = _index_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("wb") as fh:
            pickle.dump(self, fh)


def build_bm25_index(parent_store: Any) -> BM25Index:
    """Build and persist BM25 from all parent documents in the parent store."""
    global _bm25_index
    items = parent_store.items()
    index = BM25Index.build(items)
    index.save()
    _bm25_index = index
    logger.info("BM25 index built with %d parent documents", len(items))
    return index


def get_bm25_index(parent_store: Any | None = None) -> BM25Index | None:
    """Load the persisted BM25 index, rebuilding from parent_store if needed."""
    global _bm25_index
    if _bm25_index is not None:
        return _bm25_index

    path = _index_path()
    if path.exists():
        try:
            with path.open("rb") as fh:
                _bm25_index = pickle.load(fh)
            return _bm25_index
        except Exception:
            logger.exception("Could not load BM25 index; rebuilding if possible")

    if parent_store is None:
        return None

    try:
        if len(parent_store) == 0:
            return None
        return build_bm25_index(parent_store)
    except Exception:
        logger.exception("Could not build BM25 index")
        return None


def clear_bm25_index() -> None:
    """Remove the persisted BM25 index and clear the in-process singleton."""
    global _bm25_index
    _bm25_index = None
    path = _index_path()
    if path.exists():
        path.unlink()
