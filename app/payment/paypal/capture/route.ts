import { NextRequest, NextResponse } from 'next/server'
import { Client, Environment, OrdersController } from '@paypal/paypal-server-sdk'
import { createClient } from '@supabase/supabase-js'

// 初始化PayPal客户端
const client = new Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    },
    environment: process.env.PAYPAL_MODE === 'production'
        ? Environment.Production
        : Environment.Sandbox,
})

const ordersController = new OrdersController(client)

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const { orderId, planType, userEmail, billingCycle } = await req.json()

        console.log('🟡 PayPal capture request:', { orderId, planType, userEmail, billingCycle })

        if (!orderId || !planType || !userEmail) {
            return NextResponse.json(
                { error: 'Missing required fields: orderId, planType, userEmail' },
                { status: 400 }
            )
        }

        // 捕获PayPal支付
        const request = {
            id: orderId,
            body: {},
        }

        console.log('📤 Calling PayPal captureOrder API...')
        const { body: order } = await ordersController.captureOrder(request)
        console.log('📥 PayPal capture response:', { id: order.id, status: order.status })

        // 验证支付状态
        if (order.status !== 'COMPLETED') {
            console.error('❌ PayPal order status not COMPLETED:', order.status)
            return NextResponse.json(
                { error: 'Payment not completed', status: order.status },
                { status: 400 }
            )
        }

        // 计算订阅到期时间（优先使用 billingCycle，兼容旧数据）
        const now = new Date()
        const expireTime = new Date(now)
        const cycle = billingCycle || planType // 兼容旧数据

        if (cycle === 'yearly' || planType === 'yearly') {
            expireTime.setFullYear(expireTime.getFullYear() + 1)
        } else {
            expireTime.setMonth(expireTime.getMonth() + 1)
        }

        console.log('📅 Subscription period:', {
            startTime: now.toISOString(),
            expireTime: expireTime.toISOString(),
            billingCycle: cycle
        })

        // 获取支付金额
        const paymentAmount = order.purchaseUnits?.[0]?.payments?.captures?.[0]?.amount?.value || '0'
        const amountInCents = Math.round(parseFloat(paymentAmount) * 100)

        // 更新Supabase订阅状态（使用 web_subscriptions）
        const { data: subscriptionRows, error: subError } = await supabase.from('web_subscriptions').upsert({
            user_email: userEmail,
            platform: 'web',
            payment_method: 'paypal',
            plan_type: planType,
            billing_cycle: billingCycle || 'monthly', // 保存计费周期
            status: 'active',
            start_time: now.toISOString(),
            expire_time: expireTime.toISOString(),
            auto_renew: false,
            next_billing_date: expireTime.toISOString(),
            paypal_order_id: orderId,
            updated_at: now.toISOString(),
        }, {
            onConflict: 'user_email'
        }).select().maybeSingle()

        if (subError) {
            console.error('Failed to update subscription:', subError)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // 记录支付交易（用于利润统计）
        const paymentFee = Math.round(amountInCents * 0.045) // PayPal 4.5% 手续费
        const netAmount = amountInCents - paymentFee
        const captureId = order.purchaseUnits?.[0]?.payments?.captures?.[0]?.id

        const { error: txError } = await supabase.from('web_payment_transactions').insert({
            subscription_id: subscriptionRows?.id ?? null,
            user_email: userEmail,
            product_name: 'sitehub',
            plan_type: planType,
            billing_cycle: billingCycle || 'monthly',
            payment_method: 'paypal',
            payment_status: 'completed',
            transaction_type: 'purchase',
            currency: 'USD',
            gross_amount: amountInCents,
            payment_fee: paymentFee,
            net_amount: netAmount,
            service_cost: 0,
            profit: netAmount,
            paypal_order_id: orderId,
            paypal_capture_id: captureId,
            payment_time: now.toISOString(),
            metadata: {
                planType,
                billingCycle,
                captureId
            }
        })

        if (txError) {
            console.error('Failed to record payment transaction:', txError)
            // 不返回错误，因为订阅已经创建成功
        }

        console.log('✅ PayPal subscription activated:', userEmail, planType)

        return NextResponse.json({
            success: true,
            orderId: order.id,
            status: order.status,
        })
    } catch (error) {
        console.error('PayPal capture error:', error)
        return NextResponse.json(
            { error: 'Failed to capture payment' },
            { status: 500 }
        )
    }
}
