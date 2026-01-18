import { NextRequest, NextResponse } from 'next/server'
import { Wechatpay } from 'wechatpay-axios-plugin'
import { createClient } from '@supabase/supabase-js'
import { db as cloudbaseDB } from '@/lib/database/cloudbase-client'

// 初始化Supabase客户端
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 微信支付配置
const wechatpayConfig = {
    mchid: process.env.WECHAT_PAY_MCH_ID!,
    serial: process.env.WECHAT_PAY_SERIAL_NO!,
    privateKey: process.env.WECHAT_PAY_PRIVATE_KEY!,
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

/**
 * 微信支付回调通知
 * 文档：https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_1_5.shtml
 */
export async function POST(req: NextRequest) {
    try {
        if (!wechatpay) {
            console.error('❌ 微信支付未配置')
            return NextResponse.json(
                { code: 'FAIL', message: '微信支付未配置' },
                { status: 500 }
            )
        }

        // 获取请求头
        const signature = req.headers.get('wechatpay-signature')
        const timestamp = req.headers.get('wechatpay-timestamp')
        const nonce = req.headers.get('wechatpay-nonce')
        const serial = req.headers.get('wechatpay-serial')

        // 获取请求体
        const body = await req.text()

        // 验证签名
        const isValid = wechatpay.verifier.verify(
            timestamp,
            nonce,
            body,
            signature
        )

        if (!isValid) {
            console.error('❌ 微信支付回调签名验证失败')
            return NextResponse.json(
                { code: 'FAIL', message: '签名验证失败' },
                { status: 401 }
            )
        }

        // 解析通知数据
        const notification = JSON.parse(body)
        const { resource } = notification

        // 解密数据
        const decrypted = wechatpay.decipher.decrypt(
            resource.ciphertext,
            resource.associated_data,
            resource.nonce
        )

        const paymentData = JSON.parse(decrypted)

        console.log('✅ 微信支付回调数据:', paymentData)

        const {
            out_trade_no,  // 商户订单号
            transaction_id, // 微信支付订单号
            trade_state,    // 交易状态
            payer,          // 付款人信息
            amount,         // 订单金额
        } = paymentData

        // 只处理支付成功的通知
        if (trade_state === 'SUCCESS') {
            // 更新交易状态（先尝试腾讯云，再尝试Supabase）
            let updated = false

            // 尝试更新腾讯云
            try {
                const tcbResult = await cloudbaseDB
                    .collection('web_payment_transactions')
                    .where({
                        transaction_id: out_trade_no,
                    })
                    .update({
                        status: 'completed',
                        wechat_transaction_id: transaction_id,
                        updated_at: new Date(),
                    })

                if (tcbResult.updated > 0) {
                    updated = true
                    console.log('✅ 更新交易状态成功（腾讯云）')
                }
            } catch (error) {
                console.error('❌ 更新交易状态失败（腾讯云）:', error)
            }

            // 如果腾讯云没更新成功，尝试Supabase
            if (!updated) {
                try {
                    const { error } = await supabase
                        .from('web_payment_transactions')
                        .update({
                            status: 'completed',
                            wechat_transaction_id: transaction_id,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('transaction_id', out_trade_no)

                    if (!error) {
                        updated = true
                        console.log('✅ 更新交易状态成功（Supabase）')
                    }
                } catch (error) {
                    console.error('❌ 更新交易状态失败（Supabase）:', error)
                }
            }

            if (!updated) {
                console.error('❌ 未找到对应的交易记录:', out_trade_no)
            }

            // 获取交易记录，激活用户订阅
            let transactionRecord: any = null

            // 先从腾讯云查询
            try {
                const tcbResult = await cloudbaseDB
                    .collection('web_payment_transactions')
                    .where({
                        transaction_id: out_trade_no,
                    })
                    .get()

                if (tcbResult.data && tcbResult.data.length > 0) {
                    transactionRecord = tcbResult.data[0]
                }
            } catch (error) {
                console.error('❌ 查询交易记录失败（腾讯云）:', error)
            }

            // 如果腾讯云没找到，从Supabase查询
            if (!transactionRecord) {
                try {
                    const { data } = await supabase
                        .from('web_payment_transactions')
                        .select('*')
                        .eq('transaction_id', out_trade_no)
                        .single()

                    transactionRecord = data
                } catch (error) {
                    console.error('❌ 查询交易记录失败（Supabase）:', error)
                }
            }

            if (transactionRecord) {
                // 激活用户订阅
                const now = new Date()
                const endDate = new Date(now)

                if (transactionRecord.billing_cycle === 'monthly') {
                    endDate.setMonth(endDate.getMonth() + 1)
                } else {
                    endDate.setFullYear(endDate.getFullYear() + 1)
                }

                const subscriptionData = {
                    user_email: transactionRecord.user_email,
                    plan_type: transactionRecord.plan_type,
                    billing_cycle: transactionRecord.billing_cycle,
                    status: 'active',
                    payment_method: 'wechat',
                    current_period_start: now.toISOString(),
                    current_period_end: endDate.toISOString(),
                    cancel_at_period_end: false,
                    updated_at: now.toISOString(),
                }

                // 先尝试腾讯云
                try {
                    // 查询是否已有订阅
                    const existingSub = await cloudbaseDB
                        .collection('web_subscriptions')
                        .where({
                            user_email: transactionRecord.user_email,
                        })
                        .get()

                    if (existingSub.data && existingSub.data.length > 0) {
                        // 更新现有订阅
                        await cloudbaseDB
                            .collection('web_subscriptions')
                            .doc(existingSub.data[0]._id)
                            .update(subscriptionData)
                    } else {
                        // 创建新订阅
                        await cloudbaseDB
                            .collection('web_subscriptions')
                            .add({
                                ...subscriptionData,
                                created_at: now,
                            })
                    }
                    console.log('✅ 订阅激活成功（腾讯云）')
                } catch (error) {
                    console.error('❌ 订阅激活失败（腾讯云）:', error)

                    // 尝试Supabase
                    try {
                        await supabase
                            .from('web_subscriptions')
                            .upsert({
                                ...subscriptionData,
                                created_at: now.toISOString(),
                            }, {
                                onConflict: 'user_email',
                            })
                        console.log('✅ 订阅激活成功（Supabase）')
                    } catch (supabaseError) {
                        console.error('❌ 订阅激活失败（Supabase）:', supabaseError)
                    }
                }
            }
        }

        // 返回成功响应
        return NextResponse.json({ code: 'SUCCESS', message: '成功' })
    } catch (error: any) {
        console.error('❌ 处理微信支付回调失败:', error)
        return NextResponse.json(
            { code: 'FAIL', message: error.message || '处理失败' },
            { status: 500 }
        )
    }
}

