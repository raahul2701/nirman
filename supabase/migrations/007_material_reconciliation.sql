-- Material Reconciliation Engine

CREATE TYPE material_variance_status AS ENUM ('open', 'reviewed', 'closed', 'escalated');
CREATE TYPE wastage_alert_type AS ENUM ('overconsumption', 'shortage', 'storage_loss', 'mishandling', 'quality_reject');

CREATE TABLE IF NOT EXISTS material_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id),
  material_name TEXT NOT NULL,
  material_received NUMERIC NOT NULL DEFAULT 0,
  material_used NUMERIC NOT NULL DEFAULT 0,
  theoretical_required NUMERIC NOT NULL DEFAULT 0,
  actual_consumption NUMERIC NOT NULL DEFAULT 0,
  variance_percent NUMERIC GENERATED ALWAYS AS (
    CASE WHEN theoretical_required = 0 THEN 0 ELSE ((actual_consumption - theoretical_required) / theoretical_required) * 100 END
  ) STORED,
  possible_theft BOOLEAN DEFAULT FALSE,
  possible_wastage BOOLEAN DEFAULT FALSE,
  status material_variance_status DEFAULT 'open',
  report_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS theoretical_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  planned_quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wastage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  alert_type wastage_alert_type NOT NULL,
  variance_percent NUMERIC NOT NULL DEFAULT 0,
  estimated_loss NUMERIC NOT NULL DEFAULT 0,
  ai_reason TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER material_reconciliation_set_updated_at
BEFORE UPDATE ON material_reconciliation
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER theoretical_consumption_set_updated_at
BEFORE UPDATE ON theoretical_consumption
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER wastage_alerts_set_updated_at
BEFORE UPDATE ON wastage_alerts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE material_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE theoretical_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE wastage_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Material reconciliation select" ON material_reconciliation
  FOR SELECT USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','project_manager','site_engineer','labor_supervisor')));
CREATE POLICY "Theoretical consumption select" ON theoretical_consumption
  FOR SELECT USING (TRUE);
CREATE POLICY "Wastage alerts select" ON wastage_alerts
  FOR SELECT USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_material_reconciliation_project_id ON material_reconciliation(project_id);
CREATE INDEX IF NOT EXISTS idx_material_reconciliation_site_id ON material_reconciliation(site_id);
CREATE INDEX IF NOT EXISTS idx_material_reconciliation_report_date ON material_reconciliation(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_theoretical_consumption_project_id ON theoretical_consumption(project_id);
CREATE INDEX IF NOT EXISTS idx_wastage_alerts_project_id ON wastage_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_wastage_alerts_alert_type ON wastage_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_wastage_alerts_created_at ON wastage_alerts(created_at DESC);
