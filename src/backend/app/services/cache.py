"""Redis-backed JSON cache for expensive, deterministic LLM pipelines.

Design constraints for a legal-analysis product:

* **Fail-open** — Redis being down, slow, or returning garbage must never break
  or change the result of a request. Every operation swallows its own errors,
  logs a warning, and behaves as a cache miss / no-op.
* **Only cache successful results** — callers cache *after* a clean run, so a
  failed LLM/RAG call is never persisted.
* **Version-fingerprinted keys** — the caller is responsible for baking every
  input that changes the output (prompt version, model, checklist version,
  feature flags) into the key via :func:`build_cache_key`, so stale results
  can never outlive a logic change.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
import unicodedata
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# A successful connection is cached for the process lifetime (below). A
# *failed* attempt is only remembered for this cooldown, then retried on the
# next call — otherwise a transient failure (e.g. this process's first Redis
# call racing ahead of the Redis container's startup) would disable caching
# permanently until the backend restarts, even once Redis becomes reachable.
_REDIS_RETRY_COOLDOWN_SECONDS = 30

_redis_client: "Redis | None" = None  # noqa: F821  (redis imported lazily)
_redis_last_failure_at: float | None = None


def get_redis_client() -> "Redis | None":  # noqa: F821  (redis imported lazily)
    """Return a cached Redis client, or ``None`` if unavailable.

    Import is lazy so the backend still boots when the optional ``redis``
    package or a ``REDIS_URL`` is missing (e.g. unit tests, local runs).
    """
    global _redis_client, _redis_last_failure_at

    if _redis_client is not None:
        return _redis_client
    if not settings.redis_url:
        return None

    now = time.monotonic()
    if _redis_last_failure_at is not None and (now - _redis_last_failure_at) < _REDIS_RETRY_COOLDOWN_SECONDS:
        return None

    try:
        import redis  # local import: optional dependency

        client = redis.Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        client.ping()
        logger.info("Redis cache connected: %s", settings.redis_url)
        _redis_client = client
        _redis_last_failure_at = None
        return client
    except Exception:
        logger.warning("Redis cache unavailable; running without cache", exc_info=True)
        _redis_last_failure_at = now
        return None


def _normalize(text: str) -> str:
    """Canonicalise free text so trivial formatting differences share a key.

    Unicode NFC + collapse all runs of whitespace to single spaces + strip.
    Keeps semantically distinct text distinct while merging reflow/indent noise.
    """
    normalized = unicodedata.normalize("NFC", text)
    return " ".join(normalized.split()).strip()


def build_cache_key(namespace: str, *parts: Any) -> str:
    """Build a stable cache key from a namespace + fingerprint parts.

    The last part is treated as the large free-text payload and normalised;
    all parts are joined and hashed so the key length is bounded.
    """
    fingerprint = "\x1f".join(_normalize(str(p)) for p in parts)
    digest = hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()
    return f"{namespace}:{digest}"


def cache_get(key: str) -> dict | None:
    """Return the cached JSON dict for ``key``, or ``None`` on miss/error."""
    client = get_redis_client()
    if client is None:
        return None
    try:
        raw = client.get(key)
    except Exception:
        logger.warning("cache_get failed for %s; treating as miss", key, exc_info=True)
        return None
    if raw is None:
        return None
    try:
        value = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        logger.warning("cache_get: corrupt JSON at %s; ignoring", key)
        return None
    return value if isinstance(value, dict) else None


def cache_set(key: str, value: dict, ttl_seconds: int) -> None:
    """Store ``value`` (a JSON-serialisable dict) under ``key`` with a TTL."""
    client = get_redis_client()
    if client is None:
        return
    try:
        payload = json.dumps(value, ensure_ascii=False)
    except (TypeError, ValueError):
        logger.warning("cache_set: value not JSON-serialisable for %s; skipping", key)
        return
    try:
        client.set(key, payload, ex=ttl_seconds)
    except Exception:
        logger.warning("cache_set failed for %s; skipping", key, exc_info=True)


def count_namespace_keys(namespace: str, scan_count: int = 500) -> int | None:
    """Count keys under ``{namespace}:*`` via non-blocking SCAN (never ``KEYS``).

    Returns ``None`` when Redis is unavailable, distinct from a real ``0``.
    """
    client = get_redis_client()
    if client is None:
        return None
    try:
        return sum(1 for _ in client.scan_iter(match=f"{namespace}:*", count=scan_count))
    except Exception:
        logger.warning("count_namespace_keys failed for %s", namespace, exc_info=True)
        return None


def flush_namespace(namespace: str, scan_count: int = 500) -> int:
    """Delete every key under ``{namespace}:*`` via SCAN + UNLINK batches.

    Scoped by namespace prefix so a flush can never touch unrelated keys sharing
    the same Redis instance. Returns the number of keys removed (0 on failure,
    matching the fail-open contract of the rest of this module).
    """
    client = get_redis_client()
    if client is None:
        return 0
    deleted = 0
    batch: list[str] = []
    try:
        for key in client.scan_iter(match=f"{namespace}:*", count=scan_count):
            batch.append(key)
            if len(batch) >= scan_count:
                deleted += client.unlink(*batch)
                batch.clear()
        if batch:
            deleted += client.unlink(*batch)
    except Exception:
        logger.warning("flush_namespace failed for %s", namespace, exc_info=True)
    return deleted


def list_namespace_entries(
    namespace: str, cursor: int = 0, count: int = 50
) -> tuple[int, list[dict[str, Any]]] | None:
    """Page through ``{namespace}:*`` keys via a single non-blocking SCAN call.

    Returns ``(next_cursor, entries)`` where each entry is
    ``{"key": str, "value": dict | None, "ttl_seconds": int | None}``, or
    ``None`` when Redis is unavailable. Per Redis SCAN semantics, ``next_cursor
    == 0`` means the caller has completed a full cycle (not necessarily that
    every key was returned in one page).
    """
    client = get_redis_client()
    if client is None:
        return None
    try:
        next_cursor, keys = client.scan(cursor=cursor, match=f"{namespace}:*", count=count)
        if not keys:
            return next_cursor, []
        pipe = client.pipeline()
        for key in keys:
            pipe.get(key)
            pipe.ttl(key)
        raw = pipe.execute()
    except Exception:
        logger.warning("list_namespace_entries failed for %s", namespace, exc_info=True)
        return None

    entries = []
    for i, key in enumerate(keys):
        raw_value, ttl = raw[i * 2], raw[i * 2 + 1]
        try:
            value = json.loads(raw_value) if raw_value else None
        except (json.JSONDecodeError, TypeError):
            value = None
        entries.append({
            "key": key,
            "value": value if isinstance(value, dict) else None,
            "ttl_seconds": ttl if isinstance(ttl, int) and ttl >= 0 else None,
        })
    return next_cursor, entries


def delete_key(namespace: str, key: str) -> bool:
    """Delete a single key scoped to the ``{namespace}:`` prefix.

    Refuses to touch a key outside the given namespace even if the caller
    passes one in — the only defense between "delete this one cache entry"
    and an arbitrary Redis key deletion.
    """
    if not key.startswith(f"{namespace}:"):
        return False
    client = get_redis_client()
    if client is None:
        return False
    try:
        return bool(client.unlink(key))
    except Exception:
        logger.warning("delete_key failed for %s", key, exc_info=True)
        return False


def get_redis_stats() -> dict[str, Any] | None:
    """Return a small, display-friendly subset of Redis ``INFO``, or ``None`` if down.

    ``keyspace_hits``/``keyspace_misses`` are cumulative for the whole Redis
    instance since its last restart, not scoped to any one namespace.
    """
    client = get_redis_client()
    if client is None:
        return None
    try:
        info = client.info()
    except Exception:
        logger.warning("get_redis_stats: INFO command failed", exc_info=True)
        return None
    hits = info.get("keyspace_hits", 0)
    misses = info.get("keyspace_misses", 0)
    total = hits + misses
    return {
        "used_memory_human": info.get("used_memory_human"),
        "connected_clients": info.get("connected_clients"),
        "uptime_in_seconds": info.get("uptime_in_seconds"),
        "keyspace_hits": hits,
        "keyspace_misses": misses,
        "hit_rate": (hits / total) if total else None,
    }
