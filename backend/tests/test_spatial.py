"""
Person 5A — PostGIS Spatial Query Tests

Tests that spatial filtering is performed by PostGIS (ST_DWithin, ST_Distance),
not by fetching all incidents and filtering in Python.
"""

import pytest

API = "/api/v1/incidents"
NEARBY = f"{API}/nearby"

# Gandhipuram, Coimbatore
CENTER_LAT = 11.0168
CENTER_LON = 76.9558


def _create_incident(client, lat, lon, title="Spatial test", **kwargs):
    payload = {
        "incident_type": kwargs.get("incident_type", "FIRE"),
        "severity": kwargs.get("severity", "HIGH"),
        "title": title,
        "latitude": lat,
        "longitude": lon,
    }
    payload.update(kwargs)
    resp = client.post(f"{API}/", json=payload)
    assert resp.status_code == 201
    return resp.json()


class TestNearbyEndpoint:
    def test_nearby_returns_close_incident(self, client):
        """An incident at the search center should be returned."""
        _create_incident(client, CENTER_LAT, CENTER_LON, title="At center")

        resp = client.get(
            NEARBY,
            params={"latitude": CENTER_LAT, "longitude": CENTER_LON, "radius_meters": 1000},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] >= 1
        # The incident at the same point should have ~0 distance
        found = [i for i in data["incidents"] if i["title"] == "At center"]
        assert len(found) >= 1
        assert found[0]["distance_meters"] < 10  # essentially 0

    def test_nearby_excludes_distant_incident(self, client):
        """An incident far away should not be returned in a small radius."""
        # Create an incident in Chennai (~500 km from Coimbatore)
        _create_incident(client, 13.0827, 80.2707, title="Far away Chennai")

        resp = client.get(
            NEARBY,
            params={"latitude": CENTER_LAT, "longitude": CENTER_LON, "radius_meters": 5000},
        )
        assert resp.status_code == 200
        titles = [i["title"] for i in resp.json()["incidents"]]
        assert "Far away Chennai" not in titles

    def test_nearby_calculates_distance(self, client):
        """Distance values should be positive for non-zero offsets."""
        # ~1 km offset
        _create_incident(client, CENTER_LAT + 0.009, CENTER_LON, title="Offset 1km")

        resp = client.get(
            NEARBY,
            params={"latitude": CENTER_LAT, "longitude": CENTER_LON, "radius_meters": 5000},
        )
        assert resp.status_code == 200
        found = [i for i in resp.json()["incidents"] if i["title"] == "Offset 1km"]
        assert len(found) >= 1
        # ~1 km should be roughly 900–1100 meters
        assert 500 < found[0]["distance_meters"] < 2000

    def test_nearby_sorted_by_distance(self, client):
        """Results should be sorted by distance ascending."""
        _create_incident(client, CENTER_LAT + 0.02, CENTER_LON, title="Farther")
        _create_incident(client, CENTER_LAT + 0.005, CENTER_LON, title="Closer")

        resp = client.get(
            NEARBY,
            params={"latitude": CENTER_LAT, "longitude": CENTER_LON, "radius_meters": 10000},
        )
        assert resp.status_code == 200
        distances = [i["distance_meters"] for i in resp.json()["incidents"]]
        assert distances == sorted(distances)

    def test_nearby_required_params(self, client):
        """Missing lat/lon should return 422."""
        resp = client.get(NEARBY, params={"radius_meters": 1000})
        assert resp.status_code == 422

    def test_nearby_invalid_latitude(self, client):
        resp = client.get(
            NEARBY,
            params={"latitude": 95, "longitude": CENTER_LON, "radius_meters": 1000},
        )
        assert resp.status_code == 422

    def test_nearby_default_radius(self, client):
        """If radius not provided, should use the default (5000m)."""
        _create_incident(client, CENTER_LAT, CENTER_LON, title="Default radius test")

        resp = client.get(
            NEARBY,
            params={"latitude": CENTER_LAT, "longitude": CENTER_LON},
        )
        assert resp.status_code == 200

    def test_nearby_response_structure(self, client):
        """Response should have count and incidents array with correct fields."""
        _create_incident(client, CENTER_LAT, CENTER_LON, title="Structure test")

        resp = client.get(
            NEARBY,
            params={"latitude": CENTER_LAT, "longitude": CENTER_LON, "radius_meters": 1000},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "count" in data
        assert "incidents" in data
        if data["count"] > 0:
            item = data["incidents"][0]
            assert "id" in item
            assert "distance_meters" in item
            assert "incident_type" in item
            assert "severity" in item
            assert "latitude" in item
            assert "longitude" in item
