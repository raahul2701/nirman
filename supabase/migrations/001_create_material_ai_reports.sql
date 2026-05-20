-- 001_create_material_ai_reports.sql
CREATE TABLE IF NOT EXISTS material_ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  material_id uuid,
  report jsonb NOT NULL,
  structured_output jsonb,
  confidence numeric,
  severity text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_ai_reports_project ON material_ai_reports (project_id);
CREATE INDEX IF NOT EXISTS idx_material_ai_reports_created_at ON material_ai_reports (created_at);
