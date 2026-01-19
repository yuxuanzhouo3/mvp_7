'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
    const router = useRouter()

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                console.log('🔍 [Callback] Starting auth callback processing...')

                const { data, error } = await supabase.auth.getSession()

                if (error) {
                    console.error('❌ [Callback] Auth callback error:', error)
                    router.push('/?error=auth_failed')
                    return
                }

                console.log('✅ [Callback] Session retrieved:', {
                    hasSession: !!data.session,
                    userId: data.session?.user?.id,
                    email: data.session?.user?.email
                })

                if (data.session) {
                    // Successful authentication
                    console.log('✅ [Callback] Authentication successful, redirecting to home...')
                    // 使用 replace 而不是 push，避免返回按钮回到 callback 页面
                    router.replace('/')
                } else {
                    // No session found
                    console.log('⚠️ [Callback] No session found')
                    router.push('/?error=no_session')
                }
            } catch (error) {
                console.error('❌ [Callback] Auth callback error:', error)
                router.push('/?error=auth_failed')
            }
        }

        handleAuthCallback()
    }, [router])

    return (
        <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Completing authentication...</p>
    </div>
    </div>
)
}
