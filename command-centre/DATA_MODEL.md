# Operational data-model migration

The redesign adds a normalized command layer without deleting the legacy demo model.

## Entity mapping

- `Area` → `District`, adding CPOC channel, capacity, communications, access, SITREP, briefing, and objective fields.
- `Incident` → `OperationalIncident`, adding response status, people counts, named ownership, acknowledgement, deadline, next action, escalation, routes, forecast, blockers, and embedded trust metadata.
- `Unit` → `Resource`, broadening the model to teams, vehicles, medical assets, equipment, facilities, and supplies with endurance, work/rest, heartbeat, check-in, and release state.
- `ResourceRequest` → expanded `ResourceRequest` with capability, quantity, need-by time, and fulfilment state.
- `AuditEntry` → `AuditEvent`, adding previous/new values, reason, source/device, and synchronisation state.

## New first-class entities

- Scenario and operational period
- Operational task
- Command decision
- Verification report
- Evidence item
- Command role
- Inter-agency hand-off
- Incident Action Plan
- SITREP

## Validation now enforced in the client domain

- Unassigned P0 incidents outrank assigned P0 incidents.
- Invalid response-status transitions are rejected.
- Resolved incidents require evidence.
- A committed or unavailable resource cannot be double-booked.
- Offline mutations generate pending audit events and increment the local queue.
- Historical scenario time is independent of operator time.
- Kerala replay localities are mapped to their correct administrative districts.

Production persistence should store these entities in separate tables/collections keyed by stable IDs, with server-enforced transition, assignment, acknowledgement, and audit constraints.
