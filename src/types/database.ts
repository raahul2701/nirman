export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          company: string | null;
          role: string;
          avatar_url: string | null;
          phone: string | null;
          location: string | null;
          onboarding_complete: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; email: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          table_name: string | null;
          record_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['audit_logs']['Row']> & { action: string };
        Update: Partial<Database['public']['Tables']['audit_logs']['Row']>;
      };
      error_logs: {
        Row: {
          id: string;
          level: string;
          message: string;
          context: Json | null;
          user_id: string | null;
          url: string | null;
          user_agent: string | null;
          stack: string | null;
          created_at: string;
          details: Json | null;
          source: string | null;
        };
        Insert: Partial<Database['public']['Tables']['error_logs']['Row']> & { level: string; message: string };
        Update: Partial<Database['public']['Tables']['error_logs']['Row']>;
      };
      ai_request_logs: {
        Row: {
          id: string;
          user_id: string | null;
          request_id: string;
          workflow: string;
          model: string | null;
          status: string;
          prompt_chars: number | null;
          tokens_used: number | null;
          duration_ms: number | null;
          error_message: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ai_request_logs']['Row']> & { request_id: string; workflow: string; status: string };
        Update: Partial<Database['public']['Tables']['ai_request_logs']['Row']>;
      };
      upload_metadata: {
        Row: {
          id: string;
          user_id: string | null;
          bucket: string;
          path: string;
          file_hash: string | null;
          size_bytes: number | null;
          mime_type: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['upload_metadata']['Row']> & { bucket: string; path: string };
        Update: Partial<Database['public']['Tables']['upload_metadata']['Row']>;
      };
      device_sessions: {
        Row: {
          id: string;
          user_id: string;
          device_id: string;
          user_agent: string | null;
          last_seen_at: string;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['device_sessions']['Row']> & { user_id: string; device_id: string };
        Update: Partial<Database['public']['Tables']['device_sessions']['Row']>;
      };
      admin_impersonation_events: {
        Row: {
          id: string;
          admin_user_id: string;
          target_user_id: string;
          reason: string;
          started_at: string;
          ended_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['admin_impersonation_events']['Row']> & {
          admin_user_id: string;
          target_user_id: string;
          reason: string;
        };
        Update: Partial<Database['public']['Tables']['admin_impersonation_events']['Row']>;
      };
      [key: string]: {
        Row: Record<string, Json>;
        Insert: Record<string, Json>;
        Update: Record<string, Json>;
      };
    };
    Views: { [key: string]: { Row: Record<string, Json> } };
    Functions: { [key: string]: { Args: Record<string, Json>; Returns: Json } };
    Enums: { [key: string]: string };
    CompositeTypes: { [key: string]: unknown };
  };
};
