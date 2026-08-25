"""Database-independent tests for the Person 5 integration contract."""

import asyncio
import importlib
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.main import app
from app.models.database_records import AreaRecord, PhotoRecord, UserRecord
from app.models.photo import Photo
from app.models.user import UserRole
from app.services.geo_validation import distance_meters


def test_person5_tables_and_routes_are_registered():
    assert {"areas", "users", "incidents", "photos"} <= set(Base.metadata.tables)
    paths = app.openapi()["paths"]
    assert "/api/v1/areas/" in paths
    assert "/api/v1/incidents/" in paths
    assert "/verification/{incident_id}/approve" in paths


def test_geo_validation_distinguishes_near_and_far_photos():
    assert distance_meters(11.0168, 76.9558, 11.0168, 76.9558) == 0
    assert distance_meters(11.0168, 76.9558, 11.0268, 76.9558) > 1_000


def test_user_and_photo_metadata_persist(monkeypatch):
    engine = create_engine("sqlite+pysqlite:///:memory:")
    AreaRecord.__table__.create(engine)
    UserRecord.__table__.create(engine)
    PhotoRecord.__table__.create(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    user_module = importlib.import_module("app.services.user_store")
    photo_module = importlib.import_module("app.services.photo_store")
    monkeypatch.setattr(user_module, "SessionLocal", session_factory)
    monkeypatch.setattr(photo_module, "SessionLocal", session_factory)

    users = user_module.UserStore()
    user = asyncio.run(
        users.get_or_create("9876543210", UserRole.RESPONDER, "Test Responder")
    )
    assert asyncio.run(users.get_by_phone("9876543210")).id == user.id
    assert users.backend == "database"

    photos = photo_module.PhotoStore()
    photo = Photo(
        id=uuid4(),
        object_key="tests/evidence.jpg",
        content_type="image/jpeg",
        uploaded_by=user.id,
        latitude=11.0,
        longitude=77.0,
    )
    asyncio.run(photos.add(photo))
    loaded = asyncio.run(photos.get(photo.id))
    assert loaded is not None
    assert loaded.latitude == 11.0
    assert photos.backend == "database"


def test_verification_adapter_contract_uses_integer_incident_ids():
    schema = app.openapi()["components"]["schemas"]
    incident_id = schema["VerificationResponse"]["properties"]["incident_id"]
    assert incident_id["type"] == "integer"
    closing_photo = schema["VerificationRequest"]["properties"]["closing_photo_id"]
    assert closing_photo["anyOf"][0]["format"] == "uuid"
