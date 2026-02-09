import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { getDatabase } from "@/lib/database/cloudbase-service"
import { updateCloudbaseSubscription } from "@/app/api/payment/lib/update-cloudbase-subscription"
import { getMembershipPlanById, getMembershipCreditsGrant } from "@/lib/credits/pricing"

export const runtime = "nodejs"

function parseWechatWebhookPayload(rawBody: string): any {
  const data = JSON.parse(rawBody)

  if (data?.resource?.ciphertext && data?.resource?.nonce) {
    const apiV3Key = process.env.WECHAT_PAY_API_V3_KEY || ""
    if (!apiV3Key) {
      throw new Error("WECHAT_PAY_API_V3_KEY is missing")
    }

    const nonce = Buffer.from(String(data.resource.nonce), "utf8")
    const associatedData = Buffer.from(String(data.resource.associated_data || ""), "utf8")
    const ciphertext = Buffer.from(String(data.resource.ciphertext), "base64")

    if (ciphertext.length < 17) {
      throw new Error("Invalid WeChat ciphertext")
    }

    const authTag = ciphertext.subarray(ciphertext.length - 16)
    const encrypted = ciphertext.subarray(0, ciphertext.length - 16)

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(apiV3Key, "utf8"),
      nonce
    )
    decipher.setAAD(associatedData)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
    const resourceData = JSON.parse(decrypted)

    return {
      ...data,
      resource: resourceData,
    }
  }

  return data
}

function resolveDaysByBillingCycle(value?: string): number {
  return value === "yearly" ? 365 : 30
}

async function resolvePaymentUserId(db: any, paymentRecord: any): Promise<string | null> {
  const rawUserId = String(paymentRecord?.user_id || "").trim()
  if (rawUserId) {
    const directUser = await db.collection("web_users").where({ _id: rawUserId }).get()
    if ((directUser?.data?.length || 0) > 0) {
      return rawUserId
    }
  }

  const email = String(paymentRecord?.user_email || "").trim()
  if (!email) return null

  const userResult = await db.collection("web_users").where({ email }).get()
  const userId = userResult?.data?.[0]?._id ? String(userResult.data[0]._id) : null

  if (userId && paymentRecord?.out_trade_no) {
    await db.collection("payments").where({ out_trade_no: paymentRecord.out_trade_no }).update({
      user_id: userId,
      updated_at: new Date().toISOString(),
    })
  }

  return userId
}

export async function POST(request: NextRequest) {
  try {
    if (resolveDeploymentRegion() !== "CN") {
      return NextResponse.json(
        { code: "FAIL", message: "WeChat webhook only available in CN" },
        { status: 403 }
      )
    }

    const rawBody = await request.text()
    const payload = parseWechatWebhookPayload(rawBody)

    const eventType = payload?.event_type || payload?.eventType
    if (eventType !== "TRANSACTION.SUCCESS") {
      return NextResponse.json({ code: "SUCCESS", message: "Ok" }, { status: 200 })
    }

    const paymentData = payload?.resource || payload
    const outTradeNo = paymentData?.out_trade_no
    const transactionId = paymentData?.transaction_id
    const tradeState = paymentData?.trade_state || "SUCCESS"

    if (!outTradeNo || !transactionId || tradeState !== "SUCCESS") {
      return NextResponse.json(
        { code: "FAIL", message: "Invalid WeChat payment payload" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const webhookEventId = `wechat_${transactionId}`

    const existingEvent = await db.collection("webhook_events").where({ id: webhookEventId }).get()
    if ((existingEvent?.data?.length || 0) > 0) {
      return NextResponse.json({ code: "SUCCESS", message: "Ok" }, { status: 200 })
    }

    await db.collection("webhook_events").add({
      id: webhookEventId,
      provider: "wechat",
      event_type: "TRANSACTION.SUCCESS",
      event_data: paymentData,
      processed: false,
      created_at: new Date().toISOString(),
    })

    await db.collection("payments").where({ out_trade_no: outTradeNo }).update({
      status: "completed",
      transaction_id: transactionId,
      webhook_confirmed: true,
      updated_at: new Date().toISOString(),
    })

    const paymentResult = await db.collection("payments").where({ out_trade_no: outTradeNo }).get()
    const paymentRecord = paymentResult?.data?.[0]

    const resolvedUserId = await resolvePaymentUserId(db, paymentRecord)

    if (!resolvedUserId) {
      await db.collection("webhook_events").where({ id: webhookEventId }).update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: "payment record missing user_id",
      })

      return NextResponse.json(
        { code: "FAIL", message: "Payment record missing user_id" },
        { status: 400 }
      )
    }

    const billingCycle =
      paymentRecord.billing_cycle || paymentRecord.metadata?.billingCycle || "monthly"
    const planId = String(paymentRecord?.plan_type || paymentRecord?.metadata?.planId || "pro")
    const plan = getMembershipPlanById(planId)
    const creditsToAdd = plan ? getMembershipCreditsGrant(plan, billingCycle) : 0

    const subscriptionResult = await updateCloudbaseSubscription({
      userId: resolvedUserId,
      days: resolveDaysByBillingCycle(billingCycle),
      creditsToAdd,
      transactionId,
      provider: "wechat",
      currentDate: new Date(),
    })

    if (subscriptionResult.success) {
      await db.collection("payments").where({ out_trade_no: outTradeNo }).update({
        membership_applied: true,
        updated_at: new Date().toISOString(),
      })
    } else {
      await db.collection("webhook_events").where({ id: webhookEventId }).update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: subscriptionResult.error || "failed to apply membership",
      })

      return NextResponse.json(
        { code: "FAIL", message: subscriptionResult.error || "Membership apply failed" },
        { status: 500 }
      )
    }

    await db.collection("webhook_events").where({ id: webhookEventId }).update({
      processed: true,
      processed_at: new Date().toISOString(),
    })

    return NextResponse.json({ code: "SUCCESS", message: "Ok" }, { status: 200 })
  } catch (error: any) {
    console.error("[wechat/webhook] error:", error)
    return NextResponse.json(
      { code: "FAIL", message: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
