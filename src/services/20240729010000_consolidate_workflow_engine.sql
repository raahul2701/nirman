-- This migration consolidates the backend to a single, canonical workflow engine
-- by removing all legacy and duplicate approval-related tables.
-- It preserves immutable migration history by creating a new migration file
-- for cleanup, rather than editing or deleting previous ones.

BEGIN;

-- Drop the simple, now-obsolete approval engine tables.
DROP TABLE IF EXISTS public.approval_actions;
DROP TABLE IF EXISTS public.approval_requests;
DROP TABLE IF EXISTS public.approval_workflow;

COMMIT;