import pytest

from app.services.gemini_key_pool import GeminiPoolConfigError, build_gemini_key_pool_from_env


class FakeClient:
  pass


def test_build_pool_from_split_env(monkeypatch):
    monkeypatch.setenv("GEMINI_GCP_PLATFORM_KEYS", "AQ.gcp1,AQ.gcp2")
    monkeypatch.setenv("GEMINI_AI_STUDIO_KEY", "AIza-studio")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("GEMINI_OCR_KEY_CONCURRENCY", "1")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    pool = build_gemini_key_pool_from_env()
    assert pool.endpoint_count == 3
    assert pool.max_parallel_calls == 3
    labels = {endpoint.label for endpoint in pool._endpoints}
    assert labels == {"gcp-1", "gcp-2", "ai-studio"}


def test_pool_max_parallel_calls_scales_with_per_key_concurrency(monkeypatch):
    monkeypatch.setenv("GEMINI_GCP_PLATFORM_KEYS", "AQ.gcp1,AQ.gcp2")
    monkeypatch.setenv("GEMINI_AI_STUDIO_KEY", "AIza-studio")
    monkeypatch.setenv("GEMINI_OCR_KEY_CONCURRENCY", "2")

    pool = build_gemini_key_pool_from_env()
    assert pool.per_key_concurrency == 2
    assert pool.max_parallel_calls == 6


def test_legacy_aq_key_falls_back_to_gcp_platform(monkeypatch):
    monkeypatch.delenv("GEMINI_GCP_PLATFORM_KEYS", raising=False)
    monkeypatch.delenv("GEMINI_AI_STUDIO_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "AQ.legacy-key")

    pool = build_gemini_key_pool_from_env()
    assert pool.endpoint_count == 1
    assert pool._endpoints[0].vertexai is True


def test_pool_acquire_round_robin(monkeypatch):
    monkeypatch.setenv("GEMINI_GCP_PLATFORM_KEYS", "AQ.one,AQ.two")
    monkeypatch.setenv("GEMINI_AI_STUDIO_KEY", "AIza-studio")
    monkeypatch.setenv("GEMINI_API_KEY", "")

    pool = build_gemini_key_pool_from_env()
    with pool.acquire() as first:
        label_one = first.label
    with pool.acquire() as second:
        label_two = second.label
    assert label_one != label_two


def test_empty_pool_raises_config_error(monkeypatch):
    monkeypatch.delenv("GEMINI_GCP_PLATFORM_KEYS", raising=False)
    monkeypatch.delenv("GEMINI_AI_STUDIO_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(GeminiPoolConfigError):
        build_gemini_key_pool_from_env()
