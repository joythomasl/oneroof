"""
Person 5A — Test Fixtures

Provides a test database, session, and FastAPI TestClient.
Uses a separate test PostgreSQL database (or the same one with rollbacks).
"""

import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app

# Import models so tables are registered with Base.metadata
import app.models.incident as incident_models  # noqa: F401


# Use a test database URL (default: same DB for hackathon simplicity)
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    os.getenv("DATABASE_URL", "postgresql://oneroof:oneroof@localhost:5432/oneroof"),
)

test_engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables once per test session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    # Optionally drop tables after tests; commented out for hackathon
    # Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def db_session() -> Session:
    """
    Provide a transactional database session that rolls back after each test.
    This keeps tests isolated without needing a separate test DB.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session: Session) -> TestClient:
    """FastAPI TestClient with the test DB session injected."""

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    # These tests exercise request handlers, not external-service startup.
    # Avoid running the application lifespan (Redis/MinIO) for every test.
    c = TestClient(app)
    yield c
    c.close()
    app.dependency_overrides.clear()
