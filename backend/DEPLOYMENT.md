# Person 5 Deployment Readiness

The backend supports either a hosted Supabase project or self-hosted Supabase.
Nothing in this repository contains project credentials.

## Supabase setup

1. Create the project and enable PostGIS.
2. Apply `../supabase/migrations/202608250001_person5_core.sql` with the
   Supabase CLI or SQL editor.
3. Set `DATABASE_URL` to the Supabase PostgreSQL pooler URL.
4. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` in the deployment secret manager.
5. For Supabase S3-compatible Storage, point `MINIO_ENDPOINT` at the project's
   S3 endpoint and provide its S3 access key and secret. The existing MinIO
   backend remains available for a fully local demo.

## Start command

```text
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Run from the `backend` directory after installing `requirements.txt`.

## Demo readiness

- Run `python -m app.seed_data` once against the demo database.
- Confirm `/health` reports the configured database and live dependencies.
- Confirm `/api/v1/areas/` and `/api/v1/incidents/` return seeded data.
- Upload a closing photo with latitude, longitude, and captured time.
- Approve it through `/verification/{incident_id}/approve` using
  `closing_photo_id`; verify the incident becomes `CLOSED` and a distant photo
  is flagged.

An actual hosted deployment still requires the team-owned Supabase project and
deployment account. Those external resources are intentionally not created by
repository code.
