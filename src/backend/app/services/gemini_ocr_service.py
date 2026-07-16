from __future__ import annotations

import concurrent.futures
import os
import random
import re
import threading
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING, Any

from dotenv import load_dotenv

from app.services.langsmith_tracing import record_gemini_usage, trace_chain


def _resolve_repo_root() -> Path:
    path = Path(__file__).resolve()
    # Monorepo local: fairterms/src/backend/app/services -> parents[4]
    if len(path.parents) > 4 and (path.parents[4] / "src").is_dir():
        return path.parents[4]
    # Docker image: /app/app/services -> /app
    return path.parents[2]


PROJECT_ROOT = _resolve_repo_root()
_env_file = PROJECT_ROOT / ".env"
if _env_file.is_file():
    load_dotenv(_env_file)

DEFAULT_PROMPT_PATH = Path(__file__).with_name("contract_ocr_system.txt")
DEFAULT_OUTPUT_ROOT = PROJECT_ROOT / "outputs"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
USER_PROMPT = "Read the entire file and return only the reconstructed Markdown."
MARKDOWN_FILENAME = "reconstructed_contract.md"
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
DEFAULT_THINKING_BUDGET = 0
DEFAULT_IMAGE_MAX_SIDE = 2048
DEFAULT_IMAGE_JPEG_QUALITY = 85
IMAGE_MIME_TYPES = frozenset({"image/png", "image/jpeg"})
DEFAULT_PDF_DPI = 200
# Lower than before (was 6): the Gemini free tier RPM is small, so a single
# multi-page upload fired enough parallel calls to trip 429s. The global
# semaphore below caps total in-flight calls across all requests.
DEFAULT_PDF_PAGE_CONCURRENCY = 3
DEFAULT_PDF_IMAGE_JPEG_QUALITY = 90
DEFAULT_MAX_IMAGES = 30
HIGH_QUALITY_IMAGE_MAX_SIDE = 3072
HIGH_QUALITY_IMAGE_JPEG_QUALITY = 92

# Retry/backoff and global throttling for Gemini calls.
DEFAULT_MAX_RETRIES = 4
DEFAULT_RETRY_BASE_DELAY = 1.0
DEFAULT_RETRY_MAX_DELAY = 30.0
DEFAULT_MAX_CONCURRENCY = 4

from app.services.document_extractor import (
    DocumentKind,
    DocumentValidationError,
    IMAGE_EXTENSIONS,
    MIME_BY_EXTENSION,
    SUPPORTED_EXTENSIONS,
    classify_pdf_pages,
    extract_contract_text_snippet,
    extract_doc_markdown,
    extract_docx_markdown,
    extract_pdf_markdown,
    extract_pdf_page_text,
    plain_text_to_markdown,
    validate_contract_upload_extended,
)
from app.services.contract_kind import (
    ApartmentTransaction,
    ContractKindDetection,
    UnsupportedContractError,
    UNSUPPORTED_CONTRACT_MESSAGE,
    classify_supported_apartment,
    detect_contract_kind,
    ensure_supported_apartment_contract,
    resolve_ocr_prompt_path,
)
from app.services.ocr_field_validation import validate_ocr_markdown

if TYPE_CHECKING:
    from app.services.gemini_key_pool import GeminiKeyPool


class GeminiOCRError(RuntimeError):
    status_code = 500
    client_message = "OCR failed"

    def __init__(self, message: str | None = None):
        super().__init__(message or self.client_message)


class GeminiOCRConfigError(GeminiOCRError):
    status_code = 500
    client_message = (
        "Gemini OCR keys are not configured. Set GEMINI_GCP_PLATFORM_KEYS and "
        "GEMINI_AI_STUDIO_KEY."
    )


class GeminiOCRValidationError(GeminiOCRError):
    status_code = 400
    client_message = "Invalid upload file"


class GeminiOCRTimeoutError(GeminiOCRError):
    status_code = 504
    client_message = "Gemini OCR request timed out"


class GeminiOCREmptyResponseError(GeminiOCRError):
    status_code = 502
    client_message = "Gemini returned an empty OCR result"


class GeminiOCRContentBlockedError(GeminiOCRError):
    status_code = 422
    client_message = "Gemini blocked the uploaded content"


class GeminiOCRUnsupportedContractError(GeminiOCRError):
    status_code = 422
    client_message = UNSUPPORTED_CONTRACT_MESSAGE


class GeminiOCRAPIError(GeminiOCRError):
    status_code = 502
    client_message = "Gemini OCR request failed"


class GeminiOCRRateLimitError(GeminiOCRError):
    status_code = 429
    client_message = "Hệ thống đang bận, vui lòng thử lại sau giây lát."

    def __init__(self, message: str | None = None, retry_after: float | None = None):
        super().__init__(message)
        self.retry_after = retry_after


class GeminiOCRServiceUnavailableError(GeminiOCRError):
    status_code = 503
    client_message = "Dịch vụ AI tạm thời quá tải, vui lòng thử lại sau."


class GeminiOCRWriteError(GeminiOCRError):
    status_code = 500
    client_message = "Could not write reconstructed Markdown"


@dataclass(frozen=True)
class GeminiOCRResult:
    success: bool
    document_id: str
    source_filename: str
    markdown_filename: str
    markdown: str
    processing_time_ms: int
    timings_ms: dict[str, Any] | None = None

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "document_id": self.document_id,
            "source_filename": self.source_filename,
            "markdown_filename": self.markdown_filename,
            "markdown": self.markdown,
            "processing_time_ms": self.processing_time_ms,
            "timings_ms": self.timings_ms,
        }


@dataclass(frozen=True)
class GeminiMultiImageOCRResult(GeminiOCRResult):
    page_count: int = 0
    image_order_used: tuple[int, ...] = ()
    order_confidence: float = 1.0
    order_warnings: tuple[str, ...] = ()

    def to_dict(self) -> dict:
        payload = super().to_dict()
        payload.update(
            {
                "page_count": self.page_count,
                "image_order_used": list(self.image_order_used),
                "order_confidence": self.order_confidence,
                "order_warnings": list(self.order_warnings),
            }
        )
        return payload


class GeminiOCRService:
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        prompt_path: Path | None = None,
        output_root: Path | None = None,
        timeout_seconds: int = 300,
        max_upload_bytes: int = MAX_UPLOAD_BYTES,
        thinking_budget: int | None = DEFAULT_THINKING_BUDGET,
        image_max_side: int = DEFAULT_IMAGE_MAX_SIDE,
        image_jpeg_quality: int = DEFAULT_IMAGE_JPEG_QUALITY,
        pdf_dpi: int = DEFAULT_PDF_DPI,
        pdf_page_concurrency: int = DEFAULT_PDF_PAGE_CONCURRENCY,
        max_retries: int = DEFAULT_MAX_RETRIES,
        retry_base_delay: float = DEFAULT_RETRY_BASE_DELAY,
        retry_max_delay: float = DEFAULT_RETRY_MAX_DELAY,
        max_images: int = DEFAULT_MAX_IMAGES,
        client_factory=None,
        key_pool: "GeminiKeyPool | None" = None,
    ):
        self.api_key = api_key if api_key is not None else os.getenv("GEMINI_API_KEY", "")
        self.model = model or os.getenv("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL
        self.prompt_path = prompt_path or DEFAULT_PROMPT_PATH
        self.output_root = output_root or DEFAULT_OUTPUT_ROOT
        self.timeout_seconds = timeout_seconds
        self.max_upload_bytes = max_upload_bytes
        self.thinking_budget = thinking_budget
        self.image_max_side = image_max_side
        self.image_jpeg_quality = image_jpeg_quality
        self.pdf_dpi = pdf_dpi
        self.pdf_page_concurrency = pdf_page_concurrency
        self.max_retries = max_retries
        self.retry_base_delay = retry_base_delay
        self.retry_max_delay = retry_max_delay
        self.max_images = max_images
        self.client_factory = client_factory
        self._key_pool = key_pool
        self._client = None
        self._types = None
        self._client_lock = threading.Lock()

    def _get_key_pool(self) -> "GeminiKeyPool":
        if self._key_pool is not None:
            return self._key_pool
        if self.client_factory is not None:
            raise GeminiOCRConfigError()
        from app.services.gemini_key_pool import GeminiPoolConfigError, get_gemini_key_pool

        try:
            return get_gemini_key_pool()
        except GeminiPoolConfigError as exc:
            raise GeminiOCRConfigError(str(exc)) from exc

    @trace_chain(name="ocr_process_contract")
    def process_contract(
        self,
        file_bytes: bytes,
        source_filename: str,
        content_type: str | None,
    ) -> GeminiOCRResult:
        started = time.perf_counter()
        safe_filename = sanitize_source_filename(source_filename)
        preprocess_started = time.perf_counter()
        try:
            mime_type, doc_kind = validate_contract_upload_extended(
                file_bytes=file_bytes,
                filename=safe_filename,
                content_type=content_type,
                max_upload_bytes=self.max_upload_bytes,
            )
        except DocumentValidationError as exc:
            raise GeminiOCRValidationError(str(exc)) from exc
        preprocess_ms = int((time.perf_counter() - preprocess_started) * 1000)

        snippet = extract_contract_text_snippet(
            file_bytes,
            safe_filename,
            doc_kind,
        )
        detection = detect_contract_kind(text=snippet, filename=safe_filename)
        if needs_vision_probe(snippet, doc_kind):
            transaction, detection = self._resolve_transaction_via_vision_probe(
                file_bytes,
                mime_type,
                doc_kind,
                safe_filename,
            )
        else:
            try:
                transaction = ensure_supported_apartment_contract(detection, snippet)
            except UnsupportedContractError as exc:
                raise GeminiOCRUnsupportedContractError(str(exc)) from exc
        prompt_path = resolve_ocr_prompt_path(transaction, self.prompt_path.parent)
        system_prompt = load_system_prompt(prompt_path)

        generation_ms = 0
        extraction_ms = 0
        page_count = 1
        extraction_method = doc_kind.value
        upload_bytes = len(file_bytes)

        if doc_kind == DocumentKind.DOCX:
            extract_started = time.perf_counter()
            markdown = extract_docx_markdown(file_bytes)
            extraction_ms = int((time.perf_counter() - extract_started) * 1000)
        elif doc_kind == DocumentKind.DOC:
            extract_started = time.perf_counter()
            markdown = extract_doc_markdown(file_bytes)
            extraction_ms = int((time.perf_counter() - extract_started) * 1000)
        elif doc_kind == DocumentKind.DIGITAL_PDF:
            extract_started = time.perf_counter()
            markdown = extract_pdf_markdown(file_bytes)
            extraction_ms = int((time.perf_counter() - extract_started) * 1000)
            try:
                import fitz

                with fitz.open(stream=file_bytes, filetype="pdf") as document:
                    page_count = document.page_count
            except Exception:
                page_count = 1
        elif doc_kind == DocumentKind.SCANNED_PDF:
            self._get_key_pool()
            markdown, render_ms, generation_ms, page_count = self._process_pdf_pages_parallel(
                file_bytes,
                system_prompt,
            )
            preprocess_ms += render_ms
        elif doc_kind == DocumentKind.MIXED_PDF:
            self._get_key_pool()
            markdown, render_ms, generation_ms, page_count = self._process_mixed_pdf(
                file_bytes,
                system_prompt,
            )
            preprocess_ms += render_ms
        else:
            self._get_key_pool()
            file_bytes, mime_type = optimize_image_for_gemini(
                file_bytes,
                mime_type,
                max_side=self.image_max_side,
                jpeg_quality=self.image_jpeg_quality,
                enhance_contrast=True,
            )
            upload_bytes = len(file_bytes)
            generation_started = time.perf_counter()
            response = self._generate_with_timeout(file_bytes, mime_type, system_prompt)
            generation_ms = int((time.perf_counter() - generation_started) * 1000)
            markdown = strip_markdown_code_fence(extract_markdown_from_response(response)).strip()

        if not markdown:
            raise GeminiOCREmptyResponseError()

        refined = detect_contract_kind(text=markdown[:4000], filename=safe_filename)
        if refined.confidence > detection.confidence:
            detection = refined
        try:
            transaction = ensure_supported_apartment_contract(detection, markdown[:4000])
        except UnsupportedContractError as exc:
            raise GeminiOCRUnsupportedContractError(str(exc)) from exc

        validation = validate_ocr_markdown(markdown, contract_kind=transaction.value)
        if validation.needs_retry and doc_kind in (DocumentKind.IMAGE, DocumentKind.SCANNED_PDF):
            retry_markdown = self._retry_ocr_higher_quality(
                file_bytes=file_bytes,
                mime_type=mime_type,
                doc_kind=doc_kind,
                system_prompt=system_prompt,
            )
            if retry_markdown:
                retry_validation = validate_ocr_markdown(
                    retry_markdown, contract_kind=transaction.value
                )
                if len(retry_validation.warnings) <= len(validation.warnings):
                    markdown = retry_markdown
                    validation = retry_validation
                    extraction_method = f"{extraction_method}_hq_retry"

        document_id = uuid.uuid4().hex
        write_started = time.perf_counter()
        self._write_markdown(document_id, markdown)
        write_ms = int((time.perf_counter() - write_started) * 1000)
        elapsed_ms = int((time.perf_counter() - started) * 1000)

        return GeminiOCRResult(
            success=True,
            document_id=document_id,
            source_filename=safe_filename,
            markdown_filename=MARKDOWN_FILENAME,
            markdown=markdown,
            processing_time_ms=elapsed_ms,
            timings_ms={
                "preprocess_ms": preprocess_ms,
                "extraction_ms": extraction_ms,
                "generation_ms": generation_ms,
                "write_ms": write_ms,
                "total_ms": elapsed_ms,
                "upload_bytes": upload_bytes,
                "page_count": page_count,
                "extraction_method": extraction_method,
                "detected_contract_kind": transaction.value,
                "supported_transaction": transaction.value,
                "detection_confidence": round(detection.confidence, 3),
                "detection_source": detection.source,
                "ocr_warnings": list(validation.warnings),
            },
        )

    def _retry_ocr_higher_quality(
        self,
        *,
        file_bytes: bytes,
        mime_type: str,
        doc_kind: DocumentKind,
        system_prompt: str,
    ) -> str:
        """Silent second pass for scan/image when critical-field validation is weak."""
        try:
            if doc_kind == DocumentKind.IMAGE:
                optimized, out_mime = optimize_image_for_gemini(
                    file_bytes,
                    mime_type,
                    max_side=max(self.image_max_side, HIGH_QUALITY_IMAGE_MAX_SIDE),
                    jpeg_quality=HIGH_QUALITY_IMAGE_JPEG_QUALITY,
                    enhance_contrast=True,
                )
                response = self._generate_with_timeout(optimized, out_mime, system_prompt)
                return strip_markdown_code_fence(extract_markdown_from_response(response)).strip()

            if doc_kind == DocumentKind.SCANNED_PDF:
                pages = render_pdf_pages(
                    file_bytes,
                    dpi=max(self.pdf_dpi, 240),
                )
                if not pages:
                    return ""
                results: dict[int, str] = {}
                self._run_parallel_page_ocr(pages[:1], system_prompt, results)
                return results.get(1, "").strip()
        except GeminiOCRError:
            return ""
        except Exception:
            return ""
        return ""

    @trace_chain(name="ocr_process_contract_images")
    def process_contract_images(
        self,
        images: list[tuple[bytes, str, str | None]],
        user_order: list[int] | None = None,
        auto_sort: bool = True,
    ) -> GeminiMultiImageOCRResult:
        from app.services.contract_image_order import (
            analyze_and_maybe_reorder_pages,
            merge_ordered_pages,
            resolve_upload_order,
            validate_image_count,
        )

        started = time.perf_counter()
        count = len(images)
        try:
            validate_image_count(count, max_images=self.max_images)
        except ValueError as exc:
            raise GeminiOCRValidationError(str(exc)) from exc

        total_bytes = sum(len(file_bytes) for file_bytes, _, _ in images)
        if total_bytes > self.max_upload_bytes:
            raise GeminiOCRValidationError(
                f"Tổng dung lượng ảnh vượt giới hạn {self.max_upload_bytes // (1024 * 1024)}MB."
            )

        preprocess_started = time.perf_counter()
        optimized: list[tuple[bytes, str]] = []
        filenames: list[str] = []
        for file_bytes, source_filename, content_type in images:
            safe_filename = sanitize_source_filename(source_filename)
            try:
                mime_type, doc_kind = validate_contract_upload_extended(
                    file_bytes=file_bytes,
                    filename=safe_filename,
                    content_type=content_type,
                    max_upload_bytes=self.max_upload_bytes,
                )
            except DocumentValidationError as exc:
                raise GeminiOCRValidationError(str(exc)) from exc
            if doc_kind != DocumentKind.IMAGE:
                raise GeminiOCRValidationError(
                    f"Tệp '{safe_filename}' không phải ảnh PNG/JPG."
                )
            file_bytes, mime_type = optimize_image_for_gemini(
                file_bytes,
                mime_type,
                max_side=self.image_max_side,
                jpeg_quality=self.image_jpeg_quality,
                enhance_contrast=True,
            )
            optimized.append((file_bytes, mime_type))
            filenames.append(safe_filename)
        preprocess_ms = int((time.perf_counter() - preprocess_started) * 1000)

        try:
            upload_order = resolve_upload_order(
                count,
                filenames,
                user_order=user_order,
                auto_sort=auto_sort,
            )
        except ValueError as exc:
            raise GeminiOCRValidationError(str(exc)) from exc

        page_count = len(upload_order)
        combined_names = " ".join(filenames)
        first_source_index = upload_order[0]
        first_bytes, first_mime = optimized[first_source_index]
        transaction, detection = self._resolve_transaction_via_vision_probe(
            first_bytes,
            first_mime,
            DocumentKind.IMAGE,
            filenames[first_source_index],
        )
        prompt_path = resolve_ocr_prompt_path(transaction, self.prompt_path.parent)
        system_prompt = load_system_prompt(prompt_path)
        pages: list[tuple[int, int, bytes]] = []
        for position, source_index in enumerate(upload_order, start=1):
            page_bytes, _mime_type = optimized[source_index]
            pages.append((position, page_count, page_bytes))

        self._get_key_pool()
        results: dict[int, str] = {}
        _, _, generation_ms, _ = self._run_parallel_page_ocr(pages, system_prompt, results)
        markdown_pages = [results.get(page_number, "").strip() for page_number, _, _ in pages]

        order_outcome = analyze_and_maybe_reorder_pages(
            markdown_pages,
            user_order_provided=user_order is not None,
            auto_sort=auto_sort,
        )
        markdown = merge_ordered_pages(order_outcome.markdown_pages)
        if not markdown:
            raise GeminiOCREmptyResponseError()

        refined = detect_contract_kind(text=markdown[:4000], filename=combined_names)
        if refined.confidence > detection.confidence:
            detection = refined
        try:
            transaction = ensure_supported_apartment_contract(detection, markdown[:4000])
        except UnsupportedContractError as exc:
            raise GeminiOCRUnsupportedContractError(str(exc)) from exc
        validation = validate_ocr_markdown(markdown, contract_kind=transaction.value)

        document_id = uuid.uuid4().hex
        write_started = time.perf_counter()
        self._write_markdown(document_id, markdown)
        write_ms = int((time.perf_counter() - write_started) * 1000)
        elapsed_ms = int((time.perf_counter() - started) * 1000)

        source_label = f"{count}_images"
        if filenames:
            source_label = f"{filenames[upload_order[0]]} (+{count - 1} ảnh)"

        final_order = [upload_order[index] for index in order_outcome.ordered_indices]

        return GeminiMultiImageOCRResult(
            success=True,
            document_id=document_id,
            source_filename=source_label,
            markdown_filename=MARKDOWN_FILENAME,
            markdown=markdown,
            processing_time_ms=elapsed_ms,
            page_count=page_count,
            image_order_used=tuple(final_order),
            order_confidence=order_outcome.confidence,
            order_warnings=tuple(order_outcome.warnings),
            timings_ms={
                "preprocess_ms": preprocess_ms,
                "extraction_ms": 0,
                "generation_ms": generation_ms,
                "write_ms": write_ms,
                "total_ms": elapsed_ms,
                "upload_bytes": total_bytes,
                "page_count": page_count,
                "extraction_method": "multi_image",
                "image_count": count,
                "detected_contract_kind": transaction.value,
                "supported_transaction": transaction.value,
                "detection_confidence": round(detection.confidence, 3),
                "detection_source": detection.source,
                "ocr_warnings": list(validation.warnings),
            },
        )

    def _load_system_prompt(self) -> str:
        return load_system_prompt(self.prompt_path)

    def _render_first_pdf_page_bytes(
        self,
        file_bytes: bytes,
        doc_kind: DocumentKind,
    ) -> bytes:
        try:
            import fitz

            with fitz.open(stream=file_bytes, filetype="pdf") as document:
                if document.page_count == 0:
                    raise GeminiOCRValidationError("PDF is empty")
                if doc_kind == DocumentKind.MIXED_PDF:
                    scanned_flags = classify_pdf_pages(document)
                    if not scanned_flags[0]:
                        raise GeminiOCRValidationError(
                            "Mixed PDF first page is not scanned"
                        )
                page = document[0]
                pixmap = page.get_pixmap(dpi=self.pdf_dpi, alpha=False)
                return pixmap.tobytes("jpg", jpg_quality=DEFAULT_PDF_IMAGE_JPEG_QUALITY)
        except GeminiOCRValidationError:
            raise
        except Exception as exc:
            raise GeminiOCRValidationError("Could not render first PDF page for OCR") from exc

    def _probe_transaction_from_vision(
        self,
        page_bytes: bytes,
        mime_type: str,
        *,
        filename_hint: str = "",
    ) -> tuple[ApartmentTransaction, ContractKindDetection]:
        """OCR one page/image with the default lease prompt to infer contract type."""
        default_tx = ApartmentTransaction.CHO_THUE_CAN_HO_CHUNG_CU
        probe_prompt_path = resolve_ocr_prompt_path(default_tx, self.prompt_path.parent)
        system_prompt = load_system_prompt(probe_prompt_path)

        optimized_bytes, out_mime = optimize_image_for_gemini(
            page_bytes,
            mime_type if mime_type in IMAGE_MIME_TYPES else "image/jpeg",
            max_side=self.image_max_side,
            jpeg_quality=self.image_jpeg_quality,
            enhance_contrast=True,
        )
        response = self._generate_with_timeout(optimized_bytes, out_mime, system_prompt)
        markdown = strip_markdown_code_fence(extract_markdown_from_response(response)).strip()
        if not markdown:
            raise GeminiOCREmptyResponseError()

        detection = detect_contract_kind(text=markdown[:4000], filename=filename_hint)
        transaction = default_transaction_from_probe(detection, markdown[:4000])
        return transaction, detection

    def _resolve_transaction_via_vision_probe(
        self,
        file_bytes: bytes,
        mime_type: str,
        doc_kind: DocumentKind,
        filename_hint: str,
    ) -> tuple[ApartmentTransaction, ContractKindDetection]:
        """Pick OCR prompt from a vision probe when local text snippet is unavailable."""
        self._get_key_pool()
        if doc_kind == DocumentKind.IMAGE:
            return self._probe_transaction_from_vision(
                file_bytes,
                mime_type,
                filename_hint=filename_hint,
            )
        if doc_kind in (DocumentKind.SCANNED_PDF, DocumentKind.MIXED_PDF):
            page_bytes = self._render_first_pdf_page_bytes(file_bytes, doc_kind)
            return self._probe_transaction_from_vision(
                page_bytes,
                "image/jpeg",
                filename_hint=filename_hint,
            )
        raise GeminiOCRValidationError("Vision probe is not supported for this file type")

    def _process_pdf_pages_parallel(
        self,
        file_bytes: bytes,
        system_prompt: str,
    ) -> tuple[str, int, int, int]:
        render_started = time.perf_counter()
        pages = render_pdf_pages(file_bytes, dpi=self.pdf_dpi)
        render_ms = int((time.perf_counter() - render_started) * 1000)
        if not pages:
            raise GeminiOCREmptyResponseError()

        results: dict[int, str] = {}
        markdown, _, generation_ms, page_count = self._run_parallel_page_ocr(
            pages,
            system_prompt,
            results,
        )
        if not markdown:
            raise GeminiOCREmptyResponseError()
        return markdown, render_ms, generation_ms, page_count

    def _process_mixed_pdf(
        self,
        file_bytes: bytes,
        system_prompt: str,
    ) -> tuple[str, int, int, int]:
        render_started = time.perf_counter()
        ocr_pages: list[tuple[int, int, bytes]] = []
        text_by_page: dict[int, str] = {}
        try:
            import fitz

            with fitz.open(stream=file_bytes, filetype="pdf") as document:
                page_count = document.page_count
                scanned_flags = classify_pdf_pages(document)
                for index, page in enumerate(document):
                    page_number = index + 1
                    if scanned_flags[index]:
                        pixmap = page.get_pixmap(dpi=self.pdf_dpi, alpha=False)
                        ocr_pages.append(
                            (
                                page_number,
                                page_count,
                                pixmap.tobytes(
                                    "jpg", jpg_quality=DEFAULT_PDF_IMAGE_JPEG_QUALITY
                                ),
                            )
                        )
                    else:
                        text_by_page[page_number] = plain_text_to_markdown(
                            extract_pdf_page_text(page)
                        )
        except Exception as exc:
            raise GeminiOCRValidationError("Could not process mixed PDF") from exc
        render_ms = int((time.perf_counter() - render_started) * 1000)

        generation_ms = 0
        ocr_results: dict[int, str] = {}
        if ocr_pages:
            _, _, generation_ms, _ = self._run_parallel_page_ocr(
                ocr_pages,
                system_prompt,
                ocr_results,
            )

        ordered_pages: list[str] = []
        all_page_numbers = [page_number for page_number, _, _ in ocr_pages] + list(text_by_page)
        total_pages = max(all_page_numbers) if all_page_numbers else 1
        for page_number in range(1, total_pages + 1):
            if page_number in text_by_page and text_by_page[page_number].strip():
                ordered_pages.append(text_by_page[page_number].strip())
            elif page_number in ocr_results and ocr_results[page_number].strip():
                ordered_pages.append(ocr_results[page_number].strip())

        markdown = merge_markdown_pages_dedup(ordered_pages).strip()
        if not markdown:
            raise GeminiOCREmptyResponseError()
        return markdown, render_ms, generation_ms, total_pages

    def _run_parallel_page_ocr(
        self,
        pages: list[tuple[int, int, bytes]],
        system_prompt: str,
        results: dict[int, str],
    ) -> tuple[str, int, int, int]:
        generation_started = time.perf_counter()
        pool = self._get_key_pool()
        max_workers = compute_pdf_ocr_max_workers(
            page_count=len(pages),
            pdf_page_concurrency=self.pdf_page_concurrency,
            pool_max_parallel=pool.max_parallel_calls,
        )
        failed: dict[int, GeminiOCRError] = {}
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {
                    executor.submit(
                        self._ocr_pdf_page,
                        page_number,
                        page_count,
                        page_bytes,
                        system_prompt,
                    ): page_number
                    for page_number, page_count, page_bytes in pages
                }
                for future in concurrent.futures.as_completed(futures, timeout=self.timeout_seconds):
                    page_number = futures[future]
                    try:
                        results[page_number] = future.result()
                    except GeminiOCRError as exc:
                        failed[page_number] = exc
        except concurrent.futures.TimeoutError as exc:
            raise GeminiOCRTimeoutError() from exc

        if failed:
            pages_by_number = {
                page_number: (page_count, page_bytes)
                for page_number, page_count, page_bytes in pages
            }
            for page_number in sorted(failed):
                page_count, page_bytes = pages_by_number[page_number]
                results[page_number] = self._ocr_pdf_page(
                    page_number,
                    page_count,
                    page_bytes,
                    system_prompt,
                )

        markdown_pages = [results.get(page_number, "").strip() for page_number, _, _ in pages]
        markdown = merge_markdown_pages_dedup(markdown_pages).strip()
        generation_ms = int((time.perf_counter() - generation_started) * 1000)
        return markdown, 0, generation_ms, len(pages)

    def _ocr_pdf_page(
        self,
        page_number: int,
        page_count: int,
        page_bytes: bytes,
        system_prompt: str,
    ) -> str:
        prompt = (
            f"This is page {page_number}/{page_count} of a Vietnamese real-estate contract "
            "(land, house, or land-use rights). "
            "Return only the reconstructed Markdown for this page. "
            "Preserve parcel numbers, GCN fields, prices, and payment tables exactly."
        )
        response = self._generate_with_retry(page_bytes, "image/jpeg", system_prompt, prompt)
        return strip_markdown_code_fence(extract_markdown_from_response(response)).strip()

    def _generate_with_retry(
        self,
        file_bytes: bytes,
        mime_type: str,
        system_prompt: str,
        user_prompt: str,
    ):
        return run_with_gemini_retry(
            lambda: self._generate_content(file_bytes, mime_type, system_prompt, user_prompt),
            max_retries=self.max_retries,
            base_delay=self.retry_base_delay,
            max_delay=self.retry_max_delay,
        )

    def _generate_with_timeout(
        self,
        file_bytes: bytes,
        mime_type: str,
        system_prompt: str,
        user_prompt: str = USER_PROMPT,
    ):
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        future = executor.submit(
            self._generate_with_retry, file_bytes, mime_type, system_prompt, user_prompt
        )
        timed_out = False
        try:
            return future.result(timeout=self.timeout_seconds)
        except concurrent.futures.TimeoutError as exc:
            timed_out = True
            raise GeminiOCRTimeoutError() from exc
        finally:
            executor.shutdown(wait=not timed_out, cancel_futures=True)

    def _generate_content(
        self,
        file_bytes: bytes,
        mime_type: str,
        system_prompt: str,
        user_prompt: str,
    ):
        config_kwargs = {
            "system_instruction": system_prompt,
            "temperature": 0,
            "response_mime_type": "text/plain",
        }
        try:
            if self.client_factory:
                client, types = self.client_factory(self.api_key)
                if self.thinking_budget is not None and hasattr(types, "ThinkingConfig"):
                    config_kwargs["thinking_config"] = types.ThinkingConfig(
                        thinking_budget=self.thinking_budget
                    )
                with gemini_concurrency_slot():
                    response = client.models.generate_content(
                        model=self.model,
                        contents=[
                            types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                            user_prompt,
                        ],
                        config=types.GenerateContentConfig(**config_kwargs),
                    )
                    record_gemini_usage(response, model=self.model)
                    return response

            pool = self._get_key_pool()
            types = pool.types
            if self.thinking_budget is not None and hasattr(types, "ThinkingConfig"):
                config_kwargs["thinking_config"] = types.ThinkingConfig(
                    thinking_budget=self.thinking_budget
                )

            from app.services.gemini_key_pool import GeminiPoolRateLimitError

            try:
                with pool.acquire() as endpoint:
                    response = endpoint.client.models.generate_content(
                        model=self.model,
                        contents=[
                            types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                            user_prompt,
                        ],
                        config=types.GenerateContentConfig(**config_kwargs),
                    )
                    record_gemini_usage(response, model=self.model)
                    return response
            except GeminiPoolRateLimitError as exc:
                raise GeminiOCRRateLimitError(retry_after=exc.retry_after) from exc
        except GeminiOCRError:
            raise
        except Exception as exc:
            raise map_gemini_exception(exc) from exc

    def _get_client_and_types(self):
        if self._client is not None and self._types is not None:
            return self._client, self._types
        with self._client_lock:
            if self._client is not None and self._types is not None:
                return self._client, self._types
            if self.client_factory:
                self._client, self._types = self.client_factory(self.api_key)
            else:
                from google import genai
                from google.genai import types

                self._client = genai.Client(api_key=self.api_key)
                self._types = types
        return self._client, self._types

    def _write_markdown(self, document_id: str, markdown: str) -> None:
        output_dir = self.output_root / document_id
        try:
            output_dir.mkdir(parents=True, exist_ok=False)
            (output_dir / MARKDOWN_FILENAME).write_text(markdown, encoding="utf-8")
        except OSError as exc:
            raise GeminiOCRWriteError() from exc


@lru_cache(maxsize=1)
def get_gemini_ocr_service() -> GeminiOCRService:
    timeout_seconds = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "300"))
    max_upload_mb = int(os.getenv("GEMINI_MAX_UPLOAD_MB", "50"))
    thinking_budget = parse_optional_int(os.getenv("GEMINI_THINKING_BUDGET"), DEFAULT_THINKING_BUDGET)
    image_max_side = int(os.getenv("GEMINI_IMAGE_MAX_SIDE", str(DEFAULT_IMAGE_MAX_SIDE)))
    image_jpeg_quality = int(os.getenv("GEMINI_IMAGE_JPEG_QUALITY", str(DEFAULT_IMAGE_JPEG_QUALITY)))
    pdf_dpi = int(os.getenv("GEMINI_PDF_DPI", str(DEFAULT_PDF_DPI)))
    pdf_page_concurrency = int(
        os.getenv("GEMINI_PDF_PAGE_CONCURRENCY", str(DEFAULT_PDF_PAGE_CONCURRENCY))
    )
    max_retries = int(os.getenv("GEMINI_MAX_RETRIES", str(DEFAULT_MAX_RETRIES)))
    retry_base_delay = float(os.getenv("GEMINI_RETRY_BASE_DELAY", str(DEFAULT_RETRY_BASE_DELAY)))
    retry_max_delay = float(os.getenv("GEMINI_RETRY_MAX_DELAY", str(DEFAULT_RETRY_MAX_DELAY)))
    max_images = int(os.getenv("GEMINI_MAX_IMAGES", str(DEFAULT_MAX_IMAGES)))
    return GeminiOCRService(
        timeout_seconds=timeout_seconds,
        max_upload_bytes=max_upload_mb * 1024 * 1024,
        thinking_budget=thinking_budget,
        image_max_side=image_max_side,
        image_jpeg_quality=image_jpeg_quality,
        pdf_dpi=pdf_dpi,
        pdf_page_concurrency=pdf_page_concurrency,
        max_retries=max_retries,
        retry_base_delay=retry_base_delay,
        retry_max_delay=retry_max_delay,
        max_images=max_images,
    )


@lru_cache(maxsize=8)
def load_system_prompt(prompt_path: Path) -> str:
    try:
        prompt = prompt_path.read_text(encoding="utf-8").strip()
    except OSError as exc:
        raise GeminiOCRConfigError("OCR system prompt file is missing or unreadable") from exc
    if not prompt:
        raise GeminiOCRConfigError("OCR system prompt file is empty")
    return prompt


def parse_optional_int(value: str | None, default: int | None) -> int | None:
    if value is None:
        return default
    value = value.strip()
    if not value:
        return None
    return int(value)


def validate_contract_upload(
    file_bytes: bytes,
    filename: str,
    content_type: str | None,
    max_upload_bytes: int = MAX_UPLOAD_BYTES,
) -> str:
    try:
        mime_type, _doc_kind = validate_contract_upload_extended(
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type,
            max_upload_bytes=max_upload_bytes,
        )
    except DocumentValidationError as exc:
        raise GeminiOCRValidationError(str(exc)) from exc
    return mime_type


def detect_mime_from_bytes(file_bytes: bytes) -> str | None:
    if file_bytes.startswith(b"%PDF"):
        return "application/pdf"
    if file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if file_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    return None


def optimize_image_for_gemini(
    file_bytes: bytes,
    mime_type: str,
    max_side: int = DEFAULT_IMAGE_MAX_SIDE,
    jpeg_quality: int = DEFAULT_IMAGE_JPEG_QUALITY,
    *,
    enhance_contrast: bool = False,
) -> tuple[bytes, str]:
    if mime_type not in IMAGE_MIME_TYPES or max_side <= 0:
        return file_bytes, mime_type

    try:
        from io import BytesIO

        from PIL import Image, ImageOps

        with Image.open(BytesIO(file_bytes)) as image:
            image = ImageOps.exif_transpose(image)
            if enhance_contrast and image.mode in ("RGB", "L"):
                image = ImageOps.autocontrast(image)
            if max(image.size) > max_side:
                image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
            if image.mode not in ("RGB", "L"):
                image = image.convert("RGB")

            output = BytesIO()
            image.save(output, format="JPEG", quality=jpeg_quality, optimize=True)
            optimized = output.getvalue()
    except Exception:
        return file_bytes, mime_type

    if len(optimized) >= len(file_bytes):
        return file_bytes, mime_type
    return optimized, "image/jpeg"


def needs_vision_probe(snippet: str, doc_kind: DocumentKind) -> bool:
    """True when contract kind cannot be inferred from local text before OCR."""
    if snippet.strip():
        return False
    return doc_kind in (
        DocumentKind.IMAGE,
        DocumentKind.SCANNED_PDF,
        DocumentKind.MIXED_PDF,
    )


def default_transaction_from_probe(
    detection: ContractKindDetection,
    text: str,
) -> ApartmentTransaction:
    transaction = classify_supported_apartment(detection, text)
    if transaction is not None:
        return transaction
    return ApartmentTransaction.CHO_THUE_CAN_HO_CHUNG_CU


def render_pdf_pages(file_bytes: bytes, dpi: int = DEFAULT_PDF_DPI) -> list[tuple[int, int, bytes]]:
    try:
        import fitz

        pages: list[tuple[int, int, bytes]] = []
        with fitz.open(stream=file_bytes, filetype="pdf") as document:
            page_count = document.page_count
            for index, page in enumerate(document, start=1):
                pixmap = page.get_pixmap(dpi=dpi, alpha=False)
                pages.append((index, page_count, pixmap.tobytes("jpg", jpg_quality=DEFAULT_PDF_IMAGE_JPEG_QUALITY)))
        return pages
    except Exception as exc:
        raise GeminiOCRValidationError("Could not render PDF pages for OCR") from exc


def sanitize_source_filename(filename: str) -> str:
    name = Path(filename or "").name.strip()
    name = re.sub(r"[\x00-\x1f\x7f]", "", name)
    return name or "uploaded_contract"


def strip_markdown_code_fence(markdown: str) -> str:
    text = markdown.strip()
    fence_match = re.fullmatch(r"```(?:markdown|md)?\s*\n?(.*?)\n?```", text, flags=re.IGNORECASE | re.DOTALL)
    if fence_match:
        return fence_match.group(1).strip()
    return text


def clean_markdown_for_structuring(markdown: str) -> str:
    cleaned_lines: list[str] = []
    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line:
            cleaned_lines.append("")
            continue
        if re.search(r"scanned with|camscanner", line, flags=re.IGNORECASE):
            continue
        if re.match(r"^==\s*End of OCR for page \d+\s*==$", line, flags=re.IGNORECASE):
            continue
        # Remove short stamp/logo noise lines while preserving Vietnamese text blocks.
        if len(line) <= 8 and re.fullmatch(r"[A-Za-z0-9\W_]+", line) and not re.search(r"[À-ỹà-ỹ]", line):
            continue
        cleaned_lines.append(raw_line)
    cleaned = "\n".join(cleaned_lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def compute_pdf_ocr_max_workers(
    *,
    page_count: int,
    pdf_page_concurrency: int,
    pool_max_parallel: int,
) -> int:
    """Cap parallel PDF page OCR workers by env limit and key-pool capacity."""
    return max(
        1,
        min(pdf_page_concurrency, page_count, max(1, pool_max_parallel)),
    )


def merge_markdown_pages_dedup(markdown_pages: list[str]) -> str:
    merged: list[str] = []
    for page in markdown_pages:
        page = page.strip()
        if not page:
            continue
        if not merged:
            merged.append(page)
            continue
        previous = merged[-1]
        if are_pages_near_duplicate(previous, page):
            continue
        merged[-1] = trim_overlapping_tail(previous, page)
        if not are_pages_near_duplicate(merged[-1], page):
            merged.append(page)
    return "\n\n".join(merged)


def are_pages_near_duplicate(left: str, right: str) -> bool:
    left_norm = normalize_whitespace(left)
    right_norm = normalize_whitespace(right)
    if not left_norm or not right_norm:
        return False
    if left_norm == right_norm:
        return True
    shorter, longer = (left_norm, right_norm) if len(left_norm) <= len(right_norm) else (right_norm, left_norm)
    if len(shorter) < 120:
        return False
    overlap_ratio = len(shorter) / max(len(longer), 1)
    return overlap_ratio >= 0.9 and shorter in longer


def trim_overlapping_tail(previous: str, current: str) -> str:
    prev_lines = [normalize_whitespace(line) for line in previous.splitlines() if normalize_whitespace(line)]
    curr_lines = [normalize_whitespace(line) for line in current.splitlines() if normalize_whitespace(line)]
    max_overlap = min(20, len(prev_lines), len(curr_lines))
    for overlap in range(max_overlap, 0, -1):
        if prev_lines[-overlap:] == curr_lines[:overlap]:
            raw_lines = previous.splitlines()
            normalized_raw_lines = [normalize_whitespace(line) for line in raw_lines]
            remove_count = 0
            for expected in reversed(prev_lines[-overlap:]):
                for index in range(len(normalized_raw_lines) - 1 - remove_count, -1, -1):
                    if normalized_raw_lines[index] == expected:
                        remove_count = len(raw_lines) - index
                        break
            if remove_count > 0:
                trimmed = "\n".join(raw_lines[:-remove_count]).strip()
                return trimmed if trimmed else previous
    return previous


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def extract_markdown_from_response(response) -> str:
    try:
        text = getattr(response, "text", None)
    except Exception as exc:
        if "safety" in str(exc).lower() or "blocked" in str(exc).lower():
            raise GeminiOCRContentBlockedError() from exc
        text = None
    if isinstance(text, str) and text.strip():
        return text

    candidates = getattr(response, "candidates", None) or []
    blocked = False
    parts_text: list[str] = []
    for candidate in candidates:
        finish_reason = str(getattr(candidate, "finish_reason", "") or "").lower()
        if "safety" in finish_reason or "block" in finish_reason:
            blocked = True
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", None) or []:
            part_text = getattr(part, "text", None)
            if part_text:
                parts_text.append(part_text)

    if parts_text:
        return "\n".join(parts_text)
    if blocked:
        raise GeminiOCRContentBlockedError()
    raise GeminiOCREmptyResponseError()


def map_gemini_exception(exc: Exception) -> GeminiOCRError:
    name = type(exc).__name__.lower()
    message = str(getattr(exc, "message", "") or exc)
    status = getattr(exc, "code", None) or getattr(exc, "status_code", None)

    if "timeout" in name or "deadline" in name or "deadline" in message.lower():
        return GeminiOCRTimeoutError()
    try:
        status_int = int(status) if status is not None else None
    except (TypeError, ValueError):
        status_int = None
    if status_int is None and ("429" in message or "resource_exhausted" in message.lower()):
        status_int = 429
    if status_int in (400, 401, 403):
        return GeminiOCRAPIError("Gemini OCR request was rejected. Check API key and request settings.")
    if status_int == 429:
        return GeminiOCRRateLimitError(retry_after=extract_retry_after_seconds(exc))
    if status_int and status_int >= 500:
        return GeminiOCRServiceUnavailableError()
    if "safety" in message.lower() or "blocked" in message.lower():
        return GeminiOCRContentBlockedError()
    return GeminiOCRAPIError()


@lru_cache(maxsize=1)
def _get_gemini_semaphore() -> threading.BoundedSemaphore:
    size = max(1, int(os.getenv("GEMINI_MAX_CONCURRENCY", str(DEFAULT_MAX_CONCURRENCY))))
    return threading.BoundedSemaphore(size)


@contextmanager
def gemini_concurrency_slot():
    """Bound the total number of in-flight Gemini calls across all requests."""
    semaphore = _get_gemini_semaphore()
    semaphore.acquire()
    try:
        yield
    finally:
        semaphore.release()


def run_with_gemini_retry(
    func,
    *,
    max_retries: int = DEFAULT_MAX_RETRIES,
    base_delay: float = DEFAULT_RETRY_BASE_DELAY,
    max_delay: float = DEFAULT_RETRY_MAX_DELAY,
):
    """Call ``func`` and retry on transient Gemini errors (429 / 5xx) with backoff."""
    last_error: GeminiOCRError | None = None
    for attempt in range(max_retries + 1):
        try:
            return func()
        except (GeminiOCRRateLimitError, GeminiOCRServiceUnavailableError) as exc:
            last_error = exc
            if attempt >= max_retries:
                break
            retry_after = getattr(exc, "retry_after", None)
            time.sleep(compute_retry_delay(attempt, retry_after, base_delay, max_delay))
    if last_error is not None:
        raise last_error
    raise GeminiOCRAPIError()


def compute_retry_delay(
    attempt: int,
    retry_after: float | None,
    base_delay: float,
    max_delay: float,
) -> float:
    if retry_after is not None and retry_after > 0:
        return min(retry_after, max_delay)
    exponential = base_delay * (2 ** attempt)
    jitter = random.uniform(0, base_delay)
    return min(exponential + jitter, max_delay)


def extract_retry_after_seconds(exc: Exception) -> float | None:
    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None)
    if headers is not None:
        try:
            header_value = headers.get("Retry-After") or headers.get("retry-after")
        except Exception:
            header_value = None
        parsed = parse_retry_after_value(header_value)
        if parsed is not None:
            return parsed

    text = str(getattr(exc, "message", "") or exc)
    pattern = r"retrydelay['\"]?\s*[:=]\s*['\"]?(\d+(?:\.\d+)?)s"
    match = re.search(pattern, text, flags=re.IGNORECASE)
    if match:
        return float(match.group(1))
    return None


def parse_retry_after_value(value) -> float | None:
    if value is None:
        return None
    value = str(value).strip()
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        # HTTP-date form is not parsed here; fall back to exponential backoff.
        return None
