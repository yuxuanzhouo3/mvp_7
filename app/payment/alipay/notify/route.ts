import { NextRequest, NextResponse } from 'next/server'
import * as AlipaySdk from 'alipay-sdk'
import { createClient } from '@supabase/supabase-js'

// Supabase 客户端
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 支付宝配置（与 create/route.ts 保持一致）
const alipayConfig = {
    appId: process.env.ALIPAY_APP_ID || '2021005199628151',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
    signType: 'RSA2',
    charset: 'utf-8',
    version: '1.0',
}

/**
 * POST - 支付宝异步通知回调
 * 支付宝会在支付成功后调用此接口
 */
export async function POST(req: NextRequest) {
    try {
        console.log('🔔 [Alipay Notify] 收到支付宝回调通知')

        // 检查配置
        if (!alipayConfig.appId || !alipayConfig.privateKey || !alipayConfig.alipayPublicKey) {
            console.error('❌ [Alipay Notify] 配置缺失')
            return new NextResponse('fail', { status: 503 })
        }

        // 获取POST数据
        const formData = await req.formData()
        const params: Record<string, string> = {}

        formData.forEach((value, key) => {
            params[key] = value.toString()
        })

        console.log('📝 [Alipay Notify] 回调参数:', {
            out_trade_no: params.out_trade_no,
            trade_no: params.trade_no,
            trade_status: params.trade_status,
            total_amount: params.total_amount,
        })

        // 初始化支付宝 SDK
        const alipaySdk = new AlipaySdk(alipayConfig)

        // 验证签名
        const signVerified = alipaySdk.checkNotifySign(params)

        if (!signVerified) {
            console.error('❌ [Alipay Notify] 签名验证失败')
            return new NextResponse('fail', { status: 400 })
        }

        console.log('✅ [Alipay Notify] 签名验证通过')

        // 提取关键信息
        const {
            out_trade_no, // 商户订单号
            trade_no, // 支付宝交易号
            trade_status, // 交易状态
            total_amount, // 订单金额
            buyer_email, // 买家邮箱
        } = params

        // 更新数据库订单状态
        if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
            console.log('💰 [Alipay Notify] 支付成功，更新订单状态')

            // 更新订单状态为已支付
            const { error: updateError } = await supabase
                .from('payment_transactions')
                .update({
                    status: 'completed',
                    transaction_id: trade_no, // 更新为支付宝交易号
                    updated_at: new Date().toISOString(),
                })
                .eq('transaction_id', out_trade_no)

            if (updateError) {
                console.error('❌ [Alipay Notify] 数据库更新失败:', updateError)
                // 即使数据库更新失败，也要返回success给支付宝，避免重复通知
            } else {
                console.log('✅ [Alipay Notify] 订单状态已更新为 completed')
            }

            // 查询订单信息以更新用户订阅状态
            const { data: transaction, error: queryError } = await supabase
                .from('payment_transactions')
                .select('*')
                .eq('transaction_id', trade_no)
                .single()

            if (!queryError && transaction) {
                console.log('📦 [Alipay Notify] 订单信息:', {
                    email: transaction.user_email,
                    plan: transaction.plan_type,
                    cycle: transaction.billing_cycle,
                })

                // 计算订阅到期时间
                const startDate = new Date()
                const endDate = new Date()
                if (transaction.billing_cycle === 'monthly') {
                    endDate.setMonth(endDate.getMonth() + 1)
                } else {
                    endDate.setFullYear(endDate.getFullYear() + 1)
                }

                // 更新或创建用户订阅
                const { error: subscriptionError } = await supabase
                    .from('subscriptions')
                    .upsert(
                        {
                            user_email: transaction.user_email,
                            plan_type: transaction.plan_type,
                            status: 'active',
                            current_period_start: startDate.toISOString(),
                            current_period_end: endDate.toISOString(),
                            cancel_at_period_end: false,
                            payment_method: 'alipay',
                            updated_at: new Date().toISOString(),
                        },
                        {
                            onConflict: 'user_email',
                        }
                    )

                if (subscriptionError) {
                    console.error('❌ [Alipay Notify] 订阅更新失败:', subscriptionError)
                } else {
                    console.log('✅ [Alipay Notify] 用户订阅已激活')
                }
            }
        } else if (trade_status === 'TRADE_CLOSED') {
            console.log('⚠️ [Alipay Notify] 交易已关闭')

            // 更新订单状态为已关闭
            await supabase
                .from('payment_transactions')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString(),
                })
                .eq('transaction_id', out_trade_no)
        }

        // 返回 success 给支付宝（必须返回纯文本 "success"）
        console.log('✅ [Alipay Notify] 回调处理完成，返回 success')
        return new NextResponse('success', {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            },
        })
    } catch (error) {
        console.error('❌ [Alipay Notify] 回调处理异常:', error)
        // 返回 fail 给支付宝，支付宝会重试
        return new NextResponse('fail', {
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
            },
        })
    }
}

/**
 * GET - 支付宝同步返回（用户支付完成后浏览器跳转）
 * 这个接口主要用于页面跳转，不处理业务逻辑（业务逻辑在POST中处理）
 */
export async function GET(req: NextRequest) {
    try {
        console.log('🔄 [Alipay Return] 用户支付完成，同步返回')

        const searchParams = req.nextUrl.searchParams
        const params: Record<string, string> = {}

        searchParams.forEach((value, key) => {
            params[key] = value
        })

        console.log('📝 [Alipay Return] 返回参数:', {
            out_trade_no: params.out_trade_no,
            trade_no: params.trade_no,
            total_amount: params.total_amount,
        })

        // 验证签名
        if (alipayConfig.alipayPublicKey) {
            const alipaySdk = new AlipaySdk(alipayConfig)
            const signVerified = alipaySdk.checkNotifySign(params)

            if (!signVerified) {
                console.error('❌ [Alipay Return] 签名验证失败')
                return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/cancel`)
            }

            console.log('✅ [Alipay Return] 签名验证通过')
        }

        // 跳转到成功页面（带订单号）
        const successUrl = new URL('/payment/success', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
        if (params.out_trade_no) {
            successUrl.searchParams.set('session_id', params.out_trade_no)
        }

        return NextResponse.redirect(successUrl.toString())
    } catch (error) {
        console.error('❌ [Alipay Return] 同步返回处理异常:', error)
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/cancel`)
    }
}
