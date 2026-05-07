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
      journal_entries: {
        Row: {
          content: string
          created_at: string
          date: string
          id: string
          is_encrypted: boolean | null
          mood_score: number | null
          profile_id: string
        }
        Insert: {
          content: string
          created_at?: string
          date?: string
          id?: string
          is_encrypted?: boolean | null
          mood_score?: number | null
          profile_id: string
        }
        Update: {
          content?: string
          created_at?: string
          date?: string
          id?: string
          is_encrypted?: boolean | null
          mood_score?: number | null
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
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          xp_cost: number
          category?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          xp_cost?: number
          category?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
