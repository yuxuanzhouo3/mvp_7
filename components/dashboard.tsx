"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ThemeSwitch } from "@/components/theme-switch"
import {
  Search,
  Star,
  Clock,
  Mail,
  MessageSquare,
  Share2,
  Database,
  FileImage,
  FileText,
  Video,
  ImageIcon,
  QrCode,
  DollarSign,
  Calculator,
  Type,
  Globe,
  Briefcase,
  Users,
  Download,
  Zap,
  Settings,
} from "lucide-react"

interface Tool {
  id: string
  name: string
  description: string
  category: "job-application" | "social-media" | "data-extraction" | "file-converters" | "productivity"
  icon: React.ComponentType<{ className?: string }>
  isFavorite?: boolean
  isNew?: boolean
}

const tools: Tool[] = [
  // Job Application Tools
  {
    id: "email-multi-sender",
    name: "Email Multi Sender",
    description: "Send personalized emails to multiple recipients with CSV upload and templates",
    category: "job-application",
    icon: Mail,
    isNew: true,
  },
  {
    id: "text-multi-sender",
    name: "Text Multi Sender",
    description: "Bulk SMS and WhatsApp messaging with scheduling and personalization",
    category: "job-application",
    icon: MessageSquare,
  },

  // Social Media Tools
  {
    id: "social-auto-poster",
    name: "Social Media Auto Poster",
    description: "Schedule posts across Twitter, LinkedIn, and Facebook with analytics",
    category: "social-media",
    icon: Share2,
    isNew: true,
  },

  // Data Extraction Tools
  {
    id: "data-scraper",
    name: "Data Scraper Pro",
    description: "Extract emails, phone numbers, and custom data from websites",
    category: "data-extraction",
    icon: Database,
  },

  // File Converters
  {
    id: "jpeg-to-pdf",
    name: "JPEG to PDF Converter",
    description: "Convert and merge multiple images into high-quality PDF documents",
    category: "file-converters",
    icon: FileImage,
    isFavorite: true,
  },
  {
    id: "file-format-converter",
    name: "File Format Converter",
    description: "Convert DOC, PPT, XLS files to PDF with batch processing",
    category: "file-converters",
    icon: FileText,
  },
  {
    id: "video-to-gif",
    name: "Video to GIF Creator",
    description: "Create optimized GIFs from video clips with custom settings",
    category: "file-converters",
    icon: Video,
  },
  {
    id: "bulk-image-resizer",
    name: "Bulk Image Resizer",
    description: "Resize multiple images with aspect ratio and compression options",
    category: "file-converters",
    icon: ImageIcon,
  },

  // Productivity Utilities
  {
    id: "qr-generator",
    name: "QR Code Generator",
    description: "Generate QR codes for URLs, text, WiFi, and contacts with customization",
    category: "productivity",
    icon: QrCode,
  },
  {
    id: "currency-converter",
    name: "Currency Converter",
    description: "Real-time exchange rates with historical data and bulk conversion",
    category: "productivity",
    icon: DollarSign,
  },
  {
    id: "unit-converter",
    name: "Unit Conversion Toolkit",
    description: "Convert length, weight, temperature, and volume with custom formulas",
    category: "productivity",
    icon: Calculator,
  },
  {
    id: "text-utilities",
    name: "Text Utilities Suite",
    description: "Case conversion, word counting, and text formatting tools",
    category: "productivity",
    icon: Type,
  },
  {
    id: "timezone-converter",
    name: "Time Zone Converter",
    description: "Convert between time zones and schedule meetings globally",
    category: "productivity",
    icon: Globe,
  },
]

const categories = [
  {
    id: "all",
    name: "All Tools",
    icon: Zap,
    color: "text-foreground",
    count: tools.length,
  },
  {
    id: "job-application",
    name: "Job Application",
    icon: Briefcase,
    color: "text-[color:var(--job-application)]",
    count: tools.filter((t) => t.category === "job-application").length,
  },
  {
    id: "social-media",
    name: "Social Media",
    icon: Users,
    color: "text-[color:var(--social-media)]",
    count: tools.filter((t) => t.category === "social-media").length,
  },
  {
    id: "data-extraction",
    name: "Data Extraction",
    icon: Database,
    color: "text-[color:var(--data-extraction)]",
    count: tools.filter((t) => t.category === "data-extraction").length,
  },
  {
    id: "file-converters",
    name: "File Converters",
    icon: Download,
    color: "text-[color:var(--file-converters)]",
    count: tools.filter((t) => t.category === "file-converters").length,
  },
  {
    id: "productivity",
    name: "Productivity",
    icon: Settings,
    color: "text-[color:var(--productivity)]",
    count: tools.filter((t) => t.category === "productivity").length,
  },
]

export function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [favorites, setFavorites] = useState<string[]>(tools.filter((t) => t.isFavorite).map((t) => t.id))

  const filteredTools = tools.filter((tool) => {
    const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const toggleFavorite = (toolId: string) => {
    setFavorites((prev) => (prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]))
  }

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

  const handleToolClick = (toolId: string) => {
    window.location.href = `/tools/${toolId}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-balance">AutoTools</h1>
                <p className="text-sm text-muted-foreground">Professional Automation Toolkit</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <ThemeSwitch />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <div className="sticky top-24">
              <nav className="space-y-2">
                {categories.map((category) => {
                  const Icon = category.icon
                  const isActive = selectedCategory === category.id

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
                      <span className="flex-1 text-left">{category.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {category.count}
                      </Badge>
                    </Button>
                  )
                })}
              </nav>

              {/* Quick Access */}
              <div className="mt-8">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Access</h3>
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-9">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">Favorites</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {favorites.length}
                    </Badge>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-9">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Recent</span>
                  </Button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-balance mb-2">
                {selectedCategory === "all" ? "All Tools" : categories.find((c) => c.id === selectedCategory)?.name}
              </h2>
              <p className="text-muted-foreground">
                {filteredTools.length} tool{filteredTools.length !== 1 ? "s" : ""} available
              </p>
            </div>

            {/* Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map((tool) => {
                const Icon = tool.icon
                const isFavorited = favorites.includes(tool.id)

                return (
                  <Card
                    key={tool.id}
                    className={`group hover:shadow-lg transition-all duration-200 border-l-4 ${getCategoryColor(tool.category)} cursor-pointer`}
                    onClick={() => handleToolClick(tool.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon className="w-5 h-5 text-secondary-foreground" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base text-balance leading-tight">{tool.name}</CardTitle>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {tool.isNew && (
                            <Badge variant="secondary" className="text-xs">
                              New
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
                                isFavorited ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                              }`}
                            />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-pretty leading-relaxed">{tool.description}</CardDescription>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {filteredTools.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No tools found</h3>
                <p className="text-muted-foreground">Try adjusting your search or category filter</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
