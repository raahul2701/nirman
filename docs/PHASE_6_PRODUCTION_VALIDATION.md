# Phase 6 Production Validation

## Supabase Migration Checklist

- Generate types before release: `supabase gen types typescript --project-id <project> > src/types/database.ts`.
- Apply migrations first in staging, then production with backups enabled.
- Confirm RLS is enabled on production tables and storage objects.
- Verify ownership policies with contractor, site engineer, project manager, government, admin, and super admin sessions.
- Validate signed upload URL flow for private buckets.
- Confirm `audit_logs`, `ai_request_logs`, `upload_metadata`, `device_sessions`, and impersonation tables receive events.
- Run rollback scripts only as forward migrations that disable new behavior or mark records inactive. Avoid destructive rollback.

## Runtime Validation

- Run `npm run typecheck`.
- Run `npm run build`.
- Run bundle analysis with `npm run build -- --mode analyze` or Vite visualizer in CI.
- Open production preview and verify lazy routes load without chunk failures.
- Simulate offline mode and confirm inspections, reports, and uploads queue.
- Simulate slow 3G and confirm AI proxy timeout/fallback, upload resume, and no reconnect storms.
- Confirm service worker update prompt appears after a new deploy.
- Confirm no sensitive tokens appear in console, telemetry, Supabase logs, or AI audit logs.

## Rollback-Safe Migration Rules

- Add nullable columns first, backfill second, enforce `not null` in a later migration.
- Create policies with explicit role checks and keep old policies until clients are deployed.
- Use `create table if not exists`, `create index if not exists`, and idempotent policy drops.
- Prefer status flags and views over table drops.
- Keep storage cleanup jobs dry-run capable before deletion.
