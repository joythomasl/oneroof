"""
ONE ROOF - Person 5B acceptance test

    python scripts/test_5b.py

Runs the app in-process with FastAPI's TestClient (no separate uvicorn
needed) and walks every Person 5B feature.

Reads the OTP straight out of the store rather than scraping the
terminal, so the auth flow is tested exactly as a client would use it.

Checks are reported as PASS / FAIL / SKIP. A SKIP means an external
service (Redis, MinIO) is not running - it is never counted as a pass.
Start the infrastructure first for a full run:

    docker compose up -d
"""

from __future__ import annotations

import asyncio
import io
import sys
from pathlib import Path

# Allow `python scripts/test_5b.py` from the backend/ directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services.redis_service import redis_service  # noqa: E402
from app.services.s3_service import s3_service  # noqa: E402

PASS, FAIL, SKIP = "PASS", "FAIL", "SKIP"
results: list[tuple[str, str, str]] = []


def check(name: str, ok, detail: str = "") -> bool:
    state = SKIP if ok is None else (PASS if ok else FAIL)
    results.append((state, name, detail))
    icon = {"PASS": "[PASS]", "FAIL": "[FAIL]", "SKIP": "[SKIP]"}[state]
    print("{} {}{}".format(icon, name, "  - " + detail if detail else ""))
    return ok is True


def png_bytes() -> bytes:
    """Smallest valid 1x1 PNG."""
    import base64

    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )


def section(title: str) -> None:
    print("\n" + "-" * 60)
    print(title)
    print("-" * 60)


def main() -> int:
    with TestClient(app) as client:
        redis_up = asyncio.run(redis_service.ping())
        minio_up = s3_service.bucket_ready

        print("\nInfrastructure: Redis={}  MinIO={}".format(
            "UP" if redis_up else "DOWN", "UP" if minio_up else "DOWN"))

        # ---------------- CORE ----------------
        section("FASTAPI")
        r = client.get("/")
        check("GET / returns banner",
              r.status_code == 200 and "message" in r.json(),
              "status={}".format(r.status_code))

        r = client.get("/health")
        health = r.json() if r.status_code == 200 else {}
        check("GET /health responds", r.status_code == 200,
              "status={}".format(health.get("status")))
        check("/health reports dependencies honestly",
              "dependencies" in health,
              "redis={} minio={}".format(
                  health.get("dependencies", {}).get("redis", {}).get("connected"),
                  health.get("dependencies", {}).get("minio", {}).get("bucket_ready")))

        r = client.get("/openapi.json")
        spec = r.json() if r.status_code == 200 else {}
        paths = spec.get("paths", {})
        check("OpenAPI schema builds (/docs will render)", r.status_code == 200,
              "{} paths".format(len(paths)))
        for expected in ("/auth/send-otp", "/auth/verify-otp", "/upload/photo",
                         "/verification/{incident_id}/approve",
                         "/verification/{incident_id}/reject"):
            check("  documented: {}".format(expected), expected in paths)

        # ---------------- AUTH ----------------
        section("AUTH / OTP")
        phone = "9876543210"

        r = client.post("/auth/send-otp", json={"phone": phone})
        body = r.json()
        check("send-otp succeeds", r.status_code == 200,
              "status={}".format(r.status_code))
        check("OTP is NOT exposed in the response",
              "otp" not in str(body).lower() or body.get("otp") is None,
              str(body))
        check("expires_in_seconds is 300", body.get("expires_in_seconds") == 300)

        otp = asyncio.run(redis_service.get_otp(phone))
        check("OTP stored and retrievable", otp is not None and len(otp) == 6,
              "backend={}".format("redis" if redis_up else "memory fallback"))

        ttl = asyncio.run(redis_service.otp_ttl(phone))
        check("OTP has a TTL", ttl is not None and 0 < ttl <= 300,
              "ttl={}s".format(ttl))

        r = client.post("/auth/verify-otp", json={"phone": phone, "otp": "000000"})
        check("wrong OTP is rejected (401)", r.status_code == 401,
              "got {}".format(r.status_code))

        r = client.post("/auth/verify-otp", json={"phone": phone, "otp": otp})
        auth_body = r.json() if r.status_code == 200 else {}
        check("correct OTP succeeds", r.status_code == 200,
              "got {}".format(r.status_code))
        token = auth_body.get("access_token")
        check("JWT issued", bool(token),
              "token_type={}".format(auth_body.get("token_type")))
        check("new user defaults to role 'citizen'",
              auth_body.get("role") == "citizen")

        r = client.post("/auth/verify-otp", json={"phone": phone, "otp": otp})
        check("OTP cannot be reused (400)", r.status_code == 400,
              "got {}".format(r.status_code))

        r = client.post("/auth/send-otp", json={"phone": "abc"})
        check("invalid phone rejected (422)", r.status_code == 422,
              "got {}".format(r.status_code))

        citizen_hdr = {"Authorization": "Bearer {}".format(token)} if token else {}
        r = client.get("/auth/me", headers=citizen_hdr)
        check("GET /auth/me with token", r.status_code == 200,
              "got {}".format(r.status_code))
        r = client.get("/auth/me")
        check("GET /auth/me without token is 401", r.status_code == 401,
              "got {}".format(r.status_code))

        # Log in the seeded cpoc_admin for the RBAC tests.
        admin_phone = "9000000003"
        client.post("/auth/send-otp", json={"phone": admin_phone})
        admin_otp = asyncio.run(redis_service.get_otp(admin_phone))
        r = client.post("/auth/verify-otp",
                        json={"phone": admin_phone, "otp": admin_otp})
        admin_body = r.json() if r.status_code == 200 else {}
        admin_token = admin_body.get("access_token")
        check("seeded cpoc_admin can log in",
              admin_body.get("role") == "cpoc_admin",
              "role={}".format(admin_body.get("role")))
        admin_hdr = {"Authorization": "Bearer {}".format(admin_token)}

        # ---------------- RBAC ----------------
        section("ROLE-BASED ACCESS CONTROL")
        inc = "3fa85f64-5717-4562-b3fc-2c963f66afa6"

        r = client.post("/verification/{}/approve".format(inc),
                        json={"note": "test"}, headers=citizen_hdr)
        check("citizen CANNOT approve (403)", r.status_code == 403,
              "got {}".format(r.status_code))

        r = client.post("/verification/{}/approve".format(inc), json={"note": "test"})
        check("anonymous CANNOT approve (401)", r.status_code == 401,
              "got {}".format(r.status_code))

        r = client.get("/auth/users", headers=citizen_hdr)
        check("citizen CANNOT list users (403)", r.status_code == 403,
              "got {}".format(r.status_code))
        r = client.get("/auth/users", headers=admin_hdr)
        check("cpoc_admin CAN list users", r.status_code == 200,
              "{} users".format(len(r.json()) if r.status_code == 200 else "-"))

        # ---------------- VERIFICATION ----------------
        section("VERIFICATION")
        r = client.post("/verification/{}/approve".format(inc),
                        json={"note": "Confirmed on site."}, headers=admin_hdr)
        vbody = r.json() if r.status_code == 200 else {}
        check("cpoc_admin CAN approve", r.status_code == 200,
              "got {}".format(r.status_code))
        check("approve returns status 'approved'", vbody.get("status") == "approved")
        check("approve reports persistence honestly",
              vbody.get("persisted") is False,
              "persisted={} (Person 5A not wired yet)".format(vbody.get("persisted")))
        check("approve reports event delivery honestly",
              vbody.get("event_published") == redis_up,
              "event_published={}".format(vbody.get("event_published")))

        r = client.post("/verification/{}/reject".format(inc),
                        json={"note": "Duplicate report."}, headers=admin_hdr)
        check("cpoc_admin CAN reject", r.status_code == 200
              and r.json().get("status") == "rejected",
              "got {}".format(r.status_code))

        r = client.post("/verification/{}/reject".format(inc),
                        json={"note": ""}, headers=admin_hdr)
        check("reject without a note is 422", r.status_code == 422,
              "got {}".format(r.status_code))

        r = client.post("/verification/{}/flag-location".format(inc),
                        json={"reason": "Landmarks do not match."}, headers=admin_hdr)
        check("flag-location works", r.status_code == 200,
              "got {}".format(r.status_code))

        r = client.get("/verification/{}".format(inc))
        check("verification state readable", r.status_code == 200
              and r.json().get("location_flagged") is True)

        r = client.post("/verification/not-a-uuid/approve",
                        json={"note": "x"}, headers=admin_hdr)
        check("malformed incident id is 422", r.status_code == 422,
              "got {}".format(r.status_code))

        # ---------------- UPLOAD ----------------
        section("MEDIA UPLOAD (MinIO)")
        r = client.post(
            "/upload/photo",
            files={"file": ("evil.exe", io.BytesIO(b"MZ"), "application/x-msdownload")},
        )
        check("unsupported type rejected (415)", r.status_code == 415,
              "got {}".format(r.status_code))

        if not minio_up:
            check("PNG upload", None, "MinIO not running - start docker compose")
            check("JPEG upload", None, "MinIO not running")
            check("WEBP upload", None, "MinIO not running")
            check("object really exists in bucket", None, "MinIO not running")
            r = client.post("/upload/photo",
                            files={"file": ("a.png", io.BytesIO(png_bytes()),
                                            "image/png")})
            check("upload returns 503 when MinIO is down (not a fake URL)",
                  r.status_code == 503, "got {}".format(r.status_code))
        else:
            uploaded_key = None
            for fname, ctype in (("a.png", "image/png"),
                                 ("b.jpg", "image/jpeg"),
                                 ("c.webp", "image/webp")):
                r = client.post("/upload/photo",
                                files={"file": (fname, io.BytesIO(png_bytes()), ctype)})
                ok = r.status_code == 201
                body = r.json() if ok else {}
                check("{} upload".format(ctype.split("/")[1].upper()), ok,
                      "key={}".format(body.get("object_key")))
                if ok:
                    uploaded_key = body.get("object_key")
                    check("  status is 'pending'", body.get("status") == "pending")
                    check("  object_key matches photos/<uuid>.<ext>",
                          str(body.get("object_key", "")).startswith("photos/"))
                    check("  url returned", bool(body.get("url")))

            if uploaded_key:
                exists = asyncio.run(s3_service.object_exists(uploaded_key))
                check("object really exists in the bucket", exists,
                      uploaded_key)

            big = io.BytesIO(b"\0" * (11 * 1024 * 1024))
            r = client.post("/upload/photo",
                            files={"file": ("big.png", big, "image/png")})
            check("oversized file rejected (413)", r.status_code == 413,
                  "got {}".format(r.status_code))

        # ---------------- REDIS / WEBSOCKET ----------------
        section("REDIS + WEBSOCKET")
        if not redis_up:
            check("Redis connected", None, "Redis not running - start docker compose")
            check("Redis publish reaches a WebSocket client", None, "Redis not running")
        else:
            check("Redis connected", True, "publish/subscribe available")

        try:
            with client.websocket_connect("/ws/incidents") as ws:
                hello = ws.receive_json()
                check("WebSocket accepts a connection",
                      hello.get("event") == "connection_established",
                      "redis_connected={}".format(
                          hello.get("data", {}).get("redis_connected")))

                ws.send_text("ping")
                pong = ws.receive_json()
                check("WebSocket keepalive (ping -> pong)",
                      pong.get("event") == "pong")

                with client.websocket_connect("/ws/incidents") as ws2:
                    ws2.receive_json()
                    r = client.get("/ws/status")
                    check("multiple clients tracked",
                          r.json().get("connected_clients", 0) >= 2,
                          "clients={}".format(r.json().get("connected_clients")))

                    r = client.post("/ws/test-broadcast",
                                    json={"event": "incident_updated",
                                          "incident_id": inc,
                                          "data": {"hello": "world"}})
                    tb = r.json()
                    if redis_up:
                        got = ws.receive_json()
                        check("Redis event reaches WebSocket client 1",
                              got.get("event") == "incident_updated",
                              "published_to_redis={}".format(
                                  tb.get("published_to_redis")))
                        got2 = ws2.receive_json()
                        check("same event reaches WebSocket client 2",
                              got2.get("event") == "incident_updated")
                    else:
                        got = ws.receive_json()
                        check("local fallback reaches WebSocket client 1",
                              got.get("event") == "incident_updated",
                              "delivered_via=local (Redis down)")
                        check("Redis->WebSocket path", None,
                              "cannot be tested while Redis is down")

            r = client.get("/ws/status")
            check("disconnect cleaned up, server alive",
                  r.status_code == 200 and r.json().get("connected_clients") == 0,
                  "clients={}".format(r.json().get("connected_clients")))
        except Exception as exc:
            check("WebSocket suite", False, "{}: {}".format(type(exc).__name__, exc))

    # ---------------- SUMMARY ----------------
    passed = sum(1 for s, _, _ in results if s == PASS)
    failed = sum(1 for s, _, _ in results if s == FAIL)
    skipped = sum(1 for s, _, _ in results if s == SKIP)

    print("\n" + "=" * 60)
    print("SUMMARY:  {} passed   {} failed   {} skipped".format(
        passed, failed, skipped))
    print("=" * 60)

    if failed:
        print("\nFailures:")
        for state, name, detail in results:
            if state == FAIL:
                print("  - {}  {}".format(name, detail))
    if skipped:
        print("\nSkipped (external service not running - NOT a pass):")
        for state, name, detail in results:
            if state == SKIP:
                print("  - {}  {}".format(name, detail))

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
