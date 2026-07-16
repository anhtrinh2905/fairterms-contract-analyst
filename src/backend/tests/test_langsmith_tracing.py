from app.services.langsmith_tracing import configure_langsmith, is_langsmith_enabled, trace_llm


def test_configure_langsmith_disabled_without_key(monkeypatch) -> None:
    monkeypatch.setenv("LANGSMITH_API_KEY", "")
    monkeypatch.setenv("LANGSMITH_TRACING", "true")
    from app.core.config import Settings

    settings = Settings()
    monkeypatch.setattr("app.services.langsmith_tracing.settings", settings)
    assert configure_langsmith() is False
    assert is_langsmith_enabled() is False


def test_trace_llm_noop_when_disabled(monkeypatch) -> None:
    monkeypatch.setattr("app.services.langsmith_tracing._enabled", False)

    @trace_llm(name="noop_test")
    def sample(x: int) -> int:
        return x + 1

    assert sample(1) == 2
