"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider";
import { useTranslations } from "@/lib/i18n";
import { categories, tools, Tool } from "./tools-data"
import { getToolCreditCost } from "@/lib/credits/pricing"
import { Star, Clock, Search } from "lucide-react"

interface MainContentProps {
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  searchQuery: string
  favorites: string[]
  recentTools: string[]
  user: any
  toggleFavorite: (toolId: string) => void
  handleToolClick: (toolId: string) => void
  setShowFeatureModal: (show: boolean) => void
  setSelectedToolName: (name: string) => void
  isChinaRegion: boolean
}

export function MainContent({
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  favorites,
  recentTools,
  user,
  toggleFavorite,
  handleToolClick,
  setShowFeatureModal,
  setSelectedToolName,
  isChinaRegion
}: MainContentProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const getToolName = (tool: Tool) => t.tools?.[tool.nameKey]?.name || tool.nameKey
  const getToolDescription = (tool: Tool) => t.tools?.[tool.nameKey]?.description || tool.nameKey
  const getCategoryName = (category: any) => t.categories?.[category.nameKey] || category.nameKey

  const filteredTools = tools.filter((tool) => {
    const toolName = getToolName(tool)
    const toolDesc = getToolDescription(tool)
    const matchesSearch =
      toolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      toolDesc.toLowerCase().includes(searchQuery.toLowerCase())

    if (selectedCategory === "favorites") {
      return favorites.includes(tool.id) && matchesSearch
    } else if (selectedCategory === "recent") {
      return recentTools.includes(tool.id) && matchesSearch
    } else {
      const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory
      return matchesCategory && matchesSearch
    }
  })

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "job-application":
        return "border-l-[color:var(--job-application)]"
      case "social-media":
        return "border-l-[color:var(--social-media)]"
      case "data-extraction":
        return "border-l-[color:var(--data-extraction)]"
      case "file-converters":
        return "border-l-[color:var(--file-converters)]"
      case "productivity":
        return "border-l-[color:var(--productivity)]"
      default:
        return "border-l-border"
    }
  }

  const featureEmail = isChinaRegion ? 'morntool@sina.cn' : 'morntool@gmail.com'

  return (
    <main className="flex-1 min-w-0">
      {/* Mobile Category Navigation (Horizontal Scroll) */}
      <div className="md:hidden mb-6 -mx-4 px-4 overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex gap-3 w-max">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                    : 'bg-card hover:bg-accent border-border text-muted-foreground'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-foreground' : category.color}`} />
                <span className="text-sm font-semibold">{getCategoryName(category)}</span>
                {!isActive && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-medium">
                    {category.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-balance mb-2">
          {selectedCategory === "all" ? t.common?.all : categories.find(c => c.id === selectedCategory) && getCategoryName(categories.find(c => c.id === selectedCategory))}
        </h2>
        <p className="text-muted-foreground">
          {filteredTools.length} {t.common?.available || "available"}
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          const creditCost = getToolCreditCost(tool.id)
          return (
            <Card
              key={tool.id}
              className={`group cursor-pointer transition-all hover:shadow-lg ${getCategoryColor(tool.category)} border-l-4`}
              onClick={() => {
                // Check if tool is uncompleted
                const uncompletedTools = ["text-multi-sender", "social-auto-poster"]
                if (uncompletedTools.includes(tool.id)) {
                  setSelectedToolName(getToolName(tool))
                  setShowFeatureModal(true)
                  return
                }

                if ((user && user.credits >= 0) || !user) {
                  handleToolClick(tool.id)
                } else {
                  alert(t.errors.promptForExceedingUsage)
                }
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base text-balance leading-tight">{getToolName(tool)}</CardTitle>
                      {creditCost !== null && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                            {creditCost} {t.common?.credits || "Credits"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {tool.isNew && (
                      <Badge variant="secondary" className="text-xs">
                        {t.common?.new || "New"}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(tool.id)
                      }}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          favorites.includes(tool.id) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
                        }`}
                      />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-pretty leading-relaxed">
                  {getToolDescription(tool)}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">{t.common?.noResults || "No tools found"}</h3>
          <p className="text-muted-foreground">{t.common?.adjustFilter || "Try adjusting your search or category filter"}</p>
        </div>
      )}
    </main>
  )
}