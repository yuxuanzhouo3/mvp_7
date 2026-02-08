'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

export default function AuthCallback() {
    const router = useRouter()

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                console.log('🔍 [Callback] Starting auth callback processing...')

                const { data, error } = await getSupabaseClient().auth.getSession()

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
                    const sessionUser = data.session.user
                    const userId = sessionUser?.id
                    const email = sessionUser?.email
                    const fullName =
                      (sessionUser as any)?.user_metadata?.full_name ||
                      (sessionUser as any)?.user_metadata?.name ||
                      (email ? email.split('@')[0] : undefined)
                    const avatarUrl =
                      (sessionUser as any)?.user_metadata?.avatar_url ||
                      (sessionUser as any)?.user_metadata?.picture

                    if (userId && email) {
                        try {
                            const resp = await fetch('/api/auth/supabase-profile', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId, email, fullName, avatarUrl })
                            })
                            const result = await resp.json()
                            if (resp.ok && result?.user) {
                                localStorage.setItem('user', JSON.stringify(result.user))
                            }
                        } catch (e) {
                            console.warn('[Callback] Failed to sync profile:', e)
                        }
                    }

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
