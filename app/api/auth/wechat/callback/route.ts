import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/cloudbase-service'
import * as jwt from 'jsonwebtoken'

const cloudbaseDB = getDatabase()

/**
 * 微信网页授权回调
 * 文档：https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html
 */
export async function GET(req: NextRequest) {
    try {
        // 检查微信登录是否已配置
        if (!process.env.NEXT_PUBLIC_WECHAT_APP_ID || !process.env.NEXT_PUBLIC_WECHAT_APP_SECRET) {
            console.log('⚠️ [WeChat] 微信登录未配置，重定向到首页')
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL}/?error=wechat_not_configured`
            )
        }
        const searchParams = req.nextUrl.searchParams
        const code = searchParams.get('code')
        const state = searchParams.get('state')

        if (!code) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL}/?error=wechat_auth_failed`
            )
        }

        // 通过code获取access_token
        const tokenResponse = await fetch(
            `https://api.weixin.qq.com/sns/oauth2/access_token?` +
            `appid=${process.env.NEXT_PUBLIC_WECHAT_APP_ID}&` +
            `secret=${process.env.NEXT_PUBLIC_WECHAT_APP_SECRET}&` +
            `code=${code}&` +
            `grant_type=authorization_code`
        )

        const tokenData = await tokenResponse.json()

        if (tokenData.errcode) {
            console.error('❌ 获取微信access_token失败:', tokenData)
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL}/?error=wechat_token_failed`
            )
        }

        const { access_token, openid, refresh_token } = tokenData

        // 获取用户信息
        const userInfoResponse = await fetch(
            `https://api.weixin.qq.com/sns/userinfo?` +
            `access_token=${access_token}&` +
            `openid=${openid}&` +
            `lang=zh_CN`
        )

        const userInfo = await userInfoResponse.json()

        if (userInfo.errcode) {
            console.error('❌ 获取微信用户信息失败:', userInfo)
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL}/?error=wechat_userinfo_failed`
            )
        }

        console.log('✅ 微信用户信息:', userInfo)

        // 保存/更新用户信息到腾讯云数据库
        try {
            // 查询是否已存在
            const existingUser = await cloudbaseDB
                .collection('web_users')
                .where({
                    _openid: openid,
                })
                .get()

            const userData = {
                _openid: openid,
                nickname: userInfo.nickname,
                avatar: userInfo.headimgurl,
                province: userInfo.province,
                city: userInfo.city,
                country: userInfo.country,
                sex: userInfo.sex,
                name: userInfo.nickname, // 显示名称使用微信昵称
                pro: false,
                region: 'china',
                loginType: 'wechat', // 标记为微信登录
                updated_at: new Date(),
            }

            let userId: string
            let isPro = false

            if (existingUser.data && existingUser.data.length > 0) {
                // 更新现有用户
                userId = existingUser.data[0]._id
                isPro = existingUser.data[0].pro || false // 保留原有会员状态
                await cloudbaseDB
                    .collection('web_users')
                    .doc(userId)
                    .update(userData)

                console.log('✅ 更新微信用户成功:', userId, isPro ? '(会员)' : '(普通用户)')
            } else {
                // 创建新用户
                const result = await cloudbaseDB
                    .collection('web_users')
                    .add({
                        ...userData,
                        created_at: new Date(),
                    })

                userId = result.id
                console.log('✅ 创建微信用户成功:', userId)
            }

            // 生成 JWT Token
            const tokenPayload = {
                userId: userId,
                openid: openid,
                nickname: userInfo.nickname,
                region: 'china',
                loginType: 'wechat'
            }

            // ✅ 动态设置 Token 有效期：普通用户 30 天，高级会员 90 天（多端持久化优化）
            const expiresIn = isPro ? '90d' : '30d'

            sessionStorage.setItem('user', JSON.stringify(tokenPayload))

            const token = jwt.sign(
                tokenPayload,
                process.env.JWT_SECRET || 'fallback-secret-key-for-development-only',
                { expiresIn: expiresIn }
            )

            console.log('✅ [JWT Token Generated]: For WeChat user', userInfo.nickname)

            // 重定向回首页，并传递登录信息
            const redirectUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL!)
            redirectUrl.searchParams.set('wechat_login', 'success')
            redirectUrl.searchParams.set('token', token)
            redirectUrl.searchParams.set('user', encodeURIComponent(JSON.stringify({
                id: userId,
                name: userInfo.nickname,
                avatar: userInfo.headimgurl,
                pro: false,
                region: 'china',
                loginType: 'wechat'
            })))

            return NextResponse.redirect(redirectUrl.toString())
        } catch (error) {
            alert("save_user_failed:{}"+ error)
            console.error('❌ 保存微信用户信息失败:', error)
            // return NextResponse.redirect(
            //   `${process.env.NEXT_PUBLIC_SITE_URL}/?error=save_user_failed`
            // )
        }
    } catch (error: any) {
        console.error('❌ 微信登录回调处理失败:', error)
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL}/?error=wechat_callback_failed`
        )
    }
}

/**
 * 发起微信网页授权
 * 前端调用此接口跳转到微信授权页面
 */
export async function POST(req: NextRequest) {
    try {
        const { redirectUrl } = await req.json()

        const appid = process.env.NEXT_PUBLIC_WECHAT_APP_ID
        const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/wechat/callback`
        const state = Math.random().toString(36).substr(2)

        // 构造微信授权URL（网站应用 - 扫码登录）
        const authUrl =
            `https://open.weixin.qq.com/connect/qrconnect?` +
            `appid=${appid}&` +
            `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
            `response_type=code&` +
            `scope=snsapi_login&` +
            `state=${state}#wechat_redirect`

        return NextResponse.json({
            success: true,
            authUrl,
        })
    } catch (error: any) {
        console.error('❌ 构造微信授权URL失败:', error)
        return NextResponse.json(
            { error: '构造授权URL失败' },
            { status: 500 }
        )
    }
}
