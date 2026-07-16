"""Standalone test script for the Legal RAG pipeline.

Run from the backend directory::

    uv run python tests/test_rag.py

This script:
1. Parses the sample legal Markdown file.
2. Verifies the parser produces correct parent/child documents.
3. Ingests documents into ChromaDB.
4. Runs test queries and prints retrieved articles + metadata.
"""

from __future__ import annotations

import shutil
import sys
import tempfile
from pathlib import Path

# Fix Windows console encoding for Vietnamese text
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure the backend root is on sys.path so ``app.*`` imports work.
_backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_backend_root))

from app.rag.parser import parse_legal_markdown  # noqa: E402
from app.rag.pipeline import ingest_legal_markdown, retrieve  # noqa: E402

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SAMPLE_FILE = _backend_root / "app" / "rag" / "data" / "luat_kinh_doanh_bat_dong_san_2023.md"
TEST_CHROMA_DIR = _backend_root / ".chroma_test"


def _fresh_chroma_dir() -> Path:
    """Isolated writable Chroma dir (avoids readonly checkout artifacts on CI)."""
    return Path(tempfile.mkdtemp(prefix="chroma_test_"))


def _reset_rag_stores(test_chroma_dir: Path) -> None:
    """Point RAG stores at an isolated dir and use deterministic fake embeddings."""
    from langchain_core.embeddings import FakeEmbeddings

    from app.core.config import settings
    import app.rag.embeddings as emb_mod
    import app.rag.retriever as ret_mod

    settings.chroma_persist_dir = str(test_chroma_dir)
    emb_mod._embeddings = FakeEmbeddings(size=1536)
    ret_mod._child_store = None
    ret_mod._parent_store.clear()


def _separator(title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


# ---------------------------------------------------------------------------
# Test 1 — Parser
# ---------------------------------------------------------------------------
def test_parser() -> None:
    _separator("TEST 1: Parser — parse_legal_markdown")

    parents, children = parse_legal_markdown(SAMPLE_FILE)

    print(f"[OK] Parsed {len(parents)} parent articles")
    print(f"[OK] Parsed {len(children)} child clauses\n")

    # Sanity checks
    assert len(parents) > 0, "No parent documents parsed!"
    assert len(children) > 0, "No child documents parsed!"

    # Show first parent
    p = parents[0]
    print(f"--- First parent article ---")
    print(f"  law     : {p.metadata.get('law')}")
    print(f"  chapter : {p.metadata.get('chapter')}")
    print(f"  article : {p.metadata.get('article')}")
    print(f"  doc_id  : {p.metadata.get('doc_id')}")
    print(f"  content : {p.page_content[:120]}...")

    # Show first child
    c = children[0]
    print(f"\n--- First child clause ---")
    print(f"  parent_id : {c.metadata.get('parent_id')}")
    print(f"  clause    : {c.metadata.get('clause')}")
    print(f"  content   : {c.page_content[:120]}...")

    # Verify parent-child link
    assert c.metadata["parent_id"] == p.metadata["doc_id"], \
        "First child's parent_id does not match first parent's doc_id!"
    
    # Assert ID stability
    assert "luat_kinh_doanh_bat_dong_san_2023" in p.metadata["doc_id"], "Parent doc_id must contain law ID"
    assert p.metadata["article"], "Parent metadata must include article title"
    assert c.metadata["doc_id"] == f"{p.metadata['doc_id']}_clause_1", "Child doc_id must be derived stably"
    
    print("\n[OK] Parent-child link and stable IDs verified!")


# ---------------------------------------------------------------------------
# Test 2 — Ingest + Retrieve
# ---------------------------------------------------------------------------
def test_ingest_and_retrieve() -> None:
    _separator("TEST 2: Ingest + Retrieve pipeline")

    # Use a separate chroma dir for testing
    test_chroma_dir = _fresh_chroma_dir()
    _reset_rag_stores(test_chroma_dir)

    # Ingest
    counts = ingest_legal_markdown(SAMPLE_FILE)
    print(f"[OK] Ingested: {counts}")

    # Queries
    test_queries = [
        "Phạm vi điều chỉnh của luật kinh doanh bất động sản gồm những gì?",
        "Điều kiện để cá nhân kinh doanh bất động sản là gì?",
        "Những hành vi nào bị cấm trong kinh doanh bất động sản?",
    ]

    for q in test_queries:
        print(f"\n>> Query: {q}")
        results = retrieve(q, rerank_top_n=3)

        if not results:
            print("  [WARN] No results returned!")
            continue

        for i, doc in enumerate(results, 1):
            meta = doc.metadata
            print(f"  [{i}] {meta.get('article', 'N/A')} "
                  f"({meta.get('chapter', 'N/A')})")
            # Show first 100 chars of content
            preview = doc.page_content[:100].replace("\n", " ")
            print(f"      -> {preview}...")

    # Cleanup — release ChromaDB connection before deleting
    import app.rag.retriever as ret_mod
    ret_mod._child_store = None
    if ret_mod._parent_store._conn:
        try:
            ret_mod._parent_store._conn.close()
        except Exception:
            pass
    ret_mod._parent_store._conn = None
    ret_mod._parent_store._db_path = None

    import gc
    gc.collect()

    if test_chroma_dir.exists():
        try:
            shutil.rmtree(test_chroma_dir)
            print(f"\n[OK] Test chroma data cleaned up.")
        except PermissionError:
            print(f"\n[WARN] Could not delete {test_chroma_dir} (file locked).")


# ---------------------------------------------------------------------------
# Test 3 — Ingestion Deduplication + Database Persistence
# ---------------------------------------------------------------------------
def test_deduplication_and_persistence() -> None:
    _separator("TEST 3: Ingestion Deduplication + Database Persistence")

    test_chroma_dir = _fresh_chroma_dir()
    _reset_rag_stores(test_chroma_dir)
    import app.rag.retriever as ret_mod

    # First ingestion
    counts1 = ingest_legal_markdown(SAMPLE_FILE)
    print(f"[OK] First Ingest: {counts1}")
    
    first_parent_count = len(ret_mod._parent_store)
    first_child_count = ret_mod.get_vector_store()._collection.count()
    assert first_parent_count > 0, "No parents in store!"
    assert first_child_count > 0, "No children in ChromaDB!"

    # Second ingestion of the same file
    counts2 = ingest_legal_markdown(SAMPLE_FILE)
    print(f"[OK] Second Ingest (Duplicate): {counts2}")
    
    second_parent_count = len(ret_mod._parent_store)
    second_child_count = ret_mod.get_vector_store()._collection.count()
    
    assert second_parent_count == first_parent_count, \
        f"Deduplication failed for parents: {second_parent_count} vs {first_parent_count}"
    assert second_child_count == first_child_count, \
        f"Deduplication failed for children in ChromaDB: {second_child_count} vs {first_child_count}"
    print("[OK] Deduplication verified (no extra documents added)!")

    # Test persistence after reloading/restarting store (clearing singleton connections/caches but keeping database files)
    # We close connection and clear the in-memory singleton
    ret_mod._child_store = None
    if ret_mod._parent_store._conn:
        ret_mod._parent_store._conn.close()
    ret_mod._parent_store._conn = None
    ret_mod._parent_store._db_path = None

    # Now retrieval should still work because SQLite loads from disk
    results = retrieve("Phạm vi điều chỉnh của luật kinh doanh bất động sản", rerank_top_n=1)
    assert len(results) > 0, "Failed to retrieve documents after restarting parent store connection!"
    assert results[0].metadata.get("doc_type") == "parent", "Retrieved document is not parent document!"
    print(f"[OK] Persistence verified! Retrieved: {results[0].metadata.get('article')}")

    # Cleanup
    ret_mod._child_store = None
    if ret_mod._parent_store._conn:
        try:
            ret_mod._parent_store._conn.close()
        except Exception:
            pass
    ret_mod._parent_store._conn = None
    ret_mod._parent_store._db_path = None

    import gc
    gc.collect()
    if test_chroma_dir.exists():
        try:
            shutil.rmtree(test_chroma_dir)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Test 4 — Retrieval does not trigger ingestion/parsing
# ---------------------------------------------------------------------------
def test_retrieval_does_not_ingest() -> None:
    _separator("TEST 4: Retrieval does not trigger ingestion/parsing")

    from unittest.mock import patch
    with patch("app.rag.pipeline.parse_legal_markdown") as mock_parse, \
         patch("app.rag.pipeline.add_parent_child_documents") as mock_add:
        results = retrieve("Phạm vi điều chỉnh của luật kinh doanh bất động sản", rerank_top_n=1)
        mock_parse.assert_not_called()
        mock_add.assert_not_called()
        print("[OK] Retrieval verified (no parsing or ingestion triggered during query)!")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=== Legal RAG Pipeline - Test Suite ===")
    print(f"    Sample file: {SAMPLE_FILE}")

    if not SAMPLE_FILE.exists():
        print(f"\n[FAIL] Sample file not found: {SAMPLE_FILE}")
        sys.exit(1)

    test_parser()
    test_ingest_and_retrieve()
    test_deduplication_and_persistence()
    test_retrieval_does_not_ingest()

    _separator("ALL TESTS PASSED")

