#!/usr/bin/env python
"""CLI tool to ingest Vietnamese legal Markdown files into HopDongAI Legal RAG.

Usage:
    uv run python scripts/ingest.py <file_or_directory_path>
"""

import argparse
import logging
import shutil
import sys
from pathlib import Path

# Ensure backend root is on sys.path
_backend_root = Path(__file__).resolve().parent.parent
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("ingest_cli")


def _clear_index() -> None:
    import app.rag.retriever as ret_mod
    from app.core.config import settings
    from app.rag.bm25_index import clear_bm25_index

    ret_mod._child_store = None
    if ret_mod._parent_store._conn:
        try:
            ret_mod._parent_store._conn.close()
        except Exception:
            pass
    ret_mod._parent_store._conn = None
    ret_mod._parent_store._db_path = None
    clear_bm25_index()

    index_dir = Path(settings.chroma_persist_dir).resolve()
    if index_dir.exists():
        shutil.rmtree(index_dir)
        logger.info("Cleared RAG index directory: %s", index_dir)
    else:
        logger.info("RAG index directory does not exist: %s", index_dir)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest Vietnamese legal Markdown files into RAG stores."
    )
    parser.add_argument(
        "path",
        type=str,
        nargs="?",
        default=str(_backend_root / "app" / "rag" / "data"),
        help="Path to a single Markdown file or directory. Defaults to app/rag/data.",
    )
    parser.add_argument(
        "--rebuild",
        action="store_true",
        help="Clear the old index before ingesting.",
    )
    parser.add_argument("--clear", action="store_true", help="Clear the index and exit.")
    args = parser.parse_args()

    if args.clear or args.rebuild:
        _clear_index()
        if args.clear:
            return

    input_path = Path(args.path)
    if not input_path.exists():
        logger.error("Path does not exist: %s", input_path)
        sys.exit(1)

    from app.rag.pipeline import ingest_legal_markdown

    files_to_ingest: list[Path] = []
    if input_path.is_file():
        if input_path.suffix.lower() == ".md":
            files_to_ingest.append(input_path)
        else:
            logger.error("File is not a Markdown file (.md): %s", input_path)
            sys.exit(1)
    elif input_path.is_dir():
        # Skip any _archive/ folders — they hold superseded or non-normative
        # documents (old OCR attempts, contract-template appendices) that must
        # never enter the citation index.
        files_to_ingest.extend(
            p
            for p in input_path.glob("**/*.md")
            if not any(part.startswith("_") for part in p.parts)
        )
        if not files_to_ingest:
            logger.warning("No Markdown files (.md) found in directory: %s", input_path)
            sys.exit(0)
    else:
        logger.error("Invalid path type: %s", input_path)
        sys.exit(1)

    logger.info("Starting ingestion of %d files...", len(files_to_ingest))
    total_parents = 0
    total_children = 0
    failed_files = 0

    for filepath in files_to_ingest:
        try:
            logger.info("Processing file: %s", filepath)
            counts = ingest_legal_markdown(filepath)
            total_parents += counts.get("parents", 0)
            total_children += counts.get("children", 0)
        except Exception as e:
            failed_files += 1
            logger.exception("Failed to ingest file %s: %s", filepath, e)

    from app.rag.bm25_index import build_bm25_index
    from app.rag.retriever import get_parent_store

    try:
        build_bm25_index(get_parent_store())
    except Exception as e:
        logger.warning("Could not build BM25 index at end of ingestion: %s", e)

    logger.info("Ingestion CLI finished.")
    logger.info("Files attempted: %d", len(files_to_ingest))
    logger.info("Files failed: %d", failed_files)
    logger.info("Total parents indexed: %d", total_parents)
    logger.info("Total children indexed: %d", total_children)


if __name__ == "__main__":
    main()
