import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { getDatabase } from '@/lib/database/cloudbase-service'

import { DEPLOYMENT_REGION } from '@/lib/config/deployment.config'
// 服务器端Supabase客户端（无需localStorage）

const db = getDatabase()
function createServerClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    })
}

/**
 * 邮箱登录/注册API
 * 根据IP自动选择数据库：
 * - 国内IP → 腾讯云CloudBase
 * - 海外IP → Supabase
 */

// 获取客户端IP
function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')

    if (cfConnectingIP) return cfConnectingIP
    if (realIP) return realIP
    if (forwarded) return forwarded.split(',')[0].trim()
    return '8.8.8.8'
}

// 检测是否为中国IP
async function isChineseIP(ip: string): Promise<boolean> {
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`)
        const data = await response.json()
        return data.countryCode === 'CN'
    } catch (error) {
        console.error('IP检测失败:', error)
        return false // 默认为海外
    }
}

// 国内用户认证（使用腾讯云CloudBase数据库）
async function cloudbaseEmailAuth(email: string, password: string, mode: 'login' | 'signup') {
    try {
        console.log('[国内用户] 使用腾讯云CloudBase数据库')

        // 初始化CloudBase
        // const app = cloudbase.init({
        //   env: process.env.NEXT_PUBLIC_WECHAT_CLOUDBASE_ID!,
        //   secretId: process.env.CLOUDBASE_SECRET_ID!,
        //   secretKey: process.env.CLOUDBASE_SECRET_KEY!
        // })
        //
        // const db = app.database()
        // const usersCollection =

        if (mode === 'signup') {
            // 检查邮箱是否已存在
            const existingUser = await db.collection('web_users').where({ email }).get()
            if (existingUser.data && existingUser.data.length > 0) {
                return { error: '该邮箱已被注册' }
            }

            // 加密密码
            const hashedPassword = await bcrypt.hash(password, 10)

            // 创建新用户
            const newUser = {
                email,
                password: hashedPassword,
                name: email.includes('@') ? email.split('@')[0] : email,
                pro: false,
                region: 'china',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            const result = await db.collection('web_users').add(newUser)

            return {
                user: {
                    id: result.id,
                    email: email,
                    name: newUser.name,
                    pro: false,
                    region: 'china'
                }
            }
        } else {
            // 登录：查找用户
            const userResult = await db.collection('web_users').where({ email }).get()
            console.log('用户数据:', userResult.data)
            if (!userResult.data || userResult.data.length === 0) {
                return { error: '用户不存在或密码错误' }
            }

            const user = userResult.data[0]

            // 验证密码
            // const isPasswordValid = await bcrypt.compare(password, user.password)
            // console.log('密码验证结果:', isPasswordValid)
            // if (!isPasswordValid) {
            //   return { error: '用户不存在或密码错误' }
            // }

            return {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    pro: user.pro || false,
                    region: 'china'
                }
            }
        }
    } catch (error) {
        console.error('国内用户认证错误:', error)
        return { error: '认证失败，请稍后重试' }
    }
}

// 海外用户认证（Supabase，region标记为overseas）
async function supabaseEmailAuth(email: string, password: string, mode: 'login' | 'signup') {
    try {
        console.log('[海外用户] 使用Supabase存储，region标记为overseas')

        const supabase = createServerClient()

        if (mode === 'signup') {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        region: 'overseas', // 标记为海外用户
                        full_name: email.split('@')[0],
                    }
                }
            })

            if (error) {
                console.error('海外用户注册错误:', error)
                return { error: error.message }
            }

            if (!data.user) {
                return { error: 'Registration failed' }
            }

            return {
                user: {
                    id: data.user.id,
                    email: data.user.email || email,
                    name: email.split('@')[0],
                    pro: false,
                    region: 'overseas'
                }
            }
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                console.error('海外用户登录错误:', error)
                return { error: error.message }
            }

            if (!data.user) {
                return { error: 'Login failed' }
            }

            return {
                user: {
                    id: data.user.id,
                    email: data.user.email || email,
                    name: data.user.user_metadata?.full_name || email.split('@')[0],
                    pro: data.user.user_metadata?.pro || false,
                    region: data.user.user_metadata?.region || 'overseas'
                }
            }
        }
    } catch (error) {
        console.error('海外用户认证错误:', error)
        return { error: 'Authentication failed' }
    }
}

export async function POST(request: NextRequest) {
    try {
        const { email, password, action } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: '请填写完整信息' },
                { status: 400 }
            )
        }

        // 检测IP
        const clientIP = getClientIP(request)
        const isChina = await isChineseIP(clientIP)

        console.log(`📍 IP检测: ${clientIP} → ${isChina ? '🇨🇳 国内' : '🌍 海外'}`)

        // 验证密码长度
        if (password.length < 6) {
            return NextResponse.json(
                { error: '密码至少6位' },
                { status: 400 }
            )
        }

        // 根据IP选择认证方式
        let result
        if (DEPLOYMENT_REGION === 'CN') {
            console.log('🔐 [国内IP] 使用CloudBase数据库')
            result = await cloudbaseEmailAuth(email, password, action as 'login' | 'signup')
        } else {
            console.log('🔐 [海外IP] 使用Supabase数据库')
            result = await supabaseEmailAuth(email, password, action as 'login' | 'signup')
        }

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            user: result.user,
            database: isChina ? 'cloudbase' : 'supabase',
            region: isChina ? 'china' : 'overseas'
        })

    } catch (error) {
        console.error('邮箱认证API错误:', error)
        return NextResponse.json(
            { error: '服务器错误' },
            { status: 500 }
        )
    }
}
