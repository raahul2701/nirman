-- Maintenance System

CREATE TYPE maintenance_status AS ENUM ('scheduled', 'completed', 'overdue', 'in_progress', 'missed');
CREATE TYPE breakdown_severity AS ENUM ('minor', 'major', 'critical');
CREATE TYPE machinery_health_rating AS ENUM ('excellent', 'good', 'fair', 'poor', 'critical');

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  machine_name TEXT NOT NULL,
  machine_type TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  maintenance_type TEXT NOT NULL,
  service_date DATE DEFAULT CURRENT_DATE,
  maintenance_cost NUMERIC NOT NULL DEFAULT 0,
  spare_parts TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status maintenance_status DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS service_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_name TEXT NOT NULL,
  machine_type TEXT NOT NULL,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  next_service_date DATE,
  interval_days INTEGER NOT NULL DEFAULT 30,
  last_service_date DATE,
  status maintenance_status DEFAULT 'scheduled',
  owner_id UUID REFERENCES auth.users(id),
  service_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS breakdown_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  machine_name TEXT NOT NULL,
  machine_type TEXT NOT NULL,
  reported_by UUID REFERENCES auth.users(id),
  breakdown_date TIMESTAMPTZ DEFAULT now(),
  severity breakdown_severity DEFAULT 'minor',
  description TEXT DEFAULT '',
  resolution_notes TEXT DEFAULT '',
  cost_estimate NUMERIC DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS machinery_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  machine_name TEXT NOT NULL,
  machine_type TEXT NOT NULL,
  health_rating machinery_health_rating DEFAULT 'good',
  last_checked TIMESTAMPTZ DEFAULT now(),
  expected_failure_date DATE,
  maintenance_recommendation TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER maintenance_logs_set_updated_at
BEFORE UPDATE ON maintenance_logs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER service_schedules_set_updated_at
BEFORE UPDATE ON service_schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER breakdown_reports_set_updated_at
BEFORE UPDATE ON breakdown_reports
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER machinery_health_set_updated_at
BEFORE UPDATE ON machinery_health
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakdown_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE machinery_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Maintenance logs select" ON maintenance_logs
  FOR SELECT USING (TRUE);
CREATE POLICY "Service schedules select" ON service_schedules
  FOR SELECT USING (TRUE);
CREATE POLICY "Breakdown reports select" ON breakdown_reports
  FOR SELECT USING (TRUE);
CREATE POLICY "Machinery health select" ON machinery_health
  FOR SELECT USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_project_id ON maintenance_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_service_schedules_site_id ON service_schedules(site_id);
CREATE INDEX IF NOT EXISTS idx_breakdown_reports_severity ON breakdown_reports(severity);
CREATE INDEX IF NOT EXISTS idx_machinery_health_rating ON machinery_health(health_rating);
CREATE INDEX IF NOT EXISTS idx_machinery_health_last_checked ON machinery_health(last_checked DESC);
