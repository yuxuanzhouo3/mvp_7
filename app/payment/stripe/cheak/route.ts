import { NextRequest, NextResponse } from 'next/server'
import { Client, Environment, OrdersController } from '@paypal/paypal-server-sdk'

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

export async function POST(req: NextRequest) {
    try {
        const { planType, billingCycle, userEmail } = await req.json()

        if (!planType || !billingCycle || !userEmail) {
            return NextResponse.json(
                { error: 'Missing required fields: planType, billingCycle, and userEmail' },
                { status: 400 }
            )
        }

        // 定价 - 月付正式价格，年付正式价格
        const pricing = {
            pro: {
                monthly: '19.99',   // $19.99 (正式价格)
                yearly: '168.00',  // $168.00 (正式价格)
            },
            team: {
                monthly: '299.99',   // $299.99 (正式价格)
                yearly: '2520.00', // $2520.00 (正式价格)
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

        // 创建PayPal订单
        const request = {
            body: {
                intent: 'CAPTURE',
                purchaseUnits: [
                    {
                        amount: {
                            currencyCode: 'USD',
                            value: amount,
                        },
                        description: `SiteHub ${planNames[planType as keyof typeof planNames]} - ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Plan`,
                    },
                ],
                applicationContext: {
                    returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success`,
                    cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/cancel`,
                    userAction: 'PAY_NOW',
                },
            },
        }

        const response = await ordersController.createOrder(request)

        // PayPal SDK 把真实数据放在 response.result 里
        const order = (response as any).result

        console.log('=== PayPal Order Created ===')
        console.log('Order ID:', order.id)
        console.log('Order Status:', order.status)

        // 获取approval URL
        const approvalUrl = order.links?.find((link: any) => link.rel === 'approve')?.href

        console.log('Approval URL:', approvalUrl)

        if (!approvalUrl) {
            console.error('❌ No approval URL found in PayPal response!')
            return NextResponse.json(
                { error: 'PayPal did not return an approval URL.' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            orderId: order.id,
            approvalUrl,
        })
    } catch (error) {
        console.error('PayPal order creation error:', error)
        return NextResponse.json(
            { error: 'Failed to create PayPal order' },
            { status: 500 }
        )
    }
}
