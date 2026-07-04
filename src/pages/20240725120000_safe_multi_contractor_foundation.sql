-- supabase/migrations/20240725120000_safe_multi_contractor_foundation.sql

-- 1. Create `contractors` table for business entities.
-- This table uses its own UUIDs and is not tied to auth.users.
CREATE TABLE IF NOT EXISTS public.contractors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    company_name TEXT NOT NULL,
    contact_person_name TEXT,
    contact_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    -- updated_at is handled by a trigger, assumed to be in another migration
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_contractors_workspace_id ON public.contractors(workspace_id);

-- 2. Create `contractor_users` to link auth.users to a contractor entity.
CREATE TABLE IF NOT EXISTS public.contractor_users (
    -- A user can only belong to one contractor company.
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    contractor_id uuid REFERENCES public.contractors(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.contractor_users ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_contractor_users_contractor_id ON public.contractor_users(contractor_id);

-- 3. Create `project_contracts` junction table.
CREATE TABLE IF NOT EXISTS public.project_contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.gov_projects(id) ON DELETE CASCADE NOT NULL,
    contractor_id uuid REFERENCES public.contractors(id) ON DELETE RESTRICT NOT NULL,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    contract_code TEXT UNIQUE NOT NULL,
    contract_value NUMERIC,
    -- updated_at is handled by a trigger, assumed to be in another migration
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.project_contracts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_project_contracts_project_id ON public.project_contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contracts_contractor_id ON public.project_contracts(contractor_id);

-- 4. Deterministic Backfilling Logic
DO $$
DECLARE
    contractor_user_id uuid;
    new_contractor_id uuid;
    user_profile record;
    project_record record;
BEGIN
    -- Step A & B: For each unique user acting as a contractor, create a single contractor entity.
    FOR contractor_user_id IN
        SELECT DISTINCT contractor_id FROM public.gov_projects WHERE contractor_id IS NOT NULL
    LOOP
        -- Idempotency check: Only proceed if this user hasn't been migrated to a contractor entity yet.
        IF NOT EXISTS (SELECT 1 FROM public.contractor_users WHERE user_id = contractor_user_id) THEN
            -- Fetch user's profile to get company name for the new contractor entity.
            SELECT * INTO user_profile FROM public.profiles WHERE id = contractor_user_id;

            -- Create a new contractor entity
            INSERT INTO public.contractors (workspace_id, company_name, contact_person_name, contact_email, created_by)
            VALUES (
                (SELECT workspace_id FROM workspace_users wu WHERE wu.user_id = contractor_user_id AND wu.active = true LIMIT 1),
                COALESCE(user_profile.company, user_profile.full_name, 'Unnamed Contractor'),
                user_profile.full_name,
                user_profile.email,
                contractor_user_id
            ) RETURNING id INTO new_contractor_id;

            -- Create the link between the user's auth.users.id and the new contractors.id.
            INSERT INTO public.contractor_users (user_id, contractor_id)
            VALUES (contractor_user_id, new_contractor_id);
        END IF;
    END LOOP;

    -- Step C: For each existing project, create a corresponding default project_contract.
    FOR project_record IN
        SELECT id, contractor_id, workspace_id, project_code, total_contract_value, owner_id
        FROM public.gov_projects
        WHERE contractor_id IS NOT NULL
    LOOP
        -- Find the new contractor entity ID using the old contractor_user_id.
        SELECT contractor_id INTO new_contractor_id
        FROM public.contractor_users
        WHERE user_id = project_record.contractor_id;

        -- Create the project_contract if one doesn't already exist for this project
        IF new_contractor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.project_contracts WHERE project_id = project_record.id) THEN
            INSERT INTO public.project_contracts (project_id, contractor_id, workspace_id, contract_code, contract_value, created_by)
            VALUES (
                project_record.id,
                new_contractor_id,
                project_record.workspace_id,
                project_record.project_code || '-C01',
                project_record.total_contract_value,
                project_record.owner_id
            ) ON CONFLICT (contract_code) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- 5. Add nullable `project_contract_id` to relevant tables (non-breaking)
ALTER TABLE public.boq_items ADD COLUMN IF NOT EXISTS project_contract_id uuid REFERENCES public.project_contracts(id) ON DELETE SET NULL;
ALTER TABLE public.work_uploads ADD COLUMN IF NOT EXISTS project_contract_id uuid REFERENCES public.project_contracts(id) ON DELETE SET NULL;
ALTER TABLE public.hindrance_entries ADD COLUMN IF NOT EXISTS project_contract_id uuid REFERENCES public.project_contracts(id) ON DELETE SET NULL;
ALTER TABLE public.agreement_documents ADD COLUMN IF NOT EXISTS project_contract_id uuid REFERENCES public.project_contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_boq_items_project_contract_id ON public.boq_items(project_contract_id);
CREATE INDEX IF NOT EXISTS idx_work_uploads_project_contract_id ON public.work_uploads(project_contract_id);
CREATE INDEX IF NOT EXISTS idx_hindrance_entries_project_contract_id ON public.hindrance_entries(project_contract_id);
CREATE INDEX IF NOT EXISTS idx_agreement_documents_project_contract_id ON public.agreement_documents(project_contract_id);

-- 6. Backfill the new `project_contract_id` column in existing records.
UPDATE public.boq_items bi SET project_contract_id = pc.id FROM public.project_contracts pc WHERE bi.project_id = pc.project_id AND bi.project_contract_id IS NULL;
UPDATE public.work_uploads wu SET project_contract_id = pc.id FROM public.project_contracts pc WHERE wu.project_id = pc.project_id AND wu.project_contract_id IS NULL;
UPDATE public.hindrance_entries he SET project_contract_id = pc.id FROM public.project_contracts pc WHERE he.project_id = pc.project_id AND he.project_contract_id IS NULL;
UPDATE public.agreement_documents ad SET project_contract_id = pc.id FROM public.project_contracts pc WHERE ad.project_id = pc.project_id AND ad.project_contract_id IS NULL;

-- 7. Basic RLS Policies (can be refined later)
-- Assumes helper functions like is_workspace_member/is_workspace_admin exist.
CREATE POLICY "Allow workspace members to view contractors" ON public.contractors FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Allow workspace admins to manage contractors" ON public.contractors FOR ALL USING (is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Allow assigned users to see their own link" ON public.contractor_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow workspace members to view contracts" ON public.project_contracts FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Allow contractors to see their own contracts" ON public.project_contracts FOR SELECT USING (EXISTS (SELECT 1 FROM public.contractor_users cu WHERE cu.user_id = auth.uid() AND cu.contractor_id = project_contracts.contractor_id));
CREATE POLICY "Allow workspace admins to manage contracts" ON public.project_contracts FOR ALL USING (is_workspace_admin(auth.uid(), workspace_id));