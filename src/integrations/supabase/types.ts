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
      coach_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          meeting_day: string | null
          meeting_time: string | null
          member_count: number | null
          name: string
          organizer: string | null
          whatsapp_url: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          meeting_day?: string | null
          meeting_time?: string | null
          member_count?: number | null
          name: string
          organizer?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          meeting_day?: string | null
          meeting_time?: string | null
          member_count?: number | null
          name?: string
          organizer?: string | null
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_quotes: {
        Row: {
          author: string | null
          id: string
          text: string
        }
        Insert: {
          author?: string | null
          id?: string
          text: string
        }
        Update: {
          author?: string | null
          id?: string
          text?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          id: string
          instructions: string | null
          name: string
          order_index: number | null
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          workout_id: string
        }
        Insert: {
          id?: string
          instructions?: string | null
          name: string
          order_index?: number | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          workout_id: string
        }
        Update: {
          id?: string
          instructions?: string | null
          name?: string
          order_index?: number | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      food_logs: {
        Row: {
          calories: number | null
          carbs_g: number | null
          fat_g: number | null
          fiber_g: number | null
          id: string
          log_date: string
          logged_at: string
          meal_type: Database["public"]["Enums"]["meal_type"] | null
          name: string
          protein_g: number | null
          servings: number | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          log_date?: string
          logged_at?: string
          meal_type?: Database["public"]["Enums"]["meal_type"] | null
          name: string
          protein_g?: number | null
          servings?: number | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          log_date?: string
          logged_at?: string
          meal_type?: Database["public"]["Enums"]["meal_type"] | null
          name?: string
          protein_g?: number | null
          servings?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          avatar_url: string | null
          bio: string | null
          coach_questions_date: string | null
          coach_questions_today: number | null
          created_at: string
          current_weight_kg: number | null
          daily_calorie_goal: number | null
          daily_water_goal_l: number | null
          daily_workout_goal: number | null
          full_name: string | null
          goal_weight_kg: number | null
          height_cm: number | null
          id: string
          last_activity_date: string | null
          starting_weight_kg: number | null
          streak_count: number | null
          updated_at: string
        }
        Insert: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          avatar_url?: string | null
          bio?: string | null
          coach_questions_date?: string | null
          coach_questions_today?: number | null
          created_at?: string
          current_weight_kg?: number | null
          daily_calorie_goal?: number | null
          daily_water_goal_l?: number | null
          daily_workout_goal?: number | null
          full_name?: string | null
          goal_weight_kg?: number | null
          height_cm?: number | null
          id: string
          last_activity_date?: string | null
          starting_weight_kg?: number | null
          streak_count?: number | null
          updated_at?: string
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          avatar_url?: string | null
          bio?: string | null
          coach_questions_date?: string | null
          coach_questions_today?: number | null
          created_at?: string
          current_weight_kg?: number | null
          daily_calorie_goal?: number | null
          daily_water_goal_l?: number | null
          daily_workout_goal?: number | null
          full_name?: string | null
          goal_weight_kg?: number | null
          height_cm?: number | null
          id?: string
          last_activity_date?: string | null
          starting_weight_kg?: number | null
          streak_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      recipe_favorites: {
        Row: {
          created_at: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_favorites_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories_per_serving: number | null
          carbs_g: number | null
          cook_minutes: number | null
          created_at: string
          description: string | null
          dietary_tags: string[] | null
          fat_g: number | null
          fiber_g: number | null
          id: string
          image_url: string | null
          ingredients: Json | null
          instructions: Json | null
          is_premium: boolean | null
          prep_minutes: number | null
          protein_g: number | null
          servings: number | null
          title: string
        }
        Insert: {
          calories_per_serving?: number | null
          carbs_g?: number | null
          cook_minutes?: number | null
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          instructions?: Json | null
          is_premium?: boolean | null
          prep_minutes?: number | null
          protein_g?: number | null
          servings?: number | null
          title: string
        }
        Update: {
          calories_per_serving?: number | null
          carbs_g?: number | null
          cook_minutes?: number | null
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          instructions?: Json | null
          is_premium?: boolean | null
          prep_minutes?: number | null
          protein_g?: number | null
          servings?: number | null
          title?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          category: string | null
          id: string
          text: string
        }
        Insert: {
          category?: string | null
          id?: string
          text: string
        }
        Update: {
          category?: string | null
          id?: string
          text?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          amount_ml: number
          id: string
          log_date: string
          logged_at: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          id?: string
          log_date?: string
          logged_at?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          id?: string
          log_date?: string
          logged_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workout_favorites: {
        Row: {
          created_at: string
          user_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          workout_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_favorites_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          calories_burned: number | null
          completed_at: string | null
          id: string
          notes: string | null
          started_at: string
          user_id: string
          workout_id: string
        }
        Insert: {
          calories_burned?: number | null
          completed_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          user_id: string
          workout_id: string
        }
        Update: {
          calories_burned?: number | null
          completed_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          category: Database["public"]["Enums"]["workout_category"]
          cover_image_url: string | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes: number
          equipment: Database["public"]["Enums"]["equipment_type"]
          estimated_calories: number | null
          id: string
          is_premium: boolean | null
          muscle_groups: string[] | null
          title: string
          video_url: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["workout_category"]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes?: number
          equipment?: Database["public"]["Enums"]["equipment_type"]
          estimated_calories?: number | null
          id?: string
          is_premium?: boolean | null
          muscle_groups?: string[] | null
          title: string
          video_url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["workout_category"]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          duration_minutes?: number
          equipment?: Database["public"]["Enums"]["equipment_type"]
          estimated_calories?: number | null
          id?: string
          is_premium?: boolean | null
          muscle_groups?: string[] | null
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      activity_level:
        | "sedentary"
        | "light"
        | "moderate"
        | "active"
        | "very_active"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      equipment_type: "none" | "home" | "gym"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack"
      workout_category:
        | "strength"
        | "cardio"
        | "hiit"
        | "yoga"
        | "mobility"
        | "full_body"
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
    Enums: {
      activity_level: [
        "sedentary",
        "light",
        "moderate",
        "active",
        "very_active",
      ],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      equipment_type: ["none", "home", "gym"],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      workout_category: [
        "strength",
        "cardio",
        "hiit",
        "yoga",
        "mobility",
        "full_body",
      ],
    },
  },
} as const
