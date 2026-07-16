import pytest

from app.services import gemini_ocr_service as svc
from app.services.contract_structuring_service import ContractStructuringService
from app.services.gemini_ocr_service import (
    GeminiOCRAPIError,
    GeminiOCRRateLimitError,
    GeminiOCRServiceUnavailableError,
)


class FakeHeaders:
    def __init__(self, data: dict[str, str]):
        self._data = data

    def get(self, key, default=None):
        return self._data.get(key, default)


class FakeResponse:
    def __init__(self, headers: dict[str, str]):
        self.headers = FakeHeaders(headers)


class FakeAPIError(Exception):
    def __init__(self, code=None, message="", response=None):
        super().__init__(message)
        self.code = code
        self.message = message
        if response is not None:
            self.response = response


def test_map_429_returns_rate_limit_with_retry_after_header():
    exc = FakeAPIError(429, "rate limited", response=FakeResponse({"Retry-After": "12"}))
    mapped = svc.map_gemini_exception(exc)
    assert isinstance(mapped, GeminiOCRRateLimitError)
    assert mapped.status_code == 429
    assert mapped.retry_after == 12.0


def test_map_429_parses_retry_delay_from_message():
    exc = FakeAPIError(429, "RESOURCE_EXHAUSTED ... 'retryDelay': '27s'")
    mapped = svc.map_gemini_exception(exc)
    assert isinstance(mapped, GeminiOCRRateLimitError)
    assert mapped.retry_after == 27.0


def test_map_429_detected_from_message_without_code():
    mapped = svc.map_gemini_exception(Exception("Error 429 RESOURCE_EXHAUSTED"))
    assert isinstance(mapped, GeminiOCRRateLimitError)


def test_map_5xx_returns_service_unavailable():
    mapped = svc.map_gemini_exception(FakeAPIError(503, "unavailable"))
    assert isinstance(mapped, GeminiOCRServiceUnavailableError)
    assert mapped.status_code == 503


def test_map_400_is_not_retryable():
    mapped = svc.map_gemini_exception(FakeAPIError(400, "bad request"))
    assert isinstance(mapped, GeminiOCRAPIError)
    assert not isinstance(
        mapped, (GeminiOCRRateLimitError, GeminiOCRServiceUnavailableError)
    )


def test_compute_retry_delay_respects_retry_after_and_cap():
    assert svc.compute_retry_delay(0, 100.0, base_delay=1.0, max_delay=30.0) == 30.0
    assert svc.compute_retry_delay(0, 5.0, base_delay=1.0, max_delay=30.0) == 5.0


def test_compute_retry_delay_exponential_within_bounds():
    delay = svc.compute_retry_delay(2, None, base_delay=1.0, max_delay=30.0)
    assert 4.0 <= delay <= 5.0  # 2**2 base + jitter in [0, base]


def test_compute_pdf_ocr_max_workers_respects_pool_capacity():
    assert svc.compute_pdf_ocr_max_workers(
        page_count=12,
        pdf_page_concurrency=6,
        pool_max_parallel=6,
    ) == 6
    assert svc.compute_pdf_ocr_max_workers(
        page_count=12,
        pdf_page_concurrency=6,
        pool_max_parallel=3,
    ) == 3
    assert svc.compute_pdf_ocr_max_workers(
        page_count=2,
        pdf_page_concurrency=6,
        pool_max_parallel=6,
    ) == 2


def test_run_with_gemini_retry_succeeds_after_rate_limit(monkeypatch):
    monkeypatch.setattr(svc.time, "sleep", lambda _seconds: None)
    calls = {"n": 0}

    def func():
        calls["n"] += 1
        if calls["n"] < 3:
            raise GeminiOCRRateLimitError(retry_after=1)
        return "ok"

    result = svc.run_with_gemini_retry(func, max_retries=4, base_delay=0.01, max_delay=0.1)
    assert result == "ok"
    assert calls["n"] == 3


def test_run_with_gemini_retry_raises_after_exhausting(monkeypatch):
    monkeypatch.setattr(svc.time, "sleep", lambda _seconds: None)

    def func():
        raise GeminiOCRRateLimitError(retry_after=1)

    with pytest.raises(GeminiOCRRateLimitError):
        svc.run_with_gemini_retry(func, max_retries=2, base_delay=0.01, max_delay=0.1)


def test_run_with_gemini_retry_does_not_retry_non_transient(monkeypatch):
    monkeypatch.setattr(svc.time, "sleep", lambda _seconds: None)
    calls = {"n": 0}

    def func():
        calls["n"] += 1
        raise GeminiOCRAPIError("nope")

    with pytest.raises(GeminiOCRAPIError):
        svc.run_with_gemini_retry(func, max_retries=3)
    assert calls["n"] == 1


def test_structuring_uses_shared_key_pool(monkeypatch):
    monkeypatch.setenv("GEMINI_GCP_PLATFORM_KEYS", "AQ.gcp1,AQ.gcp2")
    monkeypatch.setenv("GEMINI_AI_STUDIO_KEY", "AIza-studio")
    monkeypatch.setenv("GEMINI_API_KEY", "")

    valid_json = (
        '{"contract_info": {}, "party_a": {}, "party_b": {}, '
        '"appendix_equipment": [], "clauses": []}'
    )
    labels: list[str] = []

    class FakeResp:
        text = valid_json

    class FakeModels:
        def generate_content(self, **_kwargs):
            return FakeResp()

    class FakeEndpoint:
        def __init__(self, label: str):
            self.label = label
            self.client = FakeClient()

    class FakeClient:
        models = FakeModels()

    class FakePool:
        types = type("FakeTypes", (), {"GenerateContentConfig": staticmethod(lambda **k: k)})()

        def acquire(self, **_kwargs):
            from contextlib import contextmanager

            endpoint = FakeEndpoint(labels[-1] if labels else "gcp-1")

            @contextmanager
            def _cm():
                labels.append(endpoint.label)
                yield endpoint

            return _cm()

    import app.services.contract_structuring_service as structuring_mod

    monkeypatch.setattr(structuring_mod, "get_gemini_key_pool", lambda: FakePool())

    service = structuring_mod.ContractStructuringService()
    outcome = service.structure_contract("# Hop dong\nNoi dung")
    assert labels == ["gcp-1"]
    assert outcome.method == "llm_full"


def test_structuring_retries_on_rate_limit_then_succeeds(monkeypatch):
    monkeypatch.setattr(svc.time, "sleep", lambda _seconds: None)
    valid_json = (
        '{"contract_info": {}, "party_a": {}, "party_b": {}, '
        '"appendix_equipment": [], "clauses": []}'
    )
    state = {"n": 0}

    class FakeResp:
        text = valid_json

    class FakeModels:
        def generate_content(self, **_kwargs):
            state["n"] += 1
            if state["n"] == 1:
                raise FakeAPIError(429, "RESOURCE_EXHAUSTED 'retryDelay': '1s'")
            return FakeResp()

    class FakeClient:
        models = FakeModels()

    class FakeTypes:
        @staticmethod
        def GenerateContentConfig(**kwargs):
            return kwargs

    service = ContractStructuringService(
        api_key="k",
        client_factory=lambda _key: (FakeClient(), FakeTypes),
        retry_base_delay=0.01,
        retry_max_delay=0.05,
    )
    result = service.structure_contract("# Hop dong\nNoi dung")
    assert state["n"] == 2
    assert result.contract.original_markdown == "# Hop dong\nNoi dung"


def test_optimize_image_for_gemini_accepts_jpeg_without_name_error():
    fake_jpeg = b"\xff\xd8\xff" + b"\x00" * 64
    optimized, mime = svc.optimize_image_for_gemini(fake_jpeg, "image/jpeg", max_side=0)
    assert optimized == fake_jpeg
    assert mime == "image/jpeg"


def test_process_contract_images_skips_pre_ocr_gate(monkeypatch):
    from app.services.contract_kind import (
        ApartmentTransaction,
        ContractKind,
        ContractKindDetection,
    )
    from app.services.gemini_ocr_service import GeminiMultiImageOCRResult, GeminiOCRService

    gate_calls = {"pre": 0, "post": 0}

    def fake_ensure(detection, text=""):
        if not text.strip():
            gate_calls["pre"] += 1
            raise AssertionError("pre-OCR gate should not run for images")
        gate_calls["post"] += 1
        return ApartmentTransaction.CHO_THUE_CAN_HO_CHUNG_CU

    def fake_probe(self, page_bytes, mime_type, *, filename_hint=""):
        return (
            ApartmentTransaction.CHO_THUE_CAN_HO_CHUNG_CU,
            ContractKindDetection(ContractKind.CAN_HO_CHUNG_CU, 0.9, "text"),
        )

    def fake_parallel(self, pages, system_prompt, results):
        for page_number, _, _ in pages:
            results[page_number] = "# HỢP ĐỒNG CHO THUÊ CĂN HỘ CHUNG CƯ"
        return "# HỢP ĐỒNG CHO THUÊ CĂN HỘ CHUNG CƯ", 0, 1, len(pages)

    monkeypatch.setattr(svc, "ensure_supported_apartment_contract", fake_ensure)
    monkeypatch.setattr(
        svc,
        "validate_contract_upload_extended",
        lambda **_kwargs: ("image/jpeg", svc.DocumentKind.IMAGE),
    )
    monkeypatch.setattr(
        svc,
        "optimize_image_for_gemini",
        lambda file_bytes, mime_type, **_kwargs: (file_bytes, mime_type),
    )
    monkeypatch.setattr(GeminiOCRService, "_probe_transaction_from_vision", fake_probe)
    monkeypatch.setattr(GeminiOCRService, "_run_parallel_page_ocr", fake_parallel)
    monkeypatch.setattr(GeminiOCRService, "_write_markdown", lambda self, document_id, markdown: None)
    monkeypatch.setattr(GeminiOCRService, "_get_key_pool", lambda self: type("Pool", (), {"max_parallel_calls": 4})())

    service = GeminiOCRService(api_key="k", client_factory=lambda _key: (object(), object()))
    result = service.process_contract_images(
        [
            (b"fake1", "IMG_001.jpg", "image/jpeg"),
            (b"fake2", "IMG_002.jpg", "image/jpeg"),
        ],
        user_order=[0, 1],
        auto_sort=False,
    )
    assert isinstance(result, GeminiMultiImageOCRResult)
    assert gate_calls["pre"] == 0
    assert gate_calls["post"] == 1
