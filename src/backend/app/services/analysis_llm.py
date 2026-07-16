"""LLM client for contract analysis (RAG answers, checklist evaluation).

Uses keys from the "Agent read and analyze contract" block in .env — separate from
GEMINI_API_KEY used only for OCR/structuring (easier billing tracking).

`/checklist/evaluate-clause` always uses OpenAI via `complete_json_openai()`.

RAG query (`/rag/query`) uses provider priority (first configured wins):
  1. GCP Agent Platform express key (GCP_AGENT_API_KEY) + DEFAULT_MODEL
  2. Anthropic direct (ANTHROPIC_API_KEY)
  3. OpenAI (OPENAI_API_KEY)
"""

from __future__ import annotations

import concurrent.futures
import json
import logging
import os
import time
from enum import Enum
from functools import lru_cache

import httpx
from anthropic import Anthropic
from google import genai
from google.genai import types
from openai import OpenAI

from app.core.config import settings
from app.services.gemini_ocr_service import GeminiOCRAPIError, map_gemini_exception
from app.services.langsmith_tracing import (
    record_gemini_usage,
    trace_llm,
    wrap_anthropic_client,
    wrap_openai_client,
)

logger = logging.getLogger(__name__)
DEBUG_LOG_PATH = (
    "/Users/trinhthilananh/Desktop/Personal/VinUni/group_project/fairterms/.cursor/"
    "debug-c2b556.log"
)
DEBUG_SESSION_ID = "c2b556"


def _debug_log(
    run_id: str, hypothesis_id: str, location: str, message: str, data: dict
) -> None:
    # region agent log
    payload = {
        "sessionId": DEBUG_SESSION_ID,
        "runId": run_id,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    try:
        with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=True) + "\n")
    except Exception:
        pass
    # endregion


class AnalysisProvider(str, Enum):
    GCP_AGENT = "gcp_agent"
    ANTHROPIC = "anthropic"
    OPENAI = "openai"


def resolve_provider() -> AnalysisProvider:
    if settings.gcp_agent_api_key:
        _debug_log(
            run_id="run-1",
            hypothesis_id="H2",
            location="analysis_llm.py:resolve_provider",
            message="Provider resolved to GCP agent",
            data={"has_gcp_agent_key": True},
        )
        return AnalysisProvider.GCP_AGENT
    if settings.anthropic_api_key:
        return AnalysisProvider.ANTHROPIC
    if settings.openai_api_key:
        return AnalysisProvider.OPENAI
    raise RuntimeError(
        "No analysis API key configured. Set GCP_AGENT_API_KEY, ANTHROPIC_API_KEY, "
        "or OPENAI_API_KEY."
    )


def _openai_chat_kwargs(model: str) -> dict[str, float]:
    """OpenAI reasoning models (o-series, gpt-5+) reject non-default temperature."""
    normalized = model.lower()
    if normalized.startswith(("o1", "o3", "o4", "gpt-5")):
        return {}
    return {"temperature": 0}


def resolve_openai_model() -> str:
    """Model for `/checklist/evaluate-clause` — OpenAI only."""
    if not settings.openai_api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is required for checklist clause evaluation."
        )
    if settings.default_model:
        return settings.default_model
    return settings.openai_model


def resolve_model() -> str:
    provider = resolve_provider()
    if settings.default_model:
        raw_model = settings.default_model
        _debug_log(
            run_id="run-1",
            hypothesis_id="H1",
            location="analysis_llm.py:resolve_model",
            message="Using DEFAULT_MODEL for analysis",
            data={
                "default_model": raw_model,
                "env_DEFAULT_MODEL": os.getenv("DEFAULT_MODEL"),
            },
        )
        if provider == AnalysisProvider.GCP_AGENT and not raw_model.startswith("gemini-"):
            fallback_model = settings.gemini_model or "gemini-2.5-flash"
            _debug_log(
                run_id="run-4",
                hypothesis_id="H7",
                location="analysis_llm.py:resolve_model",
                message="Fallback to Gemini model for GCP agent key",
                data={"raw_model": raw_model, "fallback_model": fallback_model},
            )
            logger.warning(
                "DEFAULT_MODEL=%s incompatible with GCP_AGENT_API_KEY; falling back to %s",
                raw_model,
                fallback_model,
            )
            return fallback_model
        return raw_model
    if provider == AnalysisProvider.OPENAI:
        return settings.openai_model
    return "gemini-3.5-flash"


@lru_cache
def _get_gcp_client() -> genai.Client:
    # GCP_AGENT_API_KEY is a Vertex AI express-mode key (prefix "AQ."). It is only
    # accepted by the aiplatform.googleapis.com endpoint, which the SDK targets when
    # vertexai=True (omitting it routes to generativelanguage.googleapis.com and 403s).
    #
    # Force IPv4: httpx tries resolved addresses sequentially, so on networks with
    # broken IPv6 each dead AAAA address stalls ~20s before falling back to IPv4,
    # pushing requests past the analysis timeout (curl avoids this via Happy Eyeballs).
    # Binding the source socket to the IPv4 any-address makes httpx use IPv4 only.
    http_client = httpx.Client(
        transport=httpx.HTTPTransport(local_address="0.0.0.0"),
        timeout=httpx.Timeout(float(settings.gemini_timeout_seconds), connect=10.0),
    )
    return genai.Client(
        vertexai=True,
        api_key=settings.gcp_agent_api_key,
        http_options=types.HttpOptions(httpx_client=http_client),
    )


@lru_cache
def _get_anthropic_client() -> Anthropic:
    return wrap_anthropic_client(Anthropic(api_key=settings.anthropic_api_key))


@lru_cache
def _get_openai_client() -> OpenAI:
    return wrap_openai_client(OpenAI(api_key=settings.openai_api_key))


def _parse_json_content(content: str) -> dict:
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        logger.warning("Analysis LLM returned non-JSON response")
        return {"raw": content}
    if not isinstance(parsed, dict):
        return {"value": parsed}
    return parsed


@trace_llm(name="analysis_complete_json")
def complete_json(
    system_prompt: str, user_prompt: str, *, model: str | None = None
) -> tuple[dict, str]:
    """Call the configured analysis LLM and parse a JSON object response."""
    provider = resolve_provider()
    model_name = model or resolve_model()
    logger.info(
        "analysis_llm.complete_json start provider=%s model=%s",
        provider.value,
        model_name,
    )
    _debug_log(
        run_id="run-1",
        hypothesis_id="H1",
        location="analysis_llm.py:complete_json",
        message="Analysis request start",
        data={"provider": provider.value, "model": model_name},
    )

    if provider == AnalysisProvider.GCP_AGENT:
        try:
            started = time.perf_counter()
            executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
            future = executor.submit(
                _get_gcp_client().models.generate_content,
                model=model_name,
                contents=[user_prompt],
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0,
                    response_mime_type="application/json",
                ),
            )
            try:
                response = future.result(timeout=settings.gemini_timeout_seconds)
            except concurrent.futures.TimeoutError as exc:
                elapsed = round(time.perf_counter() - started, 1)
                _debug_log(
                    run_id="run-5",
                    hypothesis_id="H8",
                    location="analysis_llm.py:complete_json:timeout",
                    message="Gemini analysis timed out",
                    data={
                        "model": model_name,
                        "timeout_seconds": settings.gemini_timeout_seconds,
                        "elapsed_seconds": elapsed,
                    },
                )
                raise GeminiOCRAPIError(
                    f"Analysis request timed out after {settings.gemini_timeout_seconds}s."
                ) from exc
            finally:
                executor.shutdown(wait=False, cancel_futures=True)
        except Exception as exc:
            status_code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
            logger.error(
                "analysis_llm.complete_json gcp failure status=%s type=%s detail=%s",
                status_code,
                type(exc).__name__,
                str(exc)[:300],
            )
            _debug_log(
                run_id="run-1",
                hypothesis_id="H3",
                location="analysis_llm.py:complete_json:except",
                message="GCP Gemini request failed",
                data={
                    "exc_type": type(exc).__name__,
                    "status_code": status_code,
                    "error_text": str(exc)[:400],
                },
            )
            if str(status_code) == "404" or "NOT_FOUND" in str(exc):
                raise GeminiOCRAPIError(
                    "Analysis model not found or project has no access. "
                    f"model={model_name}; detail={str(exc)}"
                ) from exc
            raise map_gemini_exception(exc) from exc
        content = (response.text or "").strip() or "{}"
        record_gemini_usage(response, model=model_name)
    elif provider == AnalysisProvider.ANTHROPIC:
        response = _get_anthropic_client().messages.create(
            model=model_name,
            max_tokens=4096,
            temperature=0,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        content = response.content[0].text
    else:
        response = _get_openai_client().chat.completions.create(
            model=model_name,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            **_openai_chat_kwargs(model_name),
        )
        content = response.choices[0].message.content or "{}"

    return _parse_json_content(content), model_name


_SELECT_CITATIONS_TOOL = {
    "type": "function",
    "function": {
        "name": "select_citations",
        "description": (
            "Select the candidate legal citations that GENUINELY support the claim. "
            "Answer only by candidate index; never invent article numbers outside "
            "the list."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "selected": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "candidate_index": {
                                "type": "integer",
                                "description": "Số thứ tự ứng viên (bắt đầu từ 1)",
                            },
                            "confidence": {
                                "type": "string",
                                "enum": ["high", "medium", "low"],
                            },
                        },
                        "required": ["candidate_index", "confidence"],
                    },
                },
                "none_apply": {
                    "type": "boolean",
                    "description": "true nếu KHÔNG ứng viên nào hỗ trợ nhận định",
                },
            },
            "required": ["selected", "none_apply"],
        },
    },
}

_SELECT_CITATIONS_SYSTEM = (
    "You are a Vietnamese legal expert. Given a claim about a risk in a contract "
    "clause and a list of candidate law excerpts, select the candidates that provide "
    "a legal basis for the claim. A candidate SUPPORTS the claim when it states the "
    "right, obligation, principle, or sanction that the contract clause at issue "
    "violates, evades, or puts at risk — it does NOT need to mention the exact "
    "contract scenario. Reject only candidates about a different subject matter. "
    "If no candidate provides a legal basis, return none_apply=true."
)


def select_citations(
    claim: str, candidates: list[dict], *, model: str | None = None
) -> dict:
    """Ask OpenAI to pick supporting citations from retrieved candidates.

    ``candidates`` are ``Citation.to_dict()`` dicts. The model is forced to
    call the ``select_citations`` tool, so it can only answer with candidate
    indices — never a free-written article number.

    Returns ``{"selected": [{"candidate_index": int, "confidence": str}],
    "none_apply": bool}``.
    """
    if not candidates:
        return {"selected": [], "none_apply": True}

    lines = []
    for idx, cand in enumerate(candidates, start=1):
        header = " — ".join(
            part for part in (cand.get("law_title"), cand.get("location")) if part
        )
        lines.append(f"[{idx}] {header}\n{cand.get('quote', '')}")

    user_prompt = (
        f"CLAIM TO VERIFY:\n{claim}\n\n"
        f"CANDIDATES:\n" + "\n\n".join(lines)
    )
    model_name = model or resolve_openai_model()
    response = _get_openai_client().chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": _SELECT_CITATIONS_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        tools=[_SELECT_CITATIONS_TOOL],
        tool_choice={"type": "function", "function": {"name": "select_citations"}},
        **_openai_chat_kwargs(model_name),
    )
    tool_calls = response.choices[0].message.tool_calls or []
    if not tool_calls:
        logger.warning("select_citations: model returned no tool call")
        return {"selected": [], "none_apply": True}
    try:
        args = json.loads(tool_calls[0].function.arguments)
    except json.JSONDecodeError:
        logger.warning("select_citations: unparseable tool arguments")
        return {"selected": [], "none_apply": True}

    selected = []
    for entry in args.get("selected") or []:
        idx = entry.get("candidate_index")
        if isinstance(idx, int) and 1 <= idx <= len(candidates):
            selected.append(
                {
                    "candidate_index": idx,
                    "confidence": entry.get("confidence", "low"),
                }
            )
    return {"selected": selected, "none_apply": bool(args.get("none_apply"))}


@trace_llm(name="checklist_complete_json_openai")
def complete_json_openai(
    system_prompt: str, user_prompt: str, *, model: str | None = None
) -> tuple[dict, str]:
    """Call OpenAI for JSON output — used by `/checklist/evaluate-clause` only."""
    if not settings.openai_api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is required for checklist clause evaluation."
        )
    model_name = model or resolve_openai_model()
    logger.info(
        "analysis_llm.complete_json_openai start model=%s",
        model_name,
    )
    response = _get_openai_client().chat.completions.create(
        model=model_name,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        **_openai_chat_kwargs(model_name),
    )
    content = response.choices[0].message.content or "{}"
    return _parse_json_content(content), model_name
