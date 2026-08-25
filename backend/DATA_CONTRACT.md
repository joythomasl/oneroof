# Person 5 Backend Data Contract

This contract is the shared source of truth for the mobile and web clients.
All timestamps are UTC ISO-8601 strings. Coordinates use WGS84 latitude and
longitude. Incident IDs and area IDs are integers; user and photo IDs are UUIDs.

## Areas

`id`, `name`, `district_code`, `state`, `latitude`, `longitude`,
`current_state`, `created_at`, `updated_at`.

`current_state`: `NORMAL`, `ALERT`, `EMERGENCY`, or `RECOVERY`.

## Users

`id`, `phone`, `name`, `role`, `area_id`, `is_active`, `created_at`,
`updated_at`.

`role`: `citizen`, `responder`, or `cpoc_admin`.

## Incidents

`id`, `area_id`, `reporter_id`, `incident_type`, `severity`, `title`,
`description`, `latitude`, `longitude`, `location`, `status`, `created_at`,
`updated_at`, `external_event_id`, `source_device_id`, `duplicate_of_id`,
`verification_note`, `verified_by`, `verified_at`.

`status`: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `CLOSED`, `REOPENED`, or
`DUPLICATE`.

## Photos

`id`, `incident_id`, `object_key`, `content_type`, `size_bytes`, `status`,
`caption`, `latitude`, `longitude`, `captured_at`, `uploaded_by`,
`uploaded_at`, `verified_at`, `verified_by`.

The binary remains in the configured object store. The database stores durable
metadata. Closing-photo coordinates are compared with incident coordinates
before verification and mismatches are flagged.

## Live events

All incident create, update, approve, reject, and photo events use:

```json
{
  "event": "incident_created",
  "incident_id": "42",
  "data": {},
  "timestamp": "2026-08-25T00:00:00+00:00"
}
```

Supabase Realtime publishes database changes when configured. The existing
Redis/WebSocket channel remains supported for local and self-hosted demos.
