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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
