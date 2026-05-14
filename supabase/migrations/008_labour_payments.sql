-- Labour Payment System

CREATE TYPE labour_payment_status AS ENUM ('pending', 'paid', 'settled', 'disputed');
CREATE TYPE labour_advance_status AS ENUM ('requested', 'approved', 'paid', 'repaid');
CREATE TYPE labour_attendance_summary_status AS ENUM ('draft', 'confirmed', 'reviewed');
CREATE TYPE labour_settlement_status AS ENUM ('pending', 'completed', 'adjusted');

CREATE TABLE IF NOT EXISTS labour_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES auth.users(id),
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status labour_payment_status DEFAULT 'pending',
  payment_mode TEXT DEFAULT 'upi' CHECK (payment_mode IN ('upi','cash','bank_transfer','other')),
  transaction_reference TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS labour_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES auth.users(id),
  advance_amount NUMERIC NOT NULL DEFAULT 0,
  advance_date DATE DEFAULT CURRENT_DATE,
  repayment_due_date DATE,
  status labour_advance_status DEFAULT 'requested',
  remarks TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS labour_attendance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  summary_date DATE DEFAULT CURRENT_DATE,
  total_workers INTEGER NOT NULL DEFAULT 0,
  present_workers INTEGER NOT NULL DEFAULT 0,
  absent_workers INTEGER NOT NULL DEFAULT 0,
  overtime_hours NUMERIC NOT NULL DEFAULT 0,
  productivity_score NUMERIC NOT NULL DEFAULT 0,
  status labour_attendance_summary_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS labour_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES auth.users(id),
  settlement_amount NUMERIC NOT NULL DEFAULT 0,
  settlement_date DATE DEFAULT CURRENT_DATE,
  settlement_status labour_settlement_status DEFAULT 'pending',
  reference TEXT DEFAULT '',
  remarks TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER labour_payments_set_updated_at
BEFORE UPDATE ON labour_payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER labour_advances_set_updated_at
BEFORE UPDATE ON labour_advances
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER labour_attendance_summary_set_updated_at
BEFORE UPDATE ON labour_attendance_summary
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER labour_settlements_set_updated_at
BEFORE UPDATE ON labour_settlements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE labour_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_attendance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Labour payments select" ON labour_payments
  FOR SELECT USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','project_manager','site_engineer','labor_supervisor')));
CREATE POLICY "Labour advances select" ON labour_advances
  FOR SELECT USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','project_manager','site_engineer','labor_supervisor')));
CREATE POLICY "Labour attendance summaries select" ON labour_attendance_summary
  FOR SELECT USING (TRUE);
CREATE POLICY "Labour settlements select" ON labour_settlements
  FOR SELECT USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','project_manager','site_engineer','labor_supervisor')));

CREATE INDEX IF NOT EXISTS idx_labour_payments_project_id ON labour_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_labour_payments_worker_id ON labour_payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_labour_advances_worker_id ON labour_advances(worker_id);
CREATE INDEX IF NOT EXISTS idx_labour_attendance_summary_site_id ON labour_attendance_summary(site_id);
CREATE INDEX IF NOT EXISTS idx_labour_settlements_worker_id ON labour_settlements(worker_id);
