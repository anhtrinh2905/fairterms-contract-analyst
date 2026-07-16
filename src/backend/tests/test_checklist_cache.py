"""Tests for the Redis clause-evaluation cache in checklists.evaluator.

The cache must:
  * serve an identical clause without re-calling the LLM (cache hit),
  * re-evaluate when the clause text or any fingerprint input changes,
  * fail open — a Redis error degrades to a normal fresh evaluation,
  * never reuse a result across a PROMPT_VERSION / feature-flag change.
"""

from __future__ import annotations

import pytest

from app.checklists import evaluator
from app.checklists.loader import Checklist, Role, RoleConvention, Signal
from app.services import cache


def _make_checklist() -> Checklist:
    return Checklist(
        checklist_id="test_checklist",
        loai_hop_dong="test_hop_dong",
        ten_hien_thi="Hợp đồng test",
        phien_ban="2.0",
        luu_y="test",
        van_ban_phap_luat_tham_chieu=[],
        convention=RoleConvention(
            ben_a=Role(key="ben_a", ma="ben_cho_thue", ten="Bên cho thuê", vi_the="manh_the"),
            ben_b=Role(key="ben_b", ma="ben_thue", ten="Bên thuê", vi_the="yeu_the"),
            protected_party="ben_b",
        ),
        required_items=[],
        signals=[
            Signal(
                id="B-R6",
                loai="red_flag",
                muc_rui_ro="cao",
                mo_ta="Bên A tự ý vào căn hộ không báo trước",
                thuoc_ben="ben_a",
                nhom="dau_hieu_lam_quyen",
                gay_bat_loi_cho="ben_b",
                can_cu=[],
                truy_van_rag="",
            )
        ],
    )


_VERDICT = {
    "phan_tich": [],
    "muc_rui_ro_tong": "khong",
    "matched_red_flags": [],
    "matched_unfair_clauses": [],
    "nhan_xet": "",
    "de_xuat_sua": "",
}


class _FakeRedis:
    """Minimal in-memory Redis stand-in (get/set with ex)."""

    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    def get(self, key: str):
        return self.store.get(key)

    def set(self, key: str, value: str, ex: int | None = None) -> None:
        self.store[key] = value


class _BrokenRedis:
    def get(self, key: str):
        raise ConnectionError("redis down")

    def set(self, key: str, value: str, ex: int | None = None) -> None:
        raise ConnectionError("redis down")


@pytest.fixture
def _base(monkeypatch):
    """Common evaluator wiring: known checklist, v2 off, no real LLM/RAG."""
    checklist = _make_checklist()
    calls = {"llm": 0}

    def fake_llm(system_prompt, user_prompt, **kwargs):
        calls["llm"] += 1
        return dict(_VERDICT), "gpt-test"

    monkeypatch.setattr(evaluator.settings, "checklist_enable_rag_citation_v2", False)
    monkeypatch.setattr(evaluator.settings, "checklist_cache_enabled", True)
    monkeypatch.setattr(evaluator, "get_checklist", lambda _: checklist)
    monkeypatch.setattr(evaluator, "complete_json_openai", fake_llm)
    monkeypatch.setattr(evaluator, "resolve_openai_model", lambda: "gpt-test")
    monkeypatch.setattr(evaluator, "retrieve", lambda *a, **k: [])
    monkeypatch.setattr(evaluator, "build_citations", lambda docs, **k: [])
    return calls


def _use_fake_redis(monkeypatch, client) -> None:
    monkeypatch.setattr(cache, "get_redis_client", lambda: client)


def test_identical_clause_served_from_cache(monkeypatch, _base):
    _use_fake_redis(monkeypatch, _FakeRedis())

    first = evaluator.evaluate_clause("test_hop_dong", "Bên A được vào nhà bất cứ lúc nào")
    second = evaluator.evaluate_clause("test_hop_dong", "Bên A được vào nhà bất cứ lúc nào")

    assert _base["llm"] == 1  # LLM called once, second served from cache
    assert first == second


def test_whitespace_variants_share_cache(monkeypatch, _base):
    _use_fake_redis(monkeypatch, _FakeRedis())

    evaluator.evaluate_clause("test_hop_dong", "Bên A được vào nhà")
    evaluator.evaluate_clause("test_hop_dong", "  Bên A   được  vào nhà  ")

    assert _base["llm"] == 1  # normalisation collapses the whitespace difference


def test_different_clause_is_cache_miss(monkeypatch, _base):
    _use_fake_redis(monkeypatch, _FakeRedis())

    evaluator.evaluate_clause("test_hop_dong", "Điều khoản A")
    evaluator.evaluate_clause("test_hop_dong", "Điều khoản B khác hẳn")

    assert _base["llm"] == 2


def test_prompt_version_bump_invalidates(monkeypatch, _base):
    _use_fake_redis(monkeypatch, _FakeRedis())

    evaluator.evaluate_clause("test_hop_dong", "clause")
    monkeypatch.setattr(evaluator, "PROMPT_VERSION", evaluator.PROMPT_VERSION + 1)
    evaluator.evaluate_clause("test_hop_dong", "clause")

    assert _base["llm"] == 2  # version bump changes the key -> re-evaluated


def test_feature_flag_change_invalidates(monkeypatch, _base):
    _use_fake_redis(monkeypatch, _FakeRedis())

    evaluator.evaluate_clause("test_hop_dong", "clause")
    # v2 changes the whole pipeline; a v1 cache entry must not be reused.
    monkeypatch.setattr(evaluator.settings, "checklist_enable_rag_citation_v2", True)
    monkeypatch.setattr(
        evaluator, "select_citations", lambda *a, **k: {"selected": [], "none_apply": True}
    )
    evaluator.evaluate_clause("test_hop_dong", "clause")

    assert _base["llm"] == 2


def test_redis_failure_is_fail_open(monkeypatch, _base):
    _use_fake_redis(monkeypatch, _BrokenRedis())

    # Both calls must succeed despite Redis raising on get/set.
    first = evaluator.evaluate_clause("test_hop_dong", "clause")
    second = evaluator.evaluate_clause("test_hop_dong", "clause")

    assert first["loai_hop_dong"] == "test_hop_dong"
    assert second["loai_hop_dong"] == "test_hop_dong"
    assert _base["llm"] == 2  # no caching, but no crash either


def test_cache_disabled_never_touches_redis(monkeypatch, _base):
    monkeypatch.setattr(evaluator.settings, "checklist_cache_enabled", False)

    def _boom():
        raise AssertionError("Redis must not be used when cache is disabled")

    monkeypatch.setattr(cache, "get_redis_client", _boom)

    evaluator.evaluate_clause("test_hop_dong", "clause")
    evaluator.evaluate_clause("test_hop_dong", "clause")

    assert _base["llm"] == 2


def test_llm_error_is_not_cached(monkeypatch, _base):
    client = _FakeRedis()
    _use_fake_redis(monkeypatch, client)

    def boom(*a, **k):
        raise RuntimeError("LLM exploded")

    monkeypatch.setattr(evaluator, "complete_json_openai", boom)

    with pytest.raises(RuntimeError):
        evaluator.evaluate_clause("test_hop_dong", "clause")

    assert client.store == {}  # failed run left nothing behind


def _reset_redis_singleton():
    cache._redis_client = None
    cache._redis_last_failure_at = None


def test_get_redis_client_retries_after_cooldown(monkeypatch):
    """A failed connection attempt must self-heal after the cooldown, not stay
    broken forever like the old @lru_cache memoization did."""
    import time

    import redis as redis_pkg

    _reset_redis_singleton()
    monkeypatch.setattr(cache.settings, "redis_url", "redis://fake-host:6379/0")

    calls = {"n": 0}

    class _FailingClient:
        def ping(self):
            raise ConnectionError("redis down")

    class _OkClient:
        def ping(self):
            return True

    def fake_from_url(*args, **kwargs):
        calls["n"] += 1
        return _FailingClient() if calls["n"] == 1 else _OkClient()

    monkeypatch.setattr(redis_pkg.Redis, "from_url", staticmethod(fake_from_url))

    try:
        # First attempt fails and is remembered.
        assert cache.get_redis_client() is None
        assert calls["n"] == 1

        # Retrying immediately (within the cooldown) must not reconnect.
        assert cache.get_redis_client() is None
        assert calls["n"] == 1

        # Once the cooldown has elapsed, the next call retries and succeeds.
        cache._redis_last_failure_at = time.monotonic() - cache._REDIS_RETRY_COOLDOWN_SECONDS - 1
        assert cache.get_redis_client() is not None
        assert calls["n"] == 2
    finally:
        _reset_redis_singleton()
