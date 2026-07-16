from pathlib import Path

from app.core.runtime_config import (
    apply_runtime_config_to_environ,
    get_env_or_runtime,
    load_runtime_config,
    save_runtime_config,
)


def test_runtime_config_roundtrip(tmp_path, monkeypatch) -> None:
    config_path = tmp_path / "admin_runtime_config.json"
    monkeypatch.setattr("app.core.runtime_config.runtime_config_path", lambda: config_path)

    save_runtime_config({"DEFAULT_MODEL": "gpt-4o-mini", "NEXT_PUBLIC_CLAUSE_CONCURRENCY": 12})
    loaded = load_runtime_config()

    assert loaded["DEFAULT_MODEL"] == "gpt-4o-mini"
    assert loaded["NEXT_PUBLIC_CLAUSE_CONCURRENCY"] == 12


def test_apply_runtime_config_to_environ(tmp_path, monkeypatch) -> None:
    config_path = tmp_path / "admin_runtime_config.json"
    monkeypatch.setattr("app.core.runtime_config.runtime_config_path", lambda: config_path)
    save_runtime_config({"GEMINI_MODEL": "gemini-2.5-pro"})

    apply_runtime_config_to_environ()
    assert get_env_or_runtime("GEMINI_MODEL", "fallback") == "gemini-2.5-pro"
