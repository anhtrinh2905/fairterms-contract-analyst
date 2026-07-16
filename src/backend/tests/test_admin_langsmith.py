from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
ADMIN_HEADERS = {"x-admin-token": "test-admin-token"}


def _with_admin_token():
    return patch("app.api.routes.admin.settings.admin_api_token", "test-admin-token")


def test_langsmith_dashboard_disabled():
    with _with_admin_token(), patch(
        "app.services.langsmith_tracing.is_langsmith_enabled", return_value=False
    ):
        resp = client.get("/admin/langsmith/dashboard", headers=ADMIN_HEADERS)
        assert resp.status_code == 200
        body = resp.json()
        assert body["enabled"] is False
        assert body["overview"]["total_runs"] == 0
        assert body["tools"] == []
        assert body["recent_errors"] == []


def test_langsmith_dashboard_requires_admin_token():
    with _with_admin_token():
        resp = client.get("/admin/langsmith/dashboard")
        assert resp.status_code == 403


def test_langsmith_dashboard_enabled_aggregates_runs():
    class FakeRun:
        def __init__(self, id, name, start_time, end_time, error=None, total_tokens=0, total_cost=None):
            self.id = id
            self.name = name
            self.start_time = start_time
            self.end_time = end_time
            self.error = error
            self.total_tokens = total_tokens
            self.total_cost = total_cost
            self.session_id = "session-1"

    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    chain_runs = [
        FakeRun("r1", "rag_query", now - timedelta(seconds=2), now),
        FakeRun("r2", "rag_query", now - timedelta(seconds=1), now, error="boom"),
    ]
    llm_runs = [
        FakeRun("l1", "analysis_complete_json", now, now, total_tokens=100, total_cost=0.01),
    ]

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def list_runs(self, *, run_type, **kwargs):
            return iter(chain_runs if run_type == "chain" else llm_runs)

        def get_run_url(self, *, run):
            return f"https://smith.langchain.com/r/{run.id}"

    with _with_admin_token(), patch(
        "app.services.langsmith_tracing.is_langsmith_enabled", return_value=True
    ), patch("langsmith.Client", FakeClient):
        resp = client.get("/admin/langsmith/dashboard?hours=1", headers=ADMIN_HEADERS)
        assert resp.status_code == 200
        body = resp.json()
        assert body["enabled"] is True
        assert body["overview"]["total_runs"] == 2
        assert body["overview"]["error_count"] == 1
        assert body["overview"]["total_tokens"] == 100
        assert len(body["recent_errors"]) == 1
        assert body["recent_errors"][0]["name"] == "rag_query"
        assert len(body["tools"]) == 1
        assert body["tools"][0]["name"] == "rag_query"
        assert body["tools"][0]["run_count"] == 2
