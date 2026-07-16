"""Golden-set evaluation for the legal retrieval pipeline.

Runs every query in ``tests/golden/legal_retrieval_golden_set.jsonl`` through
``retrieve()`` + ``build_citations()`` and scores:

- **Hit@1 / Hit@3** — a top-1 / top-3 citation matches any ``expected`` entry.
- **must_not_cite violations** — a known-bad citation appears in top-3.
  Any violation fails the run outright (these encode past real mistakes).

Metrics are written to ``tests/golden/last_run_metrics.json``. If
``baseline_metrics.json`` exists, Hit@3 regressions > 5 percentage points fail.

The test needs a live Chroma index + embedding API access, so it only runs
when ``RUN_GOLDEN_EVAL=1`` (CI sets this; plain `pytest` skips it).
"""

from __future__ import annotations

import json
import os
import re
import unicodedata
from pathlib import Path

import pytest

GOLDEN_DIR = Path(__file__).parent / "golden"
GOLDEN_SET = GOLDEN_DIR / "legal_retrieval_golden_set.jsonl"
LAST_RUN = GOLDEN_DIR / "last_run_metrics.json"
BASELINE = GOLDEN_DIR / "baseline_metrics.json"

HIT3_REGRESSION_TOLERANCE = 0.05
TOP_K = 5
RERANK_TOP_N = 3

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_GOLDEN_EVAL") != "1",
    reason="golden eval needs a live index + embedding API; set RUN_GOLDEN_EVAL=1",
)


def _normalize(text: str) -> str:
    text = text.lower().replace("đ", "d")
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", text).strip()


def _article_number(text: str) -> str | None:
    match = re.search(r"dieu\s*(\d+)", _normalize(text))
    return match.group(1) if match else None


def _law_matches(expected_law: str, citation_law: str) -> bool:
    exp, cit = _normalize(expected_law), _normalize(citation_law)
    if not exp or not cit:
        return False
    return exp in cit or cit in exp


def _citation_matches(entry: dict, citation) -> bool:
    if not _law_matches(entry["law_title"], citation.law_title):
        return False
    exp_num = _article_number(entry.get("article", ""))
    if exp_num is None:
        return True  # law-level expectation
    return _article_number(citation.article) == exp_num


def _load_golden() -> list[dict]:
    if not GOLDEN_SET.exists():
        pytest.skip(f"golden set missing: {GOLDEN_SET}")
    records = [
        json.loads(line)
        for line in GOLDEN_SET.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert records, "golden set is empty"
    return records


def test_retrieval_golden_set():
    from app.rag.citation import build_citations
    from app.rag.pipeline import retrieve
    from app.rag.retriever import is_knowledge_base_indexed

    if not is_knowledge_base_indexed():
        pytest.skip("knowledge base not ingested; run scripts/ingest.py first")

    records = _load_golden()
    hit1 = hit3 = 0
    violations: list[dict] = []
    failures: list[str] = []
    by_difficulty: dict[str, list[int]] = {"easy": [], "hard": []}

    for record in records:
        docs = retrieve(record["query"], top_k=TOP_K, rerank_top_n=RERANK_TOP_N, hybrid=True)
        citations = build_citations(docs, max_citations=RERANK_TOP_N)

        matched_at = None
        for rank, citation in enumerate(citations, start=1):
            if any(_citation_matches(e, citation) for e in record.get("expected", [])):
                matched_at = rank
                break

        if matched_at == 1:
            hit1 += 1
        if matched_at is not None:
            hit3 += 1
        else:
            failures.append(record["id"])
        by_difficulty.setdefault(record.get("difficulty", "easy"), []).append(
            1 if matched_at is not None else 0
        )

        for bad in record.get("must_not_cite", []) or []:
            for citation in citations:
                if _citation_matches(bad, citation):
                    violations.append(
                        {
                            "id": record["id"],
                            "cited": f"{citation.law_title} {citation.article}",
                            "forbidden": f"{bad['law_title']} {bad.get('article', '')}",
                        }
                    )

    total = len(records)
    metrics = {
        "total": total,
        "hit_at_1": round(hit1 / total, 4),
        "hit_at_3": round(hit3 / total, 4),
        "violations": violations,
        "failed_ids": failures,
        "by_difficulty": {
            k: round(sum(v) / len(v), 4) for k, v in by_difficulty.items() if v
        },
    }
    LAST_RUN.write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    assert not violations, (
        "must_not_cite violations (known-bad citations resurfaced): "
        f"{json.dumps(violations, ensure_ascii=False)}"
    )

    if BASELINE.exists():
        baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
        floor = baseline["hit_at_3"] - HIT3_REGRESSION_TOLERANCE
        assert metrics["hit_at_3"] >= floor, (
            f"Hit@3 regressed: {metrics['hit_at_3']} < baseline "
            f"{baseline['hit_at_3']} - {HIT3_REGRESSION_TOLERANCE} tolerance. "
            f"Failed ids: {failures}"
        )
