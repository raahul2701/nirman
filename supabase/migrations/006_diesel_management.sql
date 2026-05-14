-- Diesel Management System

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE diesel_alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE diesel_alert_type AS ENUM ('low_stock', 'high_variance', 'idle_fuel_loss', 'fuel_theft', 'runtime_anomaly', 'inspection_due');

CREATE TABLE IF NOT EXISTS diesel_tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  tank_name TEXT NOT NULL,
  capacity_liters NUMERIC NOT NULL DEFAULT 0,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  minimum_alert_level NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS diesel_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  quantity_liters NUMERIC NOT NULL DEFAULT 0,
  rate_per_liter NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  receipt_photo_url TEXT,
  received_by UUID REFERENCES auth.users(id),
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS diesel_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  machine_id UUID,
  operator_id UUID REFERENCES auth.users(id),
  issued_liters NUMERIC NOT NULL DEFAULT 0,
  runtime_hours NUMERIC NOT NULL DEFAULT 0,
  expected_consumption NUMERIC NOT NULL DEFAULT 0,
  actual_consumption NUMERIC NOT NULL DEFAULT 0,
  variance_liters NUMERIC GENERATED ALWAYS AS (actual_consumption - expected_consumption) STORED,
  gps_location TEXT,
  issued_by UUID REFERENCES auth.users(id),
  issued_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS machinery_runtime_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  machine_name TEXT NOT NULL,
  machine_type TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  start_time TIMESTAMPTZ,
  stop_time TIMESTAMPTZ,
  idle_hours NUMERIC NOT NULL DEFAULT 0,
  runtime_hours NUMERIC NOT NULL DEFAULT 0,
  diesel_used NUMERIC NOT NULL DEFAULT 0,
  expected_diesel NUMERIC NOT NULL DEFAULT 0,
  variance NUMERIC GENERATED ALWAYS AS (diesel_used - expected_diesel) STORED,
  gps_path JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS diesel_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  alert_type diesel_alert_type NOT NULL,
  severity diesel_alert_severity NOT NULL DEFAULT 'medium',
  ai_reason TEXT NOT NULL,
  estimated_loss NUMERIC DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER diesel_tanks_set_updated_at
BEFORE UPDATE ON diesel_tanks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER diesel_receipts_set_updated_at
BEFORE UPDATE ON diesel_receipts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER diesel_issues_set_updated_at
BEFORE UPDATE ON diesel_issues
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER machinery_runtime_logs_set_updated_at
BEFORE UPDATE ON machinery_runtime_logs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER diesel_alerts_set_updated_at
BEFORE UPDATE ON diesel_alerts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE diesel_tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE diesel_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE diesel_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE machinery_runtime_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE diesel_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Diesel tank owners can select" ON diesel_tanks
  FOR SELECT USING (auth.uid() = created_by OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','project_manager','site_engineer','labor_supervisor')));
CREATE POLICY "Diesel receipts owners can select" ON diesel_receipts
  FOR SELECT USING (auth.uid() = received_by OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','project_manager','site_engineer','labor_supervisor')));
CREATE POLICY "Diesel issues owners can select" ON diesel_issues
  FOR SELECT USING (auth.uid() = issued_by OR auth.uid() = operator_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','project_manager','site_engineer','labor_supervisor')));
CREATE POLICY "Machinery runtime view" ON machinery_runtime_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','project_manager','site_engineer','labor_supervisor')));
CREATE POLICY "Diesel alerts view" ON diesel_alerts
  FOR SELECT USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_diesel_tanks_site_id ON diesel_tanks(site_id);
CREATE INDEX IF NOT EXISTS idx_diesel_tanks_created_at ON diesel_tanks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diesel_receipts_site_id ON diesel_receipts(site_id);
CREATE INDEX IF NOT EXISTS idx_diesel_issues_machine_id ON diesel_issues(machine_id);
CREATE INDEX IF NOT EXISTS idx_diesel_issues_operator_id ON diesel_issues(operator_id);
CREATE INDEX IF NOT EXISTS idx_diesel_issues_issued_at ON diesel_issues(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_machinery_runtime_logs_site_id ON machinery_runtime_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_diesel_alerts_severity ON diesel_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_diesel_alerts_created_at ON diesel_alerts(created_at DESC);
