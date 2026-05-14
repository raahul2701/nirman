-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres
GRANT USAGE ON SCHEMA cron TO postgres;

-- Cron job 1: Send BG alerts at 9:00 AM daily
SELECT cron.schedule(
  'send-bg-alerts-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-bg-alerts',
    headers := '{"Authorization": "Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'service_role_key') || '"}'::jsonb
  );
  $$
);

-- Cron job 2: Calculate budget gap at 7:00 PM daily
SELECT cron.schedule(
  'calculate-budget-gap-daily',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/calculate-budget-gap',
    headers := '{"Authorization": "Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'service_role_key') || '"}'::jsonb
  );
  $$
);

-- Cron job 3: Auto weather sync every 3 hours
SELECT cron.schedule(
  'auto-weather-sync-3h',
  '0 */3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/auto-weather-sync',
    headers := '{"Authorization": "Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'service_role_key') || '"}'::jsonb
  );
  $$
);

-- Cron job 4: Generate weekly report every Monday 8:00 AM
SELECT cron.schedule(
  'generate-weekly-report-monday',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/generate-weekly-report',
    headers := '{"Authorization": "Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'service_role_key') || '"}'::jsonb
  );
  $$
);

-- Cron job 5: Send missing daily report reminders at 8:00 AM daily
SELECT cron.schedule(
  'send-daily-report-reminders',
  '0 8 * * *',
  $$
  INSERT INTO notifications (user_id, title, message, type)
  SELECT DISTINCT
    p.owner_id,
    'Missing Daily Report',
    'Daily report for ' || p.project_name || ' is overdue. Please submit it.',
    'warning'
  FROM projects p
  WHERE NOT EXISTS (
    SELECT 1 FROM daily_reports dr
    WHERE dr.project_id = p.id
    AND dr.report_date = CURRENT_DATE - INTERVAL '1 day'
  );
  $$
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin only)
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Create error_logs table for centralized logging
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
  message TEXT NOT NULL,
  context JSONB,
  user_id UUID REFERENCES auth.users(id),
  url TEXT,
  user_agent TEXT,
  stack TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin only)
CREATE POLICY "Admins can view error logs" ON error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );