import asyncio
from typing import Any

import httpx
from fastapi import FastAPI
from threading import Lock


class ASGITestClient:
    """Synchronous facade over HTTPX's ASGI transport for pytest.

    Starlette's thread-based TestClient can deadlock with the dependency
    versions supported by this project. Running each request on an isolated
    event loop keeps the public test API synchronous and works in concurrent
    regression cases as well.
    """

    def __init__(self, app: FastAPI, base_url: str = "http://testserver") -> None:
        self.app = app
        self.base_url = base_url
        self.cookies = httpx.Cookies()
        self._cookie_lock = Lock()

    def __enter__(self) -> "ASGITestClient":
        return self

    def __exit__(self, *_: object) -> None:
        return None

    def request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        async def send() -> httpx.Response:
            transport = httpx.ASGITransport(app=self.app)
            async with httpx.AsyncClient(
                transport=transport,
                base_url=self.base_url,
                follow_redirects=True,
                cookies=self.cookies,
            ) as client:
                response = await client.request(method, url, **kwargs)
                with self._cookie_lock:
                    self.cookies.update(response.cookies)
                return response

        return asyncio.run(send())

    def get(self, url: str, **kwargs: Any) -> httpx.Response:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs: Any) -> httpx.Response:
        return self.request("POST", url, **kwargs)

    def patch(self, url: str, **kwargs: Any) -> httpx.Response:
        return self.request("PATCH", url, **kwargs)

    def put(self, url: str, **kwargs: Any) -> httpx.Response:
        return self.request("PUT", url, **kwargs)

    def options(self, url: str, **kwargs: Any) -> httpx.Response:
        return self.request("OPTIONS", url, **kwargs)
