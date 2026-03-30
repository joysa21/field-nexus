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
        Row: { id: string; run_at: string | null; total_issues: number | null; total_assigned: number | null; alerts: Json | null; agent_logs: Json | null }
        Insert: { id?: string; run_at?: string | null; total_issues?: number | null; total_assigned?: number | null; alerts?: Json | null; agent_logs?: Json | null }
        Update: { id?: string; run_at?: string | null; total_issues?: number | null; total_assigned?: number | null; alerts?: Json | null; agent_logs?: Json | null }
        Relationships: []
      }
      issues: {
        Row: { id: string; issue_summary: string | null; sector: string | null; location: string | null; affected_count: number | null; priority_score: number | null; urgency_score: number | null; status: string | null; assigned_volunteer_id: string | null; assignment_reason: string | null; created_at: string | null }
        Insert: { id?: string; issue_summary?: string | null; sector?: string | null; location?: string | null; affected_count?: number | null; priority_score?: number | null; urgency_score?: number | null; status?: string | null; assigned_volunteer_id?: string | null; assignment_reason?: string | null; created_at?: string | null }
        Update: { id?: string; issue_summary?: string | null; sector?: string | null; location?: string | null; affected_count?: number | null; priority_score?: number | null; urgency_score?: number | null; status?: string | null; assigned_volunteer_id?: string | null; assignment_reason?: string | null; created_at?: string | null }
        Relationships: [{ foreignKeyName: "issues_assigned_volunteer_id_fkey"; columns: ["assigned_volunteer_id"]; isOneToOne: false; referencedRelation: "volunteers"; referencedColumns: ["id"] }]
      }
      volunteers: {
        Row: { id: string; name: string; email: string | null; phone: string | null; skills: string[] | null; zone: string | null; availability_hours_per_week: number | null; is_active: boolean | null; created_at: string | null }
        Insert: { id?: string; name: string; email?: string | null; phone?: string | null; skills?: string[] | null; zone?: string | null; availability_hours_per_week?: number | null; is_active?: boolean | null; created_at?: string | null }
        Update: { id?: string; name?: string; email?: string | null; phone?: string | null; skills?: string[] | null; zone?: string | null; availability_hours_per_week?: number | null; is_active?: boolean | null; created_at?: string | null }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          role: "ngo" | "individual"
          display_name: string
          location: string | null
          contact_info: string | null
          verification_status: "unverified" | "pending" | "verified"
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: "ngo" | "individual"
          display_name: string
          location?: string | null
          contact_info?: string | null
          verification_status?: "unverified" | "pending" | "verified"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: "ngo" | "individual"
          display_name?: string
          location?: string | null
          contact_info?: string | null
          verification_status?: "unverified" | "pending" | "verified"
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ngo_profiles: {
        Row: {
          id: string
          user_id: string
          ngo_name: string
          description: string | null
          sector: string | null
          location: string | null
          contact_info: string | null
          verification_status: "unverified" | "pending" | "verified"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ngo_name: string
          description?: string | null
          sector?: string | null
          location?: string | null
          contact_info?: string | null
          verification_status?: "unverified" | "pending" | "verified"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ngo_name?: string
          description?: string | null
          sector?: string | null
          location?: string | null
          contact_info?: string | null
          verification_status?: "unverified" | "pending" | "verified"
          created_at?: string
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: "ngo_profiles_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      individual_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          skills: string[]
          interests: string[]
          location: string | null
          availability: string | null
          contact_info: string | null
          verification_status: "unverified" | "pending" | "verified"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          skills?: string[]
          interests?: string[]
          location?: string | null
          availability?: string | null
          contact_info?: string | null
          verification_status?: "unverified" | "pending" | "verified"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          skills?: string[]
          interests?: string[]
          location?: string | null
          availability?: string | null
          contact_info?: string | null
          verification_status?: "unverified" | "pending" | "verified"
          created_at?: string
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: "individual_profiles_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      ngo_requests: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string
          category: string
          urgency: "low" | "medium" | "high" | "critical"
          location: string | null
          volunteers_needed: number
          skills_needed: string[]
          deadline: string | null
          contact_method: string | null
          status: "open" | "pending" | "matched" | "in_progress" | "completed" | "closed" | "fulfilled"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description: string
          category: string
          urgency?: "low" | "medium" | "high" | "critical"
          location?: string | null
          volunteers_needed?: number
          skills_needed?: string[]
          deadline?: string | null
          contact_method?: string | null
          status?: "open" | "pending" | "matched" | "in_progress" | "completed" | "closed" | "fulfilled"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string
          category?: string
          urgency?: "low" | "medium" | "high" | "critical"
          location?: string | null
          volunteers_needed?: number
          skills_needed?: string[]
          deadline?: string | null
          contact_method?: string | null
          status?: "open" | "pending" | "matched" | "in_progress" | "completed" | "closed" | "fulfilled"
          created_at?: string
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: "ngo_requests_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      volunteer_offers: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string
          skills: string[]
          availability: string | null
          preferred_causes: string[]
          location: string | null
          mode: "remote" | "on_ground" | "hybrid"
          contact_method: string | null
          status: "open" | "pending" | "matched" | "in_progress" | "completed" | "closed" | "unavailable"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description: string
          skills?: string[]
          availability?: string | null
          preferred_causes?: string[]
          location?: string | null
          mode?: "remote" | "on_ground" | "hybrid"
          contact_method?: string | null
          status?: "open" | "pending" | "matched" | "in_progress" | "completed" | "closed" | "unavailable"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string
          skills?: string[]
          availability?: string | null
          preferred_causes?: string[]
          location?: string | null
          mode?: "remote" | "on_ground" | "hybrid"
          contact_method?: string | null
          status?: "open" | "pending" | "matched" | "in_progress" | "completed" | "closed" | "unavailable"
          created_at?: string
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: "volunteer_offers_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      connections_or_responses: {
        Row: {
          id: string
          request_id: string | null
          offer_id: string | null
          sender_id: string
          receiver_id: string
          message: string | null
          status: "pending" | "accepted" | "rejected" | "completed" | "closed"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id?: string | null
          offer_id?: string | null
          sender_id: string
          receiver_id: string
          message?: string | null
          status?: "pending" | "accepted" | "rejected" | "completed" | "closed"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_id?: string | null
          offer_id?: string | null
          sender_id?: string
          receiver_id?: string
          message?: string | null
          status?: "pending" | "accepted" | "rejected" | "completed" | "closed"
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "connections_or_responses_offer_id_fkey"; columns: ["offer_id"]; isOneToOne: false; referencedRelation: "volunteer_offers"; referencedColumns: ["id"] },
          { foreignKeyName: "connections_or_responses_receiver_id_fkey"; columns: ["receiver_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "connections_or_responses_request_id_fkey"; columns: ["request_id"]; isOneToOne: false; referencedRelation: "ngo_requests"; referencedColumns: ["id"] },
          { foreignKeyName: "connections_or_responses_sender_id_fkey"; columns: ["sender_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      post_comments: {
        Row: {
          id: string
          post_type: "ngo_request" | "volunteer_offer"
          request_id: string | null
          offer_id: string | null
          author_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_type: "ngo_request" | "volunteer_offer"
          request_id?: string | null
          offer_id?: string | null
          author_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_type?: "ngo_request" | "volunteer_offer"
          request_id?: string | null
          offer_id?: string | null
          author_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "post_comments_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "post_comments_offer_id_fkey"; columns: ["offer_id"]; isOneToOne: false; referencedRelation: "volunteer_offers"; referencedColumns: ["id"] },
          { foreignKeyName: "post_comments_request_id_fkey"; columns: ["request_id"]; isOneToOne: false; referencedRelation: "ngo_requests"; referencedColumns: ["id"] }
        ]
      }
      saved_posts: {
        Row: {
          id: string
          user_id: string
          post_type: "ngo_request" | "volunteer_offer"
          request_id: string | null
          offer_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_type: "ngo_request" | "volunteer_offer"
          request_id?: string | null
          offer_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_type?: "ngo_request" | "volunteer_offer"
          request_id?: string | null
          offer_id?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "saved_posts_offer_id_fkey"; columns: ["offer_id"]; isOneToOne: false; referencedRelation: "volunteer_offers"; referencedColumns: ["id"] },
          { foreignKeyName: "saved_posts_request_id_fkey"; columns: ["request_id"]; isOneToOne: false; referencedRelation: "ngo_requests"; referencedColumns: ["id"] },
          { foreignKeyName: "saved_posts_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          actor_id: string | null
          event_type: string
          title: string
          body: string | null
          related_request_id: string | null
          related_offer_id: string | null
          related_connection_id: string | null
          related_comment_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          actor_id?: string | null
          event_type: string
          title: string
          body?: string | null
          related_request_id?: string | null
          related_offer_id?: string | null
          related_connection_id?: string | null
          related_comment_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          actor_id?: string | null
          event_type?: string
          title?: string
          body?: string | null
          related_request_id?: string | null
          related_offer_id?: string | null
          related_connection_id?: string | null
          related_comment_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "notifications_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_related_comment_id_fkey"; columns: ["related_comment_id"]; isOneToOne: false; referencedRelation: "post_comments"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_related_connection_id_fkey"; columns: ["related_connection_id"]; isOneToOne: false; referencedRelation: "connections_or_responses"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_related_offer_id_fkey"; columns: ["related_offer_id"]; isOneToOne: false; referencedRelation: "volunteer_offers"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_related_request_id_fkey"; columns: ["related_request_id"]; isOneToOne: false; referencedRelation: "ngo_requests"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
