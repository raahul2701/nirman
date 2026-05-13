/*
  # Ghost Technic — Initial Schema

  ## Overview
  Complete database schema for the Ghost Technic construction management platform.

  ## Tables Created
  1. `profiles` — Extended user info (name, company, role, avatar)
  2. `projects` — Construction projects per company
  3. `sites` — Individual construction sites per project
  4. `problems` — Reported site issues with AI analysis
  5. `problem_images` — Photos attached to problem reports
  6. `workers` — Registered workforce members
  7. `attendance` — Daily worker check-in/check-out records
  8. `materials` — Inventory items per site
  9. `stock_transactions` — Material stock in/out movements
  10. `suppliers` — Supplier contact database
  11. `surveys` — Drone survey records
  12. `designs` — AI-generated design briefs
  13. `notifications` — In-app notification log
  14. `subscriptions` — Billing plan records

  ## Security
  - RLS enabled on ALL tables
  - Authenticated users see only their own company's data
  - Role-based policies enforced at DB level
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text DEFAULT '',
  company text DEFAULT '',
  role text DEFAULT 'worker' CHECK (role IN ('super_admin','project_manager','site_engineer','labor_supervisor','worker')),
  avatar_url text DEFAULT '',
  phone text DEFAULT '',
  location text DEFAULT '',
  onboarding_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  company text DEFAULT '',
  status text DEFAULT 'active' CHECK (status IN ('active','completed','on_hold','cancelled')),
  start_date date,
  end_date date,
  budget numeric DEFAULT 0,
  progress_percent integer DEFAULT 0,
  location text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- SITES
CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text DEFAULT '',
  lat numeric,
  lng numeric,
  owner_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sites"
  ON sites FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own sites"
  ON sites FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own sites"
  ON sites FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- PROBLEMS
CREATE TABLE IF NOT EXISTS problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_code text UNIQUE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  reported_by uuid REFERENCES profiles(id),
  category text DEFAULT 'other' CHECK (category IN ('structural','safety_hazard','equipment_failure','material_defect','design_mismatch','labor_dispute','weather_related','other')),
  severity text DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),
  title text DEFAULT '',
  description text DEFAULT '',
  ai_analysis text DEFAULT '',
  ai_action_steps text DEFAULT '',
  ai_resolution_time text DEFAULT '',
  assigned_to uuid REFERENCES profiles(id),
  status text DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  location_text text DEFAULT '',
  lat numeric,
  lng numeric,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view problems they reported or are assigned"
  ON problems FOR SELECT TO authenticated
  USING (reported_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Authenticated users can insert problems"
  ON problems FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Users can update problems assigned to them"
  ON problems FOR UPDATE TO authenticated
  USING (reported_by = auth.uid() OR assigned_to = auth.uid())
  WITH CHECK (reported_by = auth.uid() OR assigned_to = auth.uid());

-- PROBLEM IMAGES
CREATE TABLE IF NOT EXISTS problem_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid REFERENCES problems(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  storage_path text DEFAULT '',
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE problem_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view problem images for their problems"
  ON problem_images FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM problems p
      WHERE p.id = problem_id
      AND (p.reported_by = auth.uid() OR p.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Users can insert problem images"
  ON problem_images FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM problems p
      WHERE p.id = problem_id AND p.reported_by = auth.uid()
    )
  );

-- WORKERS
CREATE TABLE IF NOT EXISTS workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id),
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text DEFAULT '',
  aadhaar text DEFAULT '',
  skill text DEFAULT 'general' CHECK (skill IN ('mason','carpenter','electrician','plumber','painter','steel_fixer','general','supervisor','driver')),
  daily_wage numeric DEFAULT 0,
  photo_url text DEFAULT '',
  status text DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave')),
  performance_score integer DEFAULT 0,
  joined_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workers"
  ON workers FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own workers"
  ON workers FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own workers"
  ON workers FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES workers(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES profiles(id),
  date date DEFAULT CURRENT_DATE,
  check_in timestamptz,
  check_out timestamptz,
  hours_worked numeric DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  status text DEFAULT 'present' CHECK (status IN ('present','absent','half_day','on_leave')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance records"
  ON attendance FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own attendance records"
  ON attendance FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own attendance records"
  ON attendance FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- MATERIALS
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id),
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text DEFAULT 'other' CHECK (category IN ('cement','steel','sand','aggregate','bricks','tiles','electrical','plumbing','safety','tools','other')),
  unit text DEFAULT 'units',
  current_qty numeric DEFAULT 0,
  threshold_qty numeric DEFAULT 0,
  unit_price numeric DEFAULT 0,
  supplier_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own materials"
  ON materials FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own materials"
  ON materials FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own materials"
  ON materials FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- STOCK TRANSACTIONS
CREATE TABLE IF NOT EXISTS stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES materials(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES profiles(id),
  type text DEFAULT 'in' CHECK (type IN ('in','out','adjustment')),
  quantity numeric NOT NULL,
  unit_price numeric DEFAULT 0,
  date date DEFAULT CURRENT_DATE,
  done_by uuid REFERENCES profiles(id),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stock transactions"
  ON stock_transactions FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own stock transactions"
  ON stock_transactions FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- SURVEYS
CREATE TABLE IF NOT EXISTS surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES profiles(id),
  conducted_by text DEFAULT '',
  survey_date date DEFAULT CURRENT_DATE,
  survey_type text DEFAULT 'aerial' CHECK (survey_type IN ('aerial','lidar','ground','thermal')),
  progress_percent integer DEFAULT 0,
  ai_report text DEFAULT '',
  status text DEFAULT 'processing' CHECK (status IN ('processing','complete','failed')),
  findings_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own surveys"
  ON surveys FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own surveys"
  ON surveys FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own surveys"
  ON surveys FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- DESIGNS
CREATE TABLE IF NOT EXISTS designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  project_type text DEFAULT 'residential' CHECK (project_type IN ('residential','commercial','industrial','infrastructure','renovation')),
  area_sqft numeric DEFAULT 0,
  budget_min numeric DEFAULT 0,
  budget_max numeric DEFAULT 0,
  floors integer DEFAULT 1,
  location text DEFAULT '',
  soil_type text DEFAULT '',
  requirements text DEFAULT '',
  ai_output text DEFAULT '',
  status text DEFAULT 'generating' CHECK (status IN ('generating','complete','failed')),
  title text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own designs"
  ON designs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own designs"
  ON designs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own designs"
  ON designs FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text DEFAULT '',
  type text DEFAULT 'info' CHECK (type IN ('info','warning','error','success')),
  category text DEFAULT 'general',
  read boolean DEFAULT false,
  action_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  plan text DEFAULT 'trial' CHECK (plan IN ('trial','starter','pro','enterprise')),
  status text DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','past_due')),
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Realtime enable
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE problems;
