import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// 将 Stripe 初始化移到函数内部，避免构建时初始化
let stripe: Stripe;

async function getStripe() {
    if (!stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('Missing Stripe secret key');
        }
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2025-09-30.clover',
        })
    }
    return stripe;
}

export async function POST(req: NextRequest) {
    try {
        const { planType, billingCycle, userEmail } = await req.json()

        // 验证输入
        if (!planType || !billingCycle || !userEmail) {
            return NextResponse.json(
                { error: 'Missing required fields: planType, billingCycle, and userEmail' },
                { status: 400 }
            )
        }

        // 定义定价（单位：美分）- 正式价格
        const pricing = {
            pro: {
                monthly: 1999,     // $19.99
                yearly: 16800,     // $168.00 (正式价格)
            },
            team: {
                monthly: 29999,    // $299.99
                yearly: 252000,     // $2520.00 (正式价格)
            },
        }

        const planPricing = pricing[planType as keyof typeof pricing]
        if (!planPricing) {
            return NextResponse.json(
                { error: 'Invalid plan type. Must be "pro" or "team"' },
                { status: 400 }
            )
        }

        const amount = planPricing[billingCycle as keyof typeof planPricing]
        if (!amount) {
            return NextResponse.json(
                { error: 'Invalid billing cycle. Must be "monthly" or "yearly"' },
                { status: 400 }
            )
        }

        // 套餐名称映射
        const planNames = {
            pro: 'Pro',
            team: 'Team',
        }

        // 获取 Stripe 实例并创建Checkout会话
        const stripeInstance = await getStripe();
        const session = await stripeInstance.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `SiteHub ${planNames[planType as keyof typeof planNames]} - ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Plan`,
                            description: planType === 'pro' ? 'Perfect for individuals' : 'For teams and organizations',
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/cancel`,
            customer_email: userEmail,
            metadata: {
                planType,
                billingCycle,
                userEmail,
            },
        })

        return NextResponse.json({
            sessionId: session.id,
            url: session.url,
        })
    } catch (error) {
        console.error('Stripe checkout error:', error)
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        )
    }
}