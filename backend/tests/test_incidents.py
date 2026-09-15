"""
Person 5A — Incident CRUD & Validation Tests
"""

import pytest


# ── Helpers ───────────────────────────────────────────────────────────────────

VALID_INCIDENT = {
    "incident_type": "FIRE",
    "severity": "HIGH",
    "title": "Test fire incident",
    "description": "A test fire incident for unit testing.",
    "latitude": 11.0168,
    "longitude": 76.9558,
}

API = "/api/v1/incidents"


# ── CRUD Tests ────────────────────────────────────────────────────────────────


class TestCreateIncident:
    def test_create_incident_success(self, client):
        resp = client.post(f"{API}/", json=VALID_INCIDENT)
        assert resp.status_code == 201
        data = resp.json()
        assert data["incident_type"] == "FIRE"
        assert data["severity"] == "HIGH"
        assert data["title"] == "Test fire incident"
        assert data["latitude"] == 11.0168
        assert data["longitude"] == 76.9558
        assert data["status"] == "OPEN"
        assert data["id"] is not None

    def test_create_incident_with_mesh_fields(self, client):
        payload = {
            **VALID_INCIDENT,
            "external_event_id": "mesh-test-001",
            "source_device_id": "node-99",
        }
        resp = client.post(f"{API}/", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["external_event_id"] == "mesh-test-001"
        assert data["source_device_id"] == "node-99"

    def test_create_incident_minimal_fields(self, client):
        payload = {
            "incident_type": "SOS",
            "severity": "CRITICAL",
            "title": "Minimal SOS",
            "latitude": 10.0,
            "longitude": 77.0,
        }
        resp = client.post(f"{API}/", json=payload)
        assert resp.status_code == 201

    def test_create_landslide_incident(self, client):
        payload = {**VALID_INCIDENT, "incident_type": "LANDSLIDE"}
        resp = client.post(f"{API}/", json=payload)
        assert resp.status_code == 201
        assert resp.json()["incident_type"] == "LANDSLIDE"


class TestRetrieveIncident:
    def test_get_incident_by_id(self, client):
        # Create one first
        resp = client.post(f"{API}/", json=VALID_INCIDENT)
        incident_id = resp.json()["id"]

        resp = client.get(f"{API}/{incident_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == incident_id

    def test_get_nonexistent_incident(self, client):
        resp = client.get(f"{API}/999999")
        assert resp.status_code == 404

    def test_list_incidents(self, client):
        # Create a couple
        client.post(f"{API}/", json=VALID_INCIDENT)
        client.post(f"{API}/", json={**VALID_INCIDENT, "title": "Second incident"})

        resp = client.get(f"{API}/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] >= 2
        assert len(data["incidents"]) >= 2


class TestFilterIncidents:
    def test_filter_by_type(self, client):
        client.post(f"{API}/", json={**VALID_INCIDENT, "incident_type": "FLOOD"})
        client.post(f"{API}/", json=VALID_INCIDENT)

        resp = client.get(f"{API}/?incident_type=FLOOD")
        assert resp.status_code == 200
        for inc in resp.json()["incidents"]:
            assert inc["incident_type"] == "FLOOD"

    def test_filter_by_severity(self, client):
        client.post(f"{API}/", json={**VALID_INCIDENT, "severity": "LOW"})

        resp = client.get(f"{API}/?severity=LOW")
        assert resp.status_code == 200
        for inc in resp.json()["incidents"]:
            assert inc["severity"] == "LOW"

    def test_filter_by_status(self, client):
        resp = client.get(f"{API}/?status=OPEN")
        assert resp.status_code == 200

    def test_pagination(self, client):
        # Create several incidents
        for i in range(5):
            client.post(f"{API}/", json={**VALID_INCIDENT, "title": f"Inc {i}"})

        resp = client.get(f"{API}/?skip=0&limit=2")
        assert resp.status_code == 200
        assert len(resp.json()["incidents"]) <= 2

    def test_offset_pagination(self, client):
        for i in range(3):
            client.post(f"{API}/", json={**VALID_INCIDENT, "title": f"Page {i}"})

        first = client.get(f"{API}/?offset=0&limit=1").json()["incidents"]
        second = client.get(f"{API}/?offset=1&limit=1").json()["incidents"]
        assert first[0]["id"] != second[0]["id"]


class TestUpdateIncident:
    def test_patch_incident(self, client):
        resp = client.post(f"{API}/", json=VALID_INCIDENT)
        incident_id = resp.json()["id"]

        resp = client.patch(f"{API}/{incident_id}", json={"title": "Updated title"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated title"

    def test_patch_status(self, client):
        resp = client.post(f"{API}/", json=VALID_INCIDENT)
        incident_id = resp.json()["id"]

        resp = client.patch(f"{API}/{incident_id}", json={"status": "ACKNOWLEDGED"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "ACKNOWLEDGED"

    def test_patch_coordinates_updates_location(self, client):
        resp = client.post(f"{API}/", json=VALID_INCIDENT)
        incident_id = resp.json()["id"]

        resp = client.patch(
            f"{API}/{incident_id}",
            json={"latitude": 12.0, "longitude": 78.0},
        )
        assert resp.status_code == 200
        assert resp.json()["latitude"] == 12.0
        assert resp.json()["longitude"] == 78.0

    def test_patch_nonexistent(self, client):
        resp = client.patch(f"{API}/999999", json={"title": "nope"})
        assert resp.status_code == 404


class TestDeleteIncident:
    def test_delete_incident(self, client):
        resp = client.post(f"{API}/", json=VALID_INCIDENT)
        incident_id = resp.json()["id"]

        resp = client.delete(f"{API}/{incident_id}")
        assert resp.status_code == 204

        # Confirm it's gone
        resp = client.get(f"{API}/{incident_id}")
        assert resp.status_code == 404

    def test_delete_nonexistent(self, client):
        resp = client.delete(f"{API}/999999")
        assert resp.status_code == 404


# ── Validation Tests ──────────────────────────────────────────────────────────


class TestValidation:
    def test_invalid_latitude_too_high(self, client):
        payload = {**VALID_INCIDENT, "latitude": 91.0}
        resp = client.post(f"{API}/", json=payload)
        assert resp.status_code == 422

    def test_invalid_latitude_too_low(self, client):
        payload = {**VALID_INCIDENT, "latitude": -91.0}
        resp = client.post(f"{API}/", json=payload)
        assert resp.status_code == 422

    def test_invalid_longitude_too_high(self, client):
        payload = {**VALID_INCIDENT, "longitude": 181.0}
        resp = client.post(f"{API}/", json=payload)
        assert resp.status_code == 422

    def test_invalid_longitude_too_low(self, client):
        payload = {**VALID_INCIDENT, "longitude": -181.0}
        resp = client.post(f"{API}/", json=payload)
        assert resp.status_code == 422

    def test_invalid_incident_type(self, client):
        payload = {**VALID_INCIDENT, "incident_type": "ZOMBIE_APOCALYPSE"}
        resp = client.post(f"{API}/", json=payload)
        assert resp.status_code == 422

    def test_invalid_severity(self, client):
        payload = {**VALID_INCIDENT, "severity": "SUPER_DUPER"}
        resp = client.post(f"{API}/", json=payload)
        assert resp.status_code == 422

    def test_missing_required_title(self, client):
        payload = {
            "incident_type": "FIRE",
            "severity": "HIGH",
            "latitude": 11.0,
            "longitude": 76.0,
        }
        resp = client.post(f"{API}/", json=payload)
        assert resp.status_code == 422


# ── Mesh Event Protection ────────────────────────────────────────────────────


class TestMeshEventProtection:
    def test_duplicate_external_event_id_rejected(self, client):
        payload = {
            **VALID_INCIDENT,
            "external_event_id": "mesh-unique-test-001",
        }
        resp1 = client.post(f"{API}/", json=payload)
        assert resp1.status_code == 201

        # Same external_event_id should be rejected
        resp2 = client.post(f"{API}/", json=payload)
        assert resp2.status_code == 409
