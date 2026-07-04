-- supabase/migrations/20240725110000_backfill_contracts_and_update_tables.sql

-- 1. Backfill `contractors` table from existing `profiles` data.
-- This assumes that `gov_projects.contractor_id` was a reference to `auth.users(id)`.
-- We find all users who are contractors on at least one project and create a contractor entity for them.
INSERT INTO public.contractors (id, workspace_id, company_name, contact_person_name, contact_email, created_by)
SELECT
    p.id, -- Use the user's ID as the contractor's ID for simplicity in this backfill
    (SELECT workspace_id FROM workspace_users wu WHERE wu.user_id = p.id AND wu.active = true LIMIT 1),
    COALESCE(p.company, p.full_name, 'Unnamed Contractor'),
    p.full_name,
    p.email,
    p.id
FROM
    public.profiles p
WHERE
    p.id IN (SELECT DISTINCT contractor_id FROM public.gov_projects WHERE contractor_id IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Backfill `project_contracts` table.
-- For each project with an assigned contractor, create a default contract record.
INSERT INTO public.project_contracts (project_id, contractor_id, workspace_id, contract_code, contract_value, created_by)
SELECT
    gp.id as project_id,
    gp.contractor_id,
    gp.workspace_id,
    gp.project_code || '-C01' as contract_code, -- Generate a default contract code
    gp.total_contract_value as contract_value,
    gp.owner_id as created_by
FROM
    public.gov_projects gp
WHERE
    gp.contractor_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = gp.contractor_id) -- Ensure contractor exists
ON CONFLICT (contract_code) DO NOTHING;

-- 3. Add nullable `project_contract_id` to relevant tables.
-- We add it as nullable to avoid breaking existing insert operations in the app.
-- We will make it non-nullable in a future migration after the app code is updated.

-- For BOQ Items
ALTER TABLE public.boq_items
ADD COLUMN IF NOT EXISTS project_contract_id uuid REFERENCES public.project_contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_boq_items_project_contract_id ON public.boq_items(project_contract_id);

-- For Daily Progress (assuming `daily_reports` or a similar table)
-- Let's assume a table `daily_progress_reports` exists for this workflow.
-- If not, this can be adapted. For now, we'll use `work_uploads` as a proxy.
ALTER TABLE public.work_uploads
ADD COLUMN IF NOT EXISTS project_contract_id uuid REFERENCES public.project_contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_work_uploads_project_contract_id ON public.work_uploads(project_contract_id);

-- For RA Bills (assuming `ra_bills` table)
CREATE TABLE IF NOT EXISTS public.ra_bills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.gov_projects(id),
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ra_bills
ADD COLUMN IF NOT EXISTS project_contract_id uuid REFERENCES public.project_contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ra_bills_project_contract_id ON public.ra_bills(project_contract_id);

-- For Material Requests (assuming `material_requests` table)
CREATE TABLE IF NOT EXISTS public.material_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.gov_projects(id),
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.material_requests
ADD COLUMN IF NOT EXISTS project_contract_id uuid REFERENCES public.project_contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_material_requests_project_contract_id ON public.material_requests(project_contract_id);

-- For Hindrance Register
ALTER TABLE public.hindrance_entries
ADD COLUMN IF NOT EXISTS project_contract_id uuid REFERENCES public.project_contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_hindrance_entries_project_contract_id ON public.hindrance_entries(project_contract_id);

-- For Agreement Documents (AI Study)
ALTER TABLE public.agreement_documents
ADD COLUMN IF NOT EXISTS project_contract_id uuid REFERENCES public.project_contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_agreement_documents_project_contract_id ON public.agreement_documents(project_contract_id);

-- 4. Backfill `project_contract_id` in existing records where possible.
-- This links existing data to the new contract structure.
UPDATE public.boq_items bi
SET project_contract_id = pc.id
FROM public.project_contracts pc
WHERE bi.project_id = pc.project_id;

UPDATE public.work_uploads wu
SET project_contract_id = pc.id
FROM public.project_contracts pc
WHERE wu.project_id = pc.project_id;

UPDATE public.hindrance_entries he
SET project_contract_id = pc.id
FROM public.project_contracts pc
WHERE he.project_id = pc.project_id;

UPDATE public.agreement_documents ad
SET project_contract_id = pc.id
FROM public.project_contracts pc
WHERE ad.project_id = pc.project_id;