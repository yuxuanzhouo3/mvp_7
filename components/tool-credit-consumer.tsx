"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useUser } from "@/hooks/use-user"
import { consumeToolCredits } from "@/lib/credits/client"
import { TOOL_SUCCESS_EVENT, type ToolSuccessDetail } from "@/lib/credits/tool-success"

function buildReferenceId(userId: string, toolId: string, eventReferenceId?: string) {
  const trimmed = String(eventReferenceId || "").trim()
  if (trimmed) return trimmed.slice(0, 180)
  const random = Math.random().toString(36).slice(2, 10)
  return `consume_${toolId}_${userId}_${Date.now()}_${random}`
}

export function ToolCreditConsumer(props: {
  toolId: string
  creditCost?: number | null
  language: "zh" | "en"
}) {
  const { toolId, creditCost, language } = props
  const { user, isLoading, updateCredits } = useUser()
  const inFlightRef = useRef(false)
  const consumedRef = useRef(false)

  useEffect(() => {
    inFlightRef.current = false
    consumedRef.current = false
  }, [toolId, user?.id])

  useEffect(() => {
    if (isLoading || !user?.id || !toolId || consumedRef.current) return

    const cost = Number(creditCost || 0)
    if (!Number.isFinite(cost) || cost <= 0) return

    const consumeCredits = async (referenceId?: string) => {
      if (inFlightRef.current || consumedRef.current) return
      inFlightRef.current = true
      const result = await consumeToolCredits({
        userId: user.id,
        toolId,
        referenceId: buildReferenceId(user.id, toolId, referenceId),
      })

      if ("newCredits" in result) {
        consumedRef.current = true
        updateCredits(result.newCredits)
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("user-updated"))
        }
        inFlightRef.current = false
        return
      }

      const message = String(result.error || "")
      const insufficient = /insufficient credits/i.test(message)

      if (insufficient) {
        toast.error(
          language === "zh"
            ? "积分不足，无法使用该工具。请先购买积分。"
            : "Insufficient credits. Please purchase credits first.",
        )
      } else {
        console.warn("[tool-credit-consumer] consume credits failed:", message || "unknown error")
      }
      inFlightRef.current = false
    }

    const onSuccess = (event: Event) => {
      const detail = (event as CustomEvent<ToolSuccessDetail | undefined>).detail
      if (!detail || detail.toolId !== toolId) return
      void consumeCredits(detail.referenceId)
    }

    window.addEventListener(TOOL_SUCCESS_EVENT, onSuccess as EventListener)
    return () => {
      window.removeEventListener(TOOL_SUCCESS_EVENT, onSuccess as EventListener)
    }
  }, [creditCost, isLoading, language, toolId, updateCredits, user?.id])

  return null
}
