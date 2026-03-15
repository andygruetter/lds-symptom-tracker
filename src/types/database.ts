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
      accounts: {
        Row: {
          created_at: string
          deleted_at: string | null
          disclaimer_accepted_at: string | null
          id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          disclaimer_accepted_at?: string | null
          id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          disclaimer_accepted_at?: string | null
          id?: string
        }
        Relationships: []
      }
      corrections: {
        Row: {
          account_id: string
          corrected_value: string
          created_at: string
          field_name: string
          id: string
          original_value: string | null
          symptom_event_id: string
        }
        Insert: {
          account_id: string
          corrected_value: string
          created_at?: string
          field_name: string
          id?: string
          original_value?: string | null
          symptom_event_id: string
        }
        Update: {
          account_id?: string
          corrected_value?: string
          created_at?: string
          field_name?: string
          id?: string
          original_value?: string | null
          symptom_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'corrections_symptom_event_id_fkey'
            columns: ['symptom_event_id']
            isOneToOne: false
            referencedRelation: 'symptom_events'
            referencedColumns: ['id']
          },
        ]
      }
      event_photos: {
        Row: {
          created_at: string | null
          id: string
          storage_path: string
          symptom_event_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          storage_path: string
          symptom_event_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          storage_path?: string
          symptom_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_photos_symptom_event_id_fkey'
            columns: ['symptom_event_id']
            isOneToOne: false
            referencedRelation: 'symptom_events'
            referencedColumns: ['id']
          },
        ]
      }
      extracted_data: {
        Row: {
          confidence: number
          confirmed: boolean
          created_at: string
          field_name: string
          id: string
          symptom_event_id: string
          value: string
        }
        Insert: {
          confidence: number
          confirmed?: boolean
          created_at?: string
          field_name: string
          id?: string
          symptom_event_id: string
          value: string
        }
        Update: {
          confidence?: number
          confirmed?: boolean
          created_at?: string
          field_name?: string
          id?: string
          symptom_event_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: 'extracted_data_symptom_event_id_fkey'
            columns: ['symptom_event_id']
            isOneToOne: false
            referencedRelation: 'symptom_events'
            referencedColumns: ['id']
          },
        ]
      }
      patient_vocabulary: {
        Row: {
          account_id: string
          created_at: string
          field_name: string
          id: string
          mapped_term: string
          patient_term: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          account_id: string
          created_at?: string
          field_name: string
          id?: string
          mapped_term: string
          patient_term: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          field_name?: string
          id?: string
          mapped_term?: string
          patient_term?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          account_id: string
          created_at: string
          endpoint: string
          id: string
          keys_auth: string
          keys_p256dh: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          endpoint: string
          id?: string
          keys_auth: string
          keys_p256dh: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          updated_at?: string
        }
        Relationships: []
      }
      symptom_events: {
        Row: {
          account_id: string
          audio_url: string | null
          created_at: string
          deleted_at: string | null
          ended_at: string | null
          event_type: string
          id: string
          occurred_at: string
          raw_input: string | null
          status: string
        }
        Insert: {
          account_id: string
          audio_url?: string | null
          created_at?: string
          deleted_at?: string | null
          ended_at?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          raw_input?: string | null
          status?: string
        }
        Update: {
          account_id?: string
          audio_url?: string | null
          created_at?: string
          deleted_at?: string | null
          ended_at?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          raw_input?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_deleted_accounts: { Args: never; Returns: undefined }
      upsert_vocabulary_entry: {
        Args: {
          p_account_id: string
          p_field_name: string
          p_mapped_term: string
          p_patient_term: string
        }
        Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
