-- 004_create_budget_analytics_sessions.sql
CREATE TABLE IF NOT EXISTS budget_analytics_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  session_data jsonb,
  results jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_sessions_project ON budget_analytics_sessions (project_id);
