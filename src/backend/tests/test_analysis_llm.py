from app.services import analysis_llm


def test_resolve_provider_prefers_gcp_agent_key(monkeypatch) -> None:
    monkeypatch.setattr(analysis_llm.settings, "gcp_agent_api_key", "gcp-key")
    monkeypatch.setattr(analysis_llm.settings, "anthropic_api_key", "anthropic-key")
    monkeypatch.setattr(analysis_llm.settings, "openai_api_key", "openai-key")

    assert analysis_llm.resolve_provider() == analysis_llm.AnalysisProvider.GCP_AGENT


def test_resolve_model_uses_default(monkeypatch) -> None:
    monkeypatch.setattr(analysis_llm.settings, "gcp_agent_api_key", "gcp-key")
    monkeypatch.setattr(analysis_llm.settings, "default_model", "gemini-3.5-flash")

    assert analysis_llm.resolve_model() == "gemini-3.5-flash"


def test_resolve_openai_model_uses_default(monkeypatch) -> None:
    monkeypatch.setattr(analysis_llm.settings, "openai_api_key", "openai-key")
    monkeypatch.setattr(analysis_llm.settings, "default_model", "gpt-4o-mini")
    monkeypatch.setattr(analysis_llm.settings, "gcp_agent_api_key", "gcp-key")

    assert analysis_llm.resolve_openai_model() == "gpt-4o-mini"


def test_complete_json_openai_ignores_other_providers(monkeypatch) -> None:
    class FakeCompletions:
        def create(self, **kwargs):
            assert kwargs["model"] == "gpt-4o-mini"
            class Message:
                content = '{"matched_red_flags": []}'

            class Choice:
                message = Message()

            class Response:
                choices = [Choice()]

            return Response()

    class FakeChat:
        completions = FakeCompletions()

    class FakeClient:
        chat = FakeChat()

    monkeypatch.setattr(analysis_llm.settings, "openai_api_key", "openai-key")
    monkeypatch.setattr(analysis_llm.settings, "gcp_agent_api_key", "gcp-key")
    monkeypatch.setattr(analysis_llm.settings, "default_model", "gpt-4o-mini")
    monkeypatch.setattr(analysis_llm, "_get_openai_client", lambda: FakeClient())

    parsed, model = analysis_llm.complete_json_openai("system", "user")

    assert parsed == {"matched_red_flags": []}
    assert model == "gpt-4o-mini"


def test_openai_chat_kwargs_omits_temperature_for_gpt5() -> None:
    assert analysis_llm._openai_chat_kwargs("gpt-5.5") == {}
    assert analysis_llm._openai_chat_kwargs("gpt-4o-mini") == {"temperature": 0}


def test_complete_json_openai_omits_temperature_for_gpt5(monkeypatch) -> None:
    class FakeCompletions:
        def create(self, **kwargs):
            assert kwargs["model"] == "gpt-5.5"
            assert "temperature" not in kwargs

            class Message:
                content = '{"matched_red_flags": []}'

            class Choice:
                message = Message()

            class Response:
                choices = [Choice()]

            return Response()

    class FakeChat:
        completions = FakeCompletions()

    class FakeClient:
        chat = FakeChat()

    monkeypatch.setattr(analysis_llm.settings, "openai_api_key", "openai-key")
    monkeypatch.setattr(analysis_llm.settings, "default_model", "gpt-5.5")
    monkeypatch.setattr(analysis_llm, "_get_openai_client", lambda: FakeClient())

    parsed, model = analysis_llm.complete_json_openai("system", "user")

    assert parsed == {"matched_red_flags": []}
    assert model == "gpt-5.5"


def test_complete_json_uses_gcp_agent_client(monkeypatch) -> None:
    class FakeResponse:
        text = '{"answer": "ok"}'

    class FakeModels:
        def generate_content(self, **kwargs):
            return FakeResponse()

    class FakeClient:
        models = FakeModels()

    monkeypatch.setattr(analysis_llm.settings, "gcp_agent_api_key", "gcp-key")
    monkeypatch.setattr(analysis_llm, "_get_gcp_client", lambda: FakeClient())
    parsed, model = analysis_llm.complete_json("system", "user", model="gemini-3.5-flash")

    assert parsed == {"answer": "ok"}
    assert model == "gemini-3.5-flash"
