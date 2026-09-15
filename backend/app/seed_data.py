"""
Person 5A — Seed Data Generator

Creates ~60 realistic demo incidents around Coimbatore / Tamil Nadu.
Includes intentional duplicate clusters for demonstrating deduplication.

Usage:
    python -m app.seed_data

Repeatable: clears existing incidents before seeding.
Does NOT use real people's personal data.
"""

import random
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session
from geoalchemy2.elements import WKTElement

from app.database import engine, Base, SessionLocal
from app.models.incident import Incident, IncidentType, Severity, IncidentStatus
from app.models.database_records import AreaRecord, PhotoRecord, UserRecord

# Import models to register them with Base
import app.models.incident  # noqa: F401


# ── Coimbatore / Tamil Nadu landmarks (lat, lon, area name) ───────────────

LOCATIONS = [
    (11.0168, 76.9558, "Gandhipuram"),
    (11.0254, 76.9398, "RS Puram"),
    (11.0060, 76.9614, "Peelamedu"),
    (11.0480, 76.9520, "Saibaba Colony"),
    (11.0020, 76.9680, "Singanallur"),
    (11.0120, 76.9870, "Kuniyamuthur"),
    (10.9920, 76.9610, "Ondipudur"),
    (11.0560, 76.9990, "Ganapathy"),
    (11.0320, 77.0280, "Vadavalli"),
    (11.0400, 76.9440, "Race Course"),
    (10.9270, 76.9225, "Pollachi Road"),
    (10.9505, 76.9470, "Kinathukadavu"),
    (11.1085, 76.9960, "Thondamuthur"),
    (11.0780, 77.0155, "Perur"),
    (11.0010, 77.0200, "Kovaipudur"),
    (11.0600, 76.9700, "Town Hall"),
    (11.0190, 76.9500, "Ukkadam"),
    (11.0340, 76.9650, "Saravanampatti"),
    (10.9780, 76.9540, "Sulur"),
    (11.0070, 76.9380, "Podanur"),
    (10.7870, 78.7047, "Trichy Junction"),
    (9.9252, 78.1198, "Madurai Meenakshi"),
    (13.0827, 80.2707, "Chennai Central"),
    (11.9416, 79.8083, "Pondicherry Beach"),
    (8.5241, 76.9366, "Trivandrum"),
]

INCIDENT_TEMPLATES = [
    # (type, severity, title, description)
    (IncidentType.FIRE, Severity.CRITICAL, "Building fire reported", "Smoke and flames visible from multi-story building. Fire department alerted."),
    (IncidentType.FIRE, Severity.HIGH, "Vegetation fire near road", "Dry grass fire spreading along the highway median. Traffic affected."),
    (IncidentType.FIRE, Severity.MEDIUM, "Small kitchen fire", "Minor fire in a residential kitchen. Contained by residents."),
    (IncidentType.FLOOD, Severity.CRITICAL, "Road submerged in floodwater", "Heavy rain caused the main road to flood. Vehicles stranded."),
    (IncidentType.FLOOD, Severity.HIGH, "Canal overflow in residential area", "Overflowing canal threatening nearby houses. Evacuation may be needed."),
    (IncidentType.FLOOD, Severity.MEDIUM, "Waterlogging on streets", "Ankle-deep water on several streets after rain."),
    (IncidentType.EARTHQUAKE, Severity.CRITICAL, "Tremor felt across district", "Mild earthquake tremor felt. Several buildings reporting cracks."),
    (IncidentType.MEDICAL, Severity.CRITICAL, "Mass casualty event at junction", "Multi-vehicle accident with multiple injured persons."),
    (IncidentType.MEDICAL, Severity.HIGH, "Heat stroke victims at event", "Several people collapsed at outdoor gathering due to extreme heat."),
    (IncidentType.MEDICAL, Severity.MEDIUM, "Minor injuries at park", "Children injured on playground equipment. First aid administered."),
    (IncidentType.ACCIDENT, Severity.CRITICAL, "Major road accident", "Multi-vehicle collision on highway. Emergency response needed."),
    (IncidentType.ACCIDENT, Severity.HIGH, "Bus overturned", "Public bus overturned near bridge. Passengers injured."),
    (IncidentType.ACCIDENT, Severity.MEDIUM, "Two-wheeler accident", "Motorcycle collision at intersection. Minor injuries."),
    (IncidentType.SOS, Severity.CRITICAL, "Person trapped in debris", "Citizen reporting person trapped after wall collapse."),
    (IncidentType.SOS, Severity.HIGH, "Missing person alert", "Elderly person missing from residence since morning."),
    (IncidentType.INFRASTRUCTURE, Severity.HIGH, "Power line down", "Live power line fallen across road. Extremely dangerous."),
    (IncidentType.INFRASTRUCTURE, Severity.MEDIUM, "Road cave-in", "Small sinkhole opened on residential street."),
    (IncidentType.INFRASTRUCTURE, Severity.LOW, "Street light malfunction", "Multiple street lights not working in the area."),
    (IncidentType.OTHER, Severity.LOW, "Loud noise complaint", "Continuous loud noise from construction site past permitted hours."),
    (IncidentType.OTHER, Severity.MEDIUM, "Suspicious package found", "Unattended bag found at bus stop. Area secured."),
]


def _jitter(val: float, amount: float = 0.002) -> float:
    """Add a small random offset to a coordinate."""
    return val + random.uniform(-amount, amount)


def _make_location(lon: float, lat: float) -> WKTElement:
    return WKTElement(f"POINT({lon} {lat})", srid=4326)


def seed(db: Session) -> None:
    """Generate ~60 incidents with intentional duplicate clusters."""

    random.seed(42)  # Repeatable
    now = datetime.now(timezone.utc)
    incidents: list[Incident] = []

    # Shared districts used by mobile and both web dashboards.
    area_specs = [
        ("Coimbatore Central", "CBE-C", 11.0168, 76.9558, "EMERGENCY"),
        ("Coimbatore West", "CBE-W", 11.0320, 77.0280, "ALERT"),
        ("Coimbatore South", "CBE-S", 10.9505, 76.9470, "NORMAL"),
    ]
    areas: list[AreaRecord] = []
    for name, code, lat, lon, state in area_specs:
        area = db.query(AreaRecord).filter(AreaRecord.district_code == code).one_or_none()
        if area is None:
            area = AreaRecord(
                name=name,
                district_code=code,
                latitude=lat,
                longitude=lon,
                current_state=state,
            )
            db.add(area)
        areas.append(area)
    db.flush()

    # Stable demo identities for OTP/RBAC flows.
    demo_users = [
        ("10000000-0000-0000-0000-000000000001", "9000000001", "Demo Citizen", "citizen"),
        ("10000000-0000-0000-0000-000000000002", "9000000002", "Demo Responder", "responder"),
        ("10000000-0000-0000-0000-000000000003", "9000000003", "Demo CPOC Admin", "cpoc_admin"),
    ]
    for user_id, phone, name, role in demo_users:
        if db.query(UserRecord).filter(UserRecord.phone == phone).one_or_none() is None:
            db.add(
                UserRecord(
                    id=user_id,
                    phone=phone,
                    name=name,
                    role=role,
                    area_id=areas[0].id,
                )
            )
    db.flush()

    # ── Regular incidents across locations ────────────────────────────────
    for i, (lat, lon, area) in enumerate(LOCATIONS):
        template = INCIDENT_TEMPLATES[i % len(INCIDENT_TEMPLATES)]
        inc_type, sev, title, desc = template

        # Vary the timestamp: spread across last 7 days
        created = now - timedelta(
            days=random.randint(0, 6),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        )

        status = random.choice([
            IncidentStatus.OPEN,
            IncidentStatus.OPEN,
            IncidentStatus.ACKNOWLEDGED,
            IncidentStatus.RESOLVED,
        ])

        incidents.append(Incident(
            reporter_id=random.randint(1, 50),
            incident_type=inc_type,
            severity=sev,
            title=f"{title} — {area}",
            description=desc,
            latitude=lat,
            longitude=lon,
            location=_make_location(lon, lat),
            status=status,
            created_at=created,
            updated_at=created,
        ))

    # ── Duplicate clusters (for demo) ────────────────────────────────────
    # Cluster 1: Fire near Gandhipuram — 3 reports within 200m and 15 mins
    base_time = now - timedelta(hours=2)
    cluster_base = (11.0168, 76.9558)
    for j in range(3):
        lat = _jitter(cluster_base[0], 0.001)
        lon = _jitter(cluster_base[1], 0.001)
        t = base_time + timedelta(minutes=j * 5)
        incidents.append(Incident(
            reporter_id=random.randint(1, 50),
            incident_type=IncidentType.FIRE,
            severity=Severity.CRITICAL,
            title=f"Fire at Gandhipuram (report {j + 1})",
            description="Citizens reporting fire near Gandhipuram bus stand.",
            latitude=lat,
            longitude=lon,
            location=_make_location(lon, lat),
            status=IncidentStatus.OPEN,
            created_at=t,
            updated_at=t,
        ))

    # Cluster 2: Flood near Singanallur — 4 reports within 300m and 20 mins
    base_time = now - timedelta(hours=1)
    cluster_base = (11.0020, 76.9680)
    for j in range(4):
        lat = _jitter(cluster_base[0], 0.0015)
        lon = _jitter(cluster_base[1], 0.0015)
        t = base_time + timedelta(minutes=j * 5)
        incidents.append(Incident(
            reporter_id=random.randint(1, 50),
            incident_type=IncidentType.FLOOD,
            severity=Severity.HIGH,
            title=f"Flooding at Singanallur (report {j + 1})",
            description="Heavy waterlogging reported near Singanallur lake.",
            latitude=lat,
            longitude=lon,
            location=_make_location(lon, lat),
            status=IncidentStatus.OPEN,
            created_at=t,
            updated_at=t,
        ))

    # Cluster 3: SOS near RS Puram — 2 reports within 100m and 10 mins
    base_time = now - timedelta(minutes=30)
    cluster_base = (11.0254, 76.9398)
    for j in range(2):
        lat = _jitter(cluster_base[0], 0.0005)
        lon = _jitter(cluster_base[1], 0.0005)
        t = base_time + timedelta(minutes=j * 5)
        incidents.append(Incident(
            reporter_id=random.randint(1, 50),
            incident_type=IncidentType.SOS,
            severity=Severity.CRITICAL,
            title=f"SOS at RS Puram (report {j + 1})",
            description="Person requesting emergency help near RS Puram.",
            latitude=lat,
            longitude=lon,
            location=_make_location(lon, lat),
            status=IncidentStatus.OPEN,
            created_at=t,
            updated_at=t,
        ))

    # ── Additional scattered incidents for variety ────────────────────────
    extra_templates = [
        (IncidentType.MEDICAL, Severity.LOW, "Minor injury reported", "Pedestrian slipped on wet surface."),
        (IncidentType.INFRASTRUCTURE, Severity.CRITICAL, "Bridge crack detected", "Visible crack on pedestrian bridge."),
        (IncidentType.ACCIDENT, Severity.LOW, "Fender bender", "Minor vehicle collision, no injuries."),
        (IncidentType.FIRE, Severity.LOW, "Trash fire", "Small fire in garbage dump area."),
        (IncidentType.OTHER, Severity.HIGH, "Gas leak suspected", "Strong gas odor reported in residential area."),
    ]
    for k, template in enumerate(extra_templates):
        loc = random.choice(LOCATIONS[:10])
        inc_type, sev, title, desc = template
        latitude = _jitter(loc[0])
        longitude = _jitter(loc[1])
        created = now - timedelta(
            days=random.randint(0, 3),
            hours=random.randint(0, 12),
        )
        incidents.append(Incident(
            reporter_id=random.randint(1, 50),
            incident_type=inc_type,
            severity=sev,
            title=f"{title} — {loc[2]}",
            description=desc,
            latitude=latitude,
            longitude=longitude,
            location=_make_location(longitude, latitude),
            status=random.choice([IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED]),
            created_at=created,
            updated_at=created,
        ))

    # ── Mesh-originated incidents ─────────────────────────────────────────
    mesh_incidents = [
        ("mesh-node-42-event-001", "node-42", IncidentType.SOS, Severity.CRITICAL,
         "SOS from mesh network", "Emergency SOS relayed via mesh node 42."),
        ("mesh-node-17-event-055", "node-17", IncidentType.FIRE, Severity.HIGH,
         "Fire alert from mesh", "Fire detected by mesh node 17 sensor."),
    ]
    for ext_id, src_dev, inc_type, sev, title, desc in mesh_incidents:
        loc = random.choice(LOCATIONS[:5])
        created = now - timedelta(hours=random.randint(1, 6))
        incidents.append(Incident(
            reporter_id=None,
            incident_type=inc_type,
            severity=sev,
            title=title,
            description=desc,
            latitude=loc[0],
            longitude=loc[1],
            location=_make_location(loc[1], loc[0]),
            status=IncidentStatus.OPEN,
            created_at=created,
            updated_at=created,
            external_event_id=ext_id,
            source_device_id=src_dev,
        ))

    # ── Insert ────────────────────────────────────────────────────────────
    for index, incident in enumerate(incidents):
        incident.area_id = areas[index % len(areas)].id

    db.add_all(incidents)
    db.flush()

    # Materialize the deliberate demo clusters as parent/child groups. Every
    # report remains a separate row, preserving its reporter and evidence.
    for title_prefix in (
        "Fire at Gandhipuram",
        "Flooding at Singanallur",
        "SOS at RS Puram",
    ):
        cluster = sorted(
            (item for item in incidents if item.title.startswith(title_prefix)),
            key=lambda item: (item.created_at, item.id),
        )
        if cluster:
            original = cluster[0]
            for duplicate in cluster[1:]:
                duplicate.status = IncidentStatus.DUPLICATE
                duplicate.duplicate_of_id = original.id

    # Photo metadata uses deterministic object keys. The seed does not invent
    # binary files; demo assets can be uploaded to the same keys in MinIO or
    # Supabase Storage without changing database rows.
    responder_id = UUID(demo_users[1][0])
    for index, incident in enumerate(incidents[:6], start=1):
        object_key = f"demo/incidents/{incident.id}/report-{index}.jpg"
        if db.query(PhotoRecord).filter(PhotoRecord.object_key == object_key).one_or_none() is None:
            db.add(
                PhotoRecord(
                    incident_id=incident.id,
                    object_key=object_key,
                    content_type="image/jpeg",
                    size_bytes=150000 + index * 1000,
                    caption=f"Demo evidence for incident {incident.id}",
                    latitude=incident.latitude,
                    longitude=incident.longitude,
                    captured_at=incident.created_at,
                    uploaded_by=str(responder_id),
                )
            )

    db.commit()

    print(f"✅ Seeded {len(incidents)} incidents successfully.")


def main() -> None:
    """Entry point: create tables, clear old data, seed fresh data."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Clear existing incidents for repeatable seeding
        db.query(PhotoRecord).delete()
        deleted = db.query(Incident).delete()
        db.commit()
        if deleted:
            print(f"🗑️  Cleared {deleted} existing incidents.")

        seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
