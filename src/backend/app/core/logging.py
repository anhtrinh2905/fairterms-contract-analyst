"""Central logging configuration for the backend.

Call `setup_logging()` once at startup. Level comes from `settings.log_level`;
if `settings.log_dir` is set, logs are also written to `<log_dir>/backend.log`.
Every module gets a logger via `logging.getLogger(__name__)`.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

from app.core.config import settings

_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_configured = False


def setup_logging() -> None:
    """Configure root + uvicorn loggers. Idempotent."""
    global _configured
    if _configured:
        return

    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    formatter = logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT)

    handlers: list[logging.Handler] = []

    stream = logging.StreamHandler(sys.stdout)
    stream.setFormatter(formatter)
    handlers.append(stream)

    if settings.log_dir:
        log_path = Path(settings.log_dir)
        log_path.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_path / "backend.log", encoding="utf-8")
        file_handler.setFormatter(formatter)
        handlers.append(file_handler)

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers = handlers

    # Route uvicorn's loggers through our handlers/level too.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uv_logger = logging.getLogger(name)
        uv_logger.handlers = handlers
        uv_logger.setLevel(level)
        uv_logger.propagate = False

    _configured = True
    logging.getLogger(__name__).info(
        "Logging configured (level=%s, file=%s)",
        settings.log_level.upper(),
        settings.log_dir or "off",
    )
