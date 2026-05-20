// persistence types for Supabase-backed entities
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface MaterialAIReport {
  id?: string;
  project_id: string;
  material_id?: string;
  report: any;
  structured_output?: any;
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
  properties?: Record<string, any>;
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
  metadata?: Record<string, any>;
}

export interface BudgetAnalyticsSession {
  id?: string;
  project_id: string;
  session_data?: Record<string, any>;
  results?: Record<string, any>;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TpaUploadReview {
  id?: string;
  upload_id?: string;
  review?: Record<string, any>;
  reviewer_id?: string;
  status?: 'pending' | 'approved' | 'rejected' | string;
  created_at?: string;
  updated_at?: string;
}

export interface HindranceEntry {
  id?: string;
  project_id: string;
  description?: string;
  location?: Record<string, any>;
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
  log?: Record<string, any>;
  consumption?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}
