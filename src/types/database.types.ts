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
      ai_chat_history: {
        Row: {
          created_at: string
          id: string
          message: string
          profile_id: string
          role: "user" | "oracle" | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          profile_id: string
          role?: "user" | "oracle" | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          profile_id?: string
          role?: "user" | "oracle" | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_history_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      archived_items: {
       Row: {
         id: string
         user_id: string
         item_type: string
         item_data: Json
         archived_at: string
         expires_at: string
       }
       Insert: {
         id?: string
         user_id: string
         item_type: string
         item_data: Json
         archived_at?: string
         expires_at: string
       }
       Update: {
         id?: string
         user_id?: string
         item_type?: string
         item_data?: Json
         archived_at?: string
         expires_at?: string
       }
       Relationships: [
         {
           foreignKeyName: "archived_items_user_id_fkey"
           columns: ["user_id"]
           referencedRelation: "profiles"
           referencedColumns: ["id"]
         }
       ]
     }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          date: string
          id: string
          is_encrypted: boolean | null
          mood_score: number | null
          mood_tags: string[] | null
          energy_level: number | null
          category_tags: string[] | null
          profile_id: string
        }
        Insert: {
          content: string
          created_at?: string
          date?: string
          id?: string
          is_encrypted?: boolean | null
          mood_score?: number | null
          mood_tags?: string[] | null
          energy_level?: number | null
          category_tags?: string[] | null
          profile_id: string
        }
        Update: {
          content?: string
          created_at?: string
          date?: string
          id?: string
          is_encrypted?: boolean | null
          mood_score?: number | null
          mood_tags?: string[] | null
          energy_level?: number | null
          category_tags?: string[] | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      level_logs: {
        Row: {
          created_at: string
          id: string
          level_reached: number
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level_reached: number
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level_reached?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_logs_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          ai_custom_instructions: string | null
          deep_mode_active: boolean | null
          id: string
          level: number | null
          total_xp: number
          username: string | null
          avatar_url: string | null
          full_name: string | null
          email: string | null
          daily_streak: number | null
          last_login: string | null
          updated_at: string | null
          created_at: string | null
          about_me: string | null
        }
        Insert: {
          ai_custom_instructions?: string | null
          deep_mode_active?: boolean | null
          id: string
          level?: number | null
          total_xp?: number
          username?: string | null
          avatar_url?: string | null
          full_name?: string | null
          email?: string | null
          daily_streak?: number | null
          last_login?: string | null
          updated_at?: string | null
          created_at?: string | null
          about_me?: string | null
        }
        Update: {
          ai_custom_instructions?: string | null
          deep_mode_active?: boolean | null
          id?: string
          level?: number | null
          total_xp?: number
          username?: string | null
          avatar_url?: string | null
          full_name?: string | null
          email?: string | null
          daily_streak?: number | null
          last_login?: string | null
          updated_at?: string | null
          created_at?: string | null
          about_me?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      habits: {
        Row: {
          id: string
          profile_id: string
          name: string
          xp_value: number
          enabled: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          name: string
          xp_value?: number
          enabled?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          name?: string
          xp_value?: number
          enabled?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habits_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      habit_instances: {
        Row: {
          id: string
          habit_id: string
          profile_id: string
          date: string
          completed: boolean
          notes: string | null
          completed_at: string | null
          xp_earned: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          habit_id: string
          profile_id: string
          date: string
          completed?: boolean
          notes?: string | null
          completed_at?: string | null
          xp_earned?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          habit_id?: string
          profile_id?: string
          date?: string
          completed?: boolean
          notes?: string | null
          completed_at?: string | null
          xp_earned?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_instances_habit_id_fkey"
            columns: ["habit_id"]
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_instances_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      assessment_daily_overrides: {
        Row: {
          id: string
          profile_id: string
          assessment_id: string
          date: string
          created_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          assessment_id: string
          date: string
          created_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          assessment_id?: string
          date?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_daily_overrides_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_daily_overrides_assessment_id_fkey"
            columns: ["assessment_id"]
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          }
        ]
      }
      quests: {
        Row: {
          id: string
          created_at: string | null
          profile_id: string
          name: string
          description: string | null
          xp_reward: number
          frequency: string
          is_private: boolean | null
          is_active: boolean | null
          last_completed_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          profile_id: string
          name: string
          description?: string | null
          xp_reward?: number
          frequency: string
          is_private?: boolean | null
          is_active?: boolean | null
          last_completed_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          profile_id?: string
          name?: string
          description?: string | null
          xp_reward?: number
          frequency?: string
          is_private?: boolean | null
          is_active?: boolean | null
          last_completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quests_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      xp_transactions: {
        Row: {
          id: string
          created_at: string | null
          profile_id: string
          amount: number
          reason: string
          category: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          profile_id: string
          amount: number
          reason: string
          category?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          profile_id?: string
          amount?: number
          reason?: string
          category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      daily_tasks: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          xp_reward: number | null
          task_date: string | null
          is_completed: boolean | null
          is_assigned_by_ai: boolean | null
          created_at: string | null
          urgency: "high" | "medium" | "low" | null
          deadline: string | null
          notes: string | null
          recurring: "none" | "daily" | "weekly" | null
          series_id: string | null
          xp_earned: number | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          xp_reward?: number | null
          task_date?: string | null
          is_completed?: boolean | null
          is_assigned_by_ai?: boolean | null
          created_at?: string | null
          urgency?: "high" | "medium" | "low" | null
          deadline?: string | null
          notes?: string | null
          recurring?: "none" | "daily" | "weekly" | null
          series_id?: string | null
          xp_earned?: number | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          xp_reward?: number | null
          task_date?: string | null
          is_completed?: boolean | null
          is_assigned_by_ai?: boolean | null
          created_at?: string | null
          urgency?: "high" | "medium" | "low" | null
          deadline?: string | null
          notes?: string | null
          recurring?: "none" | "daily" | "weekly" | null
          series_id?: string | null
          xp_earned?: number | null
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      indulgences: {
        Row: {
          id: string
          user_id: string
          name: string
          xp_cost: number
          category: string | null
          duration_label: string | null
          freq_limit_daily: number | null
          freq_limit_weekly: number | null
          enabled: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          xp_cost: number
          category?: string | null
          duration_label?: string | null
          freq_limit_daily?: number | null
          freq_limit_weekly?: number | null
          enabled?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          xp_cost?: number
          category?: string | null
          duration_label?: string | null
          freq_limit_daily?: number | null
          freq_limit_weekly?: number | null
          enabled?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indulgences_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      xp_config: {
        Row: {
          id: string
          profile_id: string
          xp_task_default: number
          xp_habit_streak1: number
          xp_habit_streak7: number
          xp_habit_streak30: number
          xp_journal: number
          xp_food_meal: number
          xp_sleep_log: number
          xp_exercise_min: number
          xp_neg_mild: number
          xp_neg_moderate: number
          xp_neg_severe: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          xp_task_default?: number
          xp_habit_streak1?: number
          xp_habit_streak7?: number
          xp_habit_streak30?: number
          xp_journal?: number
          xp_food_meal?: number
          xp_sleep_log?: number
          xp_exercise_min?: number
          xp_neg_mild?: number
          xp_neg_moderate?: number
          xp_neg_severe?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          xp_task_default?: number
          xp_habit_streak1?: number
          xp_habit_streak7?: number
          xp_habit_streak30?: number
          xp_journal?: number
          xp_food_meal?: number
          xp_sleep_log?: number
          xp_exercise_min?: number
          xp_neg_mild?: number
          xp_neg_moderate?: number
          xp_neg_severe?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_config_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      indulgence_logs: {
        Row: {
          id: string
          profile_id: string
          indulgence_id: string | null
          indulgence_name: string
          xp_spent: number
          redeemed_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          indulgence_id?: string | null
          indulgence_name: string
          xp_spent: number
          redeemed_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          indulgence_id?: string | null
          indulgence_name?: string
          xp_spent?: number
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indulgence_logs_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      xp_events: {
        Row: {
          id: string
          profile_id: string
          delta: number
          reason: string
          source_type: string | null
          source_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          delta: number
          reason: string
          source_type?: string | null
          source_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          delta?: number
          reason?: string
          source_type?: string | null
          source_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          profile_id: string
          title: string
          description: string | null
          deadline: string | null
          priority: "low" | "medium" | "high" | "urgent" | null
          is_completed: boolean | null
          is_assigned_by_ai: boolean | null
          category: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          title: string
          description?: string | null
          deadline?: string | null
          priority?: "low" | "medium" | "high" | "urgent" | null
          is_completed?: boolean | null
          is_assigned_by_ai?: boolean | null
          category?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          description?: string | null
          deadline?: string | null
          priority?: "low" | "medium" | "high" | "urgent" | null
          is_completed?: boolean | null
          is_assigned_by_ai?: boolean | null
          category?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      semesters: {
        Row: {
          id: string
          profile_id: string
          name: string
          start_date: string | null
          end_date: string | null
          status: "active" | "archived"
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          name: string
          start_date?: string | null
          end_date?: string | null
          status?: "active" | "archived"
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          name?: string
          start_date?: string | null
          end_date?: string | null
          status?: "active" | "archived"
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "semesters_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      courses: {
        Row: {
          id: string
          semester_id: string
          profile_id: string
          name: string
          code: string | null
          credits: number | null
          instructor_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          semester_id: string
          profile_id: string
          name: string
          code?: string | null
          credits?: number | null
          instructor_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          semester_id?: string
          profile_id?: string
          name?: string
          code?: string | null
          credits?: number | null
          instructor_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_semester_id_fkey"
            columns: ["semester_id"]
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      class_instances: {
        Row: {
          id: string
          course_id: string
          profile_id: string
          date: string
          status: "attended" | "missed" | "od"
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          course_id: string
          profile_id: string
          date: string
          status?: "attended" | "missed" | "od"
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          course_id?: string
          profile_id?: string
          date?: string
          status?: "attended" | "missed" | "od"
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_instances_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_instances_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      future_goals: {
        Row: {
          id: string
          profile_id: string
          title: string
          description: string | null
          target_date: string | null
          priority: "low" | "medium" | "high" | "urgent" | null
          category: string | null
          is_completed: boolean
          completed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          title: string
          description?: string | null
          target_date?: string | null
          priority?: "low" | "medium" | "high" | "urgent" | null
          category?: string | null
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          description?: string | null
          target_date?: string | null
          priority?: "low" | "medium" | "high" | "urgent" | null
          category?: string | null
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "future_goals_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      negative_habits: {
        Row: {
          id: string
          profile_id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negative_habits_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      negative_habit_logs: {
        Row: {
          id: string
          habit_id: string
          profile_id: string
          date: string
          intensity: "mild" | "moderate" | "severe"
          notes: string | null
          logged_at: string | null
        }
        Insert: {
          id?: string
          habit_id: string
          profile_id: string
          date: string
          intensity?: "mild" | "moderate" | "severe"
          notes?: string | null
          logged_at?: string | null
        }
        Update: {
          id?: string
          habit_id?: string
          profile_id?: string
          date?: string
          intensity?: "mild" | "moderate" | "severe"
          notes?: string | null
          logged_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negative_habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            referencedRelation: "negative_habits"
            referencedColumns: ["id"]
          }
        ]
      }
      exercise_logs: {
        Row: {
          id: string
          profile_id: string
          date: string
          exercise_type: "gym" | "cardio"
          activity_type: string
          duration_minutes: number | null
          intensity: "light" | "moderate" | "intense" | null
          notes: string | null
          xp_earned: number | null
          sets: number | null
          reps: number | null
          weight_kg: number | null
          is_pr: boolean | null
          distance_km: number | null
          logged_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          date: string
          exercise_type?: "gym" | "cardio"
          activity_type: string
          duration_minutes?: number | null
          intensity?: "light" | "moderate" | "intense" | null
          notes?: string | null
          xp_earned?: number | null
          sets?: number | null
          reps?: number | null
          weight_kg?: number | null
          is_pr?: boolean | null
          distance_km?: number | null
          logged_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          date?: string
          exercise_type?: "gym" | "cardio"
          activity_type?: string
          duration_minutes?: number | null
          intensity?: "light" | "moderate" | "intense" | null
          notes?: string | null
          xp_earned?: number | null
          sets?: number | null
          reps?: number | null
          weight_kg?: number | null
          is_pr?: boolean | null
          distance_km?: number | null
          logged_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      food_logs: {
        Row: {
          id: string
          profile_id: string
          date: string
          meal_type: "breakfast" | "lunch" | "dinner" | "snack" | null
          description: string
          calories: number | null
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          is_junk: boolean
          notes: string | null
          logged_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          date: string
          meal_type?: "breakfast" | "lunch" | "dinner" | "snack" | null
          description: string
          calories?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          is_junk?: boolean
          notes?: string | null
          logged_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          date?: string
          meal_type?: "breakfast" | "lunch" | "dinner" | "snack" | null
          description?: string
          calories?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          is_junk?: boolean
          notes?: string | null
          logged_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      sleep_logs: {
        Row: {
          id: string
          profile_id: string
          date: string
          bedtime: string | null
          wake_time: string | null
          duration_hours: number | null
          quality: number | null
          notes: string | null
          logged_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          date: string
          bedtime?: string | null
          wake_time?: string | null
          duration_hours?: number | null
          quality?: number | null
          notes?: string | null
          logged_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          date?: string
          bedtime?: string | null
          wake_time?: string | null
          duration_hours?: number | null
          quality?: number | null
          notes?: string | null
          logged_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sleep_logs_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      assessments: {
        Row: {
          id: string
          course_id: string
          profile_id: string
          name: string
          type: "assignment" | "exam" | "quiz" | "project" | "presentation" | "participation" | "other"
          due_date: string
          status: "pending" | "submitted" | "completed"
          completed_date: string | null
          tags: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          course_id: string
          profile_id: string
          name: string
          type?: "assignment" | "exam" | "quiz" | "project" | "presentation" | "participation" | "other"
          due_date: string
          status?: "pending" | "submitted" | "completed"
          completed_date?: string | null
          tags?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          course_id?: string
          profile_id?: string
          name?: string
          type?: "assignment" | "exam" | "quiz" | "project" | "presentation" | "participation" | "other"
          due_date?: string
          status?: "pending" | "submitted" | "completed"
          completed_date?: string | null
          tags?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      oracle_config: {
        Row: {
          id: string
          profile_id: string
          oracle_name: string
          personality_text: string | null
          strictness: "gentle" | "balanced" | "brutal"
          style: "coach" | "friend" | "mentor" | "therapist" | "drill_sergeant"
          length_pref: "brief" | "medium" | "detailed"
          language_tone: "formal" | "casual" | "motivational" | "analytical"
          comfort_mode_enabled: boolean
          setup_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          oracle_name?: string
          personality_text?: string | null
          strictness?: "gentle" | "balanced" | "brutal"
          style?: "coach" | "friend" | "mentor" | "therapist" | "drill_sergeant"
          length_pref?: "brief" | "medium" | "detailed"
          language_tone?: "formal" | "casual" | "motivational" | "analytical"
          comfort_mode_enabled?: boolean
          setup_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          oracle_name?: string
          personality_text?: string | null
          strictness?: "gentle" | "balanced" | "brutal"
          style?: "coach" | "friend" | "mentor" | "therapist" | "drill_sergeant"
          length_pref?: "brief" | "medium" | "detailed"
          language_tone?: "formal" | "casual" | "motivational" | "analytical"
          comfort_mode_enabled?: boolean
          setup_completed?: boolean
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: "oracle_config_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      oracle_chat_sessions: {
        Row: {
          id: string
          profile_id: string
          session_date: string
          summary: string | null
          topics: string[] | null
          primary_mood: number | null
          started_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          session_date?: string
          summary?: string | null
          topics?: string[] | null
          primary_mood?: number | null
          started_at?: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          session_date?: string
          summary?: string | null
          topics?: string[] | null
          primary_mood?: number | null
          ended_at?: string | null
        }
        Relationships: [{ foreignKeyName: "oracle_chat_sessions_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      oracle_chat_messages: {
        Row: {
          id: string
          session_id: string
          profile_id: string
          role: "user" | "oracle"
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          profile_id: string
          role: "user" | "oracle"
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          profile_id?: string
          role?: "user" | "oracle"
          content?: string
          created_at?: string
        }
        Relationships: [{ foreignKeyName: "oracle_chat_messages_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      day_diagnoses: {
        Row: {
          id: string
          profile_id: string
          diagnosis_date: string
          full_text: string
          comfort_mode_on: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          diagnosis_date: string
          full_text: string
          comfort_mode_on?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          diagnosis_date?: string
          full_text?: string
          comfort_mode_on?: boolean
          created_at?: string
        }
        Relationships: [{ foreignKeyName: "day_diagnoses_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      weekly_reviews: {
        Row: {
          id: string
          profile_id: string
          week_start_date: string
          week_end_date: string
          full_text: string
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          week_start_date: string
          week_end_date: string
          full_text: string
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          week_start_date?: string
          week_end_date?: string
          full_text?: string
          created_at?: string
        }
        Relationships: [{ foreignKeyName: "weekly_reviews_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      work_roles: {
        Row: {
          id: string
          profile_id: string
          title: string
          company: string | null
          type: "internship" | "full-time" | "freelance" | "side-project"
          color: string
          start_date: string | null
          end_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          title: string
          company?: string | null
          type?: "internship" | "full-time" | "freelance" | "side-project"
          color?: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          company?: string | null
          type?: "internship" | "full-time" | "freelance" | "side-project"
          color?: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [{ foreignKeyName: "work_roles_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      work_sessions: {
        Row: {
          id: string
          profile_id: string
          role_id: string
          date: string
          clocked_in: boolean
          duration_minutes: number | null
          xp_granted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          role_id: string
          date?: string
          clocked_in?: boolean
          duration_minutes?: number | null
          xp_granted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          role_id?: string
          date?: string
          clocked_in?: boolean
          duration_minutes?: number | null
          xp_granted?: boolean
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "work_sessions_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "work_sessions_role_id_fkey"; columns: ["role_id"]; referencedRelation: "work_roles"; referencedColumns: ["id"] }
        ]
      }
      work_logs: {
        Row: {
          id: string
          profile_id: string
          role_id: string
          date: string
          content: string
          is_private: boolean
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          role_id: string
          date?: string
          content?: string
          is_private?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          role_id?: string
          date?: string
          content?: string
          is_private?: boolean
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "work_logs_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "work_logs_role_id_fkey"; columns: ["role_id"]; referencedRelation: "work_roles"; referencedColumns: ["id"] }
        ]
      }
      growth_side_quests: {
        Row: {
          id: string
          profile_id: string
          title: string
          description: string | null
          estimated_time: string | null
          origin: "manual" | "ai"
          status: "active" | "completed" | "skipped"
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          title: string
          description?: string | null
          estimated_time?: string | null
          origin?: "manual" | "ai"
          status?: "active" | "completed" | "skipped"
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          description?: string | null
          estimated_time?: string | null
          origin?: "manual" | "ai"
          status?: "active" | "completed" | "skipped"
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "growth_side_quests_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      notes: {
        Row: {
          id: string
          profile_id: string
          title: string | null
          content: Json
          color: string
          is_pinned: boolean
          is_archived: boolean
          labels: string[]
          type: "text" | "checklist"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          title?: string | null
          content?: Json
          color?: string
          is_pinned?: boolean
          is_archived?: boolean
          labels?: string[]
          type?: "text" | "checklist"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string | null
          content?: Json
          color?: string
          is_pinned?: boolean
          is_archived?: boolean
          labels?: string[]
          type?: "text" | "checklist"
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "notes_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      user_preferences: {
        Row: {
          id: string
          profile_id: string
          categories: string[]
          content_sources: Json
          setup_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          categories?: string[]
          content_sources?: Json
          setup_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          categories?: string[]
          content_sources?: Json
          setup_completed?: boolean
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "user_preferences_profile_id_fkey"; columns: ["profile_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reset_user_data: {
        Args: { p_uid: string }
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