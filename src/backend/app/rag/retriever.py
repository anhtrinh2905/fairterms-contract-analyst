"""Parent-Child retriever for Vietnamese legal documents.

This module replaces the original flat vector-store retriever with a
**two-tier** retrieval strategy:

*   **Child vectors** (individual clauses / khoản) are stored in
    ChromaDB for precise semantic search.
*   **Parent documents** (full articles / điều) are stored in an
    in-memory dict-based store keyed by ``doc_id``.

At query time the retriever searches the child vectors, collects
the ``parent_id`` from each hit, and returns the corresponding
full-article parent documents so the LLM receives complete legal
context.
"""

from __future__ import annotations

import json
import logging
import sqlite3
from pathlib import Path
from typing import Iterable

import chromadb
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_core.vectorstores import VectorStoreRetriever

from app.core.config import settings
from app.rag.bm25_index import build_bm25_index, get_bm25_index
from app.rag.embeddings import get_embeddings

logger = logging.getLogger(__name__)


class SQLiteParentStore:
    """Persistent SQLite-backed store for parent documents."""

    def __init__(self) -> None:
        self._db_path: Path | None = None
        self._conn: sqlite3.Connection | None = None

    def _get_conn(self) -> sqlite3.Connection:
        db_dir = Path(settings.chroma_persist_dir)
        db_path = db_dir / "parent_documents.db"

        if self._db_path != db_path or self._conn is None:
            if self._conn:
                try:
                    self._conn.close()
                except Exception:
                    pass
            db_dir.mkdir(parents=True, exist_ok=True)
            self._db_path = db_path
            self._conn = sqlite3.connect(str(db_path), check_same_thread=False)
            self._init_db()
        return self._conn

    def _init_db(self) -> None:
        conn = self._conn
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS parent_documents (
                doc_id TEXT PRIMARY KEY,
                page_content TEXT NOT NULL,
                metadata TEXT NOT NULL
            )
            """
        )
        conn.commit()

    def __setitem__(self, key: str, value: Document) -> None:
        conn = self._get_conn()
        cursor = conn.cursor()
        meta_str = json.dumps(value.metadata, ensure_ascii=False)
        cursor.execute(
            """
            INSERT OR REPLACE INTO parent_documents (doc_id, page_content, metadata)
            VALUES (?, ?, ?)
            """,
            (key, value.page_content, meta_str),
        )
        conn.commit()

    def __getitem__(self, key: str) -> Document:
        doc = self.get(key)
        if doc is None:
            raise KeyError(key)
        return doc

    def get(self, key: str, default: Document | None = None) -> Document | None:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT page_content, metadata FROM parent_documents WHERE doc_id = ?",
            (key,),
        )
        row = cursor.fetchone()
        if row:
            page_content, metadata_json = row
            metadata = json.loads(metadata_json)
            return Document(page_content=page_content, metadata=metadata)
        return default

    def __contains__(self, key: str) -> bool:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT 1 FROM parent_documents WHERE doc_id = ?",
            (key,),
        )
        return cursor.fetchone() is not None

    def clear(self) -> None:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM parent_documents")
        conn.commit()

    def __len__(self) -> int:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM parent_documents")
        row = cursor.fetchone()
        return row[0] if row else 0

    def keys(self) -> list[str]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT doc_id FROM parent_documents")
        return [row[0] for row in cursor.fetchall()]

    def values(self) -> list[Document]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT page_content, metadata FROM parent_documents")
        res = []
        for row in cursor.fetchall():
            page_content, metadata_json = row
            metadata = json.loads(metadata_json)
            res.append(Document(page_content=page_content, metadata=metadata))
        return res

    def items(self) -> list[tuple[str, Document]]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT doc_id, page_content, metadata FROM parent_documents")
        res = []
        for row in cursor.fetchall():
            doc_id, page_content, metadata_json = row
            metadata = json.loads(metadata_json)
            res.append((doc_id, Document(page_content=page_content, metadata=metadata)))
        return res


# ---------------------------------------------------------------------------
# Singleton stores
# ---------------------------------------------------------------------------
_child_store: Chroma | None = None
_parent_store = SQLiteParentStore()


def get_vector_store() -> Chroma:
    """Return the ChromaDB vector store that holds **child** chunks."""
    global _child_store
    if _child_store is None:
        client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        _child_store = Chroma(
            client=client,
            collection_name=settings.chroma_collection,
            embedding_function=get_embeddings(),
        )
    return _child_store


def get_parent_store() -> SQLiteParentStore:
    """Return the persistent parent document store."""
    return _parent_store


def is_knowledge_base_indexed() -> bool:
    """Check if the knowledge base has been indexed."""
    parent_store = get_parent_store()
    try:
        vector_store = get_vector_store()
        child_count = vector_store._collection.count()
    except Exception as e:
        logger.error("Error checking child vector count: %s", e)
        child_count = 0
    parent_count = len(parent_store)
    return parent_count > 0 and child_count > 0


# ---------------------------------------------------------------------------
# Ingestion helpers
# ---------------------------------------------------------------------------

def add_parent_child_documents(
    parents: list[Document],
    children: list[Document],
) -> int:
    """Index parent and child documents into their respective stores.

    Parents go into SQLite parent store.
    Children go into ChromaDB for vector search.

    Returns the number of child chunks indexed.
    """
    logger.info("Ingest started")
    if not parents and not children:
        logger.info("No documents to index")
        return 0

    # Check parent duplicates
    skipped_parents = 0
    for doc in parents:
        doc_id = doc.metadata.get("doc_id")
        if doc_id and doc_id in _parent_store:
            skipped_parents += 1

    # Check child duplicates
    skipped_children = 0
    store = get_vector_store()
    child_ids = [c.metadata.get("doc_id") for c in children if c.metadata.get("doc_id")]
    if child_ids:
        try:
            existing = store.get(ids=child_ids)
            if existing and "ids" in existing:
                skipped_children = len(existing["ids"])
        except Exception as e:
            logger.debug("Could not check duplicate child docs in Chroma: %s", e)

    skipped_duplicates = skipped_parents + skipped_children

    # Store parents
    for doc in parents:
        doc_id = doc.metadata.get("doc_id")
        if doc_id:
            _parent_store[doc_id] = doc

    # Store children in vector DB with stable IDs
    if children:
        if child_ids:
            try:
                store.delete(ids=child_ids)
            except Exception as e:
                logger.debug("Could not delete existing child docs from Chroma: %s", e)

        store.add_documents(children, ids=child_ids)
    try:
        build_bm25_index(_parent_store)
    except Exception as e:
        logger.warning("Could not rebuild BM25 index after ingestion: %s", e)

    logger.info("Number of parents indexed: %d", len(parents))
    logger.info("Number of children indexed: %d", len(children))
    logger.info("Skipped duplicates: %d", skipped_duplicates)
    
    return len(children)



# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------

def _copy_with_score(
    doc: Document,
    *,
    score: float,
    retrieval_method: str,
    extra: dict | None = None,
) -> Document:
    metadata = dict(doc.metadata)
    metadata["_score"] = float(score)
    metadata["_retrieval_method"] = retrieval_method
    if extra:
        metadata.update(extra)
    return Document(page_content=doc.page_content, metadata=metadata)


def _normalize_distance(distance: float) -> float:
    try:
        distance = float(distance)
    except (TypeError, ValueError):
        return 0.0
    return 1.0 / (1.0 + max(distance, 0.0))


def _vector_child_hits(query: str, *, top_k: int) -> list[tuple[Document, float]]:
    store = get_vector_store()
    try:
        return [
            (doc, _normalize_distance(distance))
            for doc, distance in store.similarity_search_with_score(query, k=top_k)
        ]
    except Exception as e:
        logger.debug("Vector distance search failed; falling back to relevance scores: %s", e)

    try:
        return [
            (doc, max(0.0, min(1.0, float(score))))
            for doc, score in store.similarity_search_with_relevance_scores(query, k=top_k)
        ]
    except Exception:
        logger.exception("Vector search failed")
        return []


def _doc_key(doc: Document) -> str:
    metadata = doc.metadata or {}
    return str(metadata.get("doc_id") or metadata.get("parent_id") or hash(doc.page_content))


def _rrf_score(rank: int, *, k: int = 60) -> float:
    return 1.0 / (k + rank)


def _max_score(scores: Iterable[float]) -> float:
    values = [float(s) for s in scores]
    return max(values) if values else 0.0


def get_retriever() -> VectorStoreRetriever:
    """Return a basic child-vector retriever.

    This is still useful for components that need a standard
    LangChain retriever interface.  For parent-child retrieval
    use :func:`retrieve_with_parents` instead.
    """
    return get_vector_store().as_retriever(
        search_kwargs={"k": settings.top_k},
    )


def retrieve_with_parents(
    query: str,
    *,
    top_k: int | None = None,
) -> list[Document]:
    """Retrieve parent documents relevant to *query*.

    1. Search child vectors in ChromaDB (top *k* hits).
    2. Collect unique ``parent_id`` values from the children.
    3. Return the corresponding full-article parent documents.

    If a child has no ``parent_id`` or the parent is missing from the
    store (e.g. not yet ingested), the child document itself is
    returned as a fallback.
    """
    k = top_k or settings.top_k
    logger.info("Retrieving documents for query, top_k=%d", k)
    child_hits = _vector_child_hits(query, top_k=k)

    seen_parent_ids: set[str] = set()
    results: list[Document] = []

    for child, score in child_hits:
        pid = child.metadata.get("parent_id")
        if pid and pid not in seen_parent_ids:
            seen_parent_ids.add(pid)
            parent = _parent_store.get(pid)
            source_doc = parent if parent else child
            results.append(
                _copy_with_score(
                    source_doc,
                    score=score,
                    retrieval_method="vector",
                    extra={"_vector_score": score},
                )
            )
        elif not pid:
            # No parent link – return child as-is (backwards compat)
            results.append(
                _copy_with_score(
                    child,
                    score=score,
                    retrieval_method="vector",
                    extra={"_vector_score": score},
                )
            )

    return results


def retrieve_hybrid(
    query: str,
    *,
    top_k: int | None = None,
    hybrid: bool = True,
) -> list[Document]:
    """Retrieve parent documents with vector search plus BM25 via RRF."""
    k = top_k or settings.top_k
    # Fuse over a deeper pool than the final k: with only k candidates per
    # branch, child-hit dedup and RRF leave the right article no room to
    # surface when the branches disagree (common on a multi-law corpus).
    pool = max(k * 4, 20)
    vector_docs = retrieve_with_parents(query, top_k=pool)
    if not hybrid:
        return vector_docs[:k]

    bm25_index = get_bm25_index(_parent_store)
    if bm25_index is None:
        logger.info("BM25 index unavailable; returning vector-only results")
        return vector_docs[:k]

    bm25_hits = bm25_index.search(query, top_k=pool)
    if not bm25_hits:
        return vector_docs[:k]

    fused: dict[str, dict] = {}

    for rank, doc in enumerate(vector_docs, start=1):
        key = _doc_key(doc)
        fused.setdefault(key, {"doc": doc, "rrf": 0.0, "vector": 0.0, "bm25": 0.0})
        fused[key]["rrf"] += _rrf_score(rank)
        fused[key]["vector"] = max(
            fused[key]["vector"],
            float(doc.metadata.get("_score", 0)),
        )

    max_bm25 = _max_score(score for _, score in bm25_hits)
    for rank, (doc, raw_score) in enumerate(bm25_hits, start=1):
        key = _doc_key(doc)
        normalized_bm25 = (raw_score / max_bm25) if max_bm25 else 0.0
        fused.setdefault(key, {"doc": doc, "rrf": 0.0, "vector": 0.0, "bm25": 0.0})
        fused[key]["rrf"] += _rrf_score(rank)
        fused[key]["bm25"] = max(fused[key]["bm25"], normalized_bm25)

    ranked = sorted(fused.values(), key=lambda item: item["rrf"], reverse=True)
    max_rrf = _max_score(item["rrf"] for item in ranked)

    results: list[Document] = []
    for item in ranked[:k]:
        score = (item["rrf"] / max_rrf) if max_rrf else 0.0
        results.append(
            _copy_with_score(
                item["doc"],
                score=score,
                retrieval_method="hybrid",
                extra={
                    "_vector_score": item["vector"],
                    "_bm25_score": item["bm25"],
                    "_rrf_score": item["rrf"],
                },
            )
        )

    return results
