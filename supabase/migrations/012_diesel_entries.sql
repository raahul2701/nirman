-- Diesel Entries

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS diesel_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  project_id UUID REFERENCES gov_projects(id) ON DELETE SET NULL,
  entry_date DATE DEFAULT CURRENT_DATE,
  machine_name TEXT NOT NULL,
  machine_type TEXT,
  machine_id TEXT,
  operator_name TEXT,
  opening_diesel NUMERIC DEFAULT 0,
  diesel_received NUMERIC DEFAULT 0,
  diesel_used NUMERIC DEFAULT 0,
  closing_diesel NUMERIC DEFAULT 0,
  running_hours NUMERIC DEFAULT 0,
  expected_consumption NUMERIC DEFAULT 0,
  actual_consumption NUMERIC DEFAULT 0,
  variance NUMERIC GENERATED ALWAYS AS (actual_consumption - expected_consumption) STORED,
  bill_photo_url TEXT,
  remarks TEXT,
  ai_fraud_flag BOOLEAN DEFAULT FALSE,
  ai_fraud_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER diesel_entries_set_updated_at
BEFORE UPDATE ON diesel_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE diesel_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Diesel entries select" ON diesel_entries
  FOR SELECT USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','project_manager','site_engineer','labor_supervisor'))
  );

CREATE INDEX IF NOT EXISTS idx_diesel_entries_site_id ON diesel_entries(site_id);
CREATE INDEX IF NOT EXISTS idx_diesel_entries_project_id ON diesel_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_diesel_entries_created_at ON diesel_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diesel_entries_updated_at ON diesel_entries(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_diesel_entries_machine_id ON diesel_entries(machine_id);
