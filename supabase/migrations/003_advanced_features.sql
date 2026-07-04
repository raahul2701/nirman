-- Run this in Supabase SQL Editor
-- File: 003_advanced_features.sql

-- ─────────────────────────────────────
-- DROP EXISTING TRIGGERS/FUNCTIONS (SAFE)
-- ─────────────────────────────────────

DROP TRIGGER IF EXISTS set_hindrance_code ON hindrance_register;
DROP FUNCTION IF EXISTS generate_hindrance_code();

DROP TRIGGER IF EXISTS set_dispute_code ON disputes;
DROP FUNCTION IF EXISTS generate_dispute_code();

-- ─────────────────────────────────────
-- FEATURE 3: BLACKLIST CONTRACTOR
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS 
blacklisted_contractors (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  contractor_name TEXT NOT NULL,
  contractor_company TEXT,
  phone TEXT,
  aadhaar TEXT,
  pan_number TEXT,
  blacklisted_by UUID 
    REFERENCES user_profiles(id),
  blacklisted_by_department TEXT,
  blacklisted_by_district TEXT,
  blacklisted_by_state TEXT 
    DEFAULT 'Bihar',
  reason TEXT NOT NULL,
  fraud_type TEXT,
  -- payment_fraud/quality_fraud/
  -- fake_documents/abandoned_work/
  -- cartel/other
  fraud_amount NUMERIC,
  case_reference TEXT,
  fir_number TEXT,
  evidence_urls TEXT[],
  severity TEXT DEFAULT 'medium',
  -- low/medium/high/critical
  status TEXT DEFAULT 'active',
  -- active/under_review/removed
  verified_by UUID 
    REFERENCES user_profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS 
blacklist_alerts (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  blacklist_id UUID 
    REFERENCES blacklisted_contractors(id),
  alerted_ee_id UUID 
    REFERENCES user_profiles(id),
  alert_reason TEXT,
  -- tried_to_register/
  -- matched_phone/matched_pan/
  -- matched_aadhaar
  alert_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- FEATURE 4: BANK GUARANTEE & 
--            SECURITY DEPOSIT TRACKER
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS 
bank_guarantees (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  project_id UUID 
    REFERENCES gov_projects(id),
  contractor_id UUID 
    REFERENCES user_profiles(id),
  bg_number TEXT NOT NULL,
  bg_type TEXT NOT NULL,
  -- performance/security_deposit/
  -- advance_payment/retention/other
  bank_name TEXT NOT NULL,
  branch TEXT,
  amount NUMERIC NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  bg_document_url TEXT,
  drive_link TEXT,
  status TEXT DEFAULT 'active',
  -- active/expired/encashed/
  -- extended/returned
  alert_30_days_sent BOOLEAN 
    DEFAULT FALSE,
  alert_7_days_sent BOOLEAN 
    DEFAULT FALSE,
  alert_expired_sent BOOLEAN 
    DEFAULT FALSE,
  encashed_amount NUMERIC,
  encashed_reason TEXT,
  encashed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID 
    REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS 
security_deposits (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  project_id UUID 
    REFERENCES gov_projects(id),
  contractor_id UUID 
    REFERENCES user_profiles(id),
  deposit_type TEXT,
  -- initial_sd/retention_money/
  -- earnest_money
  total_amount NUMERIC NOT NULL,
  deducted_amount NUMERIC DEFAULT 0,
  released_amount NUMERIC DEFAULT 0,
  balance_amount NUMERIC,
  deduction_history JSONB,
  -- [{date, amount, reason, by}]
  release_conditions TEXT,
  dlp_end_date DATE,
  status TEXT DEFAULT 'held',
  -- held/partially_released/
  -- fully_released/forfeited
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- FEATURE 5: DRAWING vs REALITY AI
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS 
drawing_comparisons (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  project_id UUID 
    REFERENCES gov_projects(id),
  drawing_url TEXT NOT NULL,
  site_photo_url TEXT NOT NULL,
  drawing_type TEXT,
  -- plan/elevation/section/detail
  element_type TEXT,
  -- column/beam/slab/wall/
  -- foundation/staircase
  drawing_specification TEXT,
  site_observation TEXT,
  ai_comparison_result TEXT,
  ai_deviation_found BOOLEAN 
    DEFAULT FALSE,
  ai_deviation_percentage NUMERIC,
  ai_severity TEXT,
  -- compliant/minor/major/critical
  ai_details JSONB,
  -- [{parameter, drawing_value, 
  --   site_value, deviation%}]
  action_required TEXT,
  status TEXT DEFAULT 'open',
  -- open/acknowledged/rectified/accepted
  compared_by UUID 
    REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- FEATURE 6: MATERIAL TESTING
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS 
material_tests (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  project_id UUID 
    REFERENCES gov_projects(id),
  site_id UUID 
    REFERENCES sites(id),
  material_type TEXT NOT NULL,
  -- cement/steel/concrete/sand/
  -- aggregate/brick/soil/water
  test_type TEXT NOT NULL,
  -- cube_test/slump_test/
  -- tensile_test/sieve_analysis/
  -- compressive_strength/other
  test_date DATE 
    DEFAULT CURRENT_DATE,
  sample_location TEXT,
  lab_name TEXT,
  lab_certificate_number TEXT,
  test_report_url TEXT,
  drive_link TEXT,
  
  -- Test Results
  required_value TEXT,
  achieved_value TEXT,
  unit TEXT,
  result TEXT,
  -- pass/fail/marginal
  
  -- AI Verification
  ai_report_verified BOOLEAN 
    DEFAULT FALSE,
  ai_verification_notes TEXT,
  ai_authenticity_score NUMERIC,
  
  -- Payment Link
  blocks_payment BOOLEAN 
    DEFAULT FALSE,
  milestone_id UUID 
    REFERENCES payment_milestones(id),
  
  submitted_by UUID 
    REFERENCES user_profiles(id),
  reviewed_by UUID 
    REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS 
test_requirements (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  project_id UUID 
    REFERENCES gov_projects(id),
  milestone_id UUID 
    REFERENCES payment_milestones(id),
  material_type TEXT NOT NULL,
  test_type TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT TRUE,
  frequency TEXT,
  -- per_100_cum/per_floor/
  -- per_batch/once
  is_completed BOOLEAN DEFAULT FALSE,
  test_id UUID 
    REFERENCES material_tests(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- FEATURE 8: TENDER LIFECYCLE
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS 
tender_lifecycle (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  project_id UUID 
    REFERENCES gov_projects(id),
  
  -- Stage 1: Tender
  tender_notice_date DATE,
  tender_notice_url TEXT,
  last_date_submission DATE,
  estimated_cost NUMERIC,
  
  -- Stage 2: Bidding
  bids_received INTEGER DEFAULT 0,
  lowest_bid NUMERIC,
  l1_contractor TEXT,
  bid_opening_date DATE,
  bid_documents_url TEXT,
  
  -- Stage 3: Award
  award_date DATE,
  award_letter_url TEXT,
  negotiated_amount NUMERIC,
  
  -- Stage 4: Agreement
  agreement_date DATE,
  agreement_url TEXT,
  agreement_value NUMERIC,
  
  -- Stage 5: Work Order
  work_order_date DATE,
  work_order_url TEXT,
  work_order_amount NUMERIC,
  
  -- Stage 6: Site Handover
  site_handover_date DATE,
  site_handover_doc_url TEXT,
  
  -- Stage 7: Construction
  -- (tracked in main app)
  construction_start DATE,
  
  -- Stage 8: Completion
  completion_certificate_date DATE,
  completion_certificate_url TEXT,
  
  -- Stage 9: DLP
  dlp_start_date DATE,
  dlp_end_date DATE,
  dlp_period_months INTEGER 
    DEFAULT 12,
  
  -- Stage 10: Final Payment
  final_bill_date DATE,
  final_payment_date DATE,
  final_payment_amount NUMERIC,
  
  -- Stage 11: Closed
  project_closed_date DATE,
  closure_remarks TEXT,
  
  current_stage TEXT 
    DEFAULT 'tender',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- FEATURE 9: DLP TRACKER
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS 
dlp_defects (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  project_id UUID 
    REFERENCES gov_projects(id),
  reported_by UUID 
    REFERENCES user_profiles(id),
  defect_date DATE 
    DEFAULT CURRENT_DATE,
  defect_type TEXT,
  -- structural/finishing/leakage/
  -- electrical/plumbing/other
  location TEXT,
  description TEXT,
  photos TEXT[],
  severity TEXT DEFAULT 'medium',
  
  -- Notice to Contractor
  notice_sent BOOLEAN DEFAULT FALSE,
  notice_date DATE,
  notice_document_url TEXT,
  response_deadline DATE,
  
  -- Contractor Response
  contractor_response TEXT,
  contractor_response_date DATE,
  
  -- Rectification
  rectification_status TEXT 
    DEFAULT 'pending',
  -- pending/in_progress/
  -- completed/disputed
  rectification_date DATE,
  rectification_photos TEXT[],
  
  -- SD Impact
  sd_deduction_amount NUMERIC 
    DEFAULT 0,
  sd_deduction_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- FEATURE 10: WEATHER IMPACT LOGGER
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS 
weather_logs (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  site_id UUID 
    REFERENCES sites(id),
  project_id UUID 
    REFERENCES gov_projects(id),
  log_date DATE 
    DEFAULT CURRENT_DATE,
  weather_type TEXT NOT NULL,
  -- heavy_rain/light_rain/storm/
  -- extreme_heat/fog/flood/normal
  work_stopped BOOLEAN 
    DEFAULT FALSE,
  hours_lost NUMERIC DEFAULT 0,
  reason_details TEXT,
  auto_fetched BOOLEAN DEFAULT FALSE,
  temperature NUMERIC,
  rainfall_mm NUMERIC,
  wind_speed NUMERIC,
  weather_api_data JSONB,
  photos TEXT[],
  reported_by UUID 
    REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS 
extension_applications (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  project_id UUID 
    REFERENCES gov_projects(id),
  application_date DATE 
    DEFAULT CURRENT_DATE,
  days_requested INTEGER NOT NULL,
  
  -- Auto calculated from weather logs
  rain_days INTEGER DEFAULT 0,
  flood_days INTEGER DEFAULT 0,
  other_hindrance_days INTEGER DEFAULT 0,
  total_hindrance_days INTEGER DEFAULT 0,
  
  -- Supporting documents
  weather_report_url TEXT,
  hindrance_register_url TEXT,
  supporting_docs TEXT[],
  
  -- AI generated letter
  ai_application_letter TEXT,
  application_pdf_url TEXT,
  drive_link TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft',
  -- draft/submitted/approved/
  -- rejected/partial
  approved_days INTEGER,
  new_completion_date DATE,
  authority_response TEXT,
  
  submitted_by UUID 
    REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- FEATURE 11: WHATSAPP BOT REPORTS
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS 
whatsapp_bot_users (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  user_id UUID 
    REFERENCES user_profiles(id),
  phone TEXT UNIQUE NOT NULL,
  whatsapp_verified BOOLEAN 
    DEFAULT FALSE,
  verification_code TEXT,
  bot_active BOOLEAN DEFAULT TRUE,
  linked_sites UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS 
whatsapp_messages (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  message_in TEXT,
  message_out TEXT,
  parsed_data JSONB,
  action_taken TEXT,
  report_created_id UUID,
  status TEXT DEFAULT 'processed',
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- FEATURE 12: GIS MAP VIEW
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS 
site_gis_data (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  site_id UUID 
    REFERENCES sites(id),
  project_id UUID 
    REFERENCES gov_projects(id),
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  boundary_coordinates JSONB,
  -- polygon coordinates array
  site_area_sqm NUMERIC,
  health_status TEXT DEFAULT 'normal',
  -- critical/delayed/normal/completed
  last_updated TIMESTAMPTZ 
    DEFAULT NOW()
);

-- ─────────────────────────────────────
-- FEATURE 13: BUDGET vs PROGRESS
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS 
budget_progress_snapshots (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  project_id UUID 
    REFERENCES gov_projects(id),
  snapshot_date DATE 
    DEFAULT CURRENT_DATE,
  total_contract_value NUMERIC,
  total_paid_amount NUMERIC,
  financial_progress_percent NUMERIC,
  physical_progress_percent NUMERIC,
  gap_percentage NUMERIC,
  -- financial - physical
  gap_alert_sent BOOLEAN 
    DEFAULT FALSE,
  ai_analysis TEXT,
  risk_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- FEATURE 14: THIRD PARTY AUDITOR
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS 
tpa_firms (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  firm_name TEXT NOT NULL,
  registration_number TEXT,
  empanelment_authority TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  areas_covered TEXT[],
  expertise TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS 
tpa_inspections (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  project_id UUID 
    REFERENCES gov_projects(id),
  tpa_firm_id UUID 
    REFERENCES tpa_firms(id),
  inspector_name TEXT,
  inspection_date DATE,
  inspection_type TEXT,
  
  -- TPA Findings
  quality_score NUMERIC,
  structural_findings JSONB,
  material_findings JSONB,
  workmanship_findings JSONB,
  safety_findings JSONB,
  
  -- Comparison with EE Report
  ee_report_id UUID 
    REFERENCES inspection_reports(id),
  discrepancy_found BOOLEAN 
    DEFAULT FALSE,
  discrepancy_details TEXT,
  ai_discrepancy_analysis TEXT,
  
  tpa_report_url TEXT,
  drive_link TEXT,
  recommendation TEXT,
  -- proceed/hold/rectify/reject
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- FEATURE 15: HINDRANCE REGISTER
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS 
hindrance_register (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  hindrance_code TEXT UNIQUE,
  project_id UUID 
    REFERENCES gov_projects(id),
  site_id UUID 
    REFERENCES sites(id),
  hindrance_date DATE 
    DEFAULT CURRENT_DATE,
  hindrance_type TEXT NOT NULL,
  -- land_acquisition/forest_clearance/
  -- utility_shifting/design_change/
  -- material_shortage/rain/flood/
  -- court_order/department_delay/
  -- contractor_default/other
  description TEXT NOT NULL,
  reported_by UUID 
    REFERENCES user_profiles(id),
  days_lost INTEGER DEFAULT 0,
  financial_impact NUMERIC DEFAULT 0,
  photos TEXT[],
  documents TEXT[],
  
  -- Resolution
  resolution_status TEXT 
    DEFAULT 'open',
  -- open/in_progress/resolved/
  -- escalated
  resolved_by UUID 
    REFERENCES user_profiles(id),
  resolution_date DATE,
  resolution_details TEXT,
  
  -- Extension Impact
  used_in_extension BOOLEAN 
    DEFAULT FALSE,
  extension_application_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION 
  generate_hindrance_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.hindrance_code = 'HIN-' ||
    TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(CAST(
      (SELECT COUNT(*) 
       FROM hindrance_register) + 1
    AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_hindrance_code
  BEFORE INSERT ON hindrance_register
  FOR EACH ROW
  EXECUTE FUNCTION 
    generate_hindrance_code();

-- ─────────────────────────────────────
-- FEATURE 16: AI DISPUTE RESOLUTION
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS 
disputes (
  id UUID PRIMARY KEY 
    DEFAULT uuid_generate_v4(),
  dispute_code TEXT UNIQUE,
  project_id UUID 
    REFERENCES gov_projects(id),
  raised_by UUID 
    REFERENCES user_profiles(id),
  dispute_type TEXT NOT NULL,
  -- extra_claim/scope_dispute/
  -- rate_dispute/quality_dispute/
  -- delay_penalty/other
  claim_amount NUMERIC,
  description TEXT NOT NULL,
  supporting_docs TEXT[],
  
  -- AI Analysis
  ai_contract_analysis TEXT,
  ai_valid_claim_amount NUMERIC,
  ai_invalid_claim_amount NUMERIC,
  ai_reasoning TEXT,
  ai_contract_references JSONB,
  -- [{clause, page, text_excerpt}]
  ai_recommendation TEXT,
  ai_confidence_score NUMERIC,
  
  -- Resolution
  resolution_status TEXT 
    DEFAULT 'ai_review',
  -- ai_review/ee_review/
  -- se_review/arbitration/resolved
  final_settled_amount NUMERIC,
  resolution_notes TEXT,
  resolved_by UUID 
    REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION 
  generate_dispute_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.dispute_code = 'DIS-' ||
    TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(CAST(
      (SELECT COUNT(*) 
       FROM disputes) + 1
    AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_dispute_code
  BEFORE INSERT ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION 
    generate_dispute_code();

-- ─────────────────────────────────────
-- ENABLE REALTIME ON NEW TABLES
-- ─────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'blacklisted_contractors'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE blacklisted_contractors;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'bank_guarantees'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE bank_guarantees;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'hindrance_register'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE hindrance_register;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'disputes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE disputes;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'budget_progress_snapshots'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE budget_progress_snapshots;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'dlp_defects'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE dlp_defects;
    END IF;
END $$;
-- ─────────────────────────────────────
-- RLS POLICIES FOR NEW TABLES
-- ─────────────────────────────────────

ALTER TABLE blacklisted_contractors 
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_guarantees 
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes 
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hindrance_register 
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_tests 
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tpa_inspections 
  ENABLE ROW LEVEL SECURITY;

-- All authenticated users can 
-- read blacklist (shared database)
CREATE POLICY "All EE see blacklist"
  ON blacklisted_contractors FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only authenticated see their 
-- project BG data
CREATE POLICY "Auth see bank_guarantees"
  ON bank_guarantees FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Auth see disputes"
  ON disputes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Auth see hindrance"
  ON hindrance_register FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────
-- INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────

-- Blacklist indexes
CREATE INDEX IF NOT EXISTS idx_blacklisted_contractors_phone ON blacklisted_contractors(phone);
CREATE INDEX IF NOT EXISTS idx_blacklisted_contractors_pan ON blacklisted_contractors(pan_number);
CREATE INDEX IF NOT EXISTS idx_blacklisted_contractors_aadhaar ON blacklisted_contractors(aadhaar);
CREATE INDEX IF NOT EXISTS idx_blacklisted_contractors_status ON blacklisted_contractors(status);

-- Bank guarantee indexes
CREATE INDEX IF NOT EXISTS idx_bank_guarantees_project ON bank_guarantees(project_id);
CREATE INDEX IF NOT EXISTS idx_bank_guarantees_expiry ON bank_guarantees(expiry_date);
CREATE INDEX IF NOT EXISTS idx_bank_guarantees_status ON bank_guarantees(status);

-- Material tests indexes
CREATE INDEX IF NOT EXISTS idx_material_tests_project ON material_tests(project_id);
CREATE INDEX IF NOT EXISTS idx_material_tests_date ON material_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_material_tests_result ON material_tests(result);

-- Hindrance register indexes
CREATE INDEX IF NOT EXISTS idx_hindrance_register_project ON hindrance_register(project_id);
CREATE INDEX IF NOT EXISTS idx_hindrance_register_code ON hindrance_register(hindrance_code);
CREATE INDEX IF NOT EXISTS idx_hindrance_register_status ON hindrance_register(resolution_status);

-- Disputes indexes
CREATE INDEX IF NOT EXISTS idx_disputes_project ON disputes(project_id);
CREATE INDEX IF NOT EXISTS idx_disputes_code ON disputes(dispute_code);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(resolution_status);

-- Weather logs indexes
CREATE INDEX IF NOT EXISTS idx_weather_logs_project ON weather_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_weather_logs_date ON weather_logs(log_date);

-- Extension applications indexes
CREATE INDEX IF NOT EXISTS idx_extension_applications_project ON extension_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_extension_applications_status ON extension_applications(status);

-- Budget progress indexes
CREATE INDEX IF NOT EXISTS idx_budget_progress_project ON budget_progress_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_progress_date ON budget_progress_snapshots(snapshot_date);
