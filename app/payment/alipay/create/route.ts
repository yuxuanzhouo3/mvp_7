import { NextRequest, NextResponse } from 'next/server'
import * as AlipaySdk from 'alipay-sdk'
import { createClient } from '@supabase/supabase-js'

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

// 支付宝支付配置
const alipayConfig = {
    appId: process.env.ALIPAY_APP_ID || '2021005199628151',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
    signType: 'RSA2',
    charset: 'utf-8',
    version: '1.0',
}

// 定价配置（与 Stripe/PayPal 保持一致）
const pricingConfig = {
    pro: {
        monthly: 19.99, // 正式价格 $19.99/月
        yearly: 168,   // 正式价格 $168/年
    },
    team: {
        monthly: 299.99, // 正式价格 $299.99/月
        yearly: 2520,  // 正式价格 $2520/年
    },
}

// 汇率配置（美元转人民币，假设汇率 1 USD = 7.2 CNY）
const USD_TO_CNY_RATE = 7.2

export async function POST(req: NextRequest) {
    try {
        console.log('🔵 [Alipay] 开始创建支付订单...')

        // 检查支付宝配置
        if (!alipayConfig.appId || !alipayConfig.privateKey || !alipayConfig.alipayPublicKey) {
            console.error('❌ [Alipay] 配置缺失:', {
                hasAppId: !!alipayConfig.appId,
                hasPrivateKey: !!alipayConfig.privateKey,
                hasPublicKey: !!alipayConfig.alipayPublicKey,
            })
            return NextResponse.json(
                {
                    error: 'Alipay payment is currently unavailable. Please use Stripe or PayPal.',
                    errorCode: 'ALIPAY_NOT_CONFIGURED',
                    details: 'Alipay credentials are not configured. Contact support.',
                },
                { status: 503 }
            )
        }

        const body = await req.json()
        const { planType, billingCycle, userEmail } = body

        console.log('📝 [Alipay] 订单信息:', { planType, billingCycle, userEmail })

        // 验证输入
        if (!planType || !billingCycle || !userEmail) {
            return NextResponse.json(
                { error: 'Missing required fields: planType, billingCycle, userEmail' },
                { status: 400 }
            )
        }

        if (!['pro', 'team'].includes(planType)) {
            return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
        }

        if (!['monthly', 'yearly'].includes(billingCycle)) {
            return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
        }

        // 计算价格（美元）
        const amountUSD = pricingConfig[planType as 'pro' | 'team'][billingCycle as 'monthly' | 'yearly']

        // 转换为人民币
        const amountCNY = (amountUSD * USD_TO_CNY_RATE).toFixed(2)

        console.log('💰 [Alipay] 价格计算:', {
            amountUSD: `$${amountUSD}`,
            amountCNY: `¥${amountCNY}`,
            rate: USD_TO_CNY_RATE,
        })

        // 生成订单号
        const outTradeNo = `ALIPAY_${planType.toUpperCase()}_${billingCycle.toUpperCase()}_${Date.now()}`

        // 订单描述
        const subject = `SiteHub ${planType.charAt(0).toUpperCase() + planType.slice(1)} - ${
            billingCycle === 'monthly' ? 'Monthly' : 'Yearly'
        }`
        const body_text = `SiteHub ${planType} subscription - ${billingCycle} billing`

        // 初始化支付宝 SDK
        const alipaySdk = new AlipaySdk(alipayConfig)

        // 创建支付宝订单参数
        const formData = {
            method: 'alipay.trade.page.pay', // PC网站支付
            bizContent: {
                out_trade_no: outTradeNo,
                product_code: 'FAST_INSTANT_TRADE_PAY',
                total_amount: amountCNY,
                subject: subject,
                body: body_text,
            },
            returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?session_id=${outTradeNo}`,
            notifyUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/alipay/notify`,
        }

        console.log('📤 [Alipay] 支付宝请求参数:', formData)

        // 生成支付链接
        const paymentUrl = await alipaySdk.pageExec(formData.method, 'GET', formData.bizContent, {
            returnUrl: formData.returnUrl,
            notifyUrl: formData.notifyUrl,
        })

        console.log('✅ [Alipay] 支付链接生成成功')

        // 保存订单到数据库
        const { error: dbError } = await getSupabase().from('payment_transactions').insert({
            user_email: userEmail,
            plan_type: planType,
            billing_cycle: billingCycle,
            amount_usd: amountUSD,
            amount_cny: parseFloat(amountCNY),
            payment_method: 'alipay',
            transaction_id: outTradeNo,
            status: 'pending',
            created_at: new Date().toISOString(),
        })

        if (dbError) {
            console.error('⚠️ [Alipay] 数据库保存失败 (不影响支付):', dbError)
        } else {
            console.log('✅ [Alipay] 订单已保存到数据库')
        }

        // 返回支付链接
        return NextResponse.json({
            paymentUrl,
            orderId: outTradeNo,
            amount: amountCNY,
            currency: 'CNY',
        })
    } catch (error) {
        console.error('❌ [Alipay] 订单创建失败:', error)
        return NextResponse.json(
            {
                error: 'Failed to create Alipay order',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
