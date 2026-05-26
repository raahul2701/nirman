// persistence types for Supabase-backed entities
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface MaterialAIReport {
  id?: string;
  project_id: string;
  material_id?: string;
  report: Record<string, unknown>;
  structured_output?: unknown;
  confidence?: number;
  severity?: Severity;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GisSitePin {
  id?: string;
  project_id: string;
  latitude: number;
  longitude: number;
  properties?: Record<string, unknown>;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UploadMetadata {
  id?: string;
  file_name: string;
  content_type?: string;
  size?: number;
  storage_path: string;
  uploaded_by?: string;
  uploaded_at?: string;
  metadata?: Record<string, unknown>;
}

export interface BudgetAnalyticsSession {
  id?: string;
  project_id: string;
  session_data?: Record<string, unknown>;
  results?: Record<string, unknown>;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TpaUploadReview {
  id?: string;
  upload_id?: string;
  review?: Record<string, unknown>;
  reviewer_id?: string;
  status?: 'pending' | 'approved' | 'rejected' | string;
  created_at?: string;
  updated_at?: string;
}

export interface HindranceEntry {
  id?: string;
  project_id: string;
  description?: string;
  location?: Record<string, unknown>;
  severity?: Severity;
  status?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DieselIssueLog {
  id?: string;
  project_id: string;
  vehicle_id?: string;
  log?: Record<string, unknown>;
  consumption?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}
