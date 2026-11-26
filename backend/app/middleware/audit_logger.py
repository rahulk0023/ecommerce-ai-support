import json
import logging
import time
from fastapi import Request

logger = logging.getLogger("audit")

# skip logging noise from these endpoints
SKIP_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc"}


def log_audit_event(event: str, **details):
    """Write a structured audit log entry without leaking secrets or PII."""
    payload = {"event": event, **details}
    logger.info(json.dumps(payload, default=str))


async def audit_log_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000, 2)

    if request.url.path not in SKIP_PATHS:
        log_audit_event(
            "http_request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

    return response
