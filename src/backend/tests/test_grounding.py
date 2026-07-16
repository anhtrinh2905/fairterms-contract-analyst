"""Tests for the grounding check layer."""

from __future__ import annotations

from app.rag import grounding


def _citation(score: float = 0.8, location: str = "BLDS Điều 22") -> dict:
    return {
        "law_title": "Bộ luật Dân sự",
        "location": location,
        "quote": "Nội dung điều luật",
        "score": score,
        "selection_confidence": "high",
    }


def test_prefilter_disabled_at_zero_threshold():
    cits = [_citation(score=0.01)]
    assert grounding.prefilter_by_score(cits, threshold=0) == cits


def test_prefilter_drops_below_threshold():
    keep, drop = _citation(score=0.9), _citation(score=0.1)
    assert grounding.prefilter_by_score([keep, drop], threshold=0.5) == [keep]


def test_verify_citations_drops_ungrounded(monkeypatch):
    monkeypatch.setattr(
        grounding,
        "judge_grounding",
        lambda claim, c: {
            "grounded": "22" in c["location"],
            "confidence": "high",
            "ly_do_ngan": "",
        },
    )
    good = _citation(location="BLDS Điều 22")
    bad = _citation(location="BLDS Điều 476")
    result = grounding.verify_citations("nhận định", [good, bad])
    assert result == [good]


def test_verify_citations_drops_low_confidence(monkeypatch):
    monkeypatch.setattr(
        grounding,
        "judge_grounding",
        lambda claim, c: {"grounded": True, "confidence": "low", "ly_do_ngan": ""},
    )
    assert grounding.verify_citations("nhận định", [_citation()]) == []


def test_verify_citations_keeps_citation_on_judge_error(monkeypatch):
    def boom(claim, c):
        raise RuntimeError("api down")

    monkeypatch.setattr(grounding, "judge_grounding", boom)
    result = grounding.verify_citations("nhận định", [_citation()])
    assert len(result) == 1
    assert result[0]["selection_confidence"] == "low"


def test_verify_citations_empty_claim_skips_judge(monkeypatch):
    called = []
    monkeypatch.setattr(
        grounding, "judge_grounding", lambda *a: called.append(1) or {}
    )
    cits = [_citation()]
    assert grounding.verify_citations("", cits) == cits
    assert not called
