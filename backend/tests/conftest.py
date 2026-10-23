import os

import pytest
from sqlalchemy import create_engine
from sqlalchemy.engine import URL, make_url
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.rate_limit import auth_rate_limiter
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.modules.identity.models import User, UserRole
from tests.asgi_client import ASGITestClient

# Las pruebas eliminan y recrean todas las tablas: solo se permiten bases desechables.
DISPOSABLE_DATABASE_SUFFIXES = ("_test", "_ci")


def _is_disposable(url: URL) -> bool:
    return (url.database or "").endswith(DISPOSABLE_DATABASE_SUFFIXES)


@pytest.fixture(scope="session")
def test_database_url() -> URL:
    """TEST_DATABASE_URL explícita o, por defecto, `<base>_test` en el mismo servidor."""
    explicit = os.environ.get("TEST_DATABASE_URL")
    url = make_url(explicit or settings.DATABASE_URL)
    if not explicit and not _is_disposable(url):
        url = url.set(database=f"{url.database}_test")
    if not _is_disposable(url):
        pytest.exit(
            f"Base de pruebas rechazada ({url.render_as_string(hide_password=True)}): "
            f"su nombre debe terminar en {' o '.join(DISPOSABLE_DATABASE_SUFFIXES)}.",
            returncode=pytest.ExitCode.USAGE_ERROR,
        )
    return url


@pytest.fixture
def client_and_session(test_database_url):
    engine = create_engine(test_database_url, pool_pre_ping=True)
    Base.metadata.drop_all(bind=engine)
    testing_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    auth_rate_limiter.clear()
    with ASGITestClient(app) as client:
        yield client, testing_session
    auth_rate_limiter.clear()
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def _user(session, email: str, role: UserRole) -> User:
    user = User(email=email, full_name=email, role=role, is_active=True, hashed_password=get_password_hash("correct-horse-battery-staple"))
    session.add(user)
    session.flush()
    return user


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}
