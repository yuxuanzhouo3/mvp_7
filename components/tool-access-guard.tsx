"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useUser } from "@/hooks/use-user"
import { useLanguage } from "@/components/language-provider"

interface ToolAccessGuardProps {
  children: ReactNode
}

export function ToolAccessGuard({ children }: ToolAccessGuardProps) {
  const { user, isLoading } = useUser()
  const { language } = useLanguage()

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
        {language === "zh" ? "正在验证登录状态..." : "Checking login status..."}
      </div>
    )
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="text-lg font-semibold mb-2">
          {language === "zh" ? "请先登录后再使用工具" : "Please sign in to use tools"}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {language === "zh"
            ? "工具功能仅对已登录用户开放。"
            : "Tool features are only available for signed-in users."}
        </p>
        <Link href="/">
          <Button>
            {language === "zh" ? "返回首页登录" : "Go to home and sign in"}
          </Button>
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
