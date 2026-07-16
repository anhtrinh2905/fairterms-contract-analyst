"""HTTP request logging middleware."""

from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("app.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log each request with a short id, status code and duration.

    The id is also returned in the `X-Request-ID` response header so a client
    log line can be matched to a server log line.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = uuid.uuid4().hex[:8]
        start = time.perf_counter()
        logger.info("→ %s %s [%s]", request.method, request.url.path, request_id)

        try:
            response = await call_next(request)
        except Exception:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.exception(
                "✗ %s %s [%s] unhandled error after %.1fms",
                request.method,
                request.url.path,
                request_id,
                elapsed_ms,
            )
            raise

        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "← %s %s [%s] %d %.1fms",
            request.method,
            request.url.path,
            request_id,
            response.status_code,
            elapsed_ms,
        )
        response.headers["X-Request-ID"] = request_id
        return response
