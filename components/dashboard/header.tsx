"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ThemeSwitch } from "@/components/theme-switch"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/components/language-provider";
import { useTranslations } from "@/lib/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getSupabaseClient } from "@/lib/supabase"
import { Search, Zap, User } from "lucide-react"

interface HeaderProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  user: any
  setShowLoginModal: (show: boolean) => void
  showMobileSearch: boolean
  setShowMobileSearch: (show: boolean) => void
}

export function Header({
  searchQuery,
  setSearchQuery,
  user,
  setShowLoginModal,
  showMobileSearch,
  setShowMobileSearch
}: HeaderProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations(language);
  const ui = language === 'zh'
    ? { account: '账户', credits: '积分', tier: '等级', logout: '退出登录' }
    : { account: 'Account', credits: t.common?.credits || 'Credits', tier: 'Tier', logout: 'Logout' }

  const getAvatarUrl = (u: any): string | undefined => {
    return (
      u?.avatar_url ||
      u?.avatarUrl ||
      u?.picture ||
      u?.user_metadata?.avatar_url ||
      u?.user_metadata?.picture
    )
  }

  const getAvatarFallback = (u: any): string => {
    const label = (u?.name || u?.full_name || u?.email || "").toString().trim()
    if (!label) return "U"
    const parts = label.includes("@") ? [label.split("@")[0]] : label.split(/\s+/).filter(Boolean)
    const initials = parts.slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join("")
    return initials || "U"
  }

  const getTierLabel = (u: any) => {
    const tier = (u?.subscription_tier || u?.tier || "free").toString()
    if (tier === "admin") return "Admin"
    if (tier === "pro") return "Pro"
    if (tier === "basic") return "Basic"
    if (tier === "business") return "Business"
    return "Free"
  }

  const handleLogout = async () => {
    try {
      await getSupabaseClient().auth.signOut()
    } catch {
      // ignore
    }
    localStorage.removeItem("user")
    localStorage.removeItem("app-auth-state")
    window.location.href = "/"
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground"/>
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg md:text-xl font-bold">morntool</h1>
              <p className="text-sm text-muted-foreground">{t.header.defaultSubtitle}</p>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-8 hidden lg:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
              <Input
                placeholder={t.common.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full h-10 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="w-9 h-9"
              >
                <Search className="w-5 h-5" />
              </Button>
            </div>

            <div className="hidden md:flex items-center space-x-2">
              <LanguageSwitcher />
              <ThemeSwitch/>
            </div>

            {user ? (
              <div className="flex items-center gap-1 md:gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="rounded-full">
                      <Avatar className="h-8 w-8 md:h-9 md:w-9">
                        <AvatarImage src={getAvatarUrl(user)} alt={user?.name || user?.email || "User"} />
                        <AvatarFallback>{getAvatarFallback(user)}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="space-y-0.5">
                      <div className="text-sm font-medium leading-none">{ui.account}</div>
                      <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      {ui.credits}: {user?.credits}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      {ui.tier}: {getTierLabel(user)}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/subscription')}>
                      {t.payment?.upgradePlan || "Membership"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      {ui.logout}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/subscription')}
                  className="hidden md:flex h-9"
                >
                  {t.payment?.upgradePlan || "Membership"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLoginModal(true)}
                  className="rounded-full w-9 h-9"
                  title={t.auth?.signIn || "Sign In"}
                >
                  <User className="w-5 h-5" />
                </Button>
              </div>
            )}

            <div className="flex md:hidden items-center">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Mobile Search Bar (Expandable) */}
        <div id="search-mobile-container" className={`lg:hidden mt-3 overflow-hidden transition-all duration-300 ease-in-out ${showMobileSearch ? 'max-h-16 opacity-100 pb-2' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="relative mx-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <Input
              placeholder={t.common.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full bg-background border-border h-10 shadow-sm"
              autoFocus={showMobileSearch}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
