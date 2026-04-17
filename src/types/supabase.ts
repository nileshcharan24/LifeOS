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
      xp_transactions: {
        Row: {
          id: number
          created_at: string
          user_id: string
          amount: number
          reason: string
        }
        Insert: {
          id?: number
          created_at?: string
          user_id: string
          amount: number
          reason: string
        }
        Update: {
          id?: number
          created_at?: string
          user_id?: string
          amount?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
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