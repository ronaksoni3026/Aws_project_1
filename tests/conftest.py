import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.database import Base, get_db
import backend.core.tasks
from backend.models import Admin, Student, Recruiter, Job, Application, Notification, AuditLog
from backend.core.security import get_password_hash, create_access_token, Role

# In-memory SQLite engine for fast, isolated test runs
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Point background tasks to test session factory during testing
backend.core.tasks.SessionLocal = TestingSessionLocal


@pytest.fixture(scope="function")
def db_session():
    """Creates a fresh isolated database schema for each test function."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Pre-seed test admin
    admin = Admin(
        email="test_admin@placement.edu",
        password_hash=get_password_hash("AdminPass123"),
        full_name="Placement Director",
    )
    db.add(admin)
    db.commit()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Provides a FastAPI TestClient with the test database injected."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token(db_session):
    admin = db_session.query(Admin).filter(Admin.email == "test_admin@placement.edu").first()
    return create_access_token({"sub": str(admin.id), "email": admin.email, "role": Role.ADMIN.value})
