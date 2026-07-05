-- 007_create_diesel_issue_logs.sql
CREATE TABLE IF NOT EXISTS diesel_issue_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  vehicle_id uuid,
  log jsonb,
  consumption numeric,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diesel_logs_project ON diesel_issue_logs (project_id);
