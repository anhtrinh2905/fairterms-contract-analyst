from unittest.mock import patch

from fastapi.testclient import TestClient

from app.checklists.evaluator import CLAUSE_CACHE_NAMESPACE
from app.main import app

client = TestClient(app)
ADMIN_HEADERS = {"x-admin-token": "test-admin-token"}


def _with_admin_token():
    return patch("app.api.routes.admin.settings.admin_api_token", "test-admin-token")


def test_cache_overview_requires_admin_token():
    with _with_admin_token():
        resp = client.get("/admin/cache/overview")
        assert resp.status_code == 403


def test_cache_overview_redis_disabled():
    with _with_admin_token(), patch(
        "app.api.routes.admin.get_redis_stats", return_value=None
    ), patch("app.api.routes.admin.count_namespace_keys") as mock_count:
        resp = client.get("/admin/cache/overview", headers=ADMIN_HEADERS)
        assert resp.status_code == 200
        body = resp.json()
        assert body["redis"]["connected"] is False
        assert len(body["namespaces"]) == 1
        assert body["namespaces"][0]["namespace"] == CLAUSE_CACHE_NAMESPACE
        assert body["namespaces"][0]["key_count"] is None
        mock_count.assert_not_called()


def test_cache_overview_redis_enabled():
    fake_stats = {
        "used_memory_human": "1.2M",
        "connected_clients": 3,
        "uptime_in_seconds": 100,
        "keyspace_hits": 80,
        "keyspace_misses": 20,
        "hit_rate": 0.8,
    }
    with _with_admin_token(), patch(
        "app.api.routes.admin.get_redis_stats", return_value=fake_stats
    ), patch("app.api.routes.admin.count_namespace_keys", return_value=42):
        resp = client.get("/admin/cache/overview", headers=ADMIN_HEADERS)
        assert resp.status_code == 200
        body = resp.json()
        assert body["redis"]["connected"] is True
        assert body["redis"]["hit_rate"] == 0.8
        assert body["namespaces"][0]["key_count"] == 42


def test_cache_flush_requires_admin_token():
    with _with_admin_token():
        resp = client.post(
            f"/admin/cache/{CLAUSE_CACHE_NAMESPACE}/flush",
            json={"confirm_namespace": CLAUSE_CACHE_NAMESPACE},
        )
        assert resp.status_code == 403


def test_cache_flush_unknown_namespace():
    with _with_admin_token():
        resp = client.post(
            "/admin/cache/not-a-real-namespace/flush",
            headers=ADMIN_HEADERS,
            json={"confirm_namespace": "not-a-real-namespace"},
        )
        assert resp.status_code == 404


def test_cache_flush_confirm_mismatch():
    with _with_admin_token():
        resp = client.post(
            f"/admin/cache/{CLAUSE_CACHE_NAMESPACE}/flush",
            headers=ADMIN_HEADERS,
            json={"confirm_namespace": "wrong-name"},
        )
        assert resp.status_code == 400


def test_cache_flush_success():
    with _with_admin_token(), patch(
        "app.api.routes.admin.flush_namespace", return_value=5
    ) as mock_flush:
        resp = client.post(
            f"/admin/cache/{CLAUSE_CACHE_NAMESPACE}/flush",
            headers=ADMIN_HEADERS,
            json={"confirm_namespace": CLAUSE_CACHE_NAMESPACE},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["namespace"] == CLAUSE_CACHE_NAMESPACE
        assert body["deleted_count"] == 5
        mock_flush.assert_called_once_with(CLAUSE_CACHE_NAMESPACE)


DIGEST = "abc123"
FULL_KEY = f"{CLAUSE_CACHE_NAMESPACE}:{DIGEST}"


def test_cache_entries_requires_admin_token():
    with _with_admin_token():
        resp = client.get(f"/admin/cache/{CLAUSE_CACHE_NAMESPACE}/entries")
        assert resp.status_code == 403


def test_cache_entries_unknown_namespace():
    with _with_admin_token():
        resp = client.get("/admin/cache/not-a-real-namespace/entries", headers=ADMIN_HEADERS)
        assert resp.status_code == 404


def test_cache_entries_redis_unavailable():
    with _with_admin_token(), patch(
        "app.api.routes.admin.list_namespace_entries", return_value=None
    ):
        resp = client.get(f"/admin/cache/{CLAUSE_CACHE_NAMESPACE}/entries", headers=ADMIN_HEADERS)
        assert resp.status_code == 503


def test_cache_entries_preview_truncates_trich_dan_and_derives_digest():
    long_quote = "X" * 200
    value = {
        "loai_hop_dong": "cho_thue_can_ho_chung_cu",
        "model": "gpt-5.4-nano-2026-03-17",
        "danh_gia": {
            "muc_rui_ro_tong": "cao",
            "matched_red_flags": [{"trich_dan": long_quote}],
            "matched_unfair_clauses": [],
        },
    }
    with _with_admin_token(), patch(
        "app.api.routes.admin.list_namespace_entries",
        return_value=(0, [{"key": FULL_KEY, "value": value, "ttl_seconds": 1000}]),
    ):
        resp = client.get(f"/admin/cache/{CLAUSE_CACHE_NAMESPACE}/entries", headers=ADMIN_HEADERS)
        assert resp.status_code == 200
        body = resp.json()
        assert body["done"] is True
        entry = body["entries"][0]
        assert entry["digest"] == DIGEST
        assert entry["muc_rui_ro_tong"] == "cao"
        assert entry["red_flags_count"] == 1
        assert len(entry["trich_dan_preview"]) <= 111  # 110 chars + ellipsis
        assert entry["trich_dan_preview"].endswith("…")


def test_cache_entries_no_matches_has_no_preview():
    value = {
        "loai_hop_dong": "cho_thue_can_ho_chung_cu",
        "model": "gpt-5.4-nano-2026-03-17",
        "danh_gia": {"muc_rui_ro_tong": "khong", "matched_red_flags": [], "matched_unfair_clauses": []},
    }
    with _with_admin_token(), patch(
        "app.api.routes.admin.list_namespace_entries",
        return_value=(0, [{"key": FULL_KEY, "value": value, "ttl_seconds": 500}]),
    ):
        resp = client.get(f"/admin/cache/{CLAUSE_CACHE_NAMESPACE}/entries", headers=ADMIN_HEADERS)
        entry = resp.json()["entries"][0]
        assert entry["trich_dan_preview"] is None
        assert entry["red_flags_count"] == 0
        assert entry["unfair_count"] == 0


def test_cache_entries_corrupt_value_falls_back_to_bare_entry():
    with _with_admin_token(), patch(
        "app.api.routes.admin.list_namespace_entries",
        return_value=(0, [{"key": FULL_KEY, "value": None, "ttl_seconds": 500}]),
    ):
        resp = client.get(f"/admin/cache/{CLAUSE_CACHE_NAMESPACE}/entries", headers=ADMIN_HEADERS)
        entry = resp.json()["entries"][0]
        assert entry["digest"] == DIGEST
        assert entry["ttl_seconds"] == 500
        assert entry["loai_hop_dong"] is None


def test_cache_entries_pagination_cursor_passthrough():
    with _with_admin_token(), patch(
        "app.api.routes.admin.list_namespace_entries", return_value=(42, [])
    ) as mock_list:
        resp = client.get(
            f"/admin/cache/{CLAUSE_CACHE_NAMESPACE}/entries?cursor=7&limit=10", headers=ADMIN_HEADERS
        )
        body = resp.json()
        assert body["next_cursor"] == 42
        assert body["done"] is False
        mock_list.assert_called_once_with(CLAUSE_CACHE_NAMESPACE, cursor=7, count=10)


def test_cache_entry_delete_requires_admin_token():
    with _with_admin_token():
        resp = client.delete(f"/admin/cache/{CLAUSE_CACHE_NAMESPACE}/entries/{DIGEST}")
        assert resp.status_code == 403


def test_cache_entry_delete_unknown_namespace():
    with _with_admin_token():
        resp = client.delete(
            f"/admin/cache/not-a-real-namespace/entries/{DIGEST}", headers=ADMIN_HEADERS
        )
        assert resp.status_code == 404


def test_cache_entry_delete_success():
    with _with_admin_token(), patch(
        "app.api.routes.admin.delete_key", return_value=True
    ) as mock_delete:
        resp = client.delete(
            f"/admin/cache/{CLAUSE_CACHE_NAMESPACE}/entries/{DIGEST}", headers=ADMIN_HEADERS
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["digest"] == DIGEST
        assert body["deleted"] is True
        mock_delete.assert_called_once_with(CLAUSE_CACHE_NAMESPACE, FULL_KEY)


def test_cache_entry_delete_not_found():
    with _with_admin_token(), patch("app.api.routes.admin.delete_key", return_value=False):
        resp = client.delete(
            f"/admin/cache/{CLAUSE_CACHE_NAMESPACE}/entries/{DIGEST}", headers=ADMIN_HEADERS
        )
        assert resp.status_code == 200
        assert resp.json()["deleted"] is False
