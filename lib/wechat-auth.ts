
import OAuth from 'wechat-oauth'
import { getSupabaseClient } from './supabase'

interface WeChatTokenResult {
    data: {
        access_token: string
        openid: string
        refresh_token: string
        scope: string
        unionid?: string
    }
}

interface WeChatUserInfo {
    openid: string
    nickname: string
    sex: number
    province: string
    city: string
    country: string
    headimgurl: string
    privilege: string[]
    unionid?: string
}

// Initialize WeChat OAuth client
const client = new OAuth(
    process.env.NEXT_PUBLIC_WECHAT_APP_ID!,
    process.env.NEXT_PUBLIC_WECHAT_APP_SECRET!
)

export const wechatAuth = {
    getAuthUrl: () => {
        const state = Math.random().toString(36).substring(7)
        return client.getAuthorizeURL(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/wechat/callback`,
            state,
            'snsapi_userinfo'
        )
    },

    getAccessToken: (code: string): Promise<WeChatTokenResult> => {
        return new Promise((resolve, reject) => {
            client.getAccessToken(code, (err: any, result: WeChatTokenResult) => {
                if (err) reject(err)
                else resolve(result)
            })
        })
    },

    getUserInfo: (openid: string, accessToken: string): Promise<WeChatUserInfo> => {
        return new Promise((resolve, reject) => {
            client.getUser(openid, accessToken, (err: any, result: WeChatUserInfo) => {
                if (err) reject(err)
                else resolve(result)
            })
        })
    },

    // New method to handle WeChat user authentication with Supabase
    authenticateUser: async (userInfo: WeChatUserInfo) => {
        try {
            // First, try to find existing user by WeChat openid
            const { data: existingUser, error: fetchError } = await getSupabaseClient()
                .from('profiles')
                .select('*')
                .eq('wechat_openid', userInfo.openid)
                .single()

            if (existingUser) {
                // User exists, create a session
                const { data: sessionData, error: sessionError } = await getSupabaseClient().auth.signInWithPassword({
                    email: existingUser.email,
                    password: 'wechat_user_' + userInfo.openid // This should be handled differently in production
                })

                if (sessionError) {
                    throw sessionError
                }

                return { user: existingUser, isNew: false }
            } else {
                // Create new user
                const email = `${userInfo.openid}@wechat.local`
                const password = 'wechat_user_' + userInfo.openid + '_' + Math.random().toString(36).substring(7)

                const { data: authData, error: authError } = await getSupabaseClient().auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            provider: 'wechat',
                            wechat_openid: userInfo.openid,
                            wechat_unionid: userInfo.unionid,
                            nickname: userInfo.nickname,
                            avatar_url: userInfo.headimgurl,
                            full_name: userInfo.nickname,
                            city: userInfo.city,
                            province: userInfo.province,
                            country: userInfo.country
                        }
                    }
                })

                if (authError) {
                    throw authError
                }

                return { user: authData.user, isNew: true }
            }
        } catch (error) {
            console.error('WeChat authentication error:', error)
            throw error
        }
    }
}
