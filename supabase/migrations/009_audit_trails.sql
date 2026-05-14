-- Audit Trail System

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS table_name TEXT,
  ADD COLUMN IF NOT EXISTS record_id UUID,
  ADD COLUMN IF NOT EXISTS operation_type TEXT,
  ADD COLUMN IF NOT EXISTS old_values JSONB,
  ADD COLUMN IF NOT EXISTS new_values JSONB,
  ADD COLUMN IF NOT EXISTS device_info JSONB,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE OR REPLACE FUNCTION nirmann_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'action', 'insert',
      'table', TG_TABLE_NAME,
      'record_id', NEW.id,
      'new_values', to_jsonb(NEW),
      'old_values', NULL
    );
    INSERT INTO audit_logs(table_name, record_id, operation_type, new_values, old_values, user_id, ip_address, user_agent, created_at)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', to_jsonb(NEW), NULL, auth.uid(), NULL, NULL, NOW());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs(table_name, record_id, operation_type, new_values, old_values, user_id, ip_address, user_agent, created_at)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(NEW), to_jsonb(OLD), auth.uid(), NULL, NULL, NOW());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs(table_name, record_id, operation_type, new_values, old_values, user_id, ip_address, user_agent, created_at)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', NULL, to_jsonb(OLD), auth.uid(), NULL, NULL, NOW());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_type ON audit_logs(operation_type);

-- Attach audit trigger to core audit-sensitive tables if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'attendance' AND relkind = 'r') THEN
    CREATE TRIGGER attendance_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON attendance
      FOR EACH ROW EXECUTE FUNCTION nirmann_audit_log();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'materials' AND relkind = 'r') THEN
    CREATE TRIGGER materials_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON materials
      FOR EACH ROW EXECUTE FUNCTION nirmann_audit_log();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'stock_transactions' AND relkind = 'r') THEN
    CREATE TRIGGER stock_transactions_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON stock_transactions
      FOR EACH ROW EXECUTE FUNCTION nirmann_audit_log();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'diesel_tanks' AND relkind = 'r') THEN
    CREATE TRIGGER diesel_tanks_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON diesel_tanks
      FOR EACH ROW EXECUTE FUNCTION nirmann_audit_log();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'diesel_receipts' AND relkind = 'r') THEN
    CREATE TRIGGER diesel_receipts_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON diesel_receipts
      FOR EACH ROW EXECUTE FUNCTION nirmann_audit_log();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'diesel_issues' AND relkind = 'r') THEN
    CREATE TRIGGER diesel_issues_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON diesel_issues
      FOR EACH ROW EXECUTE FUNCTION nirmann_audit_log();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'labour_payments' AND relkind = 'r') THEN
    CREATE TRIGGER labour_payments_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON labour_payments
      FOR EACH ROW EXECUTE FUNCTION nirmann_audit_log();
  END IF;
END;
$$;
