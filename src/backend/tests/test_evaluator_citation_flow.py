"""Tests for the v2 RAG-first citation flow in checklists.evaluator."""

from __future__ import annotations

from app.checklists import evaluator
from app.checklists.loader import Checklist, Role, RoleConvention, Signal
from app.checklists.schemas import EvaluateClauseResponse
from app.rag import grounding
from app.rag.citation import Citation


def _make_checklist(*, truy_van_rag: str = "") -> Checklist:
    return Checklist(
        checklist_id="test_checklist",
        loai_hop_dong="test_hop_dong",
        ten_hien_thi="Hợp đồng test",
        phien_ban="2.0",
        luu_y="test",
        van_ban_phap_luat_tham_chieu=[],
        convention=RoleConvention(
            ben_a=Role(key="ben_a", ma="ben_cho_thue", ten="Bên cho thuê", vi_the="manh_the"),
            ben_b=Role(key="ben_b", ma="ben_thue", ten="Bên thuê", vi_the="yeu_the"),
            protected_party="ben_b",
        ),
        required_items=[],
        signals=[
            Signal(
                id="B-R6",
                loai="red_flag",
                muc_rui_ro="cao",
                mo_ta="Bên A tự ý vào căn hộ không báo trước",
                thuoc_ben="ben_a",
                nhom="dau_hieu_lam_quyen",
                gay_bat_loi_cho="ben_b",
                can_cu=["BLDS 2015 Điều 476"],  # known-bad legacy citation
                truy_van_rag=truy_van_rag,
            )
        ],
    )


def _citation(article: str, law: str = "Bộ luật Dân sự 2015", score: float = 0.8) -> Citation:
    return Citation(
        source_file="bo_luat_dan_su_2015.md",
        law_title=law,
        article=article,
        clause=None,
        point=None,
        quote=f"Nội dung {article}",
        location=f"{law} {article}",
        score=score,
    )


_VERDICT = {
    "phan_tich": [
        {
            "id": "B-R6",
            "dieu_khoan_noi_ve_ben": "ben_a",
            "dieu_khoan_lam_gi": "Cho phép bên A vào nhà không báo trước",
            "ket_luan": "MATCH",
            "giai_thich": "Xâm phạm chỗ ở",
        }
    ],
    "muc_rui_ro_tong": "cao",
    "matched_red_flags": [
        {
            "id": "B-R6",
            "muc_rui_ro": "cao",
            "trich_dan": "Bên A được vào căn hộ bất cứ lúc nào",
            "ly_do": "Xâm phạm quyền bất khả xâm phạm chỗ ở của bên thuê",
        }
    ],
    "matched_unfair_clauses": [],
    "nhan_xet": "",
    "de_xuat_sua": "",
}


def _setup_v2(monkeypatch, checklist, *, candidates, selection):
    monkeypatch.setattr(evaluator.settings, "checklist_enable_rag_citation_v2", True)
    monkeypatch.setattr(evaluator, "get_checklist", lambda _: checklist)
    monkeypatch.setattr(
        evaluator, "complete_json_openai", lambda *a, **k: (dict(_VERDICT), "gpt-test")
    )
    monkeypatch.setattr(evaluator, "resolve_openai_model", lambda: "gpt-test")
    monkeypatch.setattr(evaluator, "retrieve", lambda *a, **k: ["doc"] * len(candidates))
    monkeypatch.setattr(evaluator, "build_citations", lambda docs, **k: candidates)
    monkeypatch.setattr(evaluator, "select_citations", lambda *a, **k: selection)
    # grounding judge: pass-through (no LLM)
    monkeypatch.setattr(grounding, "verify_citations", lambda claim, cits: cits)


def test_v2_legal_basis_only_contains_selected_candidates(monkeypatch):
    checklist = _make_checklist(truy_van_rag="quyền bất khả xâm phạm về chỗ ở")
    candidates = [_citation("Điều 22", law="Hiến pháp 2013"), _citation("Điều 476")]
    selection = {
        "selected": [{"candidate_index": 1, "confidence": "high"}],
        "none_apply": False,
    }
    _setup_v2(monkeypatch, checklist, candidates=candidates, selection=selection)

    result = evaluator.evaluate_clause("test_hop_dong", "Bên A được vào căn hộ bất cứ lúc nào")

    flag = result["danh_gia"]["matched_red_flags"][0]
    assert len(flag["legal_basis"]) == 1
    assert flag["legal_basis"][0]["article"] == "Điều 22"
    assert flag["legal_basis"][0]["selection_confidence"] == "high"
    # regression: the known-bad Điều 476 must not leak into the output
    assert all("476" not in c["article"] for c in flag["legal_basis"])
    assert all("476" not in c for c in flag["can_cu"])
    assert flag["evidence_status"] == "supported"
    assert result["evidence_status"] == "supported"


def test_v2_can_cu_mirrors_verified_locations(monkeypatch):
    checklist = _make_checklist(truy_van_rag="quyền bất khả xâm phạm về chỗ ở")
    candidates = [_citation("Điều 22", law="Hiến pháp 2013")]
    selection = {
        "selected": [{"candidate_index": 1, "confidence": "medium"}],
        "none_apply": False,
    }
    _setup_v2(monkeypatch, checklist, candidates=candidates, selection=selection)

    result = evaluator.evaluate_clause("test_hop_dong", "clause")

    flag = result["danh_gia"]["matched_red_flags"][0]
    assert flag["can_cu"] == ["Hiến pháp 2013 Điều 22"]


def test_v2_none_apply_yields_insufficient_evidence(monkeypatch):
    checklist = _make_checklist(truy_van_rag="quyền bất khả xâm phạm về chỗ ở")
    candidates = [_citation("Điều 476")]
    selection = {"selected": [], "none_apply": True}
    _setup_v2(monkeypatch, checklist, candidates=candidates, selection=selection)

    result = evaluator.evaluate_clause("test_hop_dong", "clause")

    flag = result["danh_gia"]["matched_red_flags"][0]
    assert flag["legal_basis"] == []
    assert flag["evidence_status"] == "insufficient_evidence"
    assert result["evidence_status"] == "insufficient_evidence"


def test_v2_signal_without_curated_query_is_legacy_unverified(monkeypatch):
    checklist = _make_checklist(truy_van_rag="")
    candidates = [_citation("Điều 22", law="Hiến pháp 2013")]
    selection = {
        "selected": [{"candidate_index": 1, "confidence": "high"}],
        "none_apply": False,
    }
    _setup_v2(monkeypatch, checklist, candidates=candidates, selection=selection)

    result = evaluator.evaluate_clause("test_hop_dong", "clause")

    flag = result["danh_gia"]["matched_red_flags"][0]
    assert flag["evidence_status"] == "legacy_unverified"


def test_v2_prompt_omits_hand_typed_can_cu(monkeypatch):
    checklist = _make_checklist(truy_van_rag="q")
    captured: dict = {}

    def fake_llm(system_prompt, user_prompt, **kwargs):
        captured["user_prompt"] = user_prompt
        return dict(_VERDICT), "gpt-test"

    _setup_v2(
        monkeypatch,
        checklist,
        candidates=[],
        selection={"selected": [], "none_apply": True},
    )
    monkeypatch.setattr(evaluator, "complete_json_openai", fake_llm)

    evaluator.evaluate_clause("test_hop_dong", "clause")

    assert "Điều 476" not in captured["user_prompt"]
    assert "can_cu" not in captured["user_prompt"]


def test_v1_flow_unchanged_when_flag_off(monkeypatch):
    checklist = _make_checklist()
    captured: dict = {}

    def fake_llm(system_prompt, user_prompt, **kwargs):
        captured["user_prompt"] = user_prompt
        return dict(_VERDICT), "gpt-test"

    monkeypatch.setattr(evaluator.settings, "checklist_enable_rag_citation_v2", False)
    monkeypatch.setattr(evaluator, "get_checklist", lambda _: checklist)
    monkeypatch.setattr(evaluator, "complete_json_openai", fake_llm)
    monkeypatch.setattr(evaluator, "resolve_openai_model", lambda: "gpt-test")
    monkeypatch.setattr(evaluator, "retrieve", lambda *a, **k: [])
    monkeypatch.setattr(evaluator, "build_citations", lambda docs, **k: [])

    result = evaluator.evaluate_clause("test_hop_dong", "clause")

    # v1 keeps the hand-typed can_cu hint in the prompt and the old schema
    assert "Điều 476" in captured["user_prompt"]
    assert '"can_cu"' in captured["user_prompt"]
    assert result["danh_gia"]["matched_red_flags"][0]["evidence_status"] == (
        "insufficient_evidence"
    )


def test_response_schema_accepts_both_flows():
    v1_shape = {
        "loai_hop_dong": "x",
        "checklist_id": "c",
        "model": "gpt-test",
        "ben_duoc_bao_ve": "ben_b",
        "danh_gia": {
            "muc_rui_ro_tong": "cao",
            "matched_red_flags": [
                {
                    "id": "B-R6",
                    "muc_rui_ro": "cao",
                    "trich_dan": "t",
                    "ly_do": "l",
                    "can_cu": ["BLDS 2015 Điều 428"],
                    "legal_basis": [],
                    "evidence_status": "insufficient_evidence",
                }
            ],
            "matched_unfair_clauses": [],
        },
        "evidence_status": "insufficient_evidence",
        "luu_y": "n",
    }
    parsed = EvaluateClauseResponse.model_validate(v1_shape)
    assert parsed.danh_gia.matched_red_flags[0].can_cu == ["BLDS 2015 Điều 428"]

    # LLM garbage fallback ({"raw": ...}) must not 500 the route
    raw_shape = {**v1_shape, "danh_gia": {"raw": "not json"}}
    parsed = EvaluateClauseResponse.model_validate(raw_shape)
    assert parsed.danh_gia.muc_rui_ro_tong == "khong"
