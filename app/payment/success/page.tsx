"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Loader2, XCircle } from "lucide-react"

type ConfirmState = "processing" | "success" | "error"

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<ConfirmState>("processing")
  const [message, setMessage] = useState("正在确认支付结果，请稍候...")

  const params = useMemo(() => {
    const normalizeParam = (value: string | null) => {
      if (!value) return undefined
      const trimmed = value.trim()
      if (!trimmed) return undefined

      if (/^\{[A-Z0-9_]+\}$/.test(trimmed) || trimmed.includes("CHECKOUT_SESSION_ID")) {
        return undefined
      }

      return trimmed
    }

    return {
      sessionId: normalizeParam(searchParams.get("session_id")),
      token: normalizeParam(searchParams.get("token") || searchParams.get("paymentId")),
      outTradeNo: normalizeParam(searchParams.get("out_trade_no")),
      tradeNo: normalizeParam(searchParams.get("trade_no")),
      planId: normalizeParam(searchParams.get("planId")),
      billingCycle: searchParams.get("cycle") === "yearly" ? "yearly" : "monthly",
    } as const
  }, [searchParams])

  useEffect(() => {
    const run = async () => {
      try {
        const deploymentRegion = (process.env.NEXT_PUBLIC_DEPLOYMENT_REGION || "CN").toUpperCase()
        if (deploymentRegion === "CN") {
          const rawUser = localStorage.getItem("user")
          if (rawUser) {
            const user = JSON.parse(rawUser)
            const userId = user?.id
            if (userId) {
              try {
                const response = await fetch(`/api/user/profile?id=${encodeURIComponent(userId)}`)
                const profileResult = await response.json()
                if (response.ok && profileResult?.success && profileResult?.user) {
                  const nextUser = {
                    ...user,
                    ...profileResult.user,
                    credits:
                      typeof profileResult.user.credits === "number"
                        ? profileResult.user.credits
                        : user.credits,
                    subscription_tier:
                      profileResult.user.subscription_tier ||
                      (profileResult.user.pro ? "pro" : user.subscription_tier),
                    subscription_expires_at:
                      profileResult.user.subscription_expires_at ||
                      profileResult.user.membership_expires_at ||
                      user.subscription_expires_at,
                  }
                  localStorage.setItem("user", JSON.stringify(nextUser))
                }
              } catch {
                // ignore profile sync errors
              }
            }
          }

          setStatus("success")
          setMessage("支付结果已提交，会员信息将自动刷新。")
          return
        }

        const rawUser = localStorage.getItem("user")
        if (!rawUser) {
          setStatus("error")
          setMessage("未检测到登录信息，请重新登录后在订阅页查看结果。")
          return
        }

        const user = JSON.parse(rawUser)
        const userId = user?.id
        const userEmail = user?.email

        if (!userEmail || !params.planId) {
          setStatus("error")
          setMessage("缺少必要的用户或套餐信息，无法确认支付。")
          return
        }

        if (!params.sessionId && !params.token && !params.outTradeNo && !params.tradeNo) {
          setStatus("error")
          setMessage("未获取到有效支付流水号，请从支付平台返回页重新进入。")
          return
        }

        const response = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            userEmail,
            planId: params.planId,
            billingCycle: params.billingCycle,
            sessionId: params.sessionId,
            token: params.token,
            outTradeNo: params.outTradeNo,
            tradeNo: params.tradeNo,
          }),
        })

        const result = await response.json()
        if (!response.ok || result?.error) {
          throw new Error(result?.error || "支付确认失败")
        }

        const nextUser = {
          ...user,
          credits:
            typeof result?.newCredits === "number"
              ? result.newCredits
              : user.credits,
          subscription_tier:
            result?.subscriptionTier || user.subscription_tier,
          subscription_expires_at:
            result?.newExpireAt || user.subscription_expires_at,
        }

        localStorage.setItem("user", JSON.stringify(nextUser))

        setStatus("success")
        setMessage(
          result?.alreadyProcessed
            ? "支付已处理完成，会员权益已是最新状态。"
            : "支付成功，会员权益已更新。"
        )
      } catch (error: any) {
        setStatus("error")
        setMessage(error?.message || "支付确认失败，请稍后重试")
      }
    }

    run()
  }, [params])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
        {status === "processing" && <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />}
        {status === "success" && <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />}
        {status === "error" && <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />}

        <h1 className="text-2xl font-bold mb-2">
          {status === "processing" ? "Confirming Payment" : status === "success" ? "Payment Successful" : "Payment Confirm Failed"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {message}
        </p>
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/subscription"
            className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 font-medium"
          >
            View Plans
          </Link>
        </div>
      </div>
    </div>
  )
}
