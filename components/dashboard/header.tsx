"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { getSupabaseClient } from "@/lib/supabase"
import { Search, Zap, User, Menu, Sparkles, Settings2, Globe, Moon, Sun, Check, Coins, CalendarClock, Download, Shield } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./sidebar"

interface HeaderProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  user: any
  setShowLoginModal: (show: boolean) => void
  showMobileSearch: boolean
  setShowMobileSearch: (show: boolean) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  favorites: string[]
  recentTools: string[]
  closeSheet?: () => void
}

export function Header({
  searchQuery,
  setSearchQuery,
  user,
  setShowLoginModal,
  showMobileSearch,
  setShowMobileSearch,
  selectedCategory,
  setSelectedCategory,
  favorites,
  recentTools,
  closeSheet
}: HeaderProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations(language);
  const { setTheme, theme } = useTheme();
  const { setLanguage } = useLanguage();
  const ui = language === 'zh'
    ? { account: '账户', credits: '积分', tier: '等级', logout: '退出登录', expiresAt: t.user?.expiresAt || '到期时间', noMembership: t.user?.noMembership || '未开通会员' }
    : { account: 'Account', credits: t.common?.credits || 'Credits', tier: 'Tier', logout: 'Logout', expiresAt: t.user?.expiresAt || 'Expires at', noMembership: t.user?.noMembership || 'No membership' }

  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const isAdmin = (() => {
    const whitelist = String(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)

    if (!user?.email || whitelist.length === 0) return false
    return whitelist.includes(String(user.email).toLowerCase())
  })()

  const isMember = (() => {
    if (!user) return false

    const tier = String(user?.subscription_tier || user?.tier || "free").toLowerCase()
    if (["basic", "pro", "business", "admin"].includes(tier)) {
      return true
    }

    if (Boolean(user?.pro)) {
      return true
    }

    const rawExpiresAt =
      user?.subscription_expires_at ||
      user?.membership_expires_at ||
      user?.expire_time ||
      user?.current_period_end

    if (!rawExpiresAt) return false

    const parsed = new Date(rawExpiresAt)
    if (Number.isNaN(parsed.getTime())) return false

    return parsed.getTime() > Date.now()
  })()

  const handleCloseSheet = () => {
    setIsSheetOpen(false)
  }

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

  const getMembershipExpireDisplay = (u: any) => {
    const rawExpiresAt =
      u?.subscription_expires_at ||
      u?.membership_expires_at ||
      u?.expire_time ||
      u?.current_period_end

    if (!rawExpiresAt) {
      return ui.noMembership
    }

    const parsed = new Date(rawExpiresAt)
    if (Number.isNaN(parsed.getTime())) {
      return String(rawExpiresAt)
    }

    const locale = language === 'zh' ? 'zh-CN' : 'en-US'
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(parsed)
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
        <div className="flex items-center">
          <div className="flex-1 flex items-center gap-2 md:gap-3">
            <div className="md:hidden">
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-9 h-9">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 pt-6">
                  <Sidebar
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    user={user}
                    favorites={favorites}
                    recentTools={recentTools}
                    isMobile={true}
                    closeSheet={handleCloseSheet}
                  />
                </SheetContent>
              </Sheet>
            </div>
            <div className="hidden md:flex w-10 h-10 bg-primary rounded-xl items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-6 h-6 text-primary-foreground fill-primary-foreground/20 shrink-0"/>
            </div>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold tracking-tight">morntool</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                <p className="text-sm text-muted-foreground font-medium">{t.header.defaultSubtitle}</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-none justify-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
              <Input
                placeholder={t.common.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full h-9 bg-muted/40 border-none focus-visible:ring-1 focus-visible:ring-primary/50 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 flex items-center justify-end gap-1 md:gap-3">
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

            <div className="flex items-center gap-2 md:gap-3">
              {isAdmin ? (
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin')}
                  className="hidden md:flex h-9"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              ) : null}

              {user && (
                <>
                  {!isMember ? (
                    <Button
                      onClick={() => router.push('/subscription')}
                      className="hidden md:flex h-9 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none shadow-lg shadow-purple-500/20 font-medium transition-all hover:scale-105 active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {language === 'zh' ? '升级会员' : 'Upgrade Plan'}
                    </Button>
                  ) : null}

                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-lg border border-border/50 transition-all group cursor-default">
                    <div className="flex items-center justify-center w-5 h-5 bg-amber-500/10 rounded-full">
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div className="flex flex-col -space-y-0.5">
                      <span className="text-xs font-bold tabular-nums">{user?.credits}</span>
                      <span className="text-[9px] text-muted-foreground uppercase font-medium tracking-tight">{ui.credits}</span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/downloads')}
                    className="w-9 h-9 rounded-full"
                    title={language === 'zh' ? '下载中心' : 'Downloads'}
                  >
                    <Download className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </>
              )}

              {/* 设置按钮 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full">
                    <Settings2 className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{t.header.settings || "Settings"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Globe className="mr-2 h-4 w-4" />
                      <span>{t.header.selectLanguage || "Language"}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setLanguage('zh')}>
                        <span>{t.header.chinese || "中文"}</span>
                        {language === 'zh' && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLanguage('en')}>
                        <span>{t.header.english || "EN"}</span>
                        {language === 'en' && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      {theme === 'dark' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                      <span>{language === 'zh' ? (theme === 'dark' ? '深色模式' : '浅色模式') : (theme === 'dark' ? 'Dark Mode' : 'Light Mode')}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setTheme('light')}>
                        <Sun className="mr-2 h-4 w-4" />
                        <span>{language === 'zh' ? '浅色' : 'Light'}</span>
                        {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('dark')}>
                        <Moon className="mr-2 h-4 w-4" />
                        <span>{language === 'zh' ? '深色' : 'Dark'}</span>
                        {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 头像/登录按钮 */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="rounded-full flex items-center justify-center outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring">
                      <Avatar className="h-8 w-8 md:h-9 md:w-9 border border-border/50">
                        <AvatarImage src={getAvatarUrl(user)} alt={user?.name || user?.email || "User"} />
                        <AvatarFallback>{getAvatarFallback(user)}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="space-y-1">
                      <div className="text-sm font-semibold leading-none">{ui.account}</div>
                      <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled className="opacity-70">
                      <Coins className="mr-2 h-4 w-4" />
                      {ui.credits}: {user?.credits}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/subscription')} className="text-primary font-medium focus:text-primary">
                      <Sparkles className="mr-2 h-4 w-4 fill-primary/20" />
                      {language === 'zh' ? `会员等级: ${getTierLabel(user)}` : `Tier: ${getTierLabel(user)}`}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled className="opacity-70">
                      <CalendarClock className="mr-2 h-4 w-4" />
                      {ui.expiresAt}: {getMembershipExpireDisplay(user)}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      {ui.logout}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLoginModal(true)}
                  className="rounded-full w-9 h-9"
                  title={t.auth?.signIn || "Sign In"}
                >
                  <User className="w-5 h-5" />
                </Button>
              )}
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
  );
}
