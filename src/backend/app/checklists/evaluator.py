"""Evaluate a single contract clause against a checklist using GPT-4o.

Schema v2.0 is role-aware: the agent is told the fixed Bên A / Bên B convention
(who is the strong party, who is protected), and every signal carries which
party it concerns + an optional `dieu_kien_kich_hoat` (when to MATCH vs PASS).
The model must first decide WHICH party each clause speaks about, then only
flag what is genuinely disadvantageous to the protected party.
"""

from __future__ import annotations

import logging

from app.checklists.loader import Checklist, RoleConvention, Signal, get_checklist
from app.core.config import settings
from app.rag.citation import build_citations
from app.rag.pipeline import retrieve
from app.services.cache import build_cache_key, cache_get, cache_set
from app.services.langsmith_tracing import trace_chain
from app.services.analysis_llm import (
    complete_json_openai,
    resolve_openai_model,
    select_citations,
)

logger = logging.getLogger(__name__)

# Bump whenever the prompt, JSON schema, reasoning rules, or the shape of the
# cached `evaluate_clause` result change — this invalidates every stale cache
# entry without a manual flush. TTL is only the backstop.
PROMPT_VERSION = 2

CLAUSE_CACHE_NAMESPACE = "checklist:clause"

_NHOM_TITLE = {
    "dau_hieu_lam_quyen": "Signals: BÊN A abusing power / evading liability",
    "dau_hieu_ganh_qua_muc": "Signals: BÊN B overloaded with obligations / excessive penalties",
}


def _signal_line(s: Signal, *, include_can_cu: bool = True) -> str:
    parts = [
        f"- {s.id} [type: {s.loai}, risk: {s.muc_rui_ro}, disadvantages: {s.gay_bat_loi_cho}]",
        f"    Signal: {s.mo_ta}",
    ]
    # v2 flow: citations come from retrieval, so the hand-typed can_cu hint is
    # withheld from the prompt to keep the LLM from echoing unverified articles.
    if include_can_cu and s.is_red_flag and s.can_cu:
        parts.append(f"    Legal basis: {'; '.join(s.can_cu)}")
    if not s.is_red_flag and s.goi_y_thuong_luong:
        parts.append(f"    Negotiation hint: {s.goi_y_thuong_luong}")
    if s.dieu_kien_kich_hoat:
        parts.append(f"    TRIGGER CONDITION (read carefully): {s.dieu_kien_kich_hoat}")
    return "\n".join(parts)


def _signals_block(checklist: Checklist, *, include_can_cu: bool = True) -> str:
    """Group signals by the party section they live under, with role context."""
    blocks: list[str] = []
    for party_key in ("ben_a", "ben_b"):
        for nhom in ("dau_hieu_lam_quyen", "dau_hieu_ganh_qua_muc"):
            group = [
                s for s in checklist.signals if s.thuoc_ben == party_key and s.nhom == nhom
            ]
            if not group:
                continue
            blocks.append(f"### {_NHOM_TITLE[nhom]}")
            blocks.extend(
                _signal_line(s, include_can_cu=include_can_cu) for s in group
            )
    return "\n".join(blocks)


def _convention_text(conv: RoleConvention) -> str:
    a, b = conv.ben_a, conv.ben_b
    protected = conv.protected
    return (
        "PARTY CONVENTION (fixed for this contract):\n"
        f"- Bên A = {a.ten} (code: {a.ma}, position: {a.vi_the}).\n"
        f"- Bên B = {b.ten} (code: {b.ma}, position: {b.vi_the}).\n"
        f"- PROTECTED PARTY = {protected.ten} ({conv.protected_party}). "
        "Always side with this party.\n"
        "- When the clause uses other names/titles (company name, ông/bà, "
        "'bên cho thuê', 'người mua'...), map them to the correct Bên A or Bên B by role."
    )


REASONING_RULES = (
    "MANDATORY PROCEDURE to avoid wrong-party errors (apply in order to each candidate signal):\n"
    "1. Decide WHICH party's rights/obligations the clause is about (Bên A or Bên B), "
    "from the grammatical subject. Record it in 'dieu_khoan_noi_ve_ben'.\n"
    "2. A signal applies only if the clause is about the party that the signal describes. "
    "Never map a 'Bên A abuses power' signal onto a sentence about Bên B's obligations, or vice versa.\n"
    "3. SPLIT BY SUBJECT: if the clause covers several situations "
    "('nếu Bên A… / nếu Bên B…'), evaluate each part SEPARATELY; never merge them into 'all cases'.\n"
    "4. TRIGGER CONDITIONS ARE DECISIVE. If a signal has a TRIGGER CONDITION, state in "
    "'giai_thich' whether it is satisfied. A protective counterpart = a sanction on Bên A in "
    "Bên B's favour, or an exclusion protecting Bên B (force majeure, Bên A's fault). If such a "
    "counterpart is present in the clause → the trigger fails → PASS, no matter how harsh the "
    "rest looks. An extra burden on Bên B (must wait, must not claim compensation) is NOT a "
    "counterpart — it makes the clause MORE one-sided.\n"
    "5. SUBSTANCE OVER FORM: a signal also matches when the clause reaches the same harmful "
    "effect indirectly — e.g. by making Bên B accept, waive protection against, or bear the exact "
    "risk the signal describes (including waiving disclosure or remedies for it).\n"
    "6. MATCH only when the clause GENUINELY disadvantages the PROTECTED PARTY. PASS when the "
    "clause is balanced, protects Bên B, already satisfies the negotiation hint, or merely "
    "restates a normal legal duty of Bên B with proportionate consequences (e.g. pays agreed "
    "amounts on time, repairs damage they caused, standard two-sided deposit rules of BLDS "
    "Điều 328). This leniency NEVER applies to one-sided clauses: sanctioning Bên B while "
    "giving Bên A impunity for the mirror breach still matches.\n"
    "7. Distinguish tiền đặt cọc (deposit) from tiền thuê/tiền mua đã trả (payments made): a "
    "signal about one does NOT apply to the other.\n"
    "8. NO INTERNAL CONTRADICTION: 'ly_do' must be consistent with 'trich_dan'. If your own "
    "analysis says the protective condition is present, the verdict MUST be PASS.\n"
    "9. When unsure → PASS, do not flag."
)

WORKED_EXAMPLE = (
    "EXAMPLE 1 (the most common mistake — negotiation hint already satisfied):\n"
    "Clause: 'Khi chấm dứt sớm, Bên A trả lại Bên B số tiền thuê còn lại tương ứng "
    "thời gian chưa sử dụng.' Signal B-U6 warns about 'NOT refunding rent for the remaining "
    "period'. But this clause DOES refund pro-rata — exactly what B-U6 asks for. "
    "→ PASS, do NOT include B-U6 in the result.\n"
    "EXAMPLE 2 (one-sided vs balanced sanction):\n"
    "Clause X: 'Bên B chậm thanh toán quá 15 ngày → Bên A được chấm dứt, Bên B mất cọc; "
    "nếu Bên A đơn phương chấm dứt không do lỗi Bên B → Bên A hoàn cọc và bồi thường một "
    "khoản tương đương.' Bên A bears the mirror sanction → balanced → PASS B-R1.\n"
    "Clause Y: 'Bên B chậm thanh toán → mất cọc; nếu Bên A chậm bàn giao thì Bên B phải chờ, "
    "không được yêu cầu bồi thường.' The second part burdens Bên B further, it is NOT a "
    "counterpart sanction on Bên A → one-sided → MATCH B-R1."
)


def _system_prompt(checklist: Checklist) -> str:
    return (
        "You are a contract-review assistant for Vietnamese legal contracts, siding with "
        "the PROTECTED PARTY (the weaker party) per the convention below.\n\n"
        f"{_convention_text(checklist.convention)}\n\n"
        "Task: check ONE clause against two kinds of checklist signals:\n"
        "  1. red_flag — potentially ILLEGAL/void/legal risk (with legal basis).\n"
        "  2. unfair_but_legal — NOT illegal but DISADVANTAGEOUS to the protected party "
        "(warn + negotiation hint only; never label it 'trái luật').\n\n"
        f"{REASONING_RULES}\n\n"
        f"{WORKED_EXAMPLE}\n\n"
        "Route matches to the correct result group: loai=red_flag → matched_red_flags "
        "(with legal basis); loai=unfair_but_legal → matched_unfair_clauses (with negotiation "
        "hint). This is a review-support tool, NOT legal advice. "
        "Write every output string value in Vietnamese. "
        "Return exactly ONE JSON object, nothing outside the JSON."
    )


JSON_SCHEMA_HINT = """\
Return JSON with exactly this structure. Fill fields IN ORDER — write `phan_tich` FIRST,
then decide the matched arrays from it. All string values in Vietnamese:
{
  "phan_tich": [
    {
      "id": "<candidate signal id, e.g. B-U6>",
      "dieu_khoan_noi_ve_ben": "ben_a" | "ben_b" | "ca_hai",
      "dieu_khoan_lam_gi": "<what the clause actually does, close to its wording>",
      "ket_luan": "MATCH" | "PASS",
      "giai_thich": "<why MATCH/PASS; if condition/hint already satisfied → PASS>"
    }
  ],
  "muc_rui_ro_tong": "cao" | "trung_binh" | "thap" | "khong",
  "matched_red_flags": [
    {
      "id": "<signal id, e.g. B-R6>",
      "muc_rui_ro": "cao|trung_binh|thap",
      "trich_dan": "<verbatim quote of the clause passage used as evidence>",
      "ly_do": "<why it is risky/illegal for the protected party — consistent with trich_dan>",
      "can_cu": ["<legal basis citation>"]
    }
  ],
  "matched_unfair_clauses": [
    {
      "id": "<signal id, e.g. B-U1>",
      "muc_rui_ro": "trung_binh|thap",
      "trich_dan": "<verbatim quote of the clause passage used as evidence>",
      "ly_do": "<why it disadvantages the protected party — consistent with trich_dan>",
      "goi_y_thuong_luong": "<negotiation suggestion to rebalance>"
    }
  ],
  "nhan_xet": "<short overall comment>",
  "de_xuat_sua": "<suggested balanced rewording of the clause, if any>"
}
Only signals with ket_luan = "MATCH" may appear in matched_red_flags /
matched_unfair_clauses. The signal's declared type decides the array: a signal listed with
[type: red_flag] goes ONLY in matched_red_flags; [type: unfair_but_legal] goes ONLY in
matched_unfair_clauses, no matter how severe it looks. muc_rui_ro_tong is the highest risk
among MATCHed items. If nothing MATCHes: matched_red_flags = [],
matched_unfair_clauses = [], muc_rui_ro_tong = "khong"."""

# v2: identical schema minus the free-written `can_cu` array — legal citations
# are attached afterwards from retrieval, never generated by the model.
JSON_SCHEMA_HINT_V2 = JSON_SCHEMA_HINT.replace(
    """      "ly_do": "<why it is risky/illegal for the protected party — consistent with trich_dan>",
      "can_cu": ["<legal basis citation>"]""",
    """      "ly_do": "<why it is risky/illegal for the protected party — consistent with trich_dan>\"""",
)
assert "can_cu" not in JSON_SCHEMA_HINT_V2, "JSON_SCHEMA_HINT changed; update the V2 replace"


def _legal_basis_query(item: dict) -> str:
    parts: list[str] = []
    parts.extend(str(value) for value in item.get("can_cu", []) if value)
    for key in ("ly_do", "trich_dan", "goi_y_thuong_luong"):
        value = item.get(key)
        if value:
            parts.append(str(value))
    return "\n".join(parts).strip()


def _enrich_findings_with_rag(verdict: dict) -> str:
    overall_status = "unsupported"
    for key in ("matched_red_flags", "matched_unfair_clauses"):
        for item in verdict.get(key, []) or []:
            query = _legal_basis_query(item)
            if not query:
                item["legal_basis"] = []
                item["evidence_status"] = "insufficient_evidence"
                continue
            try:
                docs = retrieve(query, top_k=5, rerank_top_n=3, hybrid=True)
                citations = [
                    citation.to_dict()
                    for citation in build_citations(docs, max_citations=3)
                ]
            except Exception:
                logger.exception("RAG legal-basis enrichment failed for finding %s", item.get("id"))
                citations = []

            item["legal_basis"] = citations
            item["evidence_status"] = "supported" if citations else "insufficient_evidence"
            if citations:
                overall_status = "supported"

    if overall_status != "supported" and (
        verdict.get("matched_red_flags") or verdict.get("matched_unfair_clauses")
    ):
        return "insufficient_evidence"
    return overall_status


def _build_retrieval_query(signal: Signal | None, item: dict) -> tuple[str, bool]:
    """Return (query, is_curated) for one finding.

    Curated queries anchor retrieval on the reviewer-written legal concepts
    (`truy_van_rag`); the LLM's own wording only adds situational context.
    Findings without a curated query fall back to the legacy free-text query
    and are flagged `legacy_unverified` downstream.
    """
    if signal is not None and signal.truy_van_rag:
        ly_do = item.get("ly_do") or ""
        query = signal.truy_van_rag
        if ly_do:
            query = f"{query}\n\nTình huống cụ thể trong hợp đồng: {ly_do}"
        return query, True
    return _legal_basis_query(item), False


def _claim_text(item: dict) -> str:
    parts = [str(item.get("ly_do") or "")]
    trich_dan = item.get("trich_dan")
    if trich_dan:
        parts.append(f"Trích dẫn hợp đồng: {trich_dan}")
    return "\n".join(p for p in parts if p).strip()


def _enrich_findings_with_rag_v2(verdict: dict, checklist: Checklist) -> str:
    """RAG-first citation flow: retrieve per signal, let the LLM only pick
    among retrieved candidates, then attach the picked citations verbatim."""
    from app.rag.grounding import verify_citations  # local import: optional dep cycle guard

    signal_by_id = {s.id: s for s in checklist.signals}
    overall_supported = False
    has_findings = False

    for key in ("matched_red_flags", "matched_unfair_clauses"):
        for item in verdict.get(key, []) or []:
            has_findings = True
            item.pop("can_cu", None)  # v2 prompt omits it, but never trust echoes
            signal = signal_by_id.get(str(item.get("id") or ""))
            query, is_curated = _build_retrieval_query(signal, item)
            if not query:
                item["legal_basis"] = []
                item["evidence_status"] = "insufficient_evidence"
                continue

            try:
                docs = retrieve(
                    query,
                    top_k=settings.checklist_citation_top_k,
                    rerank_top_n=settings.checklist_citation_rerank_top_n,
                    hybrid=True,
                )
                candidates = [
                    c.to_dict()
                    for c in build_citations(
                        docs, max_citations=settings.checklist_citation_rerank_top_n
                    )
                ]
            except Exception:
                logger.exception("v2 retrieval failed for finding %s", item.get("id"))
                candidates = []

            chosen: list[dict] = []
            if candidates:
                claim = _claim_text(item)
                try:
                    selection = select_citations(claim, candidates)
                except Exception:
                    logger.exception(
                        "v2 citation selection failed for finding %s", item.get("id")
                    )
                    selection = {"selected": [], "none_apply": True}
                for entry in selection["selected"]:
                    citation = dict(candidates[entry["candidate_index"] - 1])
                    citation["selection_confidence"] = entry["confidence"]
                    chosen.append(citation)
                try:
                    chosen = verify_citations(claim, chosen)
                except Exception:
                    logger.exception(
                        "v2 grounding check failed for finding %s", item.get("id")
                    )

            item["legal_basis"] = chosen
            # Transitional: pre-GĐ4 frontends render `can_cu` strings, so mirror
            # the verified citation locations there until the UI reads legal_basis.
            item["can_cu"] = [
                c.get("location") or c.get("law_title") or "" for c in chosen
            ]
            if not is_curated:
                item["evidence_status"] = "legacy_unverified"
            elif any(c.get("selection_confidence") != "low" for c in chosen):
                item["evidence_status"] = "supported"
                overall_supported = True
            else:
                item["evidence_status"] = "insufficient_evidence"

    if not has_findings:
        return "unsupported"
    return "supported" if overall_supported else "insufficient_evidence"


def _reroute_findings_by_signal_type(verdict: dict, checklist: Checklist) -> None:
    """The checklist's declared signal type — not the model — decides which array a
    finding belongs to; nano occasionally files an unfair signal under red flags."""
    signal_by_id = {s.id: s for s in checklist.signals}
    original_red = verdict.get("matched_red_flags") or []
    original_unfair = verdict.get("matched_unfair_clauses") or []
    red: list[dict] = []
    unfair: list[dict] = []
    seen_ids: set[str] = set()
    for source, items in (("red", original_red), ("unfair", original_unfair)):
        for item in items:
            item_id = str(item.get("id") or "")
            if item_id and item_id in seen_ids:
                continue
            seen_ids.add(item_id)
            signal = signal_by_id.get(item_id)
            if signal is None:
                (red if source == "red" else unfair).append(item)
            elif signal.is_red_flag:
                red.append(item)
            else:
                if not item.get("goi_y_thuong_luong") and signal.goi_y_thuong_luong:
                    item["goi_y_thuong_luong"] = signal.goi_y_thuong_luong
                unfair.append(item)
    verdict["matched_red_flags"] = red
    verdict["matched_unfair_clauses"] = unfair


def _clause_cache_key(
    checklist: Checklist, clause_text: str, *, model: str, use_v2: bool
) -> str:
    """Fingerprint every input that changes the clause verdict.

    Two clauses share a cache entry only when the contract type, checklist
    version, prompt/schema version, model, feature flags, retrieval settings,
    and (normalised) clause text all match.
    """
    return build_cache_key(
        CLAUSE_CACHE_NAMESPACE,
        checklist.loai_hop_dong,
        checklist.phien_ban,
        PROMPT_VERSION,
        model,
        use_v2,
        settings.checklist_citation_top_k,
        settings.checklist_citation_rerank_top_n,
        clause_text,
    )


@trace_chain(name="checklist_evaluate_clause")
def evaluate_clause(loai_hop_dong: str, clause_text: str) -> dict:
    """Evaluate one clause against the checklist via GPT-4o.

    Returns a dict with the model verdict plus echo metadata. Raises
    ValueError if the contract type is unknown. Identical clauses are served
    from the Redis cache when ``checklist_cache_enabled`` is set.
    """
    checklist: Checklist | None = get_checklist(loai_hop_dong)
    if checklist is None:
        logger.warning("evaluate_clause: unknown contract type %r", loai_hop_dong)
        raise ValueError(f"Unknown contract type: {loai_hop_dong}")

    model = resolve_openai_model()
    use_v2 = settings.checklist_enable_rag_citation_v2

    cache_key: str | None = None
    if settings.checklist_cache_enabled:
        cache_key = _clause_cache_key(
            checklist, clause_text, model=model, use_v2=use_v2
        )
        cached = cache_get(cache_key)
        if cached is not None:
            logger.info(
                "evaluate_clause: cache_hit loai=%s, clause_len=%d",
                loai_hop_dong,
                len(clause_text),
            )
            return cached

    logger.info(
        "evaluate_clause: cache_miss loai=%s, clause_len=%d, model=%s",
        loai_hop_dong,
        len(clause_text),
        model,
    )

    user_prompt = (
        f"Contract type: {checklist.ten_hien_thi}\n\n"
        f"Candidate signals to check (grouped by party):\n"
        f"{_signals_block(checklist, include_can_cu=not use_v2)}\n\n"
        f"Clause under review:\n\"\"\"\n{clause_text}\n\"\"\"\n\n"
        f"{JSON_SCHEMA_HINT_V2 if use_v2 else JSON_SCHEMA_HINT}"
    )

    try:
        verdict, model_used = complete_json_openai(
            _system_prompt(checklist),
            user_prompt,
            model=model,
        )
    except Exception:
        logger.exception("evaluate_clause: LLM call failed (loai=%s)", loai_hop_dong)
        raise
    _reroute_findings_by_signal_type(verdict, checklist)
    if use_v2:
        evidence_status = _enrich_findings_with_rag_v2(verdict, checklist)
    else:
        evidence_status = _enrich_findings_with_rag(verdict)
    logger.info(
        "evaluate_clause: done loai=%s -> red_flags=%d, unfair=%d, muc_rui_ro_tong=%s",
        loai_hop_dong,
        len(verdict.get("matched_red_flags", [])),
        len(verdict.get("matched_unfair_clauses", [])),
        verdict.get("muc_rui_ro_tong"),
    )

    result = {
        "loai_hop_dong": checklist.loai_hop_dong,
        "checklist_id": checklist.checklist_id,
        "model": model_used,
        "ben_duoc_bao_ve": checklist.convention.protected_party,
        "danh_gia": verdict,
        "evidence_status": evidence_status,
        "luu_y": checklist.luu_y,
    }

    # Only reached on a clean run — a raised LLM/RAG error skips this.
    if cache_key is not None:
        cache_set(cache_key, result, settings.checklist_cache_ttl_seconds)

    return result


def _delta_system_prompt(checklist: Checklist) -> str:
    return (
        "You are a contract-review assistant for Vietnamese legal contracts, siding with "
        "the PROTECTED PARTY (the weaker party) per the convention below.\n\n"
        f"{_convention_text(checklist.convention)}\n\n"
        "Task: compare the OLD and NEW wording of the SAME clause/article across two versions "
        "of a contract (the clause may instead be newly added in the new version, or removed "
        "from it), and judge the change from the PROTECTED PARTY's perspective ONLY.\n\n"
        "RULES:\n"
        "1. tot_hon: the new version reduces risk or adds a protection for the protected party "
        "compared to the old version (for a removed clause: removing it relieves a burden or "
        "risk the protected party used to carry).\n"
        "2. xau_hon: the new version increases risk or removes a protection for the protected "
        "party compared to the old version (for a removed clause: removing it eliminates a "
        "protection the protected party used to have; for a newly added clause: the new text "
        "itself disadvantages the protected party).\n"
        "3. khong_doi: the wording changed but the practical effect on the protected party's "
        "risk is materially the same as before.\n"
        "4. can_luu_y: the effect is mixed, ambiguous, or depends on facts not in the text — "
        "flag it for the user to review manually instead of guessing.\n"
        "5. Judge from the ACTUAL wording given, not only from the risk labels supplied as "
        "context — labels can be stale or wrong; if a label and the text disagree, trust the "
        "text.\n"
        "6. This is a review-support tool, NOT legal advice. Never say a contract is void or "
        "illegal, and never advise to sign or not sign.\n"
        "Write every output string value in Vietnamese. Return exactly ONE JSON object, nothing "
        "outside the JSON."
    )


DELTA_JSON_SCHEMA_HINT = """\
Return JSON with exactly this structure. All string values in Vietnamese:
{
  "ket_luan_thay_doi": "tot_hon" | "xau_hon" | "khong_doi" | "can_luu_y",
  "giai_thich": "<1-3 short sentences explaining the judgment, referencing the actual wording>"
}"""


def _delta_clause_block(
    label: str,
    text: str | None,
    muc_rui_ro: str | None,
    ket_luan: str | None,
    ly_do: str | None,
) -> str:
    if text is None:
        return f"{label}: (clause does not exist in this version)"
    parts = [f'{label}:\n"""\n{text}\n"""']
    if muc_rui_ro or ket_luan:
        parts.append(
            f"Previous verdict on this text: muc_rui_ro={muc_rui_ro or 'khong'}, "
            f"ket_luan={ket_luan or 'PASS'}"
        )
    if ly_do:
        parts.append(f"Reason on file: {ly_do}")
    return "\n".join(parts)


@trace_chain(name="checklist_evaluate_delta")
def evaluate_delta(
    loai_hop_dong: str,
    *,
    old_clause_text: str | None,
    old_muc_rui_ro: str | None,
    old_ket_luan: str | None,
    old_ly_do: str | None,
    new_clause_text: str | None,
    new_muc_rui_ro: str | None,
    new_ket_luan: str | None,
    new_ly_do: str | None,
) -> dict:
    """Judge whether a clause change (edit, addition, or removal) helps or hurts
    the protected party, given the old/new text plus any prior verdict on file.

    Unlike `evaluate_clause`, this is a comparison-only judgment call: no RAG
    retrieval or legal citation is attached, since it reasons over verdicts
    that were already produced (with their own citations) by `evaluate_clause`.
    """
    checklist: Checklist | None = get_checklist(loai_hop_dong)
    if checklist is None:
        logger.warning("evaluate_delta: unknown contract type %r", loai_hop_dong)
        raise ValueError(f"Unknown contract type: {loai_hop_dong}")

    if old_clause_text is None and new_clause_text is None:
        raise ValueError("At least one of old_clause_text or new_clause_text is required")

    model = resolve_openai_model()
    logger.info("evaluate_delta: loai=%s, model=%s", loai_hop_dong, model)

    old_block = _delta_clause_block(
        "OLD VERSION", old_clause_text, old_muc_rui_ro, old_ket_luan, old_ly_do
    )
    new_block = _delta_clause_block(
        "NEW VERSION", new_clause_text, new_muc_rui_ro, new_ket_luan, new_ly_do
    )
    user_prompt = (
        f"Contract type: {checklist.ten_hien_thi}\n\n"
        f"{old_block}\n\n"
        f"{new_block}\n\n"
        f"{DELTA_JSON_SCHEMA_HINT}"
    )

    try:
        result, model_used = complete_json_openai(
            _delta_system_prompt(checklist),
            user_prompt,
            model=model,
        )
    except Exception:
        logger.exception("evaluate_delta: LLM call failed (loai=%s)", loai_hop_dong)
        raise

    ket_luan_thay_doi = result.get("ket_luan_thay_doi")
    if ket_luan_thay_doi not in ("tot_hon", "xau_hon", "khong_doi", "can_luu_y"):
        ket_luan_thay_doi = "can_luu_y"

    return {
        "ket_luan_thay_doi": ket_luan_thay_doi,
        "giai_thich": str(result.get("giai_thich") or ""),
        "model": model_used,
    }


_PARTY_TITLE = {
    "ben_a": "MANDATORY OBLIGATIONS OF BÊN A",
    "ben_b": "RIGHTS THAT MUST BE GUARANTEED FOR BÊN B",
}


def _required_items_block(checklist: Checklist) -> str:
    """List every required item grouped by party, for the coverage prompt."""
    blocks: list[str] = []
    for party_key in ("ben_a", "ben_b"):
        group = [item for item in checklist.required_items if item.thuoc_ben == party_key]
        if not group:
            continue
        blocks.append(f"### {_PARTY_TITLE[party_key]}")
        blocks.extend(
            f"- {item.id} [{'required' if item.bat_buoc else 'recommended'}]: {item.ten}"
            for item in group
        )
    return "\n".join(blocks)


def _coverage_system_prompt(checklist: Checklist) -> str:
    return (
        "You are a contract-review assistant for Vietnamese legal contracts, siding with "
        "the PROTECTED PARTY (the weaker party) per the convention below.\n\n"
        f"{_convention_text(checklist.convention)}\n\n"
        "Task: given the FULL contract text (numbered by ĐIỀU), check each item in the "
        "list of MANDATORY obligations/rights below and decide whether the contract "
        "already provides it — the item may appear in any article, worded differently "
        "from the template; equivalent content still counts as PRESENT.\n\n"
        "RULES:\n"
        "1. Conclude trang_thai='co' only when you find an actual corresponding passage "
        "in the contract; you MUST quote it verbatim in trich_dan.\n"
        "2. If no corresponding content exists anywhere in the contract → "
        "trang_thai='thieu', leave trich_dan empty, give a brief reason in ghi_chu.\n"
        "3. Never infer or assume content that is not in the text. When unsure whether "
        "you found it → conclude 'thieu'.\n"
        "4. For EVERY 'thieu' item, also provide both of:\n"
        "   a) goi_y_bo_sung: one short model clause (in Vietnamese) that could be inserted "
        "directly into the contract to satisfy the item (a drafting suggestion, not legal advice).\n"
        "   b) vi_tri_de_xuat: state WHICH article to insert it into, based on the article "
        "headings present in the contract text above (e.g. 'Điều 4 — Đặt cọc'). If none fits, "
        "propose a new article with the next number (e.g. 'Điều mới, ví dụ Điều 8').\n"
        "This is a review-support tool, NOT legal advice. "
        "Write every output string value in Vietnamese. "
        "Return exactly ONE JSON object, nothing outside the JSON."
    )


COVERAGE_JSON_SCHEMA_HINT = """\
Return JSON with exactly this structure, with one element for EVERY id in the given list.
All string values in Vietnamese:
{
  "items": [
    {
      "id": "<id, e.g. A-D1>",
      "trang_thai": "co" | "thieu",
      "trich_dan": "<verbatim contract quote — required if 'co', empty if 'thieu'>",
      "ghi_chu": "<brief reason if 'thieu'; may be empty if 'co'>",
      "goi_y_bo_sung": "<model clause to add — ONLY when 'thieu', empty if 'co'>",
      "vi_tri_de_xuat": "<e.g. 'Điều 4 — Đặt cọc' or 'Điều mới, ví dụ Điều 8' — ONLY when 'thieu'>"
    }
  ]
}"""


@trace_chain(name="checklist_evaluate_required_items")
def evaluate_required_items(loai_hop_dong: str, full_contract_text: str) -> dict:
    """Check, once per whole contract, which mandatory required items are present.

    Unlike `evaluate_clause` (per-clause red-flag/unfair detection), this looks
    at the ENTIRE contract text at once since a required obligation can be
    phrased anywhere, in different wording. No RAG/legal citation is needed
    here — this only checks the contract against itself.
    """
    checklist: Checklist | None = get_checklist(loai_hop_dong)
    if checklist is None:
        logger.warning("evaluate_required_items: unknown contract type %r", loai_hop_dong)
        raise ValueError(f"Unknown contract type: {loai_hop_dong}")

    logger.info(
        "evaluate_required_items: loai=%s, text_len=%d, model=%s",
        loai_hop_dong,
        len(full_contract_text),
        resolve_openai_model(),
    )

    user_prompt = (
        f"Contract type: {checklist.ten_hien_thi}\n\n"
        f"Mandatory obligations/rights to check:\n"
        f"{_required_items_block(checklist)}\n\n"
        f"Full contract text:\n\"\"\"\n{full_contract_text}\n\"\"\"\n\n"
        f"{COVERAGE_JSON_SCHEMA_HINT}"
    )

    try:
        result, model_used = complete_json_openai(
            _coverage_system_prompt(checklist),
            user_prompt,
            model=resolve_openai_model(),
        )
    except Exception:
        logger.exception("evaluate_required_items: LLM call failed (loai=%s)", loai_hop_dong)
        raise

    verdict_by_id = {str(v.get("id") or ""): v for v in result.get("items", []) or []}

    items: list[dict] = []
    for item in checklist.required_items:
        verdict = verdict_by_id.get(item.id, {})
        raw_trang_thai = verdict.get("trang_thai")
        trang_thai = raw_trang_thai if raw_trang_thai in ("co", "thieu") else "thieu"
        is_missing = trang_thai == "thieu"
        items.append(
            {
                "id": item.id,
                "ten": item.ten,
                "thuoc_ben": item.thuoc_ben,
                "bat_buoc": item.bat_buoc,
                "trang_thai": trang_thai,
                "trich_dan": "" if is_missing else str(verdict.get("trich_dan") or ""),
                "ghi_chu": str(verdict.get("ghi_chu") or ""),
                "goi_y_bo_sung": str(verdict.get("goi_y_bo_sung") or "") if is_missing else "",
                "vi_tri_de_xuat": str(verdict.get("vi_tri_de_xuat") or "") if is_missing else "",
            }
        )

    missing = sum(1 for i in items if i["trang_thai"] == "thieu")
    logger.info(
        "evaluate_required_items: done loai=%s -> missing=%d/%d",
        loai_hop_dong,
        missing,
        len(items),
    )

    return {
        "loai_hop_dong": checklist.loai_hop_dong,
        "model": model_used,
        "ben_duoc_bao_ve": checklist.convention.protected_party,
        "items": items,
        "luu_y": checklist.luu_y,
    }
