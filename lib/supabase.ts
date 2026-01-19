import { createClient, SupabaseClient } from '@supabase/supabase-js'

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

// 懒加载 Supabase 客户端，避免在构建时初始化
let supabaseInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase 配置缺失: NEXT_PUBLIC_SUPABASE_URL 和/或 NEXT_PUBLIC_SUPABASE_ANON_KEY 未设置')
        }
        
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
    }
    
    return supabaseInstance
}

// 为了向后兼容，仍然导出一个方法获取默认实例
export const supabase = getSupabaseClient
