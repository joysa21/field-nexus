export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_runs: {
        Row: {
          id: string;
          run_at: string | null;
          total_issues: number | null;
          total_assigned: number | null;
          alerts: Json | null;
          agent_logs: Json | null;
        }
        Insert: {
          id?: string;
          run_at?: string | null;
          total_issues?: number | null;
          total_assigned?: number | null;
          alerts?: Json | null;
          agent_logs?: Json | null;
        }
        Update: {
          id?: string;
          run_at?: string | null;
          total_issues?: number | null;
          total_assigned?: number | null;
          alerts?: Json | null;
          agent_logs?: Json | null;
        }
        Relationships: []
      }
      auth_events: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          event_type: "login" | "signup";
          logged_at: string | null;
          metadata: Json | null;
        }
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          event_type: "login" | "signup";
          logged_at?: string | null;
          metadata?: Json | null;
        }
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          event_type?: "login" | "signup";
          logged_at?: string | null;
          metadata?: Json | null;
        }
        Relationships: []
      }
      issues: {
        Row: {
          id: string;
          issue_summary: string | null;
          sector: string | null;
          location: string | null;
          affected_count: number | null;
          priority_score: number | null;
          urgency_score: number | null;
          status: string | null;
          assigned_volunteer_id: string | null;
          assignment_reason: string | null;
          created_at: string | null;
        }
        Insert: {
          id?: string;
          issue_summary?: string | null;
          sector?: string | null;
          location?: string | null;
          affected_count?: number | null;
          priority_score?: number | null;
          urgency_score?: number | null;
          status?: string | null;
          assigned_volunteer_id?: string | null;
          assignment_reason?: string | null;
          created_at?: string | null;
        }
        Update: {
          id?: string;
          issue_summary?: string | null;
          sector?: string | null;
          location?: string | null;
          affected_count?: number | null;
          priority_score?: number | null;
          urgency_score?: number | null;
          status?: string | null;
          assigned_volunteer_id?: string | null;
          assignment_reason?: string | null;
          created_at?: string | null;
        }
        Relationships: [
          {
            foreignKeyName: "issues_assigned_volunteer_id_fkey";
            columns: ["assigned_volunteer_id"];
            isOneToOne: false;
            referencedRelation: "volunteers";
            referencedColumns: ["id"];
          },
        ]
      }
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          user_type: "individual" | "ngo";
          location: string | null;
          contact_number: string | null;
          ngo_type: string | null;
          created_at: string | null;
          updated_at: string | null;
        }
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          user_type: "individual" | "ngo";
          location?: string | null;
          contact_number?: string | null;
          ngo_type?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        }
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          user_type?: "individual" | "ngo";
          location?: string | null;
          contact_number?: string | null;
          ngo_type?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        }
        Relationships: []
      }
      volunteers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          skills: string[] | null;
          zone: string | null;
          availability_hours_per_week: number | null;
          is_active: boolean | null;
          created_at: string | null;
        }
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          skills?: string[] | null;
          zone?: string | null;
          availability_hours_per_week?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
        }
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          skills?: string[] | null;
          zone?: string | null;
          availability_hours_per_week?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
