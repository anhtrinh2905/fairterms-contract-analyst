import json
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.services.contract_structuring_service import (
    StructuredContractResponse,
    get_contract_structuring_service,
    structured_to_public_dict,
)
from app.services.gemini_ocr_service import (
    GeminiMultiImageOCRResult,
    GeminiOCRError,
    get_gemini_ocr_service,
)

router = APIRouter(prefix="/api/ocr", tags=["ocr"])


def _ocr_http_exception(exc: GeminiOCRError) -> HTTPException:
    headers: dict[str, str] | None = None
    retry_after = getattr(exc, "retry_after", None)
    if retry_after is not None and retry_after > 0:
        headers = {"Retry-After": str(int(retry_after))}
    return HTTPException(status_code=exc.status_code, detail=str(exc), headers=headers)


class MissingFieldItem(BaseModel):
    path: str
    label: str


class ContractOCRResponse(BaseModel):
    success: bool
    document_id: str
    source_filename: str
    markdown_filename: str
    markdown: str
    processing_time_ms: int
    timings_ms: dict[str, Any] | None = None


class ContractStructuredOCRResponse(ContractOCRResponse):
    structured: StructuredContractResponse
    missing_fields: list[MissingFieldItem] = []


class MultiImageOCRResponse(ContractOCRResponse):
    page_count: int
    image_order_used: list[int]
    order_confidence: float
    order_warnings: list[str]


class MultiImageStructuredOCRResponse(MultiImageOCRResponse):
    structured: StructuredContractResponse
    missing_fields: list[MissingFieldItem] = []


def _parse_page_order(page_order: str | None, image_count: int) -> list[int] | None:
    if not page_order or not page_order.strip():
        return None
    try:
        parsed = json.loads(page_order)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="page_order phải là JSON array hợp lệ.",
        ) from exc
    if not isinstance(parsed, list) or not all(isinstance(item, int) for item in parsed):
        raise HTTPException(status_code=400, detail="page_order phải là mảng số nguyên.")
    if len(parsed) != image_count:
        raise HTTPException(
            status_code=400,
            detail="page_order phải có cùng số phần tử với số ảnh tải lên.",
        )
    return parsed


async def _read_image_uploads(files: list[UploadFile]) -> list[tuple[bytes, str, str | None]]:
    if not files:
        raise HTTPException(status_code=400, detail="Cần ít nhất một ảnh.")
    images: list[tuple[bytes, str, str | None]] = []
    for upload in files:
        try:
            file_bytes = await upload.read()
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Could not read uploaded file") from exc
        images.append((file_bytes, upload.filename or "", upload.content_type))
    return images


def _multi_image_response(result: GeminiMultiImageOCRResult) -> MultiImageOCRResponse:
    payload = result.to_dict()
    return MultiImageOCRResponse(**payload)


def _extraction_method_of(payload: dict) -> str | None:
    timings = payload.get("timings_ms") or {}
    method = timings.get("extraction_method")
    return method if isinstance(method, str) else None


def _transaction_of(payload: dict) -> str | None:
    timings = payload.get("timings_ms") or {}
    for key in ("supported_transaction", "detected_contract_kind"):
        value = timings.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _attach_structured_payload(payload: dict, outcome) -> dict:
    transaction = _transaction_of(payload) or _contract_kind_of(payload)
    structured, missing_fields = structured_to_public_dict(
        outcome.contract,
        transaction=transaction,
    )
    timings = dict(payload.get("timings_ms") or {})
    timings["structuring_ms"] = outcome.structuring_ms
    timings["structuring_method"] = outcome.method
    timings["structuring_llm_calls"] = outcome.llm_calls
    payload["timings_ms"] = timings
    payload["structured"] = structured
    payload["missing_fields"] = missing_fields
    return payload


def _contract_kind_of(payload: dict) -> str | None:
    return _transaction_of(payload)


@router.post("/contract", response_model=ContractOCRResponse)
async def ocr_contract(file: UploadFile = File(...)) -> ContractOCRResponse:
    try:
        file_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Could not read uploaded file") from exc

    try:
        result = await run_in_threadpool(
            get_gemini_ocr_service().process_contract,
            file_bytes=file_bytes,
            source_filename=file.filename or "",
            content_type=file.content_type,
        )
    except GeminiOCRError as exc:
        raise _ocr_http_exception(exc) from exc

    return ContractOCRResponse(**result.to_dict())


@router.post("/contract/structured", response_model=ContractStructuredOCRResponse)
async def ocr_contract_structured(
    file: UploadFile = File(...),
) -> ContractStructuredOCRResponse:
    try:
        file_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Could not read uploaded file") from exc

    try:
        ocr_result = await run_in_threadpool(
            get_gemini_ocr_service().process_contract,
            file_bytes=file_bytes,
            source_filename=file.filename or "",
            content_type=file.content_type,
        )
        payload = ocr_result.to_dict()
        extraction_method = _extraction_method_of(payload)
        outcome = await run_in_threadpool(
            get_contract_structuring_service().structure_contract,
            ocr_result.markdown,
            extraction_method=extraction_method,
            contract_kind=_contract_kind_of(payload),
        )
        payload = _attach_structured_payload(payload, outcome)
        return ContractStructuredOCRResponse(**payload)
    except GeminiOCRError as exc:
        raise _ocr_http_exception(exc) from exc


@router.post("/contract/images", response_model=MultiImageOCRResponse)
async def ocr_contract_images(
    files: list[UploadFile] = File(...),
    page_order: str | None = Form(None),
    auto_sort: bool = Form(True),
) -> MultiImageOCRResponse:
    images = await _read_image_uploads(files)
    user_order = _parse_page_order(page_order, len(images))
    try:
        result = await run_in_threadpool(
            get_gemini_ocr_service().process_contract_images,
            images=images,
            user_order=user_order,
            auto_sort=auto_sort,
        )
    except GeminiOCRError as exc:
        raise _ocr_http_exception(exc) from exc
    return _multi_image_response(result)


@router.post("/contract/images/structured", response_model=MultiImageStructuredOCRResponse)
async def ocr_contract_images_structured(
    files: list[UploadFile] = File(...),
    page_order: str | None = Form(None),
    auto_sort: bool = Form(True),
) -> MultiImageStructuredOCRResponse:
    images = await _read_image_uploads(files)
    user_order = _parse_page_order(page_order, len(images))
    try:
        ocr_result = await run_in_threadpool(
            get_gemini_ocr_service().process_contract_images,
            images=images,
            user_order=user_order,
            auto_sort=auto_sort,
        )
        payload = ocr_result.to_dict()
        extraction_method = _extraction_method_of(payload)
        outcome = await run_in_threadpool(
            get_contract_structuring_service().structure_contract,
            ocr_result.markdown,
            extraction_method=extraction_method,
            contract_kind=_contract_kind_of(payload),
        )
        payload = _attach_structured_payload(payload, outcome)
        return MultiImageStructuredOCRResponse(**payload)
    except GeminiOCRError as exc:
        raise _ocr_http_exception(exc) from exc
