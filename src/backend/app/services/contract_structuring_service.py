from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, Field, ValidationError

from app.services.gemini_ocr_service import (
    DEFAULT_MAX_RETRIES,
    DEFAULT_RETRY_BASE_DELAY,
    DEFAULT_RETRY_MAX_DELAY,
    GeminiOCRAPIError,
    GeminiOCRConfigError,
    GeminiOCREmptyResponseError,
    GeminiOCRError,
    GeminiOCRRateLimitError,
    clean_markdown_for_structuring,
    extract_markdown_from_response,
    load_system_prompt,
    map_gemini_exception,
    run_with_gemini_retry,
    strip_markdown_code_fence,
)
from app.services.gemini_key_pool import (
    GeminiPoolConfigError,
    GeminiPoolRateLimitError,
    gemini_structuring_concurrency_slot,
    get_gemini_key_pool,
)
from app.services.langsmith_tracing import record_gemini_usage, trace_chain
from app.services.structured_field_normalize import (
    collect_missing_fields,
    normalize_structured_dict,
)

DEFAULT_PROMPT_PATH = Path(__file__).with_name("contract_structuring_system.txt")
METADATA_PROMPT_PATH = Path(__file__).with_name("contract_structuring_metadata.txt")
CLAUSES_PROMPT_PATH = Path(__file__).with_name("contract_structuring_clauses.txt")
DEFAULT_STRUCTURING_MODEL = "gemini-2.5-flash-lite"
DEFAULT_USER_PROMPT = (
    "Extract all structured data from the contract content below and return JSON "
    "per the specified schema."
)
METADATA_USER_PROMPT = (
    "Extract contract metadata (general info, both parties, equipment appendix) "
    "from the text below and return JSON per the specified schema."
)
CLAUSES_USER_PROMPT = (
    "Extract the clause list (clauses) from the contract body below and return "
    "JSON per the specified schema."
)
DEFAULT_STRUCTURING_MODE = "hybrid_safe"
# DOCX / PDF số đã trích xuất được toàn bộ nội dung không qua OCR, nên gửi trọn
# Markdown cho Gemini structuring (llm_full) cho kết quả đầy đủ hơn regex local.
DEFAULT_DIGITAL_STRUCTURING_MODE = "llm_full"
# extraction_method (DocumentKind.value) được coi là "văn bản số" — không phải OCR ảnh.
DIGITAL_EXTRACTION_METHODS = frozenset({"docx", "doc", "digital_pdf"})


class ContractParty(BaseModel):
    role_label: str | None = None
    full_name: str | None = None
    id_number: str | None = None
    id_issue_date: str | None = None
    id_issue_place: str | None = None
    phone: str | None = None
    permanent_address: str | None = None


class ContractInfo(BaseModel):
    contract_type: str | None = None
    contract_number: str | None = None
    sign_date: str | None = None
    term_text: str | None = None
    rent_price: str | None = None
    sale_price: str | None = None
    deposit: str | None = None
    area: str | None = None
    property_address: str | None = None
    can_ho_so: str | None = None
    toa_nha: str | None = None
    payment_schedule: list[str] = Field(default_factory=list)
    certificate_no: str | None = None
    certificate_issue: str | None = None
    notarization: str | None = None
    thua_dat_so: str | None = None
    to_ban_do_so: str | None = None
    muc_dich_su_dung: str | None = None


class ContractEquipmentItem(BaseModel):
    index: int | None = None
    name: str | None = None
    quantity: int | None = None
    condition: str | None = None


class ContractClause(BaseModel):
    article_no: str | None = None
    title: str | None = None
    items: list[str] = Field(default_factory=list)


class StructuredContractResponse(BaseModel):
    contract_info: ContractInfo
    party_a: ContractParty
    party_b: ContractParty
    appendix_equipment: list[ContractEquipmentItem]
    clauses: list[ContractClause] = Field(default_factory=list)


class MetadataStructuringResponse(BaseModel):
    contract_info: ContractInfo
    party_a: ContractParty
    party_b: ContractParty
    appendix_equipment: list[ContractEquipmentItem] = Field(default_factory=list)


class ClausesStructuringResponse(BaseModel):
    clauses: list[ContractClause] = Field(default_factory=list)


class StructuredContract(StructuredContractResponse):
    original_markdown: str | None = None


@dataclass(frozen=True)
class StructuringOutcome:
    contract: StructuredContract
    method: str
    llm_calls: int
    structuring_ms: int


def structured_to_public_dict(
    structured: StructuredContract,
    *,
    transaction: str | None = None,
) -> tuple[dict, list[dict[str, str]]]:
    data = structured.model_dump(exclude={"original_markdown"})
    data = normalize_structured_dict(data)
    missing = collect_missing_fields(data, transaction=transaction)
    return data, missing


class ContractStructuringService:
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        prompt_path: Path | None = None,
        metadata_prompt_path: Path | None = None,
        clauses_prompt_path: Path | None = None,
        max_retries: int = DEFAULT_MAX_RETRIES,
        retry_base_delay: float = DEFAULT_RETRY_BASE_DELAY,
        retry_max_delay: float = DEFAULT_RETRY_MAX_DELAY,
        client_factory=None,
    ):
        self.api_key = api_key if api_key is not None else os.getenv("GEMINI_API_KEY", "")
        self.model = model or os.getenv("GEMINI_STRUCTURING_MODEL") or DEFAULT_STRUCTURING_MODEL
        self.prompt_path = prompt_path or DEFAULT_PROMPT_PATH
        self.metadata_prompt_path = metadata_prompt_path or METADATA_PROMPT_PATH
        self.clauses_prompt_path = clauses_prompt_path or CLAUSES_PROMPT_PATH
        self.max_retries = max_retries
        self.retry_base_delay = retry_base_delay
        self.retry_max_delay = retry_max_delay
        self.client_factory = client_factory

    @trace_chain(name="ocr_structure_contract")
    def structure_contract(
        self,
        markdown: str,
        *,
        extraction_method: str | None = None,
        contract_kind: str | None = None,
    ) -> StructuringOutcome:
        if not markdown.strip():
            raise GeminiOCREmptyResponseError("OCR markdown is empty, cannot structure contract")

        started = time.perf_counter()
        mode = self._resolve_mode(extraction_method)
        cleaned_markdown = clean_markdown_for_structuring(markdown)
        if not cleaned_markdown:
            cleaned_markdown = markdown

        if mode == "llm_full":
            contract = self._structure_llm_full(cleaned_markdown)
            contract.original_markdown = markdown
            return self._outcome(contract, "llm_full", 1, started)

        if mode == "hybrid_safe":
            return self._structure_hybrid_safe(
                cleaned_markdown, markdown, started, contract_kind=contract_kind
            )

        return self._structure_hybrid_gap_fill(
            cleaned_markdown, markdown, started, contract_kind=contract_kind
        )

    def _resolve_mode(self, extraction_method: str | None) -> str:
        """Chọn mode structuring theo nguồn trích xuất.

        Văn bản số (DOCX/DOC/PDF số) mặc định dùng llm_full vì đã có toàn bộ nội
        dung; ảnh/PDF scan dùng mode chung (hybrid_safe) để tiết kiệm và ổn định.
        """
        method = (extraction_method or "").strip().lower()
        if method in DIGITAL_EXTRACTION_METHODS:
            configured = os.getenv("GEMINI_STRUCTURING_MODE_DIGITAL")
            if configured and configured.strip():
                return configured.strip().lower()
            return DEFAULT_DIGITAL_STRUCTURING_MODE
        return (os.getenv("GEMINI_STRUCTURING_MODE") or DEFAULT_STRUCTURING_MODE).strip().lower()

    def _structure_hybrid_safe(
        self,
        cleaned_markdown: str,
        original_markdown: str,
        started: float,
        *,
        contract_kind: str | None = None,
    ) -> StructuringOutcome:
        """Level 2: Gemini always for metadata; local regex only for clause structure."""
        from app.services.contract_local_structuring import (
            assess_structuring_needs,
            extract_clauses_slice,
            extract_preamble_slice,
            merge_metadata_prefer_gemini,
            merge_structured_contract,
            parse_contract_structure,
        )

        local = parse_contract_structure(cleaned_markdown)
        needs = assess_structuring_needs(
            local, cleaned_markdown, contract_kind=contract_kind
        )

        if needs.needs_full_llm:
            contract = self._structure_llm_full(cleaned_markdown)
            contract.original_markdown = original_markdown
            return self._outcome(contract, "llm_full", 1, started)

        self._ensure_gemini_configured()
        metadata = self._structure_metadata_llm(
            extract_preamble_slice(cleaned_markdown, contract_kind=contract_kind)
        )
        merged = merge_metadata_prefer_gemini(local, metadata)
        llm_calls = 1
        method = "hybrid_safe"

        if needs.needs_clauses_llm:
            clauses = self._structure_clauses_llm(extract_clauses_slice(cleaned_markdown))
            merged = merge_structured_contract(merged, clauses=clauses.clauses)
            llm_calls += 1
            method = "hybrid_safe_both"

        merged.original_markdown = original_markdown
        return self._outcome(merged, method, llm_calls, started)

    def _structure_hybrid_gap_fill(
        self,
        cleaned_markdown: str,
        original_markdown: str,
        started: float,
        *,
        contract_kind: str | None = None,
    ) -> StructuringOutcome:
        """Level 1: local first; Gemini only when gap detection says metadata/clauses missing."""
        from app.services.contract_local_structuring import (
            assess_structuring_needs,
            extract_clauses_slice,
            extract_preamble_slice,
            merge_structured_contract,
            parse_contract_structure,
        )

        local = parse_contract_structure(cleaned_markdown)
        needs = assess_structuring_needs(
            local, cleaned_markdown, contract_kind=contract_kind
        )

        if needs.method == "local":
            local.original_markdown = original_markdown
            return self._outcome(local, "local", 0, started)

        if needs.needs_full_llm:
            contract = self._structure_llm_full(cleaned_markdown)
            contract.original_markdown = original_markdown
            return self._outcome(contract, "llm_full", 1, started)

        self._ensure_gemini_configured()
        merged = local
        llm_calls = 0

        if needs.needs_metadata_llm:
            metadata_slice = extract_preamble_slice(
                cleaned_markdown, contract_kind=contract_kind
            )
            metadata = self._structure_metadata_llm(metadata_slice)
            merged = merge_structured_contract(merged, metadata=metadata)
            llm_calls += 1

        if needs.needs_clauses_llm:
            clauses_slice = extract_clauses_slice(cleaned_markdown)
            clauses = self._structure_clauses_llm(clauses_slice)
            merged = merge_structured_contract(merged, clauses=clauses.clauses)
            llm_calls += 1

        merged.original_markdown = original_markdown
        return self._outcome(merged, needs.method, llm_calls, started)

    def _outcome(
        self,
        contract: StructuredContract,
        method: str,
        llm_calls: int,
        started: float,
    ) -> StructuringOutcome:
        structuring_ms = int((time.perf_counter() - started) * 1000)
        return StructuringOutcome(
            contract=contract,
            method=method,
            llm_calls=llm_calls,
            structuring_ms=structuring_ms,
        )

    def _ensure_gemini_configured(self) -> None:
        if self.client_factory:
            return
        if not (
            os.getenv("GEMINI_AI_STUDIO_KEY", "").strip()
            or os.getenv("GEMINI_API_KEY", "").strip()
            or os.getenv("GEMINI_GCP_PLATFORM_KEYS", "").strip()
        ):
            raise GeminiOCRConfigError()

    def _structure_llm_full(self, markdown: str) -> StructuredContract:
        self._ensure_gemini_configured()
        system_prompt = load_system_prompt(self.prompt_path)
        response = run_with_gemini_retry(
            lambda: self._generate_json_content(
                markdown,
                system_prompt=system_prompt,
                user_prompt=DEFAULT_USER_PROMPT,
                response_schema=StructuredContractResponse.model_json_schema(),
            ),
            max_retries=self.max_retries,
            base_delay=self.retry_base_delay,
            max_delay=self.retry_max_delay,
        )
        return self._parse_structured_payload(
            strip_markdown_code_fence(extract_markdown_from_response(response)).strip()
        )

    def _structure_metadata_llm(self, markdown_slice: str) -> StructuredContract:
        system_prompt = load_system_prompt(self.metadata_prompt_path)
        response = run_with_gemini_retry(
            lambda: self._generate_json_content(
                markdown_slice,
                system_prompt=system_prompt,
                user_prompt=METADATA_USER_PROMPT,
                response_schema=MetadataStructuringResponse.model_json_schema(),
            ),
            max_retries=self.max_retries,
            base_delay=self.retry_base_delay,
            max_delay=self.retry_max_delay,
        )
        raw_text = strip_markdown_code_fence(extract_markdown_from_response(response)).strip()
        payload = self._load_json_object(raw_text)
        data = MetadataStructuringResponse.model_validate(payload)
        return StructuredContract(
            contract_info=data.contract_info,
            party_a=data.party_a,
            party_b=data.party_b,
            appendix_equipment=data.appendix_equipment,
            clauses=[],
        )

    def _structure_clauses_llm(self, markdown_slice: str) -> ClausesStructuringResponse:
        system_prompt = load_system_prompt(self.clauses_prompt_path)
        response = run_with_gemini_retry(
            lambda: self._generate_json_content(
                markdown_slice,
                system_prompt=system_prompt,
                user_prompt=CLAUSES_USER_PROMPT,
                response_schema=ClausesStructuringResponse.model_json_schema(),
            ),
            max_retries=self.max_retries,
            base_delay=self.retry_base_delay,
            max_delay=self.retry_max_delay,
        )
        raw_text = strip_markdown_code_fence(extract_markdown_from_response(response)).strip()
        payload = self._load_json_object(raw_text)
        return ClausesStructuringResponse.model_validate(payload)

    def _parse_structured_payload(self, raw_text: str) -> StructuredContract:
        payload = self._load_json_object(raw_text)
        payload.pop("original_markdown", None)
        data = StructuredContractResponse.model_validate(payload)
        return StructuredContract(**data.model_dump())

    def _load_json_object(self, raw_text: str) -> dict:
        if not raw_text:
            raise GeminiOCREmptyResponseError("Gemini returned empty structured JSON")
        try:
            payload = json.loads(raw_text)
            if not isinstance(payload, dict):
                raise ValueError("Structured payload must be a JSON object")
            return payload
        except (json.JSONDecodeError, ValueError) as exc:
            raise GeminiOCRAPIError("Gemini returned invalid structured JSON") from exc

    def _generate_json_content(
        self,
        markdown: str,
        *,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict,
    ):
        try:
            if self.client_factory:
                client, types = self.client_factory(self.api_key)
                with gemini_structuring_concurrency_slot():
                    response = client.models.generate_content(
                        model=self.model,
                        contents=[f"{user_prompt}\n\n{markdown}"],
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                            temperature=0,
                            response_mime_type="application/json",
                            response_schema=response_schema,
                        ),
                    )
                    record_gemini_usage(response, model=self.model)
                    return response

            try:
                pool = get_gemini_key_pool()
            except GeminiPoolConfigError as exc:
                raise GeminiOCRConfigError(str(exc)) from exc
            types = pool.types

            with gemini_structuring_concurrency_slot():
                try:
                    with pool.acquire() as endpoint:
                        response = endpoint.client.models.generate_content(
                            model=self.model,
                            contents=[f"{user_prompt}\n\n{markdown}"],
                            config=types.GenerateContentConfig(
                                system_instruction=system_prompt,
                                temperature=0,
                                response_mime_type="application/json",
                                response_schema=response_schema,
                            ),
                        )
                        record_gemini_usage(response, model=self.model)
                        return response
                except GeminiPoolRateLimitError as exc:
                    raise GeminiOCRRateLimitError(retry_after=exc.retry_after) from exc
        except GeminiOCRError:
            raise
        except Exception as exc:
            raise map_gemini_exception(exc) from exc

    def _generate_structured_content(self, markdown: str, system_prompt: str):
        """Backward-compatible hook for tests."""
        return self._generate_json_content(
            markdown,
            system_prompt=system_prompt,
            user_prompt=DEFAULT_USER_PROMPT,
            response_schema=StructuredContractResponse.model_json_schema(),
        )


@lru_cache(maxsize=1)
def get_contract_structuring_service() -> ContractStructuringService:
    return ContractStructuringService(
        max_retries=int(os.getenv("GEMINI_MAX_RETRIES", str(DEFAULT_MAX_RETRIES))),
        retry_base_delay=float(os.getenv("GEMINI_RETRY_BASE_DELAY", str(DEFAULT_RETRY_BASE_DELAY))),
        retry_max_delay=float(os.getenv("GEMINI_RETRY_MAX_DELAY", str(DEFAULT_RETRY_MAX_DELAY))),
    )
