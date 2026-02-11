import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/cloudbase-service'
import * as jwt from 'jsonwebtoken'

function getWechatLoginConfig() {
    const appId = (process.env.WECHAT_APP_ID_weblogin || '').trim()
    const appSecret = (process.env.WECHAT_APP_SECRET_weblogin || '').trim()
    return { appId, appSecret }
}

/**
 * 微信网页授权回调
 * 文档：https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html
 */
export async function GET(req: NextRequest) {
    try {
        const { appId, appSecret } = getWechatLoginConfig()

        if (!appId || !appSecret) {
            console.log('⚠️ [WeChat] 微信登录未配置，重定向到首页')
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL}/?error=wechat_not_configured`
            )
        }

        const searchParams = req.nextUrl.searchParams
        const code = searchParams.get('code')

        if (!code) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL}/?error=wechat_auth_failed`
            )
        }

        const tokenResponse = await fetch(
            `https://api.weixin.qq.com/sns/oauth2/access_token?` +
            `appid=${appId}&` +
            `secret=${appSecret}&` +
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

        const { access_token, openid } = tokenData

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

        try {
            const cloudbaseDB = await getDatabase()

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
                avatar_url: userInfo.headimgurl,
                province: userInfo.province,
                city: userInfo.city,
                country: userInfo.country,
                sex: userInfo.sex,
                name: userInfo.nickname,
                pro: false,
                region: 'china',
                loginType: 'wechat',
                updated_at: new Date(),
            }

            let userId: string
            let isPro = false

            if (existingUser.data && existingUser.data.length > 0) {
                userId = existingUser.data[0]._id
                isPro = existingUser.data[0].pro || false
                await cloudbaseDB
                    .collection('web_users')
                    .doc(userId)
                    .update(userData)
            } else {
                const result = await cloudbaseDB
                    .collection('web_users')
                    .add({
                        ...userData,
                        created_at: new Date(),
                    })

                userId = result.id
            }

            const tokenPayload = {
                userId,
                openid,
                nickname: userInfo.nickname,
                region: 'china',
                loginType: 'wechat',
            }

            const expiresIn = isPro ? '90d' : '30d'

            const token = jwt.sign(
                tokenPayload,
                process.env.JWT_SECRET || 'fallback-secret-key-for-development-only',
                { expiresIn }
            )

            const redirectUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL!)
            redirectUrl.searchParams.set('wechat_login', 'success')
            redirectUrl.searchParams.set('token', token)
            redirectUrl.searchParams.set('user', encodeURIComponent(JSON.stringify({
                id: userId,
                name: userInfo.nickname,
                avatar: userInfo.headimgurl,
                avatar_url: userInfo.headimgurl,
                pro: false,
                region: 'china',
                loginType: 'wechat',
            })))

            return NextResponse.redirect(redirectUrl.toString())
        } catch (error) {
            console.error('❌ 保存微信用户信息失败:', error)
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL}/?error=save_user_failed`
            )
        }
    } catch (error: any) {
        console.error('❌ 微信登录回调处理失败:', error)
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL}/?error=wechat_callback_failed`
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        const { appId } = getWechatLoginConfig()
        if (!appId) {
            return NextResponse.json(
                { error: '微信登录未配置（缺少 WECHAT_APP_ID_weblogin）' },
                { status: 500 }
            )
        }

        const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/wechat/callback`
        const state = Math.random().toString(36).substr(2)

        const authUrl =
            `https://open.weixin.qq.com/connect/qrconnect?` +
            `appid=${appId}&` +
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
