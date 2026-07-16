"""Persist non-secret admin overrides (model names, concurrency) across restarts."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

RUNTIME_KEYS = (
    "DEFAULT_MODEL",
    "GEMINI_MODEL",
    "GEMINI_STRUCTURING_MODEL",
    "EMBEDDING_MODEL",
    "NEXT_PUBLIC_CLAUSE_CONCURRENCY",
)


def runtime_config_path() -> Path:
    log_dir = (settings.log_dir or "logs").strip() or "logs"
    return Path(log_dir) / "admin_runtime_config.json"


def load_runtime_config() -> dict[str, Any]:
    path = runtime_config_path()
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        logger.exception("Failed to read runtime config from %s", path)
        return {}


def save_runtime_config(updates: dict[str, Any]) -> None:
    path = runtime_config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    current = load_runtime_config()
    current.update(updates)
    path.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")


def apply_runtime_config_to_environ() -> None:
    for key, value in load_runtime_config().items():
        if key in RUNTIME_KEYS and value is not None:
            os.environ[key] = str(value)


def get_env_or_runtime(key: str, default: str) -> str:
    return os.environ.get(key) or str(load_runtime_config().get(key) or default)
