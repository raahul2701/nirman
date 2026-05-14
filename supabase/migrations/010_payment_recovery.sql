-- Payment Recovery Tracker

CREATE TYPE payment_visit_type AS ENUM ('ee_meeting', 'je_discussion', 'treasury_visit', 'file_submission', 'bill_passed', 'payment_followup');
CREATE TYPE payment_delay_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE IF NOT EXISTS payment_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  department TEXT NOT NULL,
  last_followup_date DATE DEFAULT CURRENT_DATE,
  next_followup_date DATE,
  escalation_level payment_delay_level DEFAULT 'low',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS department_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id UUID REFERENCES payment_followups(id) ON DELETE CASCADE,
  visit_type payment_visit_type NOT NULL,
  visited_by UUID REFERENCES auth.users(id),
  visit_date DATE DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS file_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id UUID REFERENCES payment_followups(id) ON DELETE CASCADE,
  from_department TEXT NOT NULL,
  to_department TEXT NOT NULL,
  moved_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'approved', 'rejected', 'pending')),
  remarks TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payment_delay_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  followup_id UUID REFERENCES payment_followups(id) ON DELETE CASCADE,
  delayed_days INTEGER NOT NULL DEFAULT 0,
  escalation_level payment_delay_level DEFAULT 'medium',
  ai_reason TEXT,
  expected_payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER payment_followups_set_updated_at
BEFORE UPDATE ON payment_followups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER department_visits_set_updated_at
BEFORE UPDATE ON department_visits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER file_movements_set_updated_at
BEFORE UPDATE ON file_movements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER payment_delay_alerts_set_updated_at
BEFORE UPDATE ON payment_delay_alerts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE payment_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_delay_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment followups select" ON payment_followups
  FOR SELECT USING (TRUE);
CREATE POLICY "Department visits select" ON department_visits
  FOR SELECT USING (TRUE);
CREATE POLICY "File movements select" ON file_movements
  FOR SELECT USING (TRUE);
CREATE POLICY "Payment delay alerts select" ON payment_delay_alerts
  FOR SELECT USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_payment_followups_project_id ON payment_followups(project_id);
CREATE INDEX IF NOT EXISTS idx_department_visits_followup_id ON department_visits(followup_id);
CREATE INDEX IF NOT EXISTS idx_file_movements_followup_id ON file_movements(followup_id);
CREATE INDEX IF NOT EXISTS idx_payment_delay_alerts_project_id ON payment_delay_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_delay_alerts_expected_payment_date ON payment_delay_alerts(expected_payment_date);
