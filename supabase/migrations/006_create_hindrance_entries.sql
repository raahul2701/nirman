-- 006_create_hindrance_entries.sql
CREATE TABLE IF NOT EXISTS hindrance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  description text,
  location jsonb,
  severity text,
  status text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hindrance_project ON hindrance_entries (project_id);
