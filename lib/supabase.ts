import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// PostgreSQLpassword: franklin@d123j

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Generation {
    id: number
    user_id?: string
    type: 'text' | 'image' | 'audio' | 'video'
    prompt: string
    content: string
    settings: any
    created_at: string
    updated_at: string
}

export interface User {
    id: string
    email?: string
    credits: number
    created_at: string
    updated_at: string
}
