-- This migration cleans up the legacy/redundant approval engine tables.
-- It preserves the immutable migration history by creating a new migration
-- to drop obsolete tables, rather than editing or deleting old migration files.

BEGIN;

-- Drop the simple approval engine tables, which have been replaced by the advanced workflow engine.
DROP TABLE IF EXISTS public.approval_actions;
DROP TABLE IF EXISTS public.approval_requests;

COMMIT;