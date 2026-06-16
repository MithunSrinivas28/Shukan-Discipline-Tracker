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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      code_snippets: {
        Row: {
          code: string
          created_at: string
          id: string
          language: string
          metadata: Json
          notes: string | null
          source: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          language?: string
          metadata?: Json
          notes?: string | null
          source?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          language?: string
          metadata?: Json
          notes?: string | null
          source?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_commitments: {
        Row: {
          commitment_date: string
          created_at: string
          id: string
          target_hours: number
          user_id: string
        }
        Insert: {
          commitment_date?: string
          created_at?: string
          id?: string
          target_hours: number
          user_id: string
        }
        Update: {
          commitment_date?: string
          created_at?: string
          id?: string
          target_hours?: number
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          answer: string
          created_at: string
          id: string
          metadata: Json
          question: string
          source: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          metadata?: Json
          question: string
          source?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          metadata?: Json
          question?: string
          source?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_participants: {
        Row: {
          created_at: string
          id: string
          joined_at: string | null
          left_at: string | null
          points_earned: number
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          points_earned?: number
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          points_earned?: number
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "focus_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          break_duration: number
          created_at: string
          created_by: string
          ended_at: string | null
          focus_duration: number
          id: string
          started_at: string | null
          status: string
        }
        Insert: {
          break_duration?: number
          created_at?: string
          created_by: string
          ended_at?: string | null
          focus_duration?: number
          id?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          break_duration?: number
          created_at?: string
          created_by?: string
          ended_at?: string | null
          focus_duration?: number
          id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          status: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          status?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          status?: string
          to_user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_sessions: {
        Row: {
          category_scores: Json
          completed_at: string | null
          created_at: string
          custom_topic: string | null
          difficulty: string
          domain: string
          duration_minutes: number
          id: string
          improvements: Json
          metadata: Json
          overall_score: number | null
          status: string
          strengths: Json
          transcript: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          category_scores?: Json
          completed_at?: string | null
          created_at?: string
          custom_topic?: string | null
          difficulty: string
          domain: string
          duration_minutes: number
          id?: string
          improvements?: Json
          metadata?: Json
          overall_score?: number | null
          status?: string
          strengths?: Json
          transcript?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          category_scores?: Json
          completed_at?: string | null
          created_at?: string
          custom_topic?: string | null
          difficulty?: string
          domain?: string
          duration_minutes?: number
          id?: string
          improvements?: Json
          metadata?: Json
          overall_score?: number | null
          status?: string
          strengths?: Json
          transcript?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          battle_points: number
          battle_wins: number
          created_at: string
          id: string
          joined_at: string
          last_increment: string | null
          points: number
          total_hours: number
          total_study_minutes: number
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          battle_points?: number
          battle_wins?: number
          created_at?: string
          id: string
          joined_at?: string
          last_increment?: string | null
          points?: number
          total_hours?: number
          total_study_minutes?: number
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          battle_points?: number
          battle_wins?: number
          created_at?: string
          id?: string
          joined_at?: string
          last_increment?: string | null
          points?: number
          total_hours?: number
          total_study_minutes?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      study_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          interval_type: string | null
          mode: string
          sessions_completed: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          interval_type?: string | null
          mode?: string
          sessions_completed?: number
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          interval_type?: string | null
          mode?: string
          sessions_completed?: number
          user_id?: string
        }
        Relationships: []
      }
      todo_tasks: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          task_date: string
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          task_date?: string
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          task_date?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard_minutes: {
        Args: never
        Returns: {
          total_minutes: number
          user_id: string
        }[]
      }
      get_username: { Args: { p_user_id: string }; Returns: string }
      increment_study_hour: { Args: { p_user_id: string }; Returns: Json }
      increment_study_minutes: {
        Args: { p_minutes: number; p_user_id: string }
        Returns: undefined
      }
      is_session_participant: {
        Args: { _session_id: string; _user_id: string }
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
