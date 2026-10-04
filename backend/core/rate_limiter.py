from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from backend.config import settings

# Initialize SlowAPI rate limiter keyed by client IP address
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Standardized response returned when client exceeds permitted request frequency.
    Returns HTTP 429 Too Many Requests with informative payload.
    """
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}. Please slow down your requests to protect portal infrastructure.",
            "error_code": "RATE_LIMIT_EXCEEDED"
        }
    )
