import { NextRequest, NextResponse } from "next/server"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { getDatabase } from "@/lib/database/cloudbase-service"
import { queryWechatOrderByOutTradeNo } from "@/lib/utils/wechatpay-v3-lite"
import { updateCloudbaseSubscription } from "@/app/api/payment/lib/update-cloudbase-subscription"
import { getMembershipPlanById, getMembershipCreditsGrant } from "@/lib/credits/pricing"

export const runtime = "nodejs"

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

function mapTradeStateToStatus(tradeState?: string): "pending" | "completed" | "failed" | "refunded" | "unknown" {
  const state = String(tradeState || "").toUpperCase()
  if (state === "SUCCESS") return "completed"
  if (state === "REFUND") return "refunded"
  if (["CLOSED", "REVOKED", "PAYERROR"].includes(state)) return "failed"
  if (["NOTPAY", "USERPAYING"].includes(state)) return "pending"
  return "unknown"
}

export async function GET(request: NextRequest) {
  try {
    const paymentId = request.nextUrl.searchParams.get("paymentId")
    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: "paymentId is required", status: "unknown" },
        { status: 400 }
      )
    }

    if (resolveDeploymentRegion() !== "CN") {
      return NextResponse.json(
        { success: false, error: "Status API currently supports CN WeChat payments only", status: "unknown" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const paymentResult = await db.collection("payments").where({ out_trade_no: paymentId }).get()
    const paymentRecord = paymentResult?.data?.[0]

    if (!paymentRecord) {
      return NextResponse.json(
        { success: false, error: "Payment record not found", status: "unknown" },
        { status: 404 }
      )
    }

    const localStatus = String(paymentRecord?.status || "pending")
    let finalStatus: "pending" | "completed" | "failed" | "refunded" | "unknown" =
      localStatus === "completed"
        ? "completed"
        : localStatus === "failed"
          ? "failed"
          : localStatus === "refunded"
            ? "refunded"
            : "pending"

    let tradeState: string | null = null
    let transactionId: string | null = paymentRecord?.transaction_id || null

    try {
      const wechatResp: any = await queryWechatOrderByOutTradeNo(paymentId)
      tradeState = wechatResp?.trade_state || null
      transactionId = wechatResp?.transaction_id || transactionId

      const remoteStatus = mapTradeStateToStatus(tradeState || undefined)
      if (remoteStatus !== "unknown") {
        finalStatus = remoteStatus
      }

      if (finalStatus === "completed" && localStatus !== "completed") {
        await db.collection("payments").where({ out_trade_no: paymentId }).update({
          status: "completed",
          transaction_id: transactionId,
          updated_at: new Date().toISOString(),
        })
      }

      const benefitApplied = Boolean(paymentRecord?.membership_applied)
      if (finalStatus === "completed" && !benefitApplied) {
        const resolvedUserId = await resolvePaymentUserId(db, paymentRecord)
        const billingCycle =
          paymentRecord?.billing_cycle || paymentRecord?.metadata?.billingCycle || "monthly"

        if (resolvedUserId) {
          const planId = String(paymentRecord?.plan_type || paymentRecord?.metadata?.planId || "pro")
          const plan = getMembershipPlanById(planId)
          const creditsToAdd = plan ? getMembershipCreditsGrant(plan, billingCycle) : 0

          const subscriptionResult = await updateCloudbaseSubscription({
            userId: resolvedUserId,
            days: resolveDaysByBillingCycle(billingCycle),
            creditsToAdd,
            transactionId: transactionId || paymentId,
            provider: "wechat",
            currentDate: new Date(),
          })

          if (subscriptionResult.success) {
            await db.collection("payments").where({ out_trade_no: paymentId }).update({
              membership_applied: true,
              updated_at: new Date().toISOString(),
            })
          }
        }
      }
    } catch (error) {
      console.error("[payment/status] wechat query failed, fallback local status:", error)
    }

    return NextResponse.json({
      success: true,
      paymentId,
      status: finalStatus,
      tradeState,
      transactionId,
      webhookConfirmed: Boolean(paymentRecord?.webhook_confirmed),
      method: paymentRecord?.payment_method || "wechat",
      amount: paymentRecord?.amount,
      currency: paymentRecord?.currency,
      createdAt: paymentRecord?.created_at,
    })
  } catch (error: any) {
    console.error("[payment/status] error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error", status: "unknown" },
      { status: 500 }
    )
  }
}
