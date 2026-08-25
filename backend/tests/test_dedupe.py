"""
Person 5A — Deduplication Tests

Tests the deterministic deduplication algorithm:
  - Same type + nearby + recent → DUPLICATE
  - Different type → not duplicate
  - Far away → not duplicate
  - Old timestamp → not duplicate
  - Duplicate is linked (duplicate_of_id), never deleted
"""

import pytest
from datetime import datetime, timedelta, timezone

from app.models.incident import Incident

API = "/api/v1/incidents"
DEDUPE_API = "/api/v1/dedupe"

# Gandhipuram, Coimbatore
BASE_LAT = 11.0168
BASE_LON = 76.9558


def _create_incident(client, lat, lon, title="Dedupe test", **kwargs):
    payload = {
        "incident_type": kwargs.get("incident_type", "FIRE"),
        "severity": kwargs.get("severity", "CRITICAL"),
        "title": title,
        "latitude": lat,
        "longitude": lon,
    }
    payload.update(kwargs)
    resp = client.post(f"{API}/", json=payload)
    assert resp.status_code == 201
    return resp.json()


class TestDeduplication:
    def test_nearby_recent_same_type_is_duplicate(self, client):
        """
        Two FIRE incidents at nearly the same location within minutes
        should result in the second being marked as DUPLICATE.
        """
        # Create the original
        original = _create_incident(
            client, BASE_LAT, BASE_LON, title="Original fire"
        )
        assert original["status"] == "OPEN"

        # Create a nearby, same-type incident (~100m away)
        duplicate = _create_incident(
            client,
            BASE_LAT + 0.0005,
            BASE_LON + 0.0005,
            title="Duplicate fire report",
        )

        assert duplicate["status"] == "DUPLICATE"
        assert duplicate["duplicate_of_id"] == original["id"]

    def test_different_type_not_duplicate(self, client):
        """A FLOOD near a recent FIRE should NOT be a duplicate."""
        _create_incident(
            client, BASE_LAT, BASE_LON,
            title="Fire for type test",
            incident_type="FIRE",
        )

        flood = _create_incident(
            client,
            BASE_LAT + 0.0003,
            BASE_LON + 0.0003,
            title="Flood near fire",
            incident_type="FLOOD",
        )

        assert flood["status"] == "OPEN"
        assert flood["duplicate_of_id"] is None

    def test_distant_incident_not_duplicate(self, client):
        """An incident far away (even same type) should not be duplicate."""
        _create_incident(
            client, BASE_LAT, BASE_LON,
            title="Fire at base",
        )

        # ~50 km away
        far = _create_incident(
            client,
            BASE_LAT + 0.5,
            BASE_LON + 0.5,
            title="Fire far away",
        )

        assert far["status"] == "OPEN"
        assert far["duplicate_of_id"] is None

    def test_old_incident_not_duplicate(self, client, db_session):
        original = _create_incident(
            client, BASE_LAT, BASE_LON, title="Old fire report"
        )
        old_row = db_session.get(Incident, original["id"])
        old_row.created_at = datetime.now(timezone.utc) - timedelta(hours=2)
        db_session.flush()

        recent = _create_incident(
            client,
            BASE_LAT + 0.0001,
            BASE_LON + 0.0001,
            title="Recent independent fire",
        )
        assert recent["status"] == "OPEN"
        assert recent["duplicate_of_id"] is None

    def test_duplicate_preserves_original_report(self, client):
        """
        Duplicate reports should NOT be deleted.
        Both the original and duplicate should exist.
        """
        original = _create_incident(
            client, BASE_LAT, BASE_LON,
            title="Original for preservation",
        )

        duplicate = _create_incident(
            client,
            BASE_LAT + 0.0002,
            BASE_LON + 0.0002,
            title="Dup for preservation",
        )

        # Both should be retrievable
        resp1 = client.get(f"{API}/{original['id']}")
        assert resp1.status_code == 200

        resp2 = client.get(f"{API}/{duplicate['id']}")
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "DUPLICATE"

    def test_duplicate_links_to_original(self, client):
        """duplicate_of_id should point to the original incident."""
        original = _create_incident(
            client, BASE_LAT, BASE_LON,
            title="Link test original",
        )

        dup = _create_incident(
            client,
            BASE_LAT + 0.0001,
            BASE_LON + 0.0001,
            title="Link test dup",
        )

        assert dup["duplicate_of_id"] == original["id"]

    def test_multiple_duplicates_all_link_to_same_original(self, client):
        """Three reports of the same event should all link to the first."""
        original = _create_incident(
            client, BASE_LAT, BASE_LON,
            title="Multi-dup original",
        )

        dup1 = _create_incident(
            client,
            BASE_LAT + 0.0002,
            BASE_LON + 0.0001,
            title="Multi-dup 1",
        )

        dup2 = _create_incident(
            client,
            BASE_LAT + 0.0003,
            BASE_LON + 0.0002,
            title="Multi-dup 2",
        )

        assert dup1["duplicate_of_id"] == original["id"]
        assert dup2["duplicate_of_id"] == original["id"]


class TestDedupeEndpoints:
    def test_dedupe_status(self, client):
        resp = client.get(f"{DEDUPE_API}/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "dedupe_radius_meters" in data
        assert "dedupe_time_window_minutes" in data
        assert "total_incidents" in data
        assert "duplicate_incidents" in data

    def test_duplicates_endpoint(self, client):
        """GET /dedupe/duplicates/{id} should return linked duplicates."""
        original = _create_incident(
            client, BASE_LAT, BASE_LON,
            title="Dedupe endpoint original",
        )

        _create_incident(
            client,
            BASE_LAT + 0.0002,
            BASE_LON + 0.0002,
            title="Dedupe endpoint dup",
        )

        resp = client.get(f"{DEDUPE_API}/duplicates/{original['id']}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["original_incident_id"] == original["id"]
        assert data["duplicate_count"] >= 1

    def test_duplicates_nonexistent_incident(self, client):
        resp = client.get(f"{DEDUPE_API}/duplicates/999999")
        assert resp.status_code == 404
