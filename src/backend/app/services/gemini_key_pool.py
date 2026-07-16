"""Round-robin Gemini key pool across GCP Platform and AI Studio endpoints."""

from __future__ import annotations

import os
import threading
from contextlib import contextmanager
from dataclasses import dataclass, field
from enum import Enum
from functools import lru_cache

import httpx
from google import genai
from google.genai import types


class GeminiPoolConfigError(RuntimeError):
    pass


class GeminiPoolRateLimitError(RuntimeError):
    def __init__(self, message: str | None = None, retry_after: float | None = None):
        super().__init__(message or "Gemini OCR keys are rate limited")
        self.retry_after = retry_after


class GeminiEndpointKind(str, Enum):
    GCP_PLATFORM = "gcp_platform"
    AI_STUDIO = "ai_studio"


@dataclass
class GeminiEndpoint:
    kind: GeminiEndpointKind
    api_key: str
    label: str
    vertexai: bool
    semaphore: threading.BoundedSemaphore
    client: genai.Client = field(repr=False)
    disabled_until: float = 0.0


def _parse_csv_keys(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]


def _is_gcp_express_key(api_key: str) -> bool:
    return api_key.startswith("AQ.")


def create_gemini_client(api_key: str, *, vertexai: bool, timeout_seconds: int) -> genai.Client:
    if vertexai:
        http_client = httpx.Client(
            transport=httpx.HTTPTransport(local_address="0.0.0.0"),
            timeout=httpx.Timeout(float(timeout_seconds), connect=10.0),
        )
        return genai.Client(
            vertexai=True,
            api_key=api_key,
            http_options=types.HttpOptions(httpx_client=http_client),
        )
    return genai.Client(api_key=api_key)


class GeminiKeyPool:
    def __init__(
        self,
        endpoints: list[GeminiEndpoint],
        *,
        types_module=None,
        per_key_concurrency: int = 1,
    ):
        if not endpoints:
            raise GeminiPoolConfigError(
                "No Gemini OCR keys configured. Set GEMINI_GCP_PLATFORM_KEYS and "
                "GEMINI_AI_STUDIO_KEY, or legacy GEMINI_API_KEY."
            )
        self._endpoints = endpoints
        self._types = types_module or types
        self._per_key_concurrency = max(1, per_key_concurrency)
        self._lock = threading.Lock()
        self._cursor = 0

    @property
    def endpoint_count(self) -> int:
        return len(self._endpoints)

    @property
    def per_key_concurrency(self) -> int:
        return self._per_key_concurrency

    @property
    def max_parallel_calls(self) -> int:
        """Upper bound for in-flight OCR vision calls across the whole pool."""
        return self.endpoint_count * self._per_key_concurrency

    @property
    def types(self):
        return self._types

    def _ordered_endpoints(self) -> list[GeminiEndpoint]:
        import time

        now = time.time()
        with self._lock:
            start = self._cursor
            ordered = self._endpoints[start:] + self._endpoints[:start]
            self._cursor = (self._cursor + 1) % len(self._endpoints)
        available = [endpoint for endpoint in ordered if endpoint.disabled_until <= now]
        return available or ordered

    @contextmanager
    def acquire(self, *, preferred_kind: GeminiEndpointKind | None = None):
        import time

        last_error: GeminiPoolRateLimitError | None = None
        candidates = self._ordered_endpoints()
        if preferred_kind is not None:
            preferred = [endpoint for endpoint in candidates if endpoint.kind == preferred_kind]
            if preferred:
                candidates = preferred + [
                    endpoint for endpoint in candidates if endpoint not in preferred
                ]

        for endpoint in candidates:
            if not endpoint.semaphore.acquire(blocking=False):
                continue
            try:
                if endpoint.disabled_until > time.time():
                    continue
                try:
                    yield endpoint
                    return
                except GeminiPoolRateLimitError as exc:
                    last_error = exc
                    cooldown = getattr(exc, "retry_after", None) or 2.0
                    endpoint.disabled_until = time.time() + min(float(cooldown), 30.0)
            finally:
                endpoint.semaphore.release()

        if last_error is not None:
            raise last_error
        raise GeminiPoolRateLimitError("All Gemini OCR keys are busy or rate limited")


def build_gemini_key_pool_from_env() -> GeminiKeyPool:
    timeout_seconds = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "300"))
    per_key_concurrency = max(
        1, int(os.getenv("GEMINI_OCR_KEY_CONCURRENCY", os.getenv("GEMINI_MAX_CONCURRENCY", "1")))
    )

    endpoints: list[GeminiEndpoint] = []
    gcp_keys = _parse_csv_keys(os.getenv("GEMINI_GCP_PLATFORM_KEYS"))
    ai_studio_key = os.getenv("GEMINI_AI_STUDIO_KEY", "").strip()
    legacy_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not gcp_keys and not ai_studio_key and legacy_key:
        if _is_gcp_express_key(legacy_key):
            gcp_keys = [legacy_key]
        else:
            ai_studio_key = legacy_key

    for index, api_key in enumerate(gcp_keys, start=1):
        endpoints.append(
            GeminiEndpoint(
                kind=GeminiEndpointKind.GCP_PLATFORM,
                api_key=api_key,
                label=f"gcp-{index}",
                vertexai=True,
                semaphore=threading.BoundedSemaphore(per_key_concurrency),
                client=create_gemini_client(api_key, vertexai=True, timeout_seconds=timeout_seconds),
            )
        )

    if ai_studio_key:
        endpoints.append(
            GeminiEndpoint(
                kind=GeminiEndpointKind.AI_STUDIO,
                api_key=ai_studio_key,
                label="ai-studio",
                vertexai=False,
                semaphore=threading.BoundedSemaphore(per_key_concurrency),
                client=create_gemini_client(
                    ai_studio_key, vertexai=False, timeout_seconds=timeout_seconds
                ),
            )
        )

    return GeminiKeyPool(endpoints, per_key_concurrency=per_key_concurrency)


@lru_cache(maxsize=1)
def get_gemini_key_pool() -> GeminiKeyPool:
    return build_gemini_key_pool_from_env()


@lru_cache(maxsize=1)
def _get_structuring_semaphore() -> threading.BoundedSemaphore:
    size = max(1, int(os.getenv("GEMINI_STRUCTURING_CONCURRENCY", "2")))
    return threading.BoundedSemaphore(size)


@contextmanager
def gemini_structuring_concurrency_slot():
    semaphore = _get_structuring_semaphore()
    semaphore.acquire()
    try:
        yield
    finally:
        semaphore.release()
