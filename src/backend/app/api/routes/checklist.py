from dataclasses import asdict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.checklists.evaluator import evaluate_clause, evaluate_delta, evaluate_required_items
from app.checklists.loader import get_checklist, list_checklists
from app.checklists.schemas import (
    EvaluateClauseResponse,
    EvaluateCoverageResponse,
    EvaluateDeltaResponse,
)

router = APIRouter(prefix="/checklist", tags=["checklist"])


class ChecklistSummary(BaseModel):
    loai_hop_dong: str
    ten_hien_thi: str
    phien_ban: str
    ben_a: str
    ben_b: str
    ben_duoc_bao_ve: str
    so_dieu_khoan: int
    so_red_flags: int
    so_unfair: int


class EvaluateClauseRequest(BaseModel):
    loai_hop_dong: str
    clause_text: str


class EvaluateCoverageRequest(BaseModel):
    loai_hop_dong: str
    full_text: str


class EvaluateDeltaRequest(BaseModel):
    loai_hop_dong: str
    old_clause_text: str | None = None
    old_muc_rui_ro: str | None = None
    old_ket_luan: str | None = None
    old_ly_do: str | None = None
    new_clause_text: str | None = None
    new_muc_rui_ro: str | None = None
    new_ket_luan: str | None = None
    new_ly_do: str | None = None


@router.get("/types", response_model=list[ChecklistSummary])
def types() -> list[ChecklistSummary]:
    return [
        ChecklistSummary(
            loai_hop_dong=c.loai_hop_dong,
            ten_hien_thi=c.ten_hien_thi,
            phien_ban=c.phien_ban,
            ben_a=c.convention.ben_a.ten,
            ben_b=c.convention.ben_b.ten,
            ben_duoc_bao_ve=c.convention.protected_party,
            so_dieu_khoan=len(c.required_items),
            so_red_flags=len(c.red_flags()),
            so_unfair=len(c.unfair_clauses()),
        )
        for c in list_checklists()
    ]


@router.get("/{loai_hop_dong}")
def detail(loai_hop_dong: str) -> dict:
    checklist = get_checklist(loai_hop_dong)
    if checklist is None:
        raise HTTPException(status_code=404, detail=f"Unknown contract type: {loai_hop_dong}")
    return asdict(checklist)


@router.post("/evaluate-clause", response_model=EvaluateClauseResponse)
def evaluate(req: EvaluateClauseRequest) -> EvaluateClauseResponse:
    try:
        result = evaluate_clause(req.loai_hop_dong, req.clause_text)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return EvaluateClauseResponse.model_validate(result)


@router.post("/evaluate-coverage", response_model=EvaluateCoverageResponse)
def evaluate_coverage(req: EvaluateCoverageRequest) -> EvaluateCoverageResponse:
    try:
        result = evaluate_required_items(req.loai_hop_dong, req.full_text)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return EvaluateCoverageResponse.model_validate(result)


@router.post("/evaluate-delta", response_model=EvaluateDeltaResponse)
def evaluate_delta_route(req: EvaluateDeltaRequest) -> EvaluateDeltaResponse:
    if req.old_clause_text is None and req.new_clause_text is None:
        raise HTTPException(
            status_code=400,
            detail="old_clause_text or new_clause_text is required",
        )
    try:
        result = evaluate_delta(
            req.loai_hop_dong,
            old_clause_text=req.old_clause_text,
            old_muc_rui_ro=req.old_muc_rui_ro,
            old_ket_luan=req.old_ket_luan,
            old_ly_do=req.old_ly_do,
            new_clause_text=req.new_clause_text,
            new_muc_rui_ro=req.new_muc_rui_ro,
            new_ket_luan=req.new_ket_luan,
            new_ly_do=req.new_ly_do,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return EvaluateDeltaResponse.model_validate(result)
