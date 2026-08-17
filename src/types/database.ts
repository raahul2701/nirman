export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agreement_documents: {
        Row: {
          ai_error_message: string | null
          ai_processing_status: string
          created_at: string
          document_status: string
          document_type: string
          drive_folder_path: string | null
          file_name: string
          file_url: string | null
          google_drive_file_id: string | null
          google_drive_folder_id: string | null
          google_drive_sync_status: string
          id: string
          mime_type: string | null
          module_name: string
          original_filename: string | null
          project_id: string
          role: string | null
          storage_path: string | null
          storage_provider: string
          supabase_path: string | null
          updated_at: string
          uploaded_by: string | null
          workspace_id: string | null
        }
        Insert: {
          ai_error_message?: string | null
          ai_processing_status?: string
          created_at?: string
          document_status?: string
          document_type?: string
          drive_folder_path?: string | null
          file_name: string
          file_url?: string | null
          google_drive_file_id?: string | null
          google_drive_folder_id?: string | null
          google_drive_sync_status?: string
          id?: string
          mime_type?: string | null
          module_name?: string
          original_filename?: string | null
          project_id: string
          role?: string | null
          storage_path?: string | null
          storage_provider?: string
          supabase_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          ai_error_message?: string | null
          ai_processing_status?: string
          created_at?: string
          document_status?: string
          document_type?: string
          drive_folder_path?: string | null
          file_name?: string
          file_url?: string | null
          google_drive_file_id?: string | null
          google_drive_folder_id?: string | null
          google_drive_sync_status?: string
          id?: string
          mime_type?: string | null
          module_name?: string
          original_filename?: string | null
          project_id?: string
          role?: string | null
          storage_path?: string | null
          storage_provider?: string
          supabase_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreement_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_engineer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_project_study: {
        Row: {
          agreement_document_id: string | null
          bg_terms: Json
          completion_schedule: Json
          confidence_score: number
          created_at: string
          dlp_terms: Json
          extracted_boq: Json
          id: string
          important_clauses: Json
          milestones: Json
          payment_terms: Json
          project_id: string
          reviewed_by: string | null
          sd_terms: Json
          technical_specifications: Json
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          agreement_document_id?: string | null
          bg_terms?: Json
          completion_schedule?: Json
          confidence_score?: number
          created_at?: string
          dlp_terms?: Json
          extracted_boq?: Json
          id?: string
          important_clauses?: Json
          milestones?: Json
          payment_terms?: Json
          project_id: string
          reviewed_by?: string | null
          sd_terms?: Json
          technical_specifications?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          agreement_document_id?: string | null
          bg_terms?: Json
          completion_schedule?: Json
          confidence_score?: number
          created_at?: string
          dlp_terms?: Json
          extracted_boq?: Json
          id?: string
          important_clauses?: Json
          milestones?: Json
          payment_terms?: Json
          project_id?: string
          reviewed_by?: string | null
          sd_terms?: Json
          technical_specifications?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_project_study_agreement_document_id_fkey"
            columns: ["agreement_document_id"]
            isOneToOne: false
            referencedRelation: "agreement_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_project_study_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_project_study_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_engineer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reports: {
        Row: {
          ai_summary: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          project_id: string | null
          report_type: string | null
          severity: string | null
          workspace_id: string | null
        }
        Insert: {
          ai_summary?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          report_type?: string | null
          severity?: string | null
          workspace_id?: string | null
        }
        Update: {
          ai_summary?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          report_type?: string | null
          severity?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_engineer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflow: {
        Row: {
          action: string
          action_at: string | null
          approved_amount: number | null
          approver_id: string | null
          approver_role: string
          comments: string | null
          id: string
          payment_request_id: string | null
        }
        Insert: {
          action: string
          action_at?: string | null
          approved_amount?: number | null
          approver_id?: string | null
          approver_role: string
          comments?: string | null
          id?: string
          payment_request_id?: string | null
        }
        Update: {
          action?: string
          action_at?: string | null
          approved_amount?: number | null
          approver_id?: string | null
          approver_role?: string
          comments?: string | null
          id?: string
          payment_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflow_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string | null
          hours_worked: number | null
          id: string
          marked_by: string | null
          overtime_hours: number | null
          site_id: string | null
          status: string | null
          worker_id: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string | null
          hours_worked?: number | null
          id?: string
          marked_by?: string | null
          overtime_hours?: number | null
          site_id?: string | null
          status?: string | null
          worker_id?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string | null
          hours_worked?: number | null
          id?: string
          marked_by?: string | null
          overtime_hours?: number | null
          site_id?: string | null
          status?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_guarantees: {
        Row: {
          alert_30_days_sent: boolean | null
          alert_7_days_sent: boolean | null
          alert_expired_sent: boolean | null
          amount: number
          bank_name: string
          bg_document_url: string | null
          bg_number: string
          bg_type: string
          branch: string | null
          contractor_id: string | null
          created_at: string | null
          created_by: string | null
          drive_link: string | null
          encashed_amount: number | null
          encashed_at: string | null
          encashed_reason: string | null
          expiry_date: string
          id: string
          issue_date: string
          notes: string | null
          project_id: string | null
          status: string | null
        }
        Insert: {
          alert_30_days_sent?: boolean | null
          alert_7_days_sent?: boolean | null
          alert_expired_sent?: boolean | null
          amount: number
          bank_name: string
          bg_document_url?: string | null
          bg_number: string
          bg_type: string
          branch?: string | null
          contractor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          drive_link?: string | null
          encashed_amount?: number | null
          encashed_at?: string | null
          encashed_reason?: string | null
          expiry_date: string
          id?: string
          issue_date: string
          notes?: string | null
          project_id?: string | null
          status?: string | null
        }
        Update: {
          alert_30_days_sent?: boolean | null
          alert_7_days_sent?: boolean | null
          alert_expired_sent?: boolean | null
          amount?: number
          bank_name?: string
          bg_document_url?: string | null
          bg_number?: string
          bg_type?: string
          branch?: string | null
          contractor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          drive_link?: string | null
          encashed_amount?: number | null
          encashed_at?: string | null
          encashed_reason?: string | null
          expiry_date?: string
          id?: string
          issue_date?: string
          notes?: string | null
          project_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_guarantees_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_guarantees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_guarantees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      blacklist_alerts: {
        Row: {
          alert_read: boolean | null
          alert_reason: string | null
          alerted_ee_id: string | null
          blacklist_id: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          alert_read?: boolean | null
          alert_reason?: string | null
          alerted_ee_id?: string | null
          blacklist_id?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          alert_read?: boolean | null
          alert_reason?: string | null
          alerted_ee_id?: string | null
          blacklist_id?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blacklist_alerts_alerted_ee_id_fkey"
            columns: ["alerted_ee_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blacklist_alerts_blacklist_id_fkey"
            columns: ["blacklist_id"]
            isOneToOne: false
            referencedRelation: "blacklisted_contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      blacklisted_contractors: {
        Row: {
          aadhaar: string | null
          blacklisted_by: string | null
          blacklisted_by_department: string | null
          blacklisted_by_district: string | null
          blacklisted_by_state: string | null
          case_reference: string | null
          contractor_company: string | null
          contractor_name: string
          created_at: string | null
          evidence_urls: string[] | null
          fir_number: string | null
          fraud_amount: number | null
          fraud_type: string | null
          id: string
          pan_number: string | null
          phone: string | null
          reason: string
          severity: string | null
          status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          aadhaar?: string | null
          blacklisted_by?: string | null
          blacklisted_by_department?: string | null
          blacklisted_by_district?: string | null
          blacklisted_by_state?: string | null
          case_reference?: string | null
          contractor_company?: string | null
          contractor_name: string
          created_at?: string | null
          evidence_urls?: string[] | null
          fir_number?: string | null
          fraud_amount?: number | null
          fraud_type?: string | null
          id?: string
          pan_number?: string | null
          phone?: string | null
          reason: string
          severity?: string | null
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          aadhaar?: string | null
          blacklisted_by?: string | null
          blacklisted_by_department?: string | null
          blacklisted_by_district?: string | null
          blacklisted_by_state?: string | null
          case_reference?: string | null
          contractor_company?: string | null
          contractor_name?: string
          created_at?: string | null
          evidence_urls?: string[] | null
          fir_number?: string | null
          fraud_amount?: number | null
          fraud_type?: string | null
          id?: string
          pan_number?: string | null
          phone?: string | null
          reason?: string
          severity?: string | null
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blacklisted_contractors_blacklisted_by_fkey"
            columns: ["blacklisted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blacklisted_contractors_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boq_items: {
        Row: {
          agreement_document_id: string | null
          amount: number
          boq_id: string | null
          category: string | null
          completed_quantity: number
          completion_percentage: number
          component_type: string | null
          created_at: string
          description: string
          id: string
          item_code: string | null
          item_number: string | null
          notes: string | null
          project_id: string | null
          quantity: number
          rate: number
          technical_specification: string | null
          unit: string
          work_type: string | null
          workspace_id: string | null
        }
        Insert: {
          agreement_document_id?: string | null
          amount?: number
          boq_id?: string | null
          category?: string | null
          completed_quantity?: number
          completion_percentage?: number
          component_type?: string | null
          created_at?: string
          description: string
          id?: string
          item_code?: string | null
          item_number?: string | null
          notes?: string | null
          project_id?: string | null
          quantity?: number
          rate?: number
          technical_specification?: string | null
          unit: string
          work_type?: string | null
          workspace_id?: string | null
        }
        Update: {
          agreement_document_id?: string | null
          amount?: number
          boq_id?: string | null
          category?: string | null
          completed_quantity?: number
          completion_percentage?: number
          component_type?: string | null
          created_at?: string
          description?: string
          id?: string
          item_code?: string | null
          item_number?: string | null
          notes?: string | null
          project_id?: string | null
          quantity?: number
          rate?: number
          technical_specification?: string | null
          unit?: string
          work_type?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boq_items_agreement_document_id_fkey"
            columns: ["agreement_document_id"]
            isOneToOne: false
            referencedRelation: "agreement_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_boq_id_fkey"
            columns: ["boq_id"]
            isOneToOne: false
            referencedRelation: "project_boq"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_engineer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_progress_snapshots: {
        Row: {
          ai_analysis: string | null
          created_at: string | null
          financial_progress_percent: number | null
          gap_alert_sent: boolean | null
          gap_percentage: number | null
          id: string
          physical_progress_percent: number | null
          project_id: string | null
          risk_flag: boolean | null
          snapshot_date: string | null
          total_contract_value: number | null
          total_paid_amount: number | null
        }
        Insert: {
          ai_analysis?: string | null
          created_at?: string | null
          financial_progress_percent?: number | null
          gap_alert_sent?: boolean | null
          gap_percentage?: number | null
          id?: string
          physical_progress_percent?: number | null
          project_id?: string | null
          risk_flag?: boolean | null
          snapshot_date?: string | null
          total_contract_value?: number | null
          total_paid_amount?: number | null
        }
        Update: {
          ai_analysis?: string | null
          created_at?: string | null
          financial_progress_percent?: number | null
          gap_alert_sent?: boolean | null
          gap_percentage?: number | null
          id?: string
          physical_progress_percent?: number | null
          project_id?: string | null
          risk_flag?: boolean | null
          snapshot_date?: string | null
          total_contract_value?: number | null
          total_paid_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_progress_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_licenses: {
        Row: {
          actual_users: number | null
          billable_users: number | null
          contractor_name: string
          created_at: string | null
          id: string
          license_status: string | null
          monthly_amount: number | null
          price_per_user: number | null
          recommended_by: string | null
          renewal_date: string | null
          workspace_id: string | null
        }
        Insert: {
          actual_users?: number | null
          billable_users?: number | null
          contractor_name: string
          created_at?: string | null
          id?: string
          license_status?: string | null
          monthly_amount?: number | null
          price_per_user?: number | null
          recommended_by?: string | null
          renewal_date?: string | null
          workspace_id?: string | null
        }
        Update: {
          actual_users?: number | null
          billable_users?: number | null
          contractor_name?: string
          created_at?: string | null
          id?: string
          license_status?: string | null
          monthly_amount?: number | null
          price_per_user?: number | null
          recommended_by?: string | null
          renewal_date?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_licenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_engineer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      designs: {
        Row: {
          ai_compliance: string | null
          ai_cost_breakdown: string | null
          ai_design_brief: string | null
          ai_material_list: string | null
          ai_risk_assessment: string | null
          ai_timeline: string | null
          area_sqft: number | null
          budget_max: number | null
          budget_min: number | null
          created_at: string | null
          floors: number | null
          id: string
          is_shared: boolean | null
          location: string | null
          project_name: string | null
          project_type: string | null
          share_token: string | null
          soil_type: string | null
          special_requirements: string | null
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          ai_compliance?: string | null
          ai_cost_breakdown?: string | null
          ai_design_brief?: string | null
          ai_material_list?: string | null
          ai_risk_assessment?: string | null
          ai_timeline?: string | null
          area_sqft?: number | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          floors?: number | null
          id?: string
          is_shared?: boolean | null
          location?: string | null
          project_name?: string | null
          project_type?: string | null
          share_token?: string | null
          soil_type?: string | null
          special_requirements?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          ai_compliance?: string | null
          ai_cost_breakdown?: string | null
          ai_design_brief?: string | null
          ai_material_list?: string | null
          ai_risk_assessment?: string | null
          ai_timeline?: string | null
          area_sqft?: number | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          floors?: number | null
          id?: string
          is_shared?: boolean | null
          location?: string | null
          project_name?: string | null
          project_type?: string | null
          share_token?: string | null
          soil_type?: string | null
          special_requirements?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "designs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diesel_logs: {
        Row: {
          ai_anomaly_score: number | null
          id: string
          issue_date: string | null
          issued_to: string | null
          photo_url: string | null
          project_id: string | null
          quantity: number | null
          vehicle_number: string | null
          workspace_id: string | null
        }
        Insert: {
          ai_anomaly_score?: number | null
          id?: string
          issue_date?: string | null
          issued_to?: string | null
          photo_url?: string | null
          project_id?: string | null
          quantity?: number | null
          vehicle_number?: string | null
          workspace_id?: string | null
        }
        Update: {
          ai_anomaly_score?: number | null
          id?: string
          issue_date?: string | null
          issued_to?: string | null
          photo_url?: string | null
          project_id?: string | null
          quantity?: number | null
          vehicle_number?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diesel_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diesel_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_engineer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          ai_confidence_score: number | null
          ai_contract_analysis: string | null
          ai_contract_references: Json | null
          ai_invalid_claim_amount: number | null
          ai_reasoning: string | null
          ai_recommendation: string | null
          ai_valid_claim_amount: number | null
          claim_amount: number | null
          created_at: string | null
          description: string
          dispute_code: string | null
          dispute_type: string
          final_settled_amount: number | null
          id: string
          project_id: string | null
          raised_by: string | null
          resolution_notes: string | null
          resolution_status: string | null
          resolved_at: string | null
          resolved_by: string | null
          supporting_docs: string[] | null
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_contract_analysis?: string | null
          ai_contract_references?: Json | null
          ai_invalid_claim_amount?: number | null
          ai_reasoning?: string | null
          ai_recommendation?: string | null
          ai_valid_claim_amount?: number | null
          claim_amount?: number | null
          created_at?: string | null
          description: string
          dispute_code?: string | null
          dispute_type: string
          final_settled_amount?: number | null
          id?: string
          project_id?: string | null
          raised_by?: string | null
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          supporting_docs?: string[] | null
        }
        Update: {
          ai_confidence_score?: number | null
          ai_contract_analysis?: string | null
          ai_contract_references?: Json | null
          ai_invalid_claim_amount?: number | null
          ai_reasoning?: string | null
          ai_recommendation?: string | null
          ai_valid_claim_amount?: number | null
          claim_amount?: number | null
          created_at?: string | null
          description?: string
          dispute_code?: string | null
          dispute_type?: string
          final_settled_amount?: number | null
          id?: string
          project_id?: string | null
          raised_by?: string | null
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          supporting_docs?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dlp_defects: {
        Row: {
          contractor_response: string | null
          contractor_response_date: string | null
          created_at: string | null
          defect_date: string | null
          defect_type: string | null
          description: string | null
          id: string
          location: string | null
          notice_date: string | null
          notice_document_url: string | null
          notice_sent: boolean | null
          photos: string[] | null
          project_id: string | null
          rectification_date: string | null
          rectification_photos: string[] | null
          rectification_status: string | null
          reported_by: string | null
          response_deadline: string | null
          sd_deduction_amount: number | null
          sd_deduction_reason: string | null
          severity: string | null
        }
        Insert: {
          contractor_response?: string | null
          contractor_response_date?: string | null
          created_at?: string | null
          defect_date?: string | null
          defect_type?: string | null
          description?: string | null
          id?: string
          location?: string | null
          notice_date?: string | null
          notice_document_url?: string | null
          notice_sent?: boolean | null
          photos?: string[] | null
          project_id?: string | null
          rectification_date?: string | null
          rectification_photos?: string[] | null
          rectification_status?: string | null
          reported_by?: string | null
          response_deadline?: string | null
          sd_deduction_amount?: number | null
          sd_deduction_reason?: string | null
          severity?: string | null
        }
        Update: {
          contractor_response?: string | null
          contractor_response_date?: string | null
          created_at?: string | null
          defect_date?: string | null
          defect_type?: string | null
          description?: string | null
          id?: string
          location?: string | null
          notice_date?: string | null
          notice_document_url?: string | null
          notice_sent?: boolean | null
          photos?: string[] | null
          project_id?: string | null
          rectification_date?: string | null
          rectification_photos?: string[] | null
          rectification_status?: string | null
          reported_by?: string | null
          response_deadline?: string | null
          sd_deduction_amount?: number | null
          sd_deduction_reason?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dlp_defects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dlp_defects_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_metadata: {
        Row: {
          ai_processed: boolean | null
          ai_processing_status: string | null
          contractor_id: string | null
          created_at: string | null
          document_type: string | null
          drive_file_id: string | null
          drive_folder_id: string | null
          drive_folder_path: string | null
          file_name: string | null
          file_url: string | null
          google_drive_file_id: string | null
          google_drive_folder_id: string | null
          google_drive_sync_status: string | null
          id: string
          metadata: Json
          mime_type: string | null
          module_name: string | null
          original_filename: string | null
          owner_executive_engineer_id: string | null
          project_id: string | null
          project_table: string | null
          role: string | null
          size_bytes: number | null
          storage_provider: string | null
          supabase_path: string | null
          uploaded_by: string | null
          workspace_id: string | null
        }
        Insert: {
          ai_processed?: boolean | null
          ai_processing_status?: string | null
          contractor_id?: string | null
          created_at?: string | null
          document_type?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_folder_path?: string | null
          file_name?: string | null
          file_url?: string | null
          google_drive_file_id?: string | null
          google_drive_folder_id?: string | null
          google_drive_sync_status?: string | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          module_name?: string | null
          original_filename?: string | null
          owner_executive_engineer_id?: string | null
          project_id?: string | null
          project_table?: string | null
          role?: string | null
          size_bytes?: number | null
          storage_provider?: string | null
          supabase_path?: string | null
          uploaded_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          ai_processed?: boolean | null
          ai_processing_status?: string | null
          contractor_id?: string | null
          created_at?: string | null
          document_type?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_folder_path?: string | null
          file_name?: string | null
          file_url?: string | null
          google_drive_file_id?: string | null
          google_drive_folder_id?: string | null
          google_drive_sync_status?: string | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          module_name?: string | null
          original_filename?: string | null
          owner_executive_engineer_id?: string | null
          project_id?: string | null
          project_table?: string | null
          role?: string | null
          size_bytes?: number | null
          storage_provider?: string | null
          supabase_path?: string | null
          uploaded_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_metadata_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_owner_executive_engineer_id_fkey"
            columns: ["owner_executive_engineer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_engineer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_comparisons: {
        Row: {
          action_required: string | null
          ai_comparison_result: string | null
          ai_details: Json | null
          ai_deviation_found: boolean | null
          ai_deviation_percentage: number | null
          ai_severity: string | null
          compared_by: string | null
          created_at: string | null
          drawing_specification: string | null
          drawing_type: string | null
          drawing_url: string
          element_type: string | null
          id: string
          project_id: string | null
          site_observation: string | null
          site_photo_url: string
          status: string | null
        }
        Insert: {
          action_required?: string | null
          ai_comparison_result?: string | null
          ai_details?: Json | null
          ai_deviation_found?: boolean | null
          ai_deviation_percentage?: number | null
          ai_severity?: string | null
          compared_by?: string | null
          created_at?: string | null
          drawing_specification?: string | null
          drawing_type?: string | null
          drawing_url: string
          element_type?: string | null
          id?: string
          project_id?: string | null
          site_observation?: string | null
          site_photo_url: string
          status?: string | null
        }
        Update: {
          action_required?: string | null
          ai_comparison_result?: string | null
          ai_details?: Json | null
          ai_deviation_found?: boolean | null
          ai_deviation_percentage?: number | null
          ai_severity?: string | null
          compared_by?: string | null
          created_at?: string | null
          drawing_specification?: string | null
          drawing_type?: string | null
          drawing_url?: string
          element_type?: string | null
          id?: string
          project_id?: string | null
          site_observation?: string | null
          site_photo_url?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawing_comparisons_compared_by_fkey"
            columns: ["compared_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_comparisons_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          details: Json | null
          id: string
          level: string
          message: string
          source: string | null
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          details?: Json | null
          id?: string
          level: string
          message: string
          source?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: string
          message?: string
          source?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      executive_engineer_workspaces: {
        Row: {
          created_at: string | null
          department: string | null
          district: string | null
          division_code: string | null
          drive_root_folder_id: string | null
          executive_engineer_email: string | null
          executive_engineer_id: string | null
          executive_engineer_name: string
          gemini_enabled: boolean | null
          google_drive_root_folder_id: string | null
          id: string
          maps_enabled: boolean | null
          status: string
          storage_namespace: string | null
          updated_at: string
          workspace_code: string | null
          workspace_name: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          district?: string | null
          division_code?: string | null
          drive_root_folder_id?: string | null
          executive_engineer_email?: string | null
          executive_engineer_id?: string | null
          executive_engineer_name: string
          gemini_enabled?: boolean | null
          google_drive_root_folder_id?: string | null
          id?: string
          maps_enabled?: boolean | null
          status?: string
          storage_namespace?: string | null
          updated_at?: string
          workspace_code?: string | null
          workspace_name?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          district?: string | null
          division_code?: string | null
          drive_root_folder_id?: string | null
          executive_engineer_email?: string | null
          executive_engineer_id?: string | null
          executive_engineer_name?: string
          gemini_enabled?: boolean | null
          google_drive_root_folder_id?: string | null
          id?: string
          maps_enabled?: boolean | null
          status?: string
          storage_namespace?: string | null
          updated_at?: string
          workspace_code?: string | null
          workspace_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_engineer_workspaces_executive_engineer_id_fkey"
            columns: ["executive_engineer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_applications: {
        Row: {
          ai_application_letter: string | null
          application_date: string | null
          application_pdf_url: string | null
          approved_days: number | null
          authority_response: string | null
          created_at: string | null
          days_requested: number
          drive_link: string | null
          flood_days: number | null
          hindrance_register_url: string | null
          id: string
          new_completion_date: string | null
          other_hindrance_days: number | null
          project_id: string | null
          rain_days: number | null
          status: string | null
          submitted_by: string | null
          supporting_docs: string[] | null
          total_hindrance_days: number | null
          weather_report_url: string | null
        }
        Insert: {
          ai_application_letter?: string | null
          application_date?: string | null
          application_pdf_url?: string | null
          approved_days?: number | null
          authority_response?: string | null
          created_at?: string | null
          days_requested: number
          drive_link?: string | null
          flood_days?: number | null
          hindrance_register_url?: string | null
          id?: string
          new_completion_date?: string | null
          other_hindrance_days?: number | null
          project_id?: string | null
          rain_days?: number | null
          status?: string | null
          submitted_by?: string | null
          supporting_docs?: string[] | null
          total_hindrance_days?: number | null
          weather_report_url?: string | null
        }
        Update: {
          ai_application_letter?: string | null
          application_date?: string | null
          application_pdf_url?: string | null
          approved_days?: number | null
          authority_response?: string | null
          created_at?: string | null
          days_requested?: number
          drive_link?: string | null
          flood_days?: number | null
          hindrance_register_url?: string | null
          id?: string
          new_completion_date?: string | null
          other_hindrance_days?: number | null
          project_id?: string | null
          rain_days?: number | null
          status?: string | null
          submitted_by?: string | null
          supporting_docs?: string[] | null
          total_hindrance_days?: number | null
          weather_report_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_applications_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_projects: {
        Row: {
          contract_pdf_url: string | null
          contractor_id: string | null
          contractor_name: string
          created_at: string | null
          department: string
          district: string | null
          end_date: string
          engineer_id: string | null
          id: string
          je_id: string | null
          location: string | null
          project_code: string
          project_name: string
          project_type: string | null
          se_id: string | null
          start_date: string
          state: string | null
          status: string | null
          total_contract_value: number
        }
        Insert: {
          contract_pdf_url?: string | null
          contractor_id?: string | null
          contractor_name: string
          created_at?: string | null
          department: string
          district?: string | null
          end_date: string
          engineer_id?: string | null
          id?: string
          je_id?: string | null
          location?: string | null
          project_code: string
          project_name: string
          project_type?: string | null
          se_id?: string | null
          start_date: string
          state?: string | null
          status?: string | null
          total_contract_value: number
        }
        Update: {
          contract_pdf_url?: string | null
          contractor_id?: string | null
          contractor_name?: string
          created_at?: string | null
          department?: string
          district?: string | null
          end_date?: string
          engineer_id?: string | null
          id?: string
          je_id?: string | null
          location?: string | null
          project_code?: string
          project_name?: string
          project_type?: string | null
          se_id?: string | null
          start_date?: string
          state?: string | null
          status?: string | null
          total_contract_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "gov_projects_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_projects_engineer_id_fkey"
            columns: ["engineer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_projects_je_id_fkey"
            columns: ["je_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_projects_se_id_fkey"
            columns: ["se_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hindrance_entries: {
        Row: {
          created_at: string | null
          delay_days: number | null
          description: string | null
          id: string
          project_id: string | null
          responsibility: string | null
          title: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          delay_days?: number | null
          description?: string | null
          id?: string
          project_id?: string | null
          responsibility?: string | null
          title?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          delay_days?: number | null
          description?: string | null
          id?: string
          project_id?: string | null
          responsibility?: string | null
          title?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hindrance_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hindrance_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_engineer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      hindrance_register: {
        Row: {
          created_at: string | null
          days_lost: number | null
          description: string
          documents: string[] | null
          extension_application_id: string | null
          financial_impact: number | null
          hindrance_code: string | null
          hindrance_date: string | null
          hindrance_type: string
          id: string
          photos: string[] | null
          project_id: string | null
          reported_by: string | null
          resolution_date: string | null
          resolution_details: string | null
          resolution_status: string | null
          resolved_by: string | null
          site_id: string | null
          used_in_extension: boolean | null
        }
        Insert: {
          created_at?: string | null
          days_lost?: number | null
          description: string
          documents?: string[] | null
          extension_application_id?: string | null
          financial_impact?: number | null
          hindrance_code?: string | null
          hindrance_date?: string | null
          hindrance_type: string
          id?: string
          photos?: string[] | null
          project_id?: string | null
          reported_by?: string | null
          resolution_date?: string | null
          resolution_details?: string | null
          resolution_status?: string | null
          resolved_by?: string | null
          site_id?: string | null
          used_in_extension?: boolean | null
        }
        Update: {
          created_at?: string | null
          days_lost?: number | null
          description?: string
          documents?: string[] | null
          extension_application_id?: string | null
          financial_impact?: number | null
          hindrance_code?: string | null
          hindrance_date?: string | null
          hindrance_type?: string
          id?: string
          photos?: string[] | null
          project_id?: string | null
          reported_by?: string | null
          resolution_date?: string | null
          resolution_details?: string | null
          resolution_status?: string | null
          resolved_by?: string | null
          site_id?: string | null
          used_in_extension?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hindrance_register_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hindrance_register_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hindrance_register_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hindrance_register_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_reports: {
        Row: {
          ai_report: string | null
          compliance_issues: Json | null
          created_at: string | null
          id: string
          inspected_by: string | null
          inspection_date: string | null
          inspection_type: string | null
          milestone_id: string | null
          overall_quality_score: number | null
          pdf_report_url: string | null
          photos: string[] | null
          project_id: string | null
          quality_issues: Json | null
          recommendation: string | null
          report_code: string | null
          structural_issues: Json | null
        }
        Insert: {
          ai_report?: string | null
          compliance_issues?: Json | null
          created_at?: string | null
          id?: string
          inspected_by?: string | null
          inspection_date?: string | null
          inspection_type?: string | null
          milestone_id?: string | null
          overall_quality_score?: number | null
          pdf_report_url?: string | null
          photos?: string[] | null
          project_id?: string | null
          quality_issues?: Json | null
          recommendation?: string | null
          report_code?: string | null
          structural_issues?: Json | null
        }
        Update: {
          ai_report?: string | null
          compliance_issues?: Json | null
          created_at?: string | null
          id?: string
          inspected_by?: string | null
          inspection_date?: string | null
          inspection_type?: string | null
          milestone_id?: string | null
          overall_quality_score?: number | null
          pdf_report_url?: string | null
          photos?: string[] | null
          project_id?: string | null
          quality_issues?: Json | null
          recommendation?: string | null
          report_code?: string | null
          structural_issues?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_reports_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_reports_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "payment_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_ai_reports: {
        Row: {
          confidence: number | null
          created_at: string | null
          created_by: string | null
          id: string
          material_id: string | null
          project_id: string
          report: Json
          severity: string | null
          structured_output: Json | null
          updated_at: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          material_id?: string | null
          project_id: string
          report: Json
          severity?: string | null
          structured_output?: Json | null
          updated_at?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          material_id?: string | null
          project_id?: string
          report?: Json
          severity?: string | null
          structured_output?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      material_tests: {
        Row: {
          achieved_value: string | null
          ai_authenticity_score: number | null
          ai_report_verified: boolean | null
          ai_verification_notes: string | null
          blocks_payment: boolean | null
          created_at: string | null
          drive_link: string | null
          id: string
          lab_certificate_number: string | null
          lab_name: string | null
          material_type: string
          milestone_id: string | null
          project_id: string | null
          required_value: string | null
          result: string | null
          reviewed_by: string | null
          sample_location: string | null
          site_id: string | null
          submitted_by: string | null
          test_date: string | null
          test_report_url: string | null
          test_type: string
          unit: string | null
        }
        Insert: {
          achieved_value?: string | null
          ai_authenticity_score?: number | null
          ai_report_verified?: boolean | null
          ai_verification_notes?: string | null
          blocks_payment?: boolean | null
          created_at?: string | null
          drive_link?: string | null
          id?: string
          lab_certificate_number?: string | null
          lab_name?: string | null
          material_type: string
          milestone_id?: string | null
          project_id?: string | null
          required_value?: string | null
          result?: string | null
          reviewed_by?: string | null
          sample_location?: string | null
          site_id?: string | null
          submitted_by?: string | null
          test_date?: string | null
          test_report_url?: string | null
          test_type: string
          unit?: string | null
        }
        Update: {
          achieved_value?: string | null
          ai_authenticity_score?: number | null
          ai_report_verified?: boolean | null
          ai_verification_notes?: string | null
          blocks_payment?: boolean | null
          created_at?: string | null
          drive_link?: string | null
          id?: string
          lab_certificate_number?: string | null
          lab_name?: string | null
          material_type?: string
          milestone_id?: string | null
          project_id?: string | null
          required_value?: string | null
          result?: string | null
          reviewed_by?: string | null
          sample_location?: string | null
          site_id?: string | null
          submitted_by?: string | null
          test_date?: string | null
          test_report_url?: string | null
          test_type?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_tests_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "payment_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tests_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tests_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          barcode: string | null
          category: string | null
          created_at: string | null
          current_quantity: number | null
          id: string
          last_updated: string | null
          material_name: string
          qr_code: string | null
          site_id: string | null
          supplier_id: string | null
          threshold_quantity: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          created_at?: string | null
          current_quantity?: number | null
          id?: string
          last_updated?: string | null
          material_name: string
          qr_code?: string | null
          site_id?: string | null
          supplier_id?: string | null
          threshold_quantity?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          created_at?: string | null
          current_quantity?: number | null
          id?: string
          last_updated?: string | null
          material_name?: string
          qr_code?: string | null
          site_id?: string | null
          supplier_id?: string | null
          threshold_quantity?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_milestones: {
        Row: {
          ai_analysis: string | null
          ai_hold_amount: number | null
          ai_issues: Json | null
          ai_risk_level: string | null
          ai_safe_amount: number | null
          approved_at: string | null
          approved_by: string | null
          completion_percentage: number | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          milestone_name: string
          milestone_number: number
          paid_at: string | null
          payment_amount: number
          payment_percentage: number
          project_id: string | null
          status: string | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_hold_amount?: number | null
          ai_issues?: Json | null
          ai_risk_level?: string | null
          ai_safe_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_name: string
          milestone_number: number
          paid_at?: string | null
          payment_amount: number
          payment_percentage: number
          project_id?: string | null
          status?: string | null
        }
        Update: {
          ai_analysis?: string | null
          ai_hold_amount?: number | null
          ai_issues?: Json | null
          ai_risk_level?: string | null
          ai_safe_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_name?: string
          milestone_number?: number
          paid_at?: string | null
          payment_amount?: number
          payment_percentage?: number
          project_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_milestones_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          ai_full_report: string | null
          ai_hold_amount: number | null
          ai_recommended_amount: number | null
          ai_risk_level: string | null
          claimed_amount: number
          created_at: string | null
          ee_approved_amount: number | null
          ee_approved_at: string | null
          ee_approved_by: string | null
          ee_comments: string | null
          final_status: string | null
          id: string
          je_approved_amount: number | null
          je_approved_at: string | null
          je_approved_by: string | null
          je_comments: string | null
          milestone_id: string | null
          paid_at: string | null
          project_id: string | null
          rejection_reason: string | null
          request_code: string | null
          requested_by: string | null
          se_approved_amount: number | null
          se_approved_at: string | null
          se_approved_by: string | null
          se_comments: string | null
        }
        Insert: {
          ai_full_report?: string | null
          ai_hold_amount?: number | null
          ai_recommended_amount?: number | null
          ai_risk_level?: string | null
          claimed_amount: number
          created_at?: string | null
          ee_approved_amount?: number | null
          ee_approved_at?: string | null
          ee_approved_by?: string | null
          ee_comments?: string | null
          final_status?: string | null
          id?: string
          je_approved_amount?: number | null
          je_approved_at?: string | null
          je_approved_by?: string | null
          je_comments?: string | null
          milestone_id?: string | null
          paid_at?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          request_code?: string | null
          requested_by?: string | null
          se_approved_amount?: number | null
          se_approved_at?: string | null
          se_approved_by?: string | null
          se_comments?: string | null
        }
        Update: {
          ai_full_report?: string | null
          ai_hold_amount?: number | null
          ai_recommended_amount?: number | null
          ai_risk_level?: string | null
          claimed_amount?: number
          created_at?: string | null
          ee_approved_amount?: number | null
          ee_approved_at?: string | null
          ee_approved_by?: string | null
          ee_comments?: string | null
          final_status?: string | null
          id?: string
          je_approved_amount?: number | null
          je_approved_at?: string | null
          je_approved_by?: string | null
          je_comments?: string | null
          milestone_id?: string | null
          paid_at?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          request_code?: string | null
          requested_by?: string | null
          se_approved_amount?: number | null
          se_approved_at?: string | null
          se_approved_by?: string | null
          se_comments?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_ee_approved_by_fkey"
            columns: ["ee_approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_je_approved_by_fkey"
            columns: ["je_approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "payment_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_se_approved_by_fkey"
            columns: ["se_approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_images: {
        Row: {
          id: string
          image_url: string
          problem_id: string | null
          storage_path: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          id?: string
          image_url: string
          problem_id?: string | null
          storage_path?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          id?: string
          image_url?: string
          problem_id?: string | null
          storage_path?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problem_images_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      problems: {
        Row: {
          ai_action_steps: string | null
          ai_analysis: string | null
          ai_estimated_resolution: string | null
          ai_severity: string | null
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          problem_code: string | null
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string | null
          site_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_action_steps?: string | null
          ai_analysis?: string | null
          ai_estimated_resolution?: string | null
          ai_severity?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          problem_code?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string | null
          site_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_action_steps?: string | null
          ai_analysis?: string | null
          ai_estimated_resolution?: string | null
          ai_severity?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          problem_code?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string | null
          site_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problems_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problems_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problems_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          location: string | null
          onboarding_complete: boolean | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          location?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          access_status: string
          assigned_role: string | null
          assistant_engineer_id: string | null
          contractor_company_name: string | null
          contractor_id: string | null
          created_at: string | null
          executive_engineer_id: string | null
          id: string
          junior_engineer_id: string | null
          project_id: string | null
          project_table: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          access_status?: string
          assigned_role?: string | null
          assistant_engineer_id?: string | null
          contractor_company_name?: string | null
          contractor_id?: string | null
          created_at?: string | null
          executive_engineer_id?: string | null
          id?: string
          junior_engineer_id?: string | null
          project_id?: string | null
          project_table?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          access_status?: string
          assigned_role?: string | null
          assistant_engineer_id?: string | null
          contractor_company_name?: string | null
          contractor_id?: string | null
          created_at?: string | null
          executive_engineer_id?: string | null
          id?: string
          junior_engineer_id?: string | null
          project_id?: string | null
          project_table?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_assistant_engineer_id_fkey"
            columns: ["assistant_engineer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_executive_engineer_id_fkey"
            columns: ["executive_engineer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_junior_engineer_id_fkey"
            columns: ["junior_engineer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "workspace_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_engineer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_boq: {
        Row: {
          created_at: string
          extracted_at: string | null
          extraction_confidence: number
          id: string
          project_id: string
          source_file_url: string | null
          total_estimated_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          extracted_at?: string | null
          extraction_confidence?: number
          id?: string
          project_id: string
          source_file_url?: string | null
          total_estimated_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          extracted_at?: string | null
          extraction_confidence?: number
          id?: string
          project_id?: string
          source_file_url?: string | null
          total_estimated_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number | null
          company: string | null
          completion_date: string | null
          created_at: string | null
          department: string | null
          description: string | null
          district: string | null
          end_date: string | null
          id: string
          location: string | null
          name: string | null
          owner_id: string | null
          progress_percent: number | null
          project_code: string | null
          project_name: string
          project_value: number | null
          start_date: string | null
          status: string | null
          workspace_id: string | null
        }
        Insert: {
          budget?: number | null
          company?: string | null
          completion_date?: string | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          district?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name?: string | null
          owner_id?: string | null
          progress_percent?: number | null
          project_code?: string | null
          project_name: string
          project_value?: number | null
          start_date?: string | null
          status?: string | null
          workspace_id?: string | null
        }
        Update: {
          budget?: number | null
          company?: string | null
          completion_date?: string | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          district?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name?: string | null
          owner_id?: string | null
          progress_percent?: number | null
          project_code?: string | null
          project_name?: string
          project_value?: number | null
          start_date?: string | null
          status?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_engineer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_by: string | null
          created_at: string | null
          delivered_at: string | null
          expected_delivery: string | null
          id: string
          items: Json | null
          notes: string | null
          ordered_by: string | null
          po_number: string | null
          site_id: string | null
          status: string | null
          supplier_id: string | null
          total_amount: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          delivered_at?: string | null
          expected_delivery?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          ordered_by?: string | null
          po_number?: string | null
          site_id?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          delivered_at?: string | null
          expected_delivery?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          ordered_by?: string | null
          po_number?: string | null
          site_id?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      security_deposits: {
        Row: {
          balance_amount: number | null
          contractor_id: string | null
          created_at: string | null
          deducted_amount: number | null
          deduction_history: Json | null
          deposit_type: string | null
          dlp_end_date: string | null
          id: string
          project_id: string | null
          release_conditions: string | null
          released_amount: number | null
          status: string | null
          total_amount: number
        }
        Insert: {
          balance_amount?: number | null
          contractor_id?: string | null
          created_at?: string | null
          deducted_amount?: number | null
          deduction_history?: Json | null
          deposit_type?: string | null
          dlp_end_date?: string | null
          id?: string
          project_id?: string | null
          release_conditions?: string | null
          released_amount?: number | null
          status?: string | null
          total_amount: number
        }
        Update: {
          balance_amount?: number | null
          contractor_id?: string | null
          created_at?: string | null
          deducted_amount?: number | null
          deduction_history?: Json | null
          deposit_type?: string | null
          dlp_end_date?: string | null
          id?: string
          project_id?: string | null
          release_conditions?: string | null
          released_amount?: number | null
          status?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "security_deposits_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_deposits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_gis_data: {
        Row: {
          boundary_coordinates: Json | null
          health_status: string | null
          id: string
          last_updated: string | null
          latitude: number
          longitude: number
          project_id: string | null
          site_area_sqm: number | null
          site_id: string | null
        }
        Insert: {
          boundary_coordinates?: Json | null
          health_status?: string | null
          id?: string
          last_updated?: string | null
          latitude: number
          longitude: number
          project_id?: string | null
          site_area_sqm?: number | null
          site_id?: string | null
        }
        Update: {
          boundary_coordinates?: Json | null
          health_status?: string | null
          id?: string
          last_updated?: string | null
          latitude?: number
          longitude?: number
          project_id?: string | null
          site_area_sqm?: number | null
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_gis_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_gis_data_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          city: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          location: string | null
          manager_id: string | null
          site_code: string | null
          site_name: string
          site_type: string | null
          start_date: string | null
          state: string | null
          status: string | null
          total_area: number | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          site_code?: string | null
          site_name: string
          site_type?: string | null
          start_date?: string | null
          state?: string | null
          status?: string | null
          total_area?: number | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          site_code?: string | null
          site_name?: string
          site_type?: string | null
          start_date?: string | null
          state?: string | null
          status?: string | null
          total_area?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          done_by: string | null
          id: string
          material_id: string | null
          notes: string | null
          quantity: number
          site_id: string | null
          total_amount: number | null
          transaction_date: string | null
          transaction_type: string
          unit_price: number | null
        }
        Insert: {
          done_by?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          quantity: number
          site_id?: string | null
          total_amount?: number | null
          transaction_date?: string | null
          transaction_type: string
          unit_price?: number | null
        }
        Update: {
          done_by?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          quantity?: number
          site_id?: string | null
          total_amount?: number | null
          transaction_date?: string | null
          transaction_type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          company_name: string
          contact_person: string | null
          contractor_id: string
          created_at: string
          email: string | null
          end_date: string | null
          id: string
          phone: string | null
          project_id: string
          project_table: string
          start_date: string | null
          status: string
          updated_at: string
          work_description: string | null
          work_type: string | null
          workspace_id: string
        }
        Insert: {
          company_name: string
          contact_person?: string | null
          contractor_id: string
          created_at?: string
          email?: string | null
          end_date?: string | null
          id?: string
          phone?: string | null
          project_id: string
          project_table: string
          start_date?: string | null
          status?: string
          updated_at?: string
          work_description?: string | null
          work_type?: string | null
          workspace_id: string
        }
        Update: {
          company_name?: string
          contact_person?: string | null
          contractor_id?: string
          created_at?: string
          email?: string | null
          end_date?: string | null
          id?: string
          phone?: string | null
          project_id?: string
          project_table?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          work_description?: string | null
          work_type?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number | null
          created_at: string | null
          end_date: string | null
          id: string
          plan: string | null
          razorpay_payment_id: string | null
          razorpay_subscription_id: string | null
          start_date: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          plan?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          start_date?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          plan?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          start_date?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          material_categories: string[] | null
          phone: string | null
          rating: number | null
          supplier_name: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          material_categories?: string[] | null
          phone?: string | null
          rating?: number | null
          supplier_name: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          material_categories?: string[] | null
          phone?: string | null
          rating?: number | null
          supplier_name?: string
        }
        Relationships: []
      }
      survey_files: {
        Row: {
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          storage_path: string | null
          survey_id: string | null
          uploaded_at: string | null
        }
        Insert: {
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          storage_path?: string | null
          survey_id?: string | null
          uploaded_at?: string | null
        }
        Update: {
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          storage_path?: string | null
          survey_id?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_files_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          ai_findings: string | null
          ai_report: string | null
          conducted_by: string | null
          created_at: string | null
          elevation_data: string | null
          id: string
          progress_percent: number | null
          site_id: string | null
          status: string | null
          survey_date: string | null
          survey_type: string | null
          volume_calculation: string | null
        }
        Insert: {
          ai_findings?: string | null
          ai_report?: string | null
          conducted_by?: string | null
          created_at?: string | null
          elevation_data?: string | null
          id?: string
          progress_percent?: number | null
          site_id?: string | null
          status?: string | null
          survey_date?: string | null
          survey_type?: string | null
          volume_calculation?: string | null
        }
        Update: {
          ai_findings?: string | null
          ai_report?: string | null
          conducted_by?: string | null
          created_at?: string | null
          elevation_data?: string | null
          id?: string
          progress_percent?: number | null
          site_id?: string | null
          status?: string | null
          survey_date?: string | null
          survey_type?: string | null
          volume_calculation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_lifecycle: {
        Row: {
          agreement_date: string | null
          agreement_url: string | null
          agreement_value: number | null
          award_date: string | null
          award_letter_url: string | null
          bid_documents_url: string | null
          bid_opening_date: string | null
          bids_received: number | null
          closure_remarks: string | null
          completion_certificate_date: string | null
          completion_certificate_url: string | null
          construction_start: string | null
          created_at: string | null
          current_stage: string | null
          dlp_end_date: string | null
          dlp_period_months: number | null
          dlp_start_date: string | null
          estimated_cost: number | null
          final_bill_date: string | null
          final_payment_amount: number | null
          final_payment_date: string | null
          id: string
          l1_contractor: string | null
          last_date_submission: string | null
          lowest_bid: number | null
          negotiated_amount: number | null
          project_closed_date: string | null
          project_id: string | null
          site_handover_date: string | null
          site_handover_doc_url: string | null
          tender_notice_date: string | null
          tender_notice_url: string | null
          work_order_amount: number | null
          work_order_date: string | null
          work_order_url: string | null
        }
        Insert: {
          agreement_date?: string | null
          agreement_url?: string | null
          agreement_value?: number | null
          award_date?: string | null
          award_letter_url?: string | null
          bid_documents_url?: string | null
          bid_opening_date?: string | null
          bids_received?: number | null
          closure_remarks?: string | null
          completion_certificate_date?: string | null
          completion_certificate_url?: string | null
          construction_start?: string | null
          created_at?: string | null
          current_stage?: string | null
          dlp_end_date?: string | null
          dlp_period_months?: number | null
          dlp_start_date?: string | null
          estimated_cost?: number | null
          final_bill_date?: string | null
          final_payment_amount?: number | null
          final_payment_date?: string | null
          id?: string
          l1_contractor?: string | null
          last_date_submission?: string | null
          lowest_bid?: number | null
          negotiated_amount?: number | null
          project_closed_date?: string | null
          project_id?: string | null
          site_handover_date?: string | null
          site_handover_doc_url?: string | null
          tender_notice_date?: string | null
          tender_notice_url?: string | null
          work_order_amount?: number | null
          work_order_date?: string | null
          work_order_url?: string | null
        }
        Update: {
          agreement_date?: string | null
          agreement_url?: string | null
          agreement_value?: number | null
          award_date?: string | null
          award_letter_url?: string | null
          bid_documents_url?: string | null
          bid_opening_date?: string | null
          bids_received?: number | null
          closure_remarks?: string | null
          completion_certificate_date?: string | null
          completion_certificate_url?: string | null
          construction_start?: string | null
          created_at?: string | null
          current_stage?: string | null
          dlp_end_date?: string | null
          dlp_period_months?: number | null
          dlp_start_date?: string | null
          estimated_cost?: number | null
          final_bill_date?: string | null
          final_payment_amount?: number | null
          final_payment_date?: string | null
          id?: string
          l1_contractor?: string | null
          last_date_submission?: string | null
          lowest_bid?: number | null
          negotiated_amount?: number | null
          project_closed_date?: string | null
          project_id?: string | null
          site_handover_date?: string | null
          site_handover_doc_url?: string | null
          tender_notice_date?: string | null
          tender_notice_url?: string | null
          work_order_amount?: number | null
          work_order_date?: string | null
          work_order_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_lifecycle_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      test_requirements: {
        Row: {
          created_at: string | null
          frequency: string | null
          id: string
          is_completed: boolean | null
          is_mandatory: boolean | null
          material_type: string
          milestone_id: string | null
          project_id: string | null
          test_id: string | null
          test_type: string
        }
        Insert: {
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_completed?: boolean | null
          is_mandatory?: boolean | null
          material_type: string
          milestone_id?: string | null
          project_id?: string | null
          test_id?: string | null
          test_type: string
        }
        Update: {
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_completed?: boolean | null
          is_mandatory?: boolean | null
          material_type?: string
          milestone_id?: string | null
          project_id?: string | null
          test_id?: string | null
          test_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_requirements_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "payment_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_requirements_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "material_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tpa_firms: {
        Row: {
          areas_covered: string[] | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          empanelment_authority: string | null
          expertise: string[] | null
          firm_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          registration_number: string | null
        }
        Insert: {
          areas_covered?: string[] | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          empanelment_authority?: string | null
          expertise?: string[] | null
          firm_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          registration_number?: string | null
        }
        Update: {
          areas_covered?: string[] | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          empanelment_authority?: string | null
          expertise?: string[] | null
          firm_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          registration_number?: string | null
        }
        Relationships: []
      }
      tpa_inspections: {
        Row: {
          ai_discrepancy_analysis: string | null
          created_at: string | null
          discrepancy_details: string | null
          discrepancy_found: boolean | null
          drive_link: string | null
          ee_report_id: string | null
          id: string
          inspection_date: string | null
          inspection_type: string | null
          inspector_name: string | null
          material_findings: Json | null
          project_id: string | null
          quality_score: number | null
          recommendation: string | null
          safety_findings: Json | null
          structural_findings: Json | null
          tpa_firm_id: string | null
          tpa_report_url: string | null
          workmanship_findings: Json | null
        }
        Insert: {
          ai_discrepancy_analysis?: string | null
          created_at?: string | null
          discrepancy_details?: string | null
          discrepancy_found?: boolean | null
          drive_link?: string | null
          ee_report_id?: string | null
          id?: string
          inspection_date?: string | null
          inspection_type?: string | null
          inspector_name?: string | null
          material_findings?: Json | null
          project_id?: string | null
          quality_score?: number | null
          recommendation?: string | null
          safety_findings?: Json | null
          structural_findings?: Json | null
          tpa_firm_id?: string | null
          tpa_report_url?: string | null
          workmanship_findings?: Json | null
        }
        Update: {
          ai_discrepancy_analysis?: string | null
          created_at?: string | null
          discrepancy_details?: string | null
          discrepancy_found?: boolean | null
          drive_link?: string | null
          ee_report_id?: string | null
          id?: string
          inspection_date?: string | null
          inspection_type?: string | null
          inspector_name?: string | null
          material_findings?: Json | null
          project_id?: string | null
          quality_score?: number | null
          recommendation?: string | null
          safety_findings?: Json | null
          structural_findings?: Json | null
          tpa_firm_id?: string | null
          tpa_report_url?: string | null
          workmanship_findings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tpa_inspections_ee_report_id_fkey"
            columns: ["ee_report_id"]
            isOneToOne: false
            referencedRelation: "inspection_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpa_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpa_inspections_tpa_firm_id_fkey"
            columns: ["tpa_firm_id"]
            isOneToOne: false
            referencedRelation: "tpa_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          id: string
          metadata: Json
          page_path: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type: string
          id?: string
          metadata?: Json
          page_path?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          page_path?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          department: string | null
          employee_code: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          location: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          department?: string | null
          employee_code?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          location?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          department?: string | null
          employee_code?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      weather_logs: {
        Row: {
          auto_fetched: boolean | null
          created_at: string | null
          hours_lost: number | null
          id: string
          log_date: string | null
          photos: string[] | null
          project_id: string | null
          rainfall_mm: number | null
          reason_details: string | null
          reported_by: string | null
          site_id: string | null
          temperature: number | null
          weather_api_data: Json | null
          weather_type: string
          wind_speed: number | null
          work_stopped: boolean | null
        }
        Insert: {
          auto_fetched?: boolean | null
          created_at?: string | null
          hours_lost?: number | null
          id?: string
          log_date?: string | null
          photos?: string[] | null
          project_id?: string | null
          rainfall_mm?: number | null
          reason_details?: string | null
          reported_by?: string | null
          site_id?: string | null
          temperature?: number | null
          weather_api_data?: Json | null
          weather_type: string
          wind_speed?: number | null
          work_stopped?: boolean | null
        }
        Update: {
          auto_fetched?: boolean | null
          created_at?: string | null
          hours_lost?: number | null
          id?: string
          log_date?: string | null
          photos?: string[] | null
          project_id?: string | null
          rainfall_mm?: number | null
          reason_details?: string | null
          reported_by?: string | null
          site_id?: string | null
          temperature?: number | null
          weather_api_data?: Json | null
          weather_type?: string
          wind_speed?: number | null
          work_stopped?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_logs_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_bot_users: {
        Row: {
          bot_active: boolean | null
          created_at: string | null
          id: string
          linked_sites: string[] | null
          phone: string
          user_id: string | null
          verification_code: string | null
          whatsapp_verified: boolean | null
        }
        Insert: {
          bot_active?: boolean | null
          created_at?: string | null
          id?: string
          linked_sites?: string[] | null
          phone: string
          user_id?: string | null
          verification_code?: string | null
          whatsapp_verified?: boolean | null
        }
        Update: {
          bot_active?: boolean | null
          created_at?: string | null
          id?: string
          linked_sites?: string[] | null
          phone?: string
          user_id?: string | null
          verification_code?: string | null
          whatsapp_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bot_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          action_taken: string | null
          id: string
          message_in: string | null
          message_out: string | null
          parsed_data: Json | null
          phone: string
          received_at: string | null
          report_created_id: string | null
          status: string | null
        }
        Insert: {
          action_taken?: string | null
          id?: string
          message_in?: string | null
          message_out?: string | null
          parsed_data?: Json | null
          phone: string
          received_at?: string | null
          report_created_id?: string | null
          status?: string | null
        }
        Update: {
          action_taken?: string | null
          id?: string
          message_in?: string | null
          message_out?: string | null
          parsed_data?: Json | null
          phone?: string
          received_at?: string | null
          report_created_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      work_uploads: {
        Row: {
          ai_analysis: string | null
          ai_issues: Json | null
          ai_quality_score: number | null
          description: string | null
          engineer_notes: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          milestone_id: string | null
          photo_urls: string[] | null
          project_id: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          upload_timestamp: string | null
          uploaded_by: string | null
          video_urls: string[] | null
          work_category: string
        }
        Insert: {
          ai_analysis?: string | null
          ai_issues?: Json | null
          ai_quality_score?: number | null
          description?: string | null
          engineer_notes?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          milestone_id?: string | null
          photo_urls?: string[] | null
          project_id?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          upload_timestamp?: string | null
          uploaded_by?: string | null
          video_urls?: string[] | null
          work_category: string
        }
        Update: {
          ai_analysis?: string | null
          ai_issues?: Json | null
          ai_quality_score?: number | null
          description?: string | null
          engineer_notes?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          milestone_id?: string | null
          photo_urls?: string[] | null
          project_id?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          upload_timestamp?: string | null
          uploaded_by?: string | null
          video_urls?: string[] | null
          work_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_uploads_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "payment_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_uploads_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          aadhaar_number: string | null
          address: string | null
          auth_user_id: string | null
          contractor_id: string | null
          created_at: string | null
          daily_wage: number | null
          email: string | null
          emergency_contact: string | null
          full_name: string
          id: string
          is_active: boolean | null
          joining_date: string | null
          phone: string | null
          photo_url: string | null
          project_id: string | null
          project_table: string | null
          site_id: string | null
          skill: string | null
          workspace_id: string | null
        }
        Insert: {
          aadhaar_number?: string | null
          address?: string | null
          auth_user_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          daily_wage?: number | null
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          joining_date?: string | null
          phone?: string | null
          photo_url?: string | null
          project_id?: string | null
          project_table?: string | null
          site_id?: string | null
          skill?: string | null
          workspace_id?: string | null
        }
        Update: {
          aadhaar_number?: string | null
          address?: string | null
          auth_user_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          daily_wage?: number | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          joining_date?: string | null
          phone?: string | null
          photo_url?: string | null
          project_id?: string | null
          project_table?: string | null
          site_id?: string | null
          skill?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_google_connections: {
        Row: {
          created_at: string
          drive_api_status: string
          drive_root_folder_id: string | null
          encrypted_gemini_key_ref: string | null
          gemini_api_status: string
          google_project_id: string | null
          id: string
          maps_api_status: string
          setup_status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          drive_api_status?: string
          drive_root_folder_id?: string | null
          encrypted_gemini_key_ref?: string | null
          gemini_api_status?: string
          google_project_id?: string | null
          id?: string
          maps_api_status?: string
          setup_status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          drive_api_status?: string
          drive_root_folder_id?: string | null
          encrypted_gemini_key_ref?: string | null
          gemini_api_status?: string
          google_project_id?: string | null
          id?: string
          maps_api_status?: string
          setup_status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_google_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "executive_engineer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_projects: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_users: {
        Row: {
          active: boolean
          contractor_company: string | null
          created_at: string | null
          email: string | null
          free_lifetime: boolean
          full_name: string
          id: string
          is_active: boolean | null
          parent_user_id: string | null
          role: string
          subdivision_name: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          active?: boolean
          contractor_company?: string | null
          created_at?: string | null
          email?: string | null
          free_lifetime?: boolean
          full_name: string
          id?: string
          is_active?: boolean | null
          parent_user_id?: string | null
          role: string
          subdivision_name?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          active?: boolean
          contractor_company?: string | null
          created_at?: string | null
          email?: string | null
          free_lifetime?: boolean
          full_name?: string
          id?: string
          is_active?: boolean | null
          parent_user_id?: string | null
          role?: string
          subdivision_name?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_users_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_users_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_engineer_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      budget_gap_alerts: {
        Row: {
          alert_level: string | null
          financial_progress_percent: number | null
          gap_percentage: number | null
          physical_progress_percent: number | null
          project_id: string | null
        }
        Insert: {
          alert_level?: never
          financial_progress_percent?: number | null
          gap_percentage?: number | null
          physical_progress_percent?: number | null
          project_id?: string | null
        }
        Update: {
          alert_level?: never
          financial_progress_percent?: number | null
          gap_percentage?: number | null
          physical_progress_percent?: number | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_progress_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_blocked_projects: {
        Row: {
          pending_tests: number | null
          project_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "gov_projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_update_bg_status: { Args: never; Returns: undefined }
      can_access_project: {
        Args: { target_project_id: string; target_workspace_id: string }
        Returns: boolean
      }
      is_project_field_user: {
        Args: { target_project_id: string; target_workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
