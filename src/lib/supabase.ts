import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase environment variables not configured. Please check your .env.local file.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder_key'
)

export type Database = {
  public: {
    Tables: {
      houses: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string | null
          rank: number | null
          is_ranked: boolean
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url?: string | null
          rank?: number | null
          is_ranked?: boolean
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          rank?: number | null
          is_ranked?: boolean
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}