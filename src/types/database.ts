// AUTO-GENERIERT via: npx supabase gen types typescript --project-id "$PROJECT_ID" > src/types/database.ts
// Dieser Placeholder wird durch den generierten Output ersetzt sobald ein Supabase-Projekt verbunden ist.
// NIE manuell editieren nach der ersten echten Generierung!

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      corrections: {
        Row: {
          id: string
          account_id: string
          symptom_event_id: string
          field_name: string
          original_value: string
          corrected_value: string
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          symptom_event_id: string
          field_name: string
          original_value: string
          corrected_value: string
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          symptom_event_id?: string
          field_name?: string
          original_value?: string
          corrected_value?: string
          created_at?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          id: string
          created_at: string
          deleted_at: string | null
          disclaimer_accepted_at: string | null
        }
        Insert: {
          id: string
          created_at?: string
          deleted_at?: string | null
          disclaimer_accepted_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          deleted_at?: string | null
          disclaimer_accepted_at?: string | null
        }
        Relationships: []
      }
      extracted_data: {
        Row: {
          id: string
          symptom_event_id: string
          field_name: string
          value: string
          confidence: number
          confirmed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          symptom_event_id: string
          field_name: string
          value: string
          confidence: number
          confirmed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          symptom_event_id?: string
          field_name?: string
          value?: string
          confidence?: number
          confirmed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      symptom_events: {
        Row: {
          id: string
          account_id: string
          event_type: string
          raw_input: string
          status: string
          created_at: string
          ended_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          account_id: string
          event_type?: string
          raw_input: string
          status?: string
          created_at?: string
          ended_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          event_type?: string
          raw_input?: string
          status?: string
          created_at?: string
          ended_at?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
