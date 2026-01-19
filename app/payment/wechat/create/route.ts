import { NextRequest, NextResponse } from 'next/server'
import { Wechatpay } from 'wechatpay-axios-plugin'
import { createClient } from '@supabase/supabase-js'
import { db as cloudbaseDB } from '@/lib/database/cloudbase-client'

// 延迟初始化 Supabase 客户端，避免在构建时初始化
let supabaseInstance: any = null;

function getSupabase() {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase 配置缺失: NEXT_PUBLIC_SUPABASE_URL 和/或 SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY 未设置');
        }
        
        supabaseInstance = createClient(supabaseUrl, supabaseKey);
    }
    
    return supabaseInstance;
}

// 微信支付配置
const wechatpayConfig = {
    mchid: process.env.WECHAT_PAY_MCH_ID!, // 商户号
    serial: process.env.WECHAT_PAY_SERIAL_NO!, // 证书序列号
    privateKey: process.env.WECHAT_PAY_PRIVATE_KEY!, // 私钥
    publicKey: process.env.WECHAT_PAY_PUBLIC_KEY!, // 公钥（可选）
    // APIv3密钥
    secret: process.env.WECHAT_PAY_API_V3_KEY!,
}

// 初始化微信支付客户端
let wechatpay: any = null
try {
    if (wechatpayConfig.mchid && wechatpayConfig.serial && wechatpayConfig.privateKey) {
        wechatpay = new Wechatpay(wechatpayConfig)
    }
} catch (error) {
    console.error('❌ 微信支付初始化失败:', error)
}

// 价格配置（与支付页面保持一致）
const USD_TO_CNY_RATE = 7.2
const PRICING = {
    pro: {
        monthly: 19.99, // USD
        yearly: 168,
    },
    team: {
        monthly: 299.99,
        yearly: 2520,
    },
}

/**
 * 创建微信支付订单
 */
export async function POST(req: NextRequest) {
    try {
        // 检查微信支付是否已配置
        if (!wechatpay) {
            return NextResponse.json(
                {
                    error: '微信支付未配置',
                    message: '请在环境变量中配置微信支付相关密钥'
                },
                { status: 500 }
            )
        }

        const body = await req.json()
        const { planType, billingCycle, userEmail } = body

        if (!planType || !billingCycle || !userEmail) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // 计算金额（人民币，单位：分）
        const amountUSD = billingCycle === 'monthly'
            ? PRICING[planType as keyof typeof PRICING].monthly
            : PRICING[planType as keyof typeof PRICING].yearly

        const amountCNY = amountUSD * USD_TO_CNY_RATE
        const amountInCents = Math.round(amountCNY * 100) // 转换为分

        // 生成订单号
        const outTradeNo = `WX${Date.now()}${Math.random().toString(36).substr(2, 9)}`

        // 创建支付订单
        const orderData = {
            appid: process.env.WECHAT_PAY_APP_ID!, // 微信公众号/小程序APPID
            mchid: wechatpayConfig.mchid,
            description: `SiteHub ${planType.toUpperCase()} - ${billingCycle}`,
            out_trade_no: outTradeNo,
            notify_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/wechat/notify`,
            amount: {
                total: amountInCents,
                currency: 'CNY',
            },
            payer: {
                openid: 'PLACEHOLDER_OPENID', // 需要用户微信登录后获取
            },
        }

        // 调用微信支付API创建订单
        const response = await wechatpay.v3.pay.transactions.jsapi.post(orderData)

        // 保存交易记录到数据库
        const transactionRecord = {
            user_email: userEmail,
            plan_type: planType,
            billing_cycle: billingCycle,
            amount_cny: amountCNY,
            payment_method: 'wechat',
            transaction_id: outTradeNo,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }

        // 根据用户来源保存到不同数据库
        // 这里简化处理，实际应该根据用户IP判断
        try {
            // 保存到腾讯云（国内用户）
            await cloudbaseDB.collection('web_payment_transactions').add(transactionRecord)
        } catch (error) {
            console.error('❌ 保存交易记录失败（腾讯云）:', error)
            // 如果腾讯云失败，尝试Supabase
            try {
                await getSupabase().from('web_payment_transactions').insert(transactionRecord)
            } catch (supabaseError) {
                console.error('❌ 保存交易记录失败（Supabase）:', supabaseError)
            }
        }

        // 返回支付参数
        return NextResponse.json({
            success: true,
            outTradeNo,
            qrCodeUrl: response.data.code_url, // 扫码支付链接
            prepayId: response.data.prepay_id,
            // 前端需要的支付参数
            paymentParams: {
                appId: process.env.WECHAT_PAY_APP_ID,
                timeStamp: Math.floor(Date.now() / 1000).toString(),
                nonceStr: Math.random().toString(36).substr(2, 15),
                package: `prepay_id=${response.data.prepay_id}`,
                signType: 'RSA',
                // paySign 需要前端根据其他参数计算
            },
        })
    } catch (error: any) {
        console.error('❌ 创建微信支付订单失败:', error)
        return NextResponse.json(
            {
                error: '创建订单失败',
                message: error.message || '未知错误'
            },
            { status: 500 }
        )
    }
}

