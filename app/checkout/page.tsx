"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useLanguage } from "@/components/language-provider"
import { useTranslations } from "@/lib/i18n"
import { MEMBERSHIP_PLANS, MembershipPlan } from "@/lib/credits/pricing"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2, CreditCard, Wallet, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import { getSupabaseClient } from "@/lib/supabase"
import Link from "next/link"

const USD_TO_CNY_RATE = 7.2

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const t = useTranslations(language)
  const { user, updateUser } = useUser()
  
  const planId = searchParams.get('planId')
  const cycle = searchParams.get('cycle') || 'monthly'
  const billingCycle = cycle as 'monthly' | 'yearly'

  const [paymentMethod, setPaymentMethod] = useState('card')
  const [isLoading, setIsLoading] = useState(false)
  
  // Detect deployment region
  const deploymentRegion = (process.env.NEXT_PUBLIC_DEPLOYMENT_REGION || 'CN').toUpperCase()
  const isChinaRegion = deploymentRegion === 'CN'
  
  const selectedPlan = MEMBERSHIP_PLANS.find(p => p.id === planId)

  useEffect(() => {
    // Set default payment method
    if (isChinaRegion) {
      setPaymentMethod('wechatpay')
    } else {
      setPaymentMethod('card')
    }
  }, [isChinaRegion])

  // Redirect if no plan selected
  useEffect(() => {
    if (!planId || !selectedPlan) {
      router.push('/subscription')
    }
  }, [planId, selectedPlan, router])

  const handleSubscriptionUpgrade = async () => {
    if (!user || !selectedPlan) {
        if (!user) {
             alert(language === 'zh' ? '请先登录' : 'Please login first');
             // Consider redirecting to login here
        }
        return
    }

    setIsLoading(true)
    try {
      if (isChinaRegion && !['wechatpay', 'alipay'].includes(paymentMethod)) {
        alert(language === 'zh' ? '国内版仅支持微信支付和支付宝。' : 'China deployment only supports WeChat Pay and Alipay.')
        return
      }

      if (!isChinaRegion && !['card', 'paypal'].includes(paymentMethod)) {
        alert(language === 'zh' ? '国际版仅支持信用卡和PayPal。' : 'International deployment only supports Card and PayPal.')
        return
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1200))

      const creditsToAdd = selectedPlan.credits_per_month
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + (billingCycle === 'monthly' ? 1 : 12))
      const nextCredits = Number(user.credits || 0) + creditsToAdd

      if (!isChinaRegion) {
        const { error } = await getSupabaseClient()
          .from('user')
          .update({
            subscription_tier: selectedPlan.tier,
            subscription_expires_at: expiresAt.toISOString(),
            credits: nextCredits,
          })
          .eq('id', user.id)

        if (error) throw error
      }

      updateUser({
        ...user,
        subscription_tier: selectedPlan.tier,
        subscription_expires_at: expiresAt.toISOString(),
        credits: nextCredits,
      })

      alert(
        language === 'zh'
          ? `已开通 ${selectedPlan.name} 会员（${billingCycle === 'monthly' ? '月付' : '年付'}，每月 ${creditsToAdd} 积分）`
          : `Subscribed to ${selectedPlan.name} (${billingCycle}, ${creditsToAdd} credits/month)`
      )
      
      // Redirect back to dashboard
      window.location.href = '/';

    } catch (error) {
      console.error('Subscription error:', error)
      alert(t.notifications?.upgradeFailed || 'Upgrade failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (!selectedPlan) return null;

  const isYearly = billingCycle === 'yearly'
  
  const selectedPrice = selectedPlan
    ? (isYearly ? selectedPlan.yearly_price : selectedPlan.monthly_price)
    : 0
    
  const displayPrice = isChinaRegion
    ? `¥${(selectedPrice * USD_TO_CNY_RATE).toFixed(2)}`
    : `$${selectedPrice.toFixed(2)}`
    
  const cycleLabel = isYearly
    ? (t.payment?.yearLabel || t.payment?.year || "year")
    : (t.payment?.monthLabel || t.payment?.month || "month")

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
            <Link href="/subscription" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.payment?.chooseMembershipPlan || "Back to Plans"}
            </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6">{t.payment?.summary || "Checkout"}</h1>

        <div className="grid gap-6 md:grid-cols-1">
            {/* Order Summary Card */}
            <Card className="p-6">
                <h3 className="font-semibold mb-4 text-lg">{t.payment?.summary || "Order Summary"}</h3>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">{t.payment?.plan || "Plan"}</span>
                        <span className="font-semibold text-lg">{selectedPlan.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">{t.payment?.billing || "Billing Cycle"}</span>
                        <span className="font-medium capitalize">{cycleLabel}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">{t.payment?.monthlyCredits || "Credits"}</span>
                        <span className="font-medium">{selectedPlan.credits_per_month} / {t.payment?.mo || "mo"}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <span className="font-semibold text-lg">{t.payment?.total || "Total Amount"}</span>
                        <span className="text-3xl font-bold text-primary">{displayPrice}</span>
                    </div>
                </div>
            </Card>

            {/* Payment Method Card */}
            <Card className="p-6">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5" />
                    {t.payment?.selectPaymentMethod || "Payment Method"}
                </h3>
                
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {isChinaRegion ? (
                    <>
                        <div className={cn(
                            "flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors relative",
                            paymentMethod === 'wechatpay' && "border-primary bg-primary/5 ring-1 ring-primary"
                        )}>
                        <RadioGroupItem value="wechatpay" id="wechatpay" />
                        <Label htmlFor="wechatpay" className="cursor-pointer flex items-center gap-2 font-medium w-full">
                            <Wallet className="w-4 h-4 text-green-600" />
                            {t.payment?.methods?.wechat?.name || "WeChat Pay"}
                        </Label>
                        </div>
                        <div className={cn(
                            "flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors relative",
                            paymentMethod === 'alipay' && "border-primary bg-primary/5 ring-1 ring-primary"
                        )}>
                        <RadioGroupItem value="alipay" id="alipay" />
                        <Label htmlFor="alipay" className="cursor-pointer flex items-center gap-2 font-medium w-full">
                            <Wallet className="w-4 h-4 text-blue-500" />
                            {t.payment?.methods?.alipay?.name || "Alipay"}
                        </Label>
                        </div>
                    </>
                    ) : (
                    <>
                        <div className={cn(
                            "flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors relative",
                            paymentMethod === 'card' && "border-primary bg-primary/5 ring-1 ring-primary"
                        )}>
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="cursor-pointer flex items-center gap-2 font-medium w-full">
                            <CreditCard className="w-4 h-4" />
                            {t.payment?.methods?.stripe?.name || "Credit Card"}
                        </Label>
                        </div>
                        <div className={cn(
                            "flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors relative",
                            paymentMethod === 'paypal' && "border-primary bg-primary/5 ring-1 ring-primary"
                        )}>
                        <RadioGroupItem value="paypal" id="paypal" />
                        <Label htmlFor="paypal" className="cursor-pointer flex items-center gap-2 font-medium w-full">
                            <Wallet className="w-4 h-4 text-blue-700" />
                            {t.payment?.methods?.paypal?.name || "PayPal"}
                        </Label>
                        </div>
                    </>
                    )}
                </RadioGroup>

                <div className="mt-8">
                    <Button 
                        onClick={handleSubscriptionUpgrade}
                        disabled={isLoading}
                        className="w-full h-12 text-lg font-medium shadow-md"
                        size="lg"
                    >
                        {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                            {t.common?.processing || "Processing..."}
                        </>
                        ) : (
                        <>
                            {t.payment?.subscribe || "Subscribe Now"}
                        </>
                        )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-4">
                        {language === 'zh' ? '订阅即表示您同意我们的服务条款' : 'By subscribing, you agree to our Terms of Service'}
                    </p>
                </div>
            </Card>
        </div>
      </div>
    </div>
  )
}
