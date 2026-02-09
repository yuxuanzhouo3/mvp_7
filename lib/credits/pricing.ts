export const FREE_USER_INITIAL_CREDITS = 300

export const TOOL_CREDIT_COSTS = {
  "email-multi-sender": 5,
  "text-multi-sender": 5,
  "social-auto-poster": 5,
  "data-scraper": 8,
  "jpeg-to-pdf": 3,
  "file-format-converter": 5,
  "video-to-gif": 10,
  "bulk-image-resizer": 3,
  "qr-generator": 1,
  "currency-converter": 1,
  "unit-converter": 1,
  "text-utilities": 1,
  "timezone-converter": 1,
} as const

export type ToolId = keyof typeof TOOL_CREDIT_COSTS

export function getToolCreditCost(toolId: string): number | null {
  const cost = (TOOL_CREDIT_COSTS as Record<string, number>)[toolId]
  return Number.isFinite(cost) ? cost : null
}

export const CREDIT_PACKAGES = [
  { amount: 50, price: 0.01, popular: false },
  { amount: 100, price: 0.01, popular: true },
  { amount: 250, price: 0.01, popular: false },
  { amount: 500, price: 0.01, popular: false },
] as const

export interface MembershipPlan {
  id: string
  name: string
  tier: "basic" | "pro" | "business"
  monthly_price: number
  yearly_price: number
  credits_per_month: number
  features: string[]
  popular?: boolean
}

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "basic",
    name: "Basic",
    tier: "basic",
    monthly_price: 0.01,
    yearly_price: 0.01,
    credits_per_month: 300,
    features: ["Core tools", "Email support", "Monthly credits refresh"],
  },
  {
    id: "pro",
    name: "Pro",
    tier: "pro",
    monthly_price: 0.01,
    yearly_price: 0.01,
    credits_per_month: 900,
    features: ["All Basic features", "Priority queue", "Advanced tools"],
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    tier: "business",
    monthly_price: 0.01,
    yearly_price: 0.01,
    credits_per_month: 2800,
    features: ["All Pro features", "Higher throughput", "Priority support"],
  },
]

export function getMembershipPlanByTier(tier?: string | null): MembershipPlan | null {
  if (!tier) return null
  return MEMBERSHIP_PLANS.find((plan) => plan.tier === tier) || null
}

export function getMembershipPlanById(planId?: string | null): MembershipPlan | null {
  if (!planId) return null
  return MEMBERSHIP_PLANS.find((plan) => plan.id === planId) || null
}

export function getMembershipPrice(plan: MembershipPlan, billingCycle: "monthly" | "yearly") {
  return billingCycle === "yearly" ? plan.yearly_price : plan.monthly_price
}

export function getMembershipCreditsGrant(plan: MembershipPlan, billingCycle: "monthly" | "yearly") {
  return billingCycle === "yearly" ? plan.credits_per_month * 12 : plan.credits_per_month
}
