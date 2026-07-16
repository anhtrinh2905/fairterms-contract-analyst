"""Pydantic schemas for `/checklist/evaluate-clause`.

These models are the single source of truth for the response shape; the
frontend TypeScript types are generated from the OpenAPI schema they produce.

LLM-produced free-text fields stay ``str`` (not ``Literal``) so a slightly
off-vocabulary model output degrades gracefully instead of failing the whole
request; fields the backend itself assigns use ``Literal``.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

EvidenceStatus = Literal[
    "supported",
    "insufficient_evidence",
    "unsupported",
    "legacy_unverified",
]


class PhanTichItem(BaseModel):
    id: str = ""
    dieu_khoan_noi_ve_ben: str = "ben_b"
    dieu_khoan_lam_gi: str = ""
    ket_luan: str = "PASS"
    giai_thich: str = ""


class LegalCitation(BaseModel):
    """One retrieved-and-verified legal citation (mirrors rag.citation.Citation)."""

    source_file: str = ""
    law_title: str = ""
    article: str = ""
    clause: str | None = None
    point: str | None = None
    quote: str = ""
    location: str = ""
    score: float = 0.0
    selection_confidence: Literal["high", "medium", "low"] | None = None


class MatchedFlag(BaseModel):
    id: str = ""
    muc_rui_ro: str = ""
    trich_dan: str = ""
    ly_do: str = ""
    # Transitional: v1 flow returns the checklist/LLM strings; the v2 RAG flow
    # fills this with the locations of the verified citations so pre-GĐ4
    # frontends keep rendering. Remove once the frontend reads legal_basis.
    can_cu: list[str] = Field(default_factory=list)
    goi_y_thuong_luong: str | None = None
    legal_basis: list[LegalCitation] = Field(default_factory=list)
    evidence_status: EvidenceStatus | None = None


class DanhGia(BaseModel):
    phan_tich: list[PhanTichItem] = Field(default_factory=list)
    muc_rui_ro_tong: str = "khong"
    matched_red_flags: list[MatchedFlag] = Field(default_factory=list)
    matched_unfair_clauses: list[MatchedFlag] = Field(default_factory=list)
    nhan_xet: str | None = None
    de_xuat_sua: str | None = None


class EvaluateClauseResponse(BaseModel):
    loai_hop_dong: str
    checklist_id: str
    model: str
    ben_duoc_bao_ve: str
    danh_gia: DanhGia
    evidence_status: EvidenceStatus
    luu_y: str


class RequiredItemResult(BaseModel):
    """One mandatory obligation/right checked against the whole contract."""

    id: str
    ten: str
    thuoc_ben: str
    bat_buoc: bool
    trang_thai: Literal["co", "thieu"]
    trich_dan: str = ""
    ghi_chu: str = ""
    # Only filled when trang_thai == "thieu": a drafting suggestion and where
    # in the contract's own article structure it would fit.
    goi_y_bo_sung: str = ""
    vi_tri_de_xuat: str = ""


class EvaluateCoverageResponse(BaseModel):
    loai_hop_dong: str
    model: str
    ben_duoc_bao_ve: str
    items: list[RequiredItemResult] = Field(default_factory=list)
    luu_y: str


class EvaluateDeltaResponse(BaseModel):
    """Judgment of one clause's change between an old and a new contract version."""

    ket_luan_thay_doi: Literal["tot_hon", "xau_hon", "khong_doi", "can_luu_y"]
    giai_thich: str
    model: str
