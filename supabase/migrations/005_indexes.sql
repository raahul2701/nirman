-- Performance indexes for NIRMAN AI ERP

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_contractor_id ON projects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_location ON projects USING gin(to_tsvector('english', location));

-- Gov projects indexes
CREATE INDEX IF NOT EXISTS idx_gov_projects_owner_id ON gov_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_gov_projects_contractor_id ON gov_projects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_gov_projects_engineer_id ON gov_projects(engineer_id);
CREATE INDEX IF NOT EXISTS idx_gov_projects_status ON gov_projects(status);
CREATE INDEX IF NOT EXISTS idx_gov_projects_created_at ON gov_projects(created_at DESC);

-- Daily reports indexes
CREATE INDEX IF NOT EXISTS idx_daily_reports_project_id ON daily_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_report_date ON daily_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_created_at ON daily_reports(created_at DESC);

-- Material tests indexes
CREATE INDEX IF NOT EXISTS idx_material_tests_project_id ON material_tests(project_id);
CREATE INDEX IF NOT EXISTS idx_material_tests_test_date ON material_tests(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_material_tests_status ON material_tests(status);

-- Disputes indexes
CREATE INDEX IF NOT EXISTS idx_disputes_project_id ON disputes(project_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);

-- Bank guarantees indexes
CREATE INDEX IF NOT EXISTS idx_bank_guarantees_project_id ON bank_guarantees(project_id);
CREATE INDEX IF NOT EXISTS idx_bank_guarantees_contractor_id ON bank_guarantees(contractor_id);
CREATE INDEX IF NOT EXISTS idx_bank_guarantees_status ON bank_guarantees(status);
CREATE INDEX IF NOT EXISTS idx_bank_guarantees_expiry_date ON bank_guarantees(expiry_date);

-- Payment requests indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_project_id ON payment_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_requested_by ON payment_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_payment_requests_final_status ON payment_requests(final_status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON payment_requests(created_at DESC);

-- Work uploads indexes
CREATE INDEX IF NOT EXISTS idx_work_uploads_project_id ON work_uploads(project_id);
CREATE INDEX IF NOT EXISTS idx_work_uploads_uploaded_by ON work_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_work_uploads_review_status ON work_uploads(review_status);
CREATE INDEX IF NOT EXISTS idx_work_uploads_created_at ON work_uploads(created_at DESC);

-- Inspection reports indexes
CREATE INDEX IF NOT EXISTS idx_inspection_reports_project_id ON inspection_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_inspected_by ON inspection_reports(inspected_by);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_created_at ON inspection_reports(created_at DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Weather logs indexes
CREATE INDEX IF NOT EXISTS idx_weather_logs_project_id ON weather_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_weather_logs_date ON weather_logs(date DESC);

-- Budget snapshots indexes
CREATE INDEX IF NOT EXISTS idx_budget_snapshots_project_id ON budget_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_snapshots_snapshot_date ON budget_snapshots(snapshot_date DESC);

-- Extension applications indexes
CREATE INDEX IF NOT EXISTS idx_extension_applications_project_id ON extension_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_extension_applications_status ON extension_applications(status);
CREATE INDEX IF NOT EXISTS idx_extension_applications_created_at ON extension_applications(created_at DESC);

-- Hindrances indexes
CREATE INDEX IF NOT EXISTS idx_hindrances_project_id ON hindrances(project_id);
CREATE INDEX IF NOT EXISTS idx_hindrances_date ON hindrances(date DESC);
CREATE INDEX IF NOT EXISTS idx_hindrances_type ON hindrances(type);

-- Workers indexes
CREATE INDEX IF NOT EXISTS idx_workers_project_id ON workers(project_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_created_at ON workers(created_at DESC);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_project_id ON inventory(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);

-- Blacklist indexes
CREATE INDEX IF NOT EXISTS idx_blacklist_created_by ON blacklist(created_by);
CREATE INDEX IF NOT EXISTS idx_blacklist_created_at ON blacklist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blacklist_pan ON blacklist(pan);
CREATE INDEX IF NOT EXISTS idx_blacklist_aadhaar ON blacklist(aadhaar);

-- Surveys indexes
CREATE INDEX IF NOT EXISTS idx_surveys_owner_id ON surveys(owner_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys(created_at DESC);

-- Designs indexes
CREATE INDEX IF NOT EXISTS idx_designs_user_id ON designs(user_id);
CREATE INDEX IF NOT EXISTS idx_designs_status ON designs(status);
CREATE INDEX IF NOT EXISTS idx_designs_created_at ON designs(created_at DESC);

-- Problems indexes
CREATE INDEX IF NOT EXISTS idx_problems_reported_by ON problems(reported_by);
CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status);
CREATE INDEX IF NOT EXISTS idx_problems_created_at ON problems(created_at DESC);