"use client"

import { useRouter } from "next/navigation"
import { Star, Clock } from "lucide-react"
import { useLanguage } from "@/components/language-provider";
import { useTranslations } from "@/lib/i18n";
import { categories } from "./tools-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  user: any
  favorites: string[]
  recentTools: string[]
}

export function Sidebar({
  selectedCategory,
  setSelectedCategory,
  user,
  favorites,
  recentTools
}: SidebarProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const ui = language === 'zh'
    ? { account: '账户', credits: '积分', tier: '等级', membership: '会员方案' }
    : { account: t.common?.account || 'Account', credits: t.common?.credits || 'Credits', tier: t.common?.tier || 'Tier', membership: t.payment?.upgradePlan || 'Membership Plans' }

  const getCategoryName = (category: any) => {

    if (category.id === "all") {

      return t.common?.all || category.nameKey

    }

    return t.categories?.[category.nameKey] || category.nameKey

  }

  return (
    <aside className="hidden md:block w-64 flex-shrink-0">
      <div className="sticky top-24">
        <nav className="space-y-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.id;
            return (
              <Button
                key={category.id}
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 h-11 ${
                  isActive ? "bg-secondary text-secondary-foreground" : "hover:bg-accent"
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <Icon className={`w-4 h-4 ${category.color}`} />
                <span className="flex-1 text-left">{getCategoryName(category)}</span>
                <Badge variant="secondary" className="text-xs">
                  {category.count}
                </Badge>
              </Button>
            );
          })}
        </nav>

        {/* Quick Access */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t.common?.quickAccess || "Quick Access"}</h3>
          <div className="space-y-2">
            <Button
              variant={selectedCategory === "favorites" ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 h-9 ${
                selectedCategory === "favorites" ? "bg-secondary text-secondary-foreground" : "hover:bg-accent"
              }`}
              onClick={() => setSelectedCategory("favorites")}
            >
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">{t.common?.favorites || "Favorites"}</span>
              <Badge variant="secondary" className="text-xs ml-auto">
                {favorites.length}
              </Badge>
            </Button>
            <Button
              variant={selectedCategory === "recent" ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 h-9 ${
                selectedCategory === "recent" ? "bg-secondary text-secondary-foreground" : "hover:bg-accent"
              }`}
              onClick={() => setSelectedCategory("recent")}
            >
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm">{t.common?.recent || "Recent"}</span>
              <Badge variant="secondary" className="text-xs ml-auto">
                {recentTools.length}
              </Badge>
            </Button>
          </div>
        </div>

        {user && (
          <div className="mt-8 p-4 bg-card border border-border rounded-lg">
            <h3 className="font-medium mb-2">{ui.account}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{ui.credits}:</span>
                <span className="font-medium">{user.credits}</span>
              </div>
              <div className="flex justify-between">
                <span>{ui.tier}:</span>
                <span className="font-medium capitalize">{user.subscription_tier}</span>
              </div>
            </div>
          </div>
        )}

        {user && (
          <div className="mt-4 sticky bottom-6">
            <div className="space-y-2">
              <Button
                onClick={() => router.push('/subscription')}
                className="w-full h-10 justify-center bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {ui.membership}
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
