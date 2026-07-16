"""Optional LangSmith tracing for LLM latency and token/cost observability."""

from __future__ import annotations

import logging
import os
from collections.abc import Callable
from typing import Any, TypeVar

from app.core.config import settings

logger = logging.getLogger(__name__)

_enabled: bool | None = None

F = TypeVar("F", bound=Callable[..., Any])


def is_langsmith_enabled() -> bool:
    global _enabled
    if _enabled is not None:
        return _enabled
    _enabled = bool(settings.langsmith_tracing and settings.langsmith_api_key)
    return _enabled


def configure_langsmith() -> bool:
    """Enable LangSmith via env vars (read by LangChain + langsmith SDK)."""
    global _enabled
    if not settings.langsmith_api_key:
        _enabled = False
        return False
    if not settings.langsmith_tracing:
        _enabled = False
        logger.info("LangSmith API key present but LANGSMITH_TRACING is disabled")
        return False

    project = settings.langsmith_project or "fairterms"
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGCHAIN_API_KEY", settings.langsmith_api_key)
    os.environ.setdefault("LANGCHAIN_PROJECT", project)
    os.environ.setdefault("LANGSMITH_API_KEY", settings.langsmith_api_key)
    os.environ.setdefault("LANGSMITH_PROJECT", project)
    os.environ.setdefault("LANGSMITH_TRACING", "true")

    _enabled = True
    logger.info("LangSmith tracing enabled (project=%s)", project)
    return True


def trace_llm(name: str | None = None, **trace_kwargs: Any) -> Callable[[F], F]:
    """Apply @traceable when LangSmith is enabled; no-op otherwise."""

    def decorator(fn: F) -> F:
        if not is_langsmith_enabled():
            return fn
        from langsmith import traceable

        kwargs: dict[str, Any] = {"run_type": "llm", **trace_kwargs}
        if name:
            kwargs["name"] = name
        return traceable(**kwargs)(fn)  # type: ignore[return-value]

    return decorator


def trace_chain(name: str | None = None, **trace_kwargs: Any) -> Callable[[F], F]:
    """Trace an end-to-end pipeline (OCR, RAG query, clause evaluation)."""

    def decorator(fn: F) -> F:
        if not is_langsmith_enabled():
            return fn
        from langsmith import traceable

        kwargs: dict[str, Any] = {"run_type": "chain", **trace_kwargs}
        if name:
            kwargs["name"] = name
        return traceable(**kwargs)(fn)  # type: ignore[return-value]

    return decorator


def wrap_openai_client(client: Any) -> Any:
    if not is_langsmith_enabled():
        return client
    from langsmith.wrappers import wrap_openai

    return wrap_openai(client)


def wrap_anthropic_client(client: Any) -> Any:
    if not is_langsmith_enabled():
        return client
    from langsmith.wrappers import wrap_anthropic

    return wrap_anthropic(client)


def record_gemini_usage(response: Any, *, model: str) -> None:
    """Attach Gemini token counts so LangSmith can estimate cost."""
    if not is_langsmith_enabled():
        return
    try:
        from langsmith.run_helpers import get_current_run_tree
    except ImportError:
        return

    run = get_current_run_tree()
    if run is None:
        return

    meta = getattr(response, "usage_metadata", None)
    if meta is None:
        return

    input_tokens = int(getattr(meta, "prompt_token_count", 0) or 0)
    output_tokens = int(getattr(meta, "candidates_token_count", 0) or 0)
    total_tokens = int(getattr(meta, "total_token_count", 0) or input_tokens + output_tokens)

    run.add_metadata(
        {
            "ls_model_name": model,
            "usage_metadata": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens,
            },
        }
    )
