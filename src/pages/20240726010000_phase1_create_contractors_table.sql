-- Phase 1: Create `contractors` table for business entities.
-- This migration is additive, idempotent, and backward-compatible.

-- Ensure the moddatetime function exists to prevent migration failure.
-- This function is commonly used to update `updated_at` columns.
CREATE OR REPLACE FUNCTION public.moddatetime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the `contractors` table if it does not already exist.
CREATE TABLE IF NOT EXISTS public.contractors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL, -- Nullable to allow for contractors not yet tied to a workspace.
    company_name TEXT NOT NULL,
    contact_person_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    pan_number TEXT,
    gst_number TEXT,
    status TEXT DEFAULT 'pending' NOT NULL, -- e.g., pending, active, inactive, blacklisted
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for performance on frequently queried columns.
CREATE INDEX IF NOT EXISTS idx_contractors_workspace_id ON public.contractors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contractors_company_name ON public.contractors(company_name);
CREATE INDEX IF NOT EXISTS idx_contractors_status ON public.contractors(status);

-- Add partial unique indexes to ensure PAN and GST are unique only when they are not null.
-- This allows multiple contractors to have NULL for these fields during onboarding.
CREATE UNIQUE INDEX IF NOT EXISTS idx_contractors_unique_pan_not_null ON public.contractors(pan_number) WHERE pan_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contractors_unique_gst_not_null ON public.contractors(gst_number) WHERE gst_number IS NOT NULL;

-- Create a trigger to automatically update the `updated_at` timestamp.
-- This is idempotent; it won't fail if the trigger already exists.
DROP TRIGGER IF EXISTS on_contractors_update ON public.contractors;
CREATE TRIGGER on_contractors_update
BEFORE UPDATE ON public.contractors
FOR EACH ROW EXECUTE PROCEDURE public.moddatetime();

-- Enable Row Level Security on the new table.
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS policies will be added in a subsequent migration after more tables are in place
-- to define access rules correctly (e.g., based on project_contracts or contractor_users).
-- For now, access is restricted by default as no policies are defined.