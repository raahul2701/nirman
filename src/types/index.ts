export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'admin_viewer'
  | 'project_manager'
  | 'executive_engineer'
  | 'assistant_engineer'
  | 'junior_engineer'
  | 'site_engineer'
  | 'labor_supervisor'
  | 'contractor'
  | 'gov_official'
  | 'worker';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  company: string;
  role: UserRole;
  avatar_url: string;
  phone: string;
  location: string;
  onboarding_complete: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  company: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  start_date: string;
  end_date: string;
  budget: number;
  progress_percent: number;
  location: string;
  created_at: string;
}

export interface Site {
  id: string;
  project_id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  owner_id: string;
  created_at: string;
}

export type ProblemCategory = 'structural' | 'safety_hazard' | 'equipment_failure' | 'material_defect' | 'design_mismatch' | 'labor_dispute' | 'weather_related' | 'other';
export type ProblemSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ProblemStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Problem {
  id: string;
  problem_code: string;
  site_id: string;
  project_id: string;
  reported_by: string;
  category: ProblemCategory;
  severity: ProblemSeverity;
  title: string;
  description: string;
  ai_analysis: string;
  ai_action_steps: string;
  ai_resolution_time: string;
  assigned_to?: string;
  status: ProblemStatus;
  location_text: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export type WorkerSkill = 'mason' | 'carpenter' | 'electrician' | 'plumber' | 'painter' | 'steel_fixer' | 'general' | 'supervisor' | 'driver';

export interface Worker {
  id: string;
  owner_id: string;
  site_id?: string;
  name: string;
  phone: string;
  aadhaar: string;
  skill: WorkerSkill;
  daily_wage: number;
  photo_url: string;
  status: 'active' | 'inactive' | 'on_leave';
  performance_score: number;
  joined_date: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  worker_id: string;
  owner_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  hours_worked: number;
  overtime_hours: number;
  status: 'present' | 'absent' | 'half_day' | 'on_leave';
  notes: string;
}

export interface Material {
  id: string;
  owner_id: string;
  site_id?: string;
  name: string;
  category: string;
  unit: string;
  current_qty: number;
  threshold_qty: number;
  unit_price: number;
  supplier_name: string;
  created_at: string;
}

export interface Survey {
  id: string;
  project_id: string;
  owner_id: string;
  conducted_by: string;
  survey_date: string;
  survey_type: 'aerial' | 'lidar' | 'ground' | 'thermal';
  progress_percent: number;
  ai_report: string;
  status: 'processing' | 'complete' | 'failed';
  findings_count: number;
  created_at: string;
}

export interface Design {
  id: string;
  user_id: string;
  project_type: string;
  area_sqft: number;
  budget_min: number;
  budget_max: number;
  floors: number;
  location: string;
  soil_type: string;
  requirements: string;
  ai_output: string;
  status: 'generating' | 'complete' | 'failed';
  title: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: string;
  read: boolean;
  action_url: string;
  created_at: string;
}

export interface DashboardStats {
  activeProjects: number;
  openIssues: number;
  workersPresent: number;
  lowStockAlerts: number;
  surveysCompleted: number;
  aiQueriesUsed: number;
}

export type GovProjectType = 'highway' | 'building' | 'bridge' | 'dam' | 'irrigation' | 'railway' | 'other';
export type GovProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled';

export interface GovProject {
  id: string;
  project_name: string;
  project_code: string;
  department: string;
  contractor_name: string;
  contractor_id?: string;
  total_contract_value: number;
  start_date: string;
  end_date?: string;
  contract_pdf_url: string;
  location: string;
  project_type: GovProjectType;
  status: GovProjectStatus;
  progress_percent: number;
  created_at: string;
}

export type MilestoneStatus = 'locked' | 'active' | 'submitted' | 'approved' | 'paid';
export type AIRiskLevel = 'high' | 'medium' | 'low' | 'safe';

export interface PaymentMilestone {
  id: string;
  project_id: string;
  milestone_number: number;
  milestone_name: string;
  description: string;
  payment_amount: number;
  payment_percentage: number;
  due_date?: string;
  status: MilestoneStatus;
  completion_percentage: number;
  ai_safe_amount?: number;
  ai_hold_amount?: number;
  ai_risk_level?: AIRiskLevel;
  ai_analysis: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export type WorkCategory = 'foundation' | 'brickwork' | 'rcc' | 'plastering' | 'finishing' | 'electrical' | 'plumbing' | 'other';
export type ReviewStatus = 'pending' | 'reviewed' | 'flagged';

export interface WorkUpload {
  id: string;
  project_id: string;
  milestone_id?: string;
  uploaded_by: string;
  work_category: WorkCategory;
  description: string;
  photo_urls: string[];
  video_urls: string[];
  gps_latitude?: number;
  gps_longitude?: number;
  upload_timestamp: string;
  ai_analysis: string;
  ai_quality_score: number;
  issues_found: Array<{ type: string; severity: string; description: string; location: string }>;
  review_status: ReviewStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  engineer_notes: string;
}

export type PaymentFinalStatus = 'pending' | 'je_approved' | 'ee_approved' | 'se_approved' | 'paid' | 'rejected' | 'hold';

export interface PaymentRequest {
  id: string;
  project_id: string;
  milestone_id?: string;
  requested_by: string;
  claimed_amount: number;
  ai_recommended_amount?: number;
  ai_hold_amount: number;
  ai_risk_level?: AIRiskLevel;
  ai_full_report: string;
  je_approved_amount?: number;
  je_approved_by?: string;
  je_approved_at?: string;
  ee_approved_amount?: number;
  ee_approved_by?: string;
  ee_approved_at?: string;
  se_approved_amount?: number;
  se_approved_by?: string;
  se_approved_at?: string;
  final_status: PaymentFinalStatus;
  rejection_reason: string;
  created_at: string;
}

export type InspectionType = 'routine' | 'milestone' | 'complaint' | 'final';
export type Recommendation = 'approve' | 'partial' | 'hold' | 'reject';

export interface InspectionReport {
  id: string;
  project_id: string;
  milestone_id?: string;
  inspected_by: string;
  inspection_date: string;
  inspection_type: InspectionType;
  overall_quality_score: number;
  structural_issues: unknown[];
  quality_issues: unknown[];
  compliance_issues: unknown[];
  photos: string[];
  ai_report: string;
  recommendation: Recommendation;
  pdf_report_url: string;
  created_at: string;
}

export type ApproverRole = 'JE' | 'EE' | 'SE';
export type ApprovalAction = 'approved' | 'rejected' | 'hold' | 'partial';

export interface ApprovalWorkflow {
  id: string;
  payment_request_id: string;
  approver_id: string;
  approver_role: ApproverRole;
  action: ApprovalAction;
  approved_amount?: number;
  comments: string;
  action_at: string;
}

export type WeatherType =
  | 'heavy_rain'
  | 'light_rain'
  | 'storm'
  | 'extreme_heat'
  | 'fog'
  | 'flood'
  | 'normal';

export interface WeatherLog {
  id: string;
  site_id: string;
  project_id: string;
  log_date: string;
  weather_type: WeatherType;
  work_stopped: boolean;
  hours_lost: number;
  reason_details: string;
  auto_fetched: boolean;
  temperature: number;
  rainfall_mm: number;
  wind_speed: number;
  weather_api_data: Record<string, unknown>;
  photos: string[];
  reported_by: string;
  created_at: string;
}

export interface BudgetProgressSnapshot {
  id: string;
  project_id: string;
  snapshot_date: string;
  total_contract_value: number;
  total_paid_amount: number;
  financial_progress_percent: number;
  physical_progress_percent: number;
  gap_percentage: number;
  gap_alert_sent: boolean;
  ai_analysis: string;
  risk_flag: boolean;
  created_at: string;
}

export interface DailyReport {
  id: string;
  project_id: string;
  site_id: string;
  report_date: string;
  supervisor_name: string;
  labor_count: number;
  equipment_count: number;
  work_description: string;
  materials_used: string;
  issues_faced: string;
  weather_conditions: string;
  total_workers: number;
  report_data: Record<string, unknown>;
  created_at: string;
}

export interface WhatsappMessage {
  id: string;
  phone: string;
  message_in: string;
  message_out: string;
  parsed_data: Record<string, unknown>;
  action_taken: string;
  report_created_id?: string;
  status: string;
  received_at: string;
}

export interface ExtensionApplication {
  id: string;
  project_id: string;
  application_date: string;
  days_requested: number;
  rain_days: number;
  flood_days: number;
  other_hindrance_days: number;
  total_hindrance_days: number;
  weather_report_url: string;
  hindrance_register_url: string;
  supporting_docs: string[];
  ai_application_letter: string;
  application_pdf_url: string;
  drive_link: string;
  status: string;
  approved_days?: number;
  new_completion_date?: string;
  authority_response: string;
  submitted_by: string;
  created_at: string;
}

export interface SiteGISData {
  id: string;
  site_id: string;
  project_id: string;
  latitude: number;
  longitude: number;
  boundary_coordinates: Array<[number, number]>;
  site_area_sqm: number;
  health_status: 'critical' | 'delayed' | 'normal' | 'completed';
  last_updated: string;
}

