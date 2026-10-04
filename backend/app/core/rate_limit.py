"""Rate limiting local para los flujos sensibles de autenticación.

El límite se mantiene por proceso para que el backend no dependa de un servicio
externo durante el desarrollo. En un despliegue con varias réplicas debe
reemplazarse por un almacén compartido (por ejemplo Redis o el WAF).
"""

from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request, status

from app.core.config import settings


class SlidingWindowRateLimiter:
    def __init__(self) -> None:
        self._attempts: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, scope: str, client_id: str) -> None:
        now = monotonic()
        window = settings.AUTH_RATE_LIMIT_WINDOW_SECONDS
        key = (scope, client_id)
        with self._lock:
            attempts = self._attempts[key]
            while attempts and attempts[0] <= now - window:
                attempts.popleft()
            if len(attempts) >= settings.AUTH_RATE_LIMIT_ATTEMPTS:
                retry_after = max(1, int(window - (now - attempts[0])) + 1)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Demasiados intentos. Intente nuevamente más tarde.",
                    headers={"Retry-After": str(retry_after)},
                )
            attempts.append(now)

    def reset(self, scope: str, client_id: str) -> None:
        with self._lock:
            self._attempts.pop((scope, client_id), None)

    def clear(self) -> None:
        """Solo para aislamiento de pruebas automatizadas."""
        with self._lock:
            self._attempts.clear()


auth_rate_limiter = SlidingWindowRateLimiter()


def _client_id(request: Request) -> str:
    # No se confía en X-Forwarded-For sin un proxy configurado como confiable.
    return request.client.host if request.client else "unknown"


def enforce_auth_rate_limit(request: Request, scope: str) -> None:
    auth_rate_limiter.check(scope, _client_id(request))


def clear_auth_rate_limit(request: Request, scope: str) -> None:
    auth_rate_limiter.reset(scope, _client_id(request))
