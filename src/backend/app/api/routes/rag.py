import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Response, UploadFile
from pydantic import BaseModel

from app.rag.documents import LegalDocumentNotFoundError, get_document, list_documents
from app.rag.pdf_render import render_document_pdf
from app.rag.pipeline import ingest_legal_markdown, retrieve
from app.rag.service import rag_query

router = APIRouter(prefix="/rag", tags=["rag"])


class IngestFileRequest(BaseModel):
    filepath: str


class IngestFileResponse(BaseModel):
    parents: int
    children: int
    status: str = "success"


class SearchRequest(BaseModel):
    query: str


class QueryRequest(BaseModel):
    query: str
    top_k: int = 10
    contract_type: str | None = None
    filters: dict | None = None


class SearchResult(BaseModel):
    content: str
    metadata: dict


class SearchResponse(BaseModel):
    results: list[SearchResult]


class CitationResponse(BaseModel):
    source_file: str
    law_title: str
    article: str
    clause: str | None = None
    point: str | None = None
    quote: str
    location: str
    score: float


class QueryResponse(BaseModel):
    answer: str
    citations: list[CitationResponse]
    retrieved_chunks: list[dict]
    confidence: str
    status: str


class IndexStatusResponse(BaseModel):
    parents: int
    children: int
    indexed: bool


class LegalDocumentInfoResponse(BaseModel):
    doc_id: str
    source_file: str
    title: str
    so_hieu: str | None = None
    loai_van_ban: str | None = None
    co_quan_ban_hanh: str | None = None
    ngay_ban_hanh: str | None = None
    ngay_hieu_luc: str | None = None
    trang_thai: str | None = None
    linh_vuc: str | None = None


class LegalDocumentListResponse(BaseModel):
    documents: list[LegalDocumentInfoResponse]


class LegalDocumentContentResponse(LegalDocumentInfoResponse):
    content: str


@router.post("/ingest-file", response_model=IngestFileResponse)
def ingest_file(req: IngestFileRequest) -> IngestFileResponse:
    counts = ingest_legal_markdown(req.filepath)
    return IngestFileResponse(parents=counts["parents"], children=counts["children"])


@router.post("/ingest-upload", response_model=IngestFileResponse)
def ingest_upload(file: UploadFile = File(...)) -> IngestFileResponse:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".md") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)
    try:
        counts = ingest_legal_markdown(tmp_path)
    finally:
        if tmp_path.exists():
            tmp_path.unlink()
    return IngestFileResponse(parents=counts["parents"], children=counts["children"])


@router.post("/ingest-sample", response_model=IngestFileResponse)
def ingest_sample() -> IngestFileResponse:
    base_dir = Path(__file__).resolve().parent.parent.parent
    sample_path = base_dir / "rag" / "data" / "luat_kinh_doanh_bat_dong_san_2023.md"
    counts = ingest_legal_markdown(sample_path)
    return IngestFileResponse(parents=counts["parents"], children=counts["children"])


@router.post("/search", response_model=SearchResponse)
def search(req: SearchRequest) -> SearchResponse:
    docs = retrieve(req.query)
    return SearchResponse(
        results=[SearchResult(content=d.page_content, metadata=d.metadata) for d in docs]
    )


@router.post("/query", response_model=QueryResponse)
def query(req: QueryRequest) -> QueryResponse:
    response = rag_query(
        req.query,
        top_k=req.top_k,
        contract_type=req.contract_type,
        filters=req.filters,
    )
    return QueryResponse(**response.to_dict())


_DOCUMENT_CACHE_CONTROL = "public, max-age=3600"


@router.get("/documents", response_model=LegalDocumentListResponse)
def get_documents(response: Response) -> LegalDocumentListResponse:
    response.headers["Cache-Control"] = _DOCUMENT_CACHE_CONTROL
    return LegalDocumentListResponse(
        documents=[LegalDocumentInfoResponse(**doc.to_dict()) for doc in list_documents()]
    )


@router.get("/documents/{doc_id}", response_model=LegalDocumentContentResponse)
def get_document_content(doc_id: str, response: Response) -> LegalDocumentContentResponse:
    try:
        info, content = get_document(doc_id)
    except LegalDocumentNotFoundError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc.args[0])) from exc
    response.headers["Cache-Control"] = _DOCUMENT_CACHE_CONTROL
    return LegalDocumentContentResponse(**info.to_dict(), content=content)


@router.get("/documents/{doc_id}/download")
def download_document(doc_id: str) -> Response:
    try:
        info, _ = get_document(doc_id)
        pdf_bytes = render_document_pdf(doc_id)
    except LegalDocumentNotFoundError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc.args[0])) from exc
    filename = f"{Path(info.source_file).stem}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Cache-Control": _DOCUMENT_CACHE_CONTROL,
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/status", response_model=IndexStatusResponse)
def get_status() -> IndexStatusResponse:
    from app.rag.retriever import get_parent_store, get_vector_store, is_knowledge_base_indexed
    parent_store = get_parent_store()
    try:
        vector_store = get_vector_store()
        child_count = vector_store._collection.count()
    except Exception:
        child_count = 0
    parent_count = len(parent_store)
    indexed = is_knowledge_base_indexed()
    return IndexStatusResponse(parents=parent_count, children=child_count, indexed=indexed)


