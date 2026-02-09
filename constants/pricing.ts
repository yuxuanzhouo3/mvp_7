import { MEMBERSHIP_PLANS } from "@/lib/credits/pricing"

export function getPlanPrice(planId: string, period: "monthly" | "annual", _isZh?: boolean): number {
  const normalizedId = String(planId || "").toLowerCase()
  const plan = MEMBERSHIP_PLANS.find((item) => item.id === normalizedId || item.tier === normalizedId)
  if (!plan) return 0

  return period === "annual" ? Number(plan.yearly_price || 0) : Number(plan.monthly_price || 0)
}
