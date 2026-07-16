import logging
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.middleware import RequestLoggingMiddleware
from app.core.logging import setup_logging
from app.services.langsmith_tracing import configure_langsmith

setup_logging()
configure_langsmith()

from app.api.routes import admin, agent, checklist, ocr, rag

logger = logging.getLogger(__name__)


def _startup_knowledge_base() -> None:
    from app.rag.pipeline import ingest_legal_markdown
    from app.rag.retriever import get_parent_store, get_vector_store, is_knowledge_base_indexed

    if is_knowledge_base_indexed():
        parent_store = get_parent_store()
        vector_store = get_vector_store()
        try:
            child_count = vector_store._collection.count()
        except Exception:
            child_count = 0
        parent_count = len(parent_store)
        logger.info(
            "Knowledge base already indexed (%d parents, %d children). Skipping re-ingest.",
            parent_count,
            child_count,
        )
        return

    base_dir = Path(__file__).resolve().parent
    data_dir = base_dir / "rag" / "data"
    markdown_files = sorted(data_dir.glob("*.md"))
    if not markdown_files:
        logger.warning("No legal markdown files found at startup: %s", data_dir)
        return

    logger.info(
        "Knowledge base empty or incomplete. Auto-populating %d legal files...",
        len(markdown_files),
    )
    total_parents = 0
    total_children = 0
    failed_files = 0
    for path in markdown_files:
        try:
            counts = ingest_legal_markdown(path)
            total_parents += counts["parents"]
            total_children += counts["children"]
        except Exception:
            failed_files += 1
            logger.exception("Error ingesting %s on startup", path.name)
    logger.info(
        "Startup ingest finished: %d parents, %d children, %d failed files.",
        total_parents,
        total_children,
        failed_files,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.core.runtime_config import apply_runtime_config_to_environ

    apply_runtime_config_to_environ()

    # Run ingest / model load in background so /health is available immediately.
    thread = threading.Thread(
        target=_startup_knowledge_base,
        name="kb-startup",
        daemon=True,
    )
    thread.start()
    yield


app = FastAPI(title="Agent + RAG API", version="0.1.0", lifespan=lifespan)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router)
app.include_router(ocr.router)
app.include_router(rag.router)
app.include_router(checklist.router)
app.include_router(admin.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
