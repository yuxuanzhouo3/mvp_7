import type React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home, Zap } from "lucide-react"
import Link from "next/link"

interface ToolLayoutProps {
  title: string
  description: string
  category: string
  children: React.ReactNode
}

export function ToolLayout({ title, description, category, children }: ToolLayoutProps) {
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "job-application":
        return "text-[color:var(--job-application)]"
      case "social-media":
        return "text-[color:var(--social-media)]"
      case "data-extraction":
        return "text-[color:var(--data-extraction)]"
      case "file-converters":
        return "text-[color:var(--file-converters)]"
      case "productivity":
        return "text-[color:var(--productivity)]"
      default:
        return "text-foreground"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-balance">{title}</h1>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Home className="w-4 h-4" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
