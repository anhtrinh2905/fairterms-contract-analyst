import logging

from fastapi.testclient import TestClient

from app.core.logging import setup_logging
from app.main import app

client = TestClient(app)


def test_setup_logging_idempotent():
    setup_logging()
    before = list(logging.getLogger().handlers)
    setup_logging()  # second call must not add handlers again
    after = list(logging.getLogger().handlers)
    assert before == after


def test_request_gets_request_id_header():
    resp = client.get("/health")
    assert resp.status_code == 200
    rid = resp.headers.get("X-Request-ID")
    assert rid and len(rid) == 8


def test_request_is_logged(caplog):
    with caplog.at_level(logging.INFO, logger="app.request"):
        client.get("/health")
    messages = [r.getMessage() for r in caplog.records]
    assert any("→ GET /health" in m for m in messages)
    assert any("← GET /health" in m and "200" in m for m in messages)
