/*
  # GovTrack Pro — Government Contract Monitoring & Smart Payment System

  ## Overview
  Adds complete government project tracking, milestone-based payments,
  contractor work uploads, AI-powered payment verification, multi-level
  approval workflows, and site inspection reports.

  ## Tables Created
  1. `gov_projects` — Government construction projects with contract details
  2. `payment_milestones` — Payment milestones per project with AI risk assessment
  3. `work_uploads` — Contractor photo/video/evidence uploads with AI quality scoring
  4. `payment_requests` — Multi-level approval payment requests (JE → EE → SE)
  5. `inspection_reports` — Site inspection reports with AI-generated findings
  6. `approval_workflow` — Approval action audit trail per payment request

  ## Security
  - RLS enabled on ALL tables
  - Users can only access projects they own or are assigned to
  - Contractors see only their own uploads/requests
  - Engineers see projects assigned to them
*/

-- GOV PROJECTS
CREATE TABLE IF NOT EXISTS gov_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id),
  project_name text NOT NULL,
  project_code text UNIQUE NOT NULL,
  department text NOT NULL,
  contractor_name text NOT NULL,
  contractor_id uuid REFERENCES profiles(id),
  engineer_id uuid REFERENCES profiles(id),
  total_contract_value numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  contract_pdf_url text DEFAULT '',
  location text DEFAULT '',
  project_type text DEFAULT 'highway' CHECK (project_type IN ('highway','building','bridge','dam','irrigation','railway','other')),
  status text DEFAULT 'active' CHECK (status IN ('active','completed','on_hold','cancelled')),
  progress_percent integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gov_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or assigned gov projects"
  ON gov_projects FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR contractor_id = auth.uid() OR engineer_id = auth.uid());

CREATE POLICY "Users can insert gov projects"
  ON gov_projects FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own gov projects"
  ON gov_projects FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR engineer_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() OR engineer_id = auth.uid());

-- PAYMENT MILESTONES
CREATE TABLE IF NOT EXISTS payment_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES gov_projects(id) ON DELETE CASCADE,
  milestone_number integer NOT NULL,
  milestone_name text NOT NULL,
  description text DEFAULT '',
  payment_amount numeric NOT NULL DEFAULT 0,
  payment_percentage numeric NOT NULL DEFAULT 0,
  due_date date,
  status text DEFAULT 'locked' CHECK (status IN ('locked','active','submitted','approved','paid')),
  completion_percentage numeric DEFAULT 0,
  ai_safe_amount numeric,
  ai_hold_amount numeric,
  ai_risk_level text CHECK (ai_risk_level IN ('high','medium','low','safe')),
  ai_analysis text DEFAULT '',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones for their projects"
  ON payment_milestones FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gov_projects gp
      WHERE gp.id = project_id
      AND (gp.owner_id = auth.uid() OR gp.contractor_id = auth.uid() OR gp.engineer_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert milestones for their projects"
  ON payment_milestones FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gov_projects gp
      WHERE gp.id = project_id
      AND (gp.owner_id = auth.uid() OR gp.engineer_id = auth.uid())
    )
  );

CREATE POLICY "Users can update milestones for their projects"
  ON payment_milestones FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gov_projects gp
      WHERE gp.id = project_id
      AND (gp.owner_id = auth.uid() OR gp.engineer_id = auth.uid())
    )
  );

-- WORK UPLOADS
CREATE TABLE IF NOT EXISTS work_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES gov_projects(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES payment_milestones(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES profiles(id),
  work_category text NOT NULL DEFAULT 'other' CHECK (work_category IN ('foundation','brickwork','rcc','plastering','finishing','electrical','plumbing','other')),
  description text DEFAULT '',
  photo_urls text[] DEFAULT '{}',
  video_urls text[] DEFAULT '{}',
  gps_latitude numeric,
  gps_longitude numeric,
  upload_timestamp timestamptz DEFAULT now(),
  ai_analysis text DEFAULT '',
  ai_quality_score numeric DEFAULT 0,
  issues_found jsonb DEFAULT '[]',
  review_status text DEFAULT 'pending' CHECK (review_status IN ('pending','reviewed','flagged')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  engineer_notes text DEFAULT ''
);

ALTER TABLE work_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view uploads for their projects"
  ON work_uploads FOR SELECT TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM gov_projects gp
      WHERE gp.id = project_id
      AND (gp.owner_id = auth.uid() OR gp.engineer_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own uploads"
  ON work_uploads FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Engineers can update uploads for their projects"
  ON work_uploads FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gov_projects gp
      WHERE gp.id = project_id
      AND (gp.owner_id = auth.uid() OR gp.engineer_id = auth.uid())
    )
  );

-- PAYMENT REQUESTS
CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES gov_projects(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES payment_milestones(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES profiles(id),
  claimed_amount numeric NOT NULL DEFAULT 0,
  ai_recommended_amount numeric,
  ai_hold_amount numeric DEFAULT 0,
  ai_risk_level text CHECK (ai_risk_level IN ('high','medium','low','safe')),
  ai_full_report text DEFAULT '',
  je_approved_amount numeric,
  je_approved_by uuid REFERENCES profiles(id),
  je_approved_at timestamptz,
  ee_approved_amount numeric,
  ee_approved_by uuid REFERENCES profiles(id),
  ee_approved_at timestamptz,
  se_approved_amount numeric,
  se_approved_by uuid REFERENCES profiles(id),
  se_approved_at timestamptz,
  final_status text DEFAULT 'pending' CHECK (final_status IN ('pending','je_approved','ee_approved','se_approved','paid','rejected','hold')),
  rejection_reason text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment requests for their projects"
  ON payment_requests FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM gov_projects gp
      WHERE gp.id = project_id
      AND (gp.owner_id = auth.uid() OR gp.contractor_id = auth.uid() OR gp.engineer_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own payment requests"
  ON payment_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Users can update payment requests for their projects"
  ON payment_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gov_projects gp
      WHERE gp.id = project_id
      AND (gp.owner_id = auth.uid() OR gp.engineer_id = auth.uid())
    )
  );

-- INSPECTION REPORTS
CREATE TABLE IF NOT EXISTS inspection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES gov_projects(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES payment_milestones(id) ON DELETE SET NULL,
  inspected_by uuid REFERENCES profiles(id),
  inspection_date date NOT NULL DEFAULT CURRENT_DATE,
  inspection_type text DEFAULT 'routine' CHECK (inspection_type IN ('routine','milestone','complaint','final')),
  overall_quality_score numeric DEFAULT 0,
  structural_issues jsonb DEFAULT '[]',
  quality_issues jsonb DEFAULT '[]',
  compliance_issues jsonb DEFAULT '[]',
  photos text[] DEFAULT '{}',
  ai_report text DEFAULT '',
  recommendation text DEFAULT 'approve' CHECK (recommendation IN ('approve','partial','hold','reject')),
  pdf_report_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inspections for their projects"
  ON inspection_reports FOR SELECT TO authenticated
  USING (
    inspected_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM gov_projects gp
      WHERE gp.id = project_id
      AND (gp.owner_id = auth.uid() OR gp.contractor_id = auth.uid() OR gp.engineer_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert inspections for their projects"
  ON inspection_reports FOR INSERT TO authenticated
  WITH CHECK (inspected_by = auth.uid());

CREATE POLICY "Users can update inspections for their projects"
  ON inspection_reports FOR UPDATE TO authenticated
  USING (inspected_by = auth.uid());

-- APPROVAL WORKFLOW
CREATE TABLE IF NOT EXISTS approval_workflow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid REFERENCES payment_requests(id) ON DELETE CASCADE,
  approver_id uuid REFERENCES profiles(id),
  approver_role text NOT NULL CHECK (approver_role IN ('JE','EE','SE')),
  action text NOT NULL CHECK (action IN ('approved','rejected','hold','partial')),
  approved_amount numeric,
  comments text DEFAULT '',
  action_at timestamptz DEFAULT now()
);

ALTER TABLE approval_workflow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approval actions for their requests"
  ON approval_workflow FOR SELECT TO authenticated
  USING (
    approver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM payment_requests pr
      WHERE pr.id = payment_request_id
      AND (pr.requested_by = auth.uid() OR EXISTS (
        SELECT 1 FROM gov_projects gp WHERE gp.id = pr.project_id AND (gp.owner_id = auth.uid() OR gp.engineer_id = auth.uid())
      ))
    )
  );

CREATE POLICY "Users can insert own approval actions"
  ON approval_workflow FOR INSERT TO authenticated
  WITH CHECK (approver_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE gov_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE work_uploads;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_requests;
