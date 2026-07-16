"""Grounding checks for RAG legal citations.

A citation only reaches the user if (a) its retrieval score clears the
empirically-derived prefilter threshold and (b) a small LLM judge agrees the
quoted law text actually supports the claim. Anything filtered out is dropped
silently — the caller downgrades the finding to `insufficient_evidence`
instead of showing an unverified article number.
"""

from __future__ import annotations

import concurrent.futures
import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

_JUDGE_SYSTEM = (
    "You are a legal grounding judge. Given a claim about a contract risk and a "
    "law excerpt, return exactly one JSON object: "
    '{"grounded": true|false, "confidence": "high"|"medium"|"low", '
    '"ly_do_ngan": "<one short Vietnamese sentence>"}. '
    "grounded=true when the excerpt states the right, obligation, principle, or "
    "sanction underlying the claim — it need not mention the exact contract "
    "scenario. grounded=false only when the excerpt covers a different subject "
    "matter that cannot serve as a legal basis for the claim."
)


def prefilter_by_score(candidates: list[dict], threshold: float | None = None) -> list[dict]:
    """Drop candidates whose retrieval score is below the threshold.

    A threshold of 0 (the default until one is derived from the golden set)
    disables the filter.
    """
    limit = settings.grounding_score_threshold if threshold is None else threshold
    if limit <= 0:
        return candidates
    return [c for c in candidates if float(c.get("score") or 0) >= limit]


def judge_grounding(claim: str, citation: dict) -> dict:
    """Ask the judge model whether one citation supports the claim."""
    from app.services.analysis_llm import complete_json_openai

    header = " — ".join(
        part
        for part in (citation.get("law_title"), citation.get("location"))
        if part
    )
    user_prompt = (
        f"CLAIM:\n{claim}\n\n"
        f"LAW EXCERPT ({header}):\n{citation.get('quote', '')}"
    )
    verdict, _ = complete_json_openai(
        _JUDGE_SYSTEM, user_prompt, model=settings.grounding_judge_model
    )
    return {
        "grounded": bool(verdict.get("grounded")),
        "confidence": verdict.get("confidence", "low"),
        "ly_do_ngan": str(verdict.get("ly_do_ngan") or ""),
    }


def verify_citations(claim: str, citations: list[dict]) -> list[dict]:
    """Return only the citations that pass prefilter + judge.

    Judge calls run concurrently (one per citation). A judge failure keeps the
    citation but marks its confidence low — dropping evidence on infra errors
    would be worse than showing it with a caveat.
    """
    citations = prefilter_by_score(citations)
    if not citations or not claim:
        return citations

    def _judge(citation: dict) -> dict | None:
        try:
            verdict = judge_grounding(claim, citation)
        except Exception:
            logger.exception(
                "judge_grounding failed for %s", citation.get("location")
            )
            citation["selection_confidence"] = "low"
            return citation
        if not verdict["grounded"] or verdict["confidence"] == "low":
            logger.info(
                "grounding: dropped %s (%s)",
                citation.get("location"),
                verdict["ly_do_ngan"],
            )
            return None
        return citation

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(_judge, citations))
    return [c for c in results if c is not None]
