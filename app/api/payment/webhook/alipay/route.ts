import { NextRequest, NextResponse } from "next/server"
import * as crypto from "crypto"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { getDatabase } from "@/lib/database/cloudbase-service"
import { updateCloudbaseSubscription } from "@/app/api/payment/lib/update-cloudbase-subscription"

export const runtime = "nodejs"

function verifyAlipaySignature(
  params: Record<string, string>,
  publicKey?: string
): boolean {
  try {
    if (process.env.NODE_ENV === "development") {
      return true
    }

    if (!publicKey) {
      return false
    }

    const sign = params.sign
    const signType = params.sign_type

    if (!sign || signType !== "RSA2") {
      return false
    }

    const paramsToSign = { ...params }
    delete paramsToSign.sign
    delete paramsToSign.sign_type

    const sortedKeys = Object.keys(paramsToSign).sort()
    const signString = sortedKeys.map((key) => `${key}=${paramsToSign[key]}`).join("&")

    const verify = crypto.createVerify("RSA-SHA256")
    verify.update(signString, "utf8")

    const normalizedKey = publicKey.includes("BEGIN PUBLIC KEY")
      ? publicKey
      : `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`

    return verify.verify(normalizedKey, sign, "base64")
  } catch {
    return false
  }
}

function resolveDaysByBillingCycle(value?: string): number {
  return value === "yearly" ? 365 : 30
}

export async function POST(request: NextRequest) {
  try {
    if (resolveDeploymentRegion() !== "CN") {
      return new NextResponse("failure", { status: 403 })
    }

    const formData = await request.formData()
    const params: Record<string, string> = {}

    formData.forEach((value, key) => {
      params[key] = String(value)
    })

    const tradeStatus = params.trade_status
    const outTradeNo = params.out_trade_no
    const tradeNo = params.trade_no

    const isValid = verifyAlipaySignature(
      params,
      process.env.ALIPAY_PUBLIC_KEY || process.env.ALIPAY_ALIPAY_PUBLIC_KEY
    )

    if (!isValid) {
      return new NextResponse("failure")
    }

    if (tradeStatus !== "TRADE_SUCCESS" && tradeStatus !== "TRADE_FINISHED") {
      return new NextResponse("success")
    }

    if (!outTradeNo) {
      return new NextResponse("failure")
    }

    const db = await getDatabase()
    const webhookEventId = `alipay_${outTradeNo}_${tradeNo || "unknown"}`

    const existingEvent = await db.collection("webhook_events").where({ id: webhookEventId }).get()
    if ((existingEvent?.data?.length || 0) > 0) {
      return new NextResponse("success")
    }

    await db.collection("webhook_events").add({
      id: webhookEventId,
      provider: "alipay",
      event_type: tradeStatus,
      event_data: params,
      processed: false,
      created_at: new Date().toISOString(),
    })

    const paymentResult = await db
      .collection("payments")
      .where({ out_trade_no: outTradeNo })
      .get()

    const paymentRecord = paymentResult?.data?.[0]

    if (!paymentRecord) {
      await db.collection("webhook_events").where({ id: webhookEventId }).update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: "payment record not found",
      })
      return new NextResponse("failure")
    }

    await db.collection("payments").where({ out_trade_no: outTradeNo }).update({
      status: "completed",
      transaction_id: tradeNo || paymentRecord.transaction_id,
      updated_at: new Date().toISOString(),
    })

    const userId = paymentRecord.user_id
    if (userId) {
      const billingCycle =
        paymentRecord.billing_cycle || paymentRecord.metadata?.billingCycle || "monthly"

      await updateCloudbaseSubscription({
        userId,
        days: resolveDaysByBillingCycle(billingCycle),
        transactionId: tradeNo || outTradeNo,
        provider: "alipay",
        currentDate: new Date(),
      })
    }

    await db.collection("webhook_events").where({ id: webhookEventId }).update({
      processed: true,
      processed_at: new Date().toISOString(),
    })

    return new NextResponse("success")
  } catch (error) {
    console.error("[alipay/webhook] error:", error)
    return new NextResponse("failure")
  }
}

