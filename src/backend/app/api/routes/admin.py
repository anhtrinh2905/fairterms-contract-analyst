import os
import shutil
import tempfile
import time
from collections import defaultdict
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.checklists.evaluator import CLAUSE_CACHE_NAMESPACE
from app.checklists.loader import CHECKLIST_DIR, _load_all, _parse, get_checklist, list_checklists
from app.core.config import settings
from app.core.runtime_config import (
    apply_runtime_config_to_environ,
    get_env_or_runtime,
    save_runtime_config,
)
from app.rag.documents import list_documents
from app.rag.pipeline import ingest_legal_markdown, retrieve
from app.services.cache import (
    count_namespace_keys,
    delete_key,
    flush_namespace,
    get_redis_stats,
    list_namespace_entries,
)


def require_admin_token(x_admin_token: str | None = Header(default=None)) -> None:
    expected = settings.admin_api_token.strip()
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="Admin API token chưa được cấu hình trên backend.",
        )
    if x_admin_token != expected:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập Admin API.")


router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin_token)],
)


class AdminStatsResponse(BaseModel):
    parents: int
    children: int
    checklists_count: int
    indexed: bool


@router.get("/stats", response_model=AdminStatsResponse)
def get_stats() -> AdminStatsResponse:
    from app.rag.retriever import get_parent_store, get_vector_store, is_knowledge_base_indexed
    parent_store = get_parent_store()
    try:
        vector_store = get_vector_store()
        child_count = vector_store._collection.count()
    except Exception:
        child_count = 0
    parent_count = len(parent_store)
    indexed = is_knowledge_base_indexed()
    
    return AdminStatsResponse(
        parents=parent_count,
        children=child_count,
        checklists_count=len(list_checklists()),
        indexed=indexed
    )


# --- CHECKLIST ENDPOINTS ---

class ChecklistMetaResponse(BaseModel):
    id: str
    loai_hop_dong: str
    ten_hien_thi: str
    phien_ban: str
    items_count: int


class ChecklistSaveRequest(BaseModel):
    checklist_id: str
    ten_hien_thi: str
    phien_ban: str
    luu_y: str
    van_ban_phap_luat_tham_chieu: list[str]
    quy_uoc_vai_tro: dict
    machine_block: dict


@router.get("/checklists", response_model=list[ChecklistMetaResponse])
def get_checklists_list() -> list[ChecklistMetaResponse]:
    checklists = list_checklists()
    return [
        ChecklistMetaResponse(
            id=c.checklist_id,
            loai_hop_dong=c.loai_hop_dong,
            ten_hien_thi=c.ten_hien_thi,
            phien_ban=c.phien_ban,
            items_count=len(c.required_items) + len(c.signals)
        )
        for c in checklists
    ]


@router.get("/checklists/{loai_hop_dong}")
def get_checklist_detail(loai_hop_dong: str) -> dict:
    c = get_checklist(loai_hop_dong)
    if not c:
        raise HTTPException(status_code=404, detail="Checklist not found")
    
    # Read raw content to extract the machine block safely
    target_path = None
    for path in CHECKLIST_DIR.glob("*.md"):
        content = path.read_text(encoding="utf-8")
        parsed = _parse(content)
        if parsed.loai_hop_dong == loai_hop_dong:
            target_path = path
            break
            
    machine_block = {}
    if target_path:
        content = target_path.read_text(encoding="utf-8")
        parts = content.split("```yaml\n", 1)
        if len(parts) > 1:
            yaml_part = parts[1].split("\n```", 1)[0]
            try:
                machine_block = yaml.safe_load(yaml_part) or {}
            except Exception:
                pass

    return {
        "checklist_id": c.checklist_id,
        "loai_hop_dong": c.loai_hop_dong,
        "ten_hien_thi": c.ten_hien_thi,
        "phien_ban": c.phien_ban,
        "luu_y": c.luu_y,
        "van_ban_phap_luat_tham_chieu": c.van_ban_phap_luat_tham_chieu,
        "quy_uoc_vai_tro": {
            "ben_a": {
                "ma": c.convention.ben_a.ma,
                "ten": c.convention.ben_a.ten,
                "vi_the": c.convention.ben_a.vi_the
            },
            "ben_b": {
                "ma": c.convention.ben_b.ma,
                "ten": c.convention.ben_b.ten,
                "vi_the": c.convention.ben_b.vi_the
            },
            "protected_party": c.convention.protected_party
        },
        "machine_block": machine_block,
        "required_items": [asdict(item) for item in c.required_items],
        "signals": [asdict(sig) for sig in c.signals]
    }


@router.post("/checklists/{loai_hop_dong}")
def save_checklist_detail(loai_hop_dong: str, req: ChecklistSaveRequest) -> dict:
    target_path = None
    for path in CHECKLIST_DIR.glob("*.md"):
        content = path.read_text(encoding="utf-8")
        parsed = _parse(content)
        if parsed.loai_hop_dong == loai_hop_dong:
            target_path = path
            break
            
    if not target_path:
        raise HTTPException(status_code=404, detail="Checklist file not found")
        
    try:
        content = target_path.read_text(encoding="utf-8")
        parts = content.split("---\n", 2)
        if len(parts) < 3:
            raise ValueError("Invalid checklist markdown file structure")
            
        subparts = parts[2].split("```yaml\n", 1)
        middle_markdown = subparts[0]
        
        new_fm = {
            "checklist_id": req.checklist_id,
            "loai_hop_dong": loai_hop_dong,
            "ten_hien_thi": req.ten_hien_thi,
            "phien_ban": req.phien_ban,
            "ngon_ngu": "vi",
            "quy_uoc_vai_tro": req.quy_uoc_vai_tro,
            "muc_rui_ro_enum": ["cao", "trung_binh", "thap"],
            "luu_y": req.luu_y,
            "van_ban_phap_luat_tham_chieu": req.van_ban_phap_luat_tham_chieu
        }
        
        fm_str = yaml.safe_dump(new_fm, allow_unicode=True, sort_keys=False)
        machine_str = yaml.safe_dump(req.machine_block, allow_unicode=True, sort_keys=False)
        
        new_content = f"---\n{fm_str}---\n{middle_markdown}```yaml\n{machine_str}```\n"
        target_path.write_text(new_content, encoding="utf-8")
        
        _load_all.cache_clear()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save checklist: {str(e)}")


# --- RAG DOCUMENT ENDPOINTS ---

class RAGDocInfoResponse(BaseModel):
    doc_id: str
    source_file: str
    title: str
    so_hieu: str | None = None
    loai_van_ban: str | None = None
    ngay_ban_hanh: str | None = None
    ngay_hieu_luc: str | None = None


@router.get("/rag/documents", response_model=list[RAGDocInfoResponse])
def get_rag_documents() -> list[RAGDocInfoResponse]:
    docs = list_documents()
    return [
        RAGDocInfoResponse(
            doc_id=d.doc_id,
            source_file=d.source_file,
            title=d.title,
            so_hieu=d.so_hieu,
            loai_van_ban=d.loai_van_ban,
            ngay_ban_hanh=d.ngay_ban_hanh,
            ngay_hieu_luc=d.ngay_hieu_luc
        )
        for d in docs
    ]


def _ingest_markdown_path(tmp_path: Path) -> dict:
    try:
        counts = ingest_legal_markdown(tmp_path)
        return {
            "success": True,
            "parents": counts["parents"],
            "children": counts["children"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest document: {str(e)}") from e


@router.post("/rag/ingest")
def ingest_document(file: UploadFile = File(...)) -> dict:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".md") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)
    try:
        return _ingest_markdown_path(tmp_path)
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


class RAGIngestTextRequest(BaseModel):
    title: str = Field(default="pasted_document", min_length=1, max_length=200)
    content: str = Field(min_length=1)


@router.post("/rag/ingest-text")
def ingest_text_document(req: RAGIngestTextRequest) -> dict:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".md", mode="w", encoding="utf-8") as tmp:
        tmp.write(req.content)
        tmp_path = Path(tmp.name)
    try:
        result = _ingest_markdown_path(tmp_path)
        result["title"] = req.title
        return result
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


# --- RAG PLAYGROUND ENDPOINTS ---

class RAGSearchRequest(BaseModel):
    query: str
    top_k: int = 5


class RAGSearchTestResult(BaseModel):
    text: str
    doc_id: str
    article: str | None = None
    score: float


@router.post("/rag/search-test", response_model=list[RAGSearchTestResult])
def search_test(req: RAGSearchRequest) -> list[RAGSearchTestResult]:
    try:
        chunks = retrieve(req.query, top_k=req.top_k)
        results = []
        for c in chunks:
            # Try to get similarity score if present in metadata
            score = c.metadata.get("score", 0.0)
            if not score and hasattr(c, "state") and "score" in c.state:
                score = c.state["score"]
                
            results.append(
                RAGSearchTestResult(
                    text=c.page_content,
                    doc_id=c.metadata.get("doc_id", "unknown"),
                    article=c.metadata.get("article_no") or c.metadata.get("article"),
                    score=float(score)
                )
            )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to test search: {str(e)}")


# --- AI CONFIGURATION ENDPOINTS ---

class AIConfigResponse(BaseModel):
    openai_api_key_configured: bool
    gemini_api_key_configured: bool
    default_model: str
    gemini_model: str
    gemini_structuring_model: str
    embedding_model: str
    concurrency_limit: int


class AIConfigSaveRequest(BaseModel):
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    default_model: str
    gemini_model: str
    gemini_structuring_model: str
    embedding_model: str
    concurrency_limit: int


def _openai_key_configured() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY") or settings.openai_api_key)


def _gemini_key_configured() -> bool:
    return bool(
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GEMINI_AI_STUDIO_KEY")
        or os.environ.get("GEMINI_GCP_PLATFORM_KEYS")
        or settings.gemini_api_key
        or settings.gemini_ai_studio_key
        or settings.gemini_gcp_platform_keys
    )


@router.get("/ai-config", response_model=AIConfigResponse)
def get_ai_config() -> AIConfigResponse:
    return AIConfigResponse(
        openai_api_key_configured=_openai_key_configured(),
        gemini_api_key_configured=_gemini_key_configured(),
        default_model=get_env_or_runtime("DEFAULT_MODEL", settings.openai_model or "gpt-4o"),
        gemini_model=get_env_or_runtime("GEMINI_MODEL", settings.gemini_model or "gemini-2.5-flash"),
        gemini_structuring_model=get_env_or_runtime(
            "GEMINI_STRUCTURING_MODEL",
            settings.gemini_structuring_model or "gemini-2.5-flash",
        ),
        embedding_model=get_env_or_runtime("EMBEDDING_MODEL", settings.embedding_model or "text-embedding-3-small"),
        concurrency_limit=int(get_env_or_runtime("NEXT_PUBLIC_CLAUSE_CONCURRENCY", "10")),
    )


@router.post("/ai-config")
def save_ai_config(req: AIConfigSaveRequest) -> dict:
    if req.openai_api_key:
        os.environ["OPENAI_API_KEY"] = req.openai_api_key
    if req.gemini_api_key:
        os.environ["GEMINI_API_KEY"] = req.gemini_api_key

    runtime_updates = {
        "DEFAULT_MODEL": req.default_model,
        "GEMINI_MODEL": req.gemini_model,
        "GEMINI_STRUCTURING_MODEL": req.gemini_structuring_model,
        "EMBEDDING_MODEL": req.embedding_model,
        "NEXT_PUBLIC_CLAUSE_CONCURRENCY": req.concurrency_limit,
    }
    save_runtime_config(runtime_updates)
    for key, value in runtime_updates.items():
        os.environ[key] = str(value)
    apply_runtime_config_to_environ()

    return {"success": True}


class AIPingResponse(BaseModel):
    ok: bool
    latency_ms: int
    provider: str


@router.post("/ai-config/ping/openai", response_model=AIPingResponse)
def ping_openai() -> AIPingResponse:
    api_key = os.environ.get("OPENAI_API_KEY") or settings.openai_api_key
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenAI API key chưa được cấu hình.")

    start = time.perf_counter()
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        client.models.list(limit=1)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI ping thất bại: {e}") from e

    return AIPingResponse(
        ok=True,
        latency_ms=int((time.perf_counter() - start) * 1000),
        provider="openai",
    )


@router.post("/ai-config/ping/gemini", response_model=AIPingResponse)
def ping_gemini() -> AIPingResponse:
    api_key = (
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GEMINI_AI_STUDIO_KEY")
        or settings.gemini_api_key
        or settings.gemini_ai_studio_key
    )
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API key chưa được cấu hình.")

    start = time.perf_counter()
    try:
        from google import genai

        client = genai.Client(api_key=api_key)
        next(iter(client.models.list()), None)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini ping thất bại: {e}") from e

    return AIPingResponse(
        ok=True,
        latency_ms=int((time.perf_counter() - start) * 1000),
        provider="gemini",
    )


# --- LANGSMITH OBSERVABILITY ENDPOINTS ---

_LANGSMITH_CHAIN_LABELS: dict[str, str] = {
    "rag_query": "Truy vấn RAG",
    "ocr_structure_contract": "OCR + Structuring hợp đồng",
    "ocr_process_contract": "OCR văn bản hợp đồng",
    "ocr_process_contract_images": "OCR ảnh hợp đồng",
    "checklist_evaluate_clause": "Đánh giá điều khoản",
    "checklist_evaluate_delta": "Đánh giá thay đổi điều khoản",
    "checklist_evaluate_required_items": "Kiểm tra điều khoản bắt buộc",
}

_LANGSMITH_CACHE_TTL_SECONDS = 45


class LangSmithOverview(BaseModel):
    total_runs: int
    error_count: int
    error_rate: float
    latency_p50_s: float | None = None
    latency_p95_s: float | None = None
    total_tokens: int
    total_cost_usd: float | None = None


class LangSmithToolStat(BaseModel):
    name: str
    label: str
    run_count: int
    error_count: int
    error_rate: float
    latency_p50_s: float | None = None


class LangSmithLLMStat(BaseModel):
    name: str
    run_count: int
    total_tokens: int
    total_cost_usd: float | None = None


class LangSmithErrorRun(BaseModel):
    id: str
    name: str
    error: str
    start_time: str | None = None
    latency_s: float | None = None
    url: str | None = None


class LangSmithTimelineBucket(BaseModel):
    bucket_start: str
    run_count: int
    error_count: int


class LangSmithDashboardResponse(BaseModel):
    enabled: bool
    project: str
    range_hours: int
    overview: LangSmithOverview
    tools: list[LangSmithToolStat]
    llm_calls: list[LangSmithLLMStat]
    recent_errors: list[LangSmithErrorRun]
    timeline: list[LangSmithTimelineBucket]
    truncated: bool


_langsmith_dashboard_cache: dict[int, tuple[float, LangSmithDashboardResponse]] = {}


def _langsmith_empty_dashboard(
    project: str, hours: int, enabled: bool
) -> LangSmithDashboardResponse:
    return LangSmithDashboardResponse(
        enabled=enabled,
        project=project,
        range_hours=hours,
        overview=LangSmithOverview(total_runs=0, error_count=0, error_rate=0.0, total_tokens=0),
        tools=[],
        llm_calls=[],
        recent_errors=[],
        timeline=[],
        truncated=False,
    )


def _run_latency_seconds(run: Any) -> float | None:
    start = getattr(run, "start_time", None)
    end = getattr(run, "end_time", None)
    if start is None or end is None:
        return None
    return (end - start).total_seconds()


def _percentile(values: list[float], pct: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    k = (len(ordered) - 1) * pct
    lo = int(k)
    hi = min(lo + 1, len(ordered) - 1)
    if lo == hi:
        return ordered[lo]
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (k - lo)


def _timeline_buckets(
    chain_runs: list, start_time: datetime, hours: int
) -> list[LangSmithTimelineBucket]:
    bucket_hours = 1 if hours <= 24 else (6 if hours <= 24 * 7 else 24)

    now = datetime.now(timezone.utc)
    aligned_start = start_time.replace(minute=0, second=0, microsecond=0)
    buckets: list[datetime] = []
    cursor = aligned_start
    while cursor <= now:
        buckets.append(cursor)
        cursor += timedelta(hours=bucket_hours)
    if not buckets:
        buckets = [aligned_start]

    counts = {b: {"run_count": 0, "error_count": 0} for b in buckets}
    for run in chain_runs:
        run_start = getattr(run, "start_time", None)
        if run_start is None:
            continue
        offset_hours = (run_start - aligned_start).total_seconds() / 3600
        idx = max(0, min(int(offset_hours // bucket_hours), len(buckets) - 1))
        key = buckets[idx]
        counts[key]["run_count"] += 1
        if getattr(run, "error", None):
            counts[key]["error_count"] += 1

    return [
        LangSmithTimelineBucket(
            bucket_start=b.isoformat(),
            run_count=counts[b]["run_count"],
            error_count=counts[b]["error_count"],
        )
        for b in buckets
    ]


@router.get("/langsmith/dashboard", response_model=LangSmithDashboardResponse)
def get_langsmith_dashboard(hours: int = 24) -> LangSmithDashboardResponse:
    from app.services.langsmith_tracing import is_langsmith_enabled

    project = settings.langsmith_project or "fairterms"
    hours = max(1, min(hours, 24 * 30))

    if not is_langsmith_enabled():
        return _langsmith_empty_dashboard(project, hours, enabled=False)

    cached = _langsmith_dashboard_cache.get(hours)
    if cached and (time.time() - cached[0]) < _LANGSMITH_CACHE_TTL_SECONDS:
        return cached[1]

    from itertools import islice

    from langsmith import Client
    from langsmith.utils import LangSmithNotFoundError

    client = Client(api_key=settings.langsmith_api_key)
    start_time = datetime.now(timezone.utc) - timedelta(hours=hours)
    # The LangSmith REST API rejects a per-request `limit` above 100, so we let
    # list_runs() paginate via cursor (limit=None) and cap what we consume client-side.
    limit = 200

    try:
        chain_runs = list(
            islice(
                client.list_runs(project_name=project, run_type="chain", start_time=start_time),
                limit,
            )
        )
        llm_runs = list(
            islice(
                client.list_runs(project_name=project, run_type="llm", start_time=start_time),
                limit,
            )
        )
    except LangSmithNotFoundError:
        result = _langsmith_empty_dashboard(project, hours, enabled=True)
        _langsmith_dashboard_cache[hours] = (time.time(), result)
        return result
    except Exception as e:
        detail = f"Không thể lấy dữ liệu từ LangSmith: {e}"
        raise HTTPException(status_code=502, detail=detail) from e

    total_runs = len(chain_runs)
    error_count = sum(1 for r in chain_runs if getattr(r, "error", None))
    latencies = [lat for r in chain_runs if (lat := _run_latency_seconds(r)) is not None]
    total_tokens = sum((getattr(r, "total_tokens", None) or 0) for r in llm_runs)
    cost_values = [
        float(r.total_cost) for r in llm_runs if getattr(r, "total_cost", None) is not None
    ]

    overview = LangSmithOverview(
        total_runs=total_runs,
        error_count=error_count,
        error_rate=(error_count / total_runs) if total_runs else 0.0,
        latency_p50_s=_percentile(latencies, 0.5),
        latency_p95_s=_percentile(latencies, 0.95),
        total_tokens=total_tokens,
        total_cost_usd=(sum(cost_values) if cost_values else None),
    )

    by_tool: dict[str, list[Any]] = defaultdict(list)
    for r in chain_runs:
        by_tool[getattr(r, "name", None) or "unknown"].append(r)

    tools = []
    for name, runs in sorted(by_tool.items(), key=lambda kv: -len(kv[1])):
        lat = [lat for r in runs if (lat := _run_latency_seconds(r)) is not None]
        err = sum(1 for r in runs if getattr(r, "error", None))
        tools.append(
            LangSmithToolStat(
                name=name,
                label=_LANGSMITH_CHAIN_LABELS.get(name, name),
                run_count=len(runs),
                error_count=err,
                error_rate=(err / len(runs)) if runs else 0.0,
                latency_p50_s=_percentile(lat, 0.5),
            )
        )

    by_llm: dict[str, list[Any]] = defaultdict(list)
    for r in llm_runs:
        by_llm[getattr(r, "name", None) or "unknown"].append(r)

    llm_calls = []
    for name, runs in sorted(by_llm.items(), key=lambda kv: -len(kv[1])):
        tokens = sum((getattr(r, "total_tokens", None) or 0) for r in runs)
        costs = [float(r.total_cost) for r in runs if getattr(r, "total_cost", None) is not None]
        llm_calls.append(
            LangSmithLLMStat(
                name=name,
                run_count=len(runs),
                total_tokens=tokens,
                total_cost_usd=(sum(costs) if costs else None),
            )
        )

    error_runs = sorted(
        (r for r in chain_runs if getattr(r, "error", None)),
        key=lambda r: getattr(r, "start_time", None) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )[:20]

    recent_errors = []
    for r in error_runs:
        try:
            url = client.get_run_url(run=r)
        except Exception:
            url = None
        start = getattr(r, "start_time", None)
        recent_errors.append(
            LangSmithErrorRun(
                id=str(r.id),
                name=getattr(r, "name", None) or "unknown",
                error=str(getattr(r, "error", "") or "")[:300],
                start_time=start.isoformat() if start else None,
                latency_s=_run_latency_seconds(r),
                url=url,
            )
        )

    result = LangSmithDashboardResponse(
        enabled=True,
        project=project,
        range_hours=hours,
        overview=overview,
        tools=tools,
        llm_calls=llm_calls,
        recent_errors=recent_errors,
        timeline=_timeline_buckets(chain_runs, start_time, hours),
        truncated=(len(chain_runs) >= limit or len(llm_runs) >= limit),
    )
    _langsmith_dashboard_cache[hours] = (time.time(), result)
    return result


# --- CACHE MANAGEMENT ---

# Known Redis cache namespaces exposed to the admin panel. Every namespace here
# must be a real prefix produced by `build_cache_key()` — flush is scoped to
# `{namespace}:*` so it can never touch unrelated keys on a shared Redis instance.
_CACHE_NAMESPACES: dict[str, str] = {
    CLAUSE_CACHE_NAMESPACE: "Đánh giá điều khoản checklist (RAG)",
}


class CacheRedisStats(BaseModel):
    connected: bool
    used_memory_human: str | None = None
    connected_clients: int | None = None
    uptime_in_seconds: int | None = None
    keyspace_hits: int = 0
    keyspace_misses: int = 0
    hit_rate: float | None = None


class CacheNamespaceInfo(BaseModel):
    namespace: str
    label: str
    enabled: bool
    ttl_seconds: int
    key_count: int | None = None


class CacheOverviewResponse(BaseModel):
    redis: CacheRedisStats
    namespaces: list[CacheNamespaceInfo]


@router.get("/cache/overview", response_model=CacheOverviewResponse)
def get_cache_overview() -> CacheOverviewResponse:
    stats = get_redis_stats()
    redis_stats = CacheRedisStats(connected=stats is not None, **(stats or {}))
    namespaces = [
        CacheNamespaceInfo(
            namespace=namespace,
            label=label,
            enabled=settings.checklist_cache_enabled,
            ttl_seconds=settings.checklist_cache_ttl_seconds,
            key_count=count_namespace_keys(namespace) if stats is not None else None,
        )
        for namespace, label in _CACHE_NAMESPACES.items()
    ]
    return CacheOverviewResponse(redis=redis_stats, namespaces=namespaces)


class CacheFlushRequest(BaseModel):
    confirm_namespace: str


class CacheFlushResponse(BaseModel):
    namespace: str
    deleted_count: int


@router.post("/cache/{namespace}/flush", response_model=CacheFlushResponse)
def flush_cache_namespace(namespace: str, req: CacheFlushRequest) -> CacheFlushResponse:
    if namespace not in _CACHE_NAMESPACES:
        raise HTTPException(status_code=404, detail=f"Namespace cache không tồn tại: {namespace}")
    if req.confirm_namespace != namespace:
        raise HTTPException(
            status_code=400,
            detail="Tên namespace xác nhận không khớp. Vui lòng gõ đúng tên namespace để xác nhận xóa.",
        )
    deleted_count = flush_namespace(namespace)
    return CacheFlushResponse(namespace=namespace, deleted_count=deleted_count)


# Max chars kept from a matched clause's `trich_dan` when previewing a cache
# entry to admins. Truncated (not the full quote) per product decision — a
# cached verdict may echo verbatim contract text (name/price/address), and
# `legal-safety.md` asks that full contract content not be surfaced outside
# the reviewed contract's own UI.
_CACHE_ENTRY_PREVIEW_CHARS = 110


def _truncate_preview(text: str, limit: int = _CACHE_ENTRY_PREVIEW_CHARS) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "…"


class CacheEntryPreview(BaseModel):
    digest: str
    ttl_seconds: int | None
    loai_hop_dong: str | None = None
    model: str | None = None
    muc_rui_ro_tong: str | None = None
    red_flags_count: int = 0
    unfair_count: int = 0
    trich_dan_preview: str | None = None


def _build_entry_preview(namespace: str, key: str, ttl_seconds: int | None, value: dict | None) -> CacheEntryPreview:
    digest = key[len(namespace) + 1:]
    if value is None:
        return CacheEntryPreview(digest=digest, ttl_seconds=ttl_seconds)

    danh_gia = value.get("danh_gia") or {}
    red_flags = danh_gia.get("matched_red_flags") or []
    unfair = danh_gia.get("matched_unfair_clauses") or []
    preview_source = (red_flags[0] if red_flags else unfair[0] if unfair else {}).get("trich_dan")

    return CacheEntryPreview(
        digest=digest,
        ttl_seconds=ttl_seconds,
        loai_hop_dong=value.get("loai_hop_dong"),
        model=value.get("model"),
        muc_rui_ro_tong=danh_gia.get("muc_rui_ro_tong"),
        red_flags_count=len(red_flags),
        unfair_count=len(unfair),
        trich_dan_preview=_truncate_preview(preview_source) if preview_source else None,
    )


class CacheEntriesResponse(BaseModel):
    entries: list[CacheEntryPreview]
    next_cursor: int
    done: bool


@router.get("/cache/{namespace}/entries", response_model=CacheEntriesResponse)
def get_cache_entries(namespace: str, cursor: int = 0, limit: int = 50) -> CacheEntriesResponse:
    if namespace not in _CACHE_NAMESPACES:
        raise HTTPException(status_code=404, detail=f"Namespace cache không tồn tại: {namespace}")
    limit = max(1, min(limit, 200))

    result = list_namespace_entries(namespace, cursor=cursor, count=limit)
    if result is None:
        raise HTTPException(status_code=503, detail="Redis hiện không kết nối được.")

    next_cursor, raw_entries = result
    entries = [
        _build_entry_preview(namespace, e["key"], e["ttl_seconds"], e["value"]) for e in raw_entries
    ]
    return CacheEntriesResponse(entries=entries, next_cursor=next_cursor, done=next_cursor == 0)


class CacheEntryDeleteResponse(BaseModel):
    digest: str
    deleted: bool


@router.delete("/cache/{namespace}/entries/{digest}", response_model=CacheEntryDeleteResponse)
def delete_cache_entry(namespace: str, digest: str) -> CacheEntryDeleteResponse:
    if namespace not in _CACHE_NAMESPACES:
        raise HTTPException(status_code=404, detail=f"Namespace cache không tồn tại: {namespace}")
    deleted = delete_key(namespace, f"{namespace}:{digest}")
    return CacheEntryDeleteResponse(digest=digest, deleted=deleted)

