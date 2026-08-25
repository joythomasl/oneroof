# Frontend integration

Use one configurable API origin in the client instead of hard-coding URLs in
screens.

| Target | HTTP base URL | WebSocket URL |
| --- | --- | --- |
| Flutter web / Windows | `http://localhost:8000/api/v1` | `ws://localhost:8000/api/v1/ws/incidents` |
| Android emulator | `http://10.0.2.2:8000/api/v1` | `ws://10.0.2.2:8000/api/v1/ws/incidents` |
| Physical device | `http://<computer-lan-ip>:8000/api/v1` | `ws://<computer-lan-ip>:8000/api/v1/ws/incidents` |

API documentation is available at `http://localhost:8000/docs`; OpenAPI JSON
is available at `http://localhost:8000/openapi.json`.

## Client rules

- Send JSON with `Content-Type: application/json`, except photo uploads.
- After OTP verification, send `Authorization: Bearer <access_token>`.
- Upload photos as `multipart/form-data`; the binary field is named `file`.
- Treat timestamps as UTC ISO-8601 values and follow `DATA_CONTRACT.md` for IDs.
- Handle FastAPI errors as `{ "detail": ... }`; validation failures use HTTP
  422 and return a list in `detail`.
- Do not persist presigned photo URLs; fetch photo metadata again after expiry.

All documented Person 5 endpoints are available below `/api/v1`. Older
unversioned Person 5B paths remain available for compatibility.
