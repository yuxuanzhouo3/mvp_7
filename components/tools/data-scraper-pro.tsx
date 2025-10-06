"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  Globe,
  Database,
  Mail,
  Phone,
  User,
  Building,
  Search,
  Download,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Eye,
  Settings,
  FileText,
  Link,
} from "lucide-react"

interface ScrapingJob {
  id: string
  name: string
  url: string
  dataTypes: string[]
  status: "idle" | "running" | "completed" | "error"
  progress: number
  results: number
}

interface ScrapedData {
  type: string
  value: string
  source: string
  confidence: number
}

export function DataScraperPro() {
  const [jobs, setJobs] = useState<ScrapingJob[]>([])
  const [currentJob, setCurrentJob] = useState<Partial<ScrapingJob>>({
    name: "",
    url: "",
    dataTypes: [],
  })
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([])

  const dataTypes = [
    { id: "email", name: "Email Addresses", icon: Mail, description: "Extract email addresses from web pages" },
    { id: "phone", name: "Phone Numbers", icon: Phone, description: "Find phone numbers and contact info" },
    { id: "names", name: "Names", icon: User, description: "Extract person names and contacts" },
    { id: "companies", name: "Companies", icon: Building, description: "Business names and organizations" },
    { id: "links", name: "Links", icon: Link, description: "URLs and external links" },
    { id: "text", name: "Custom Text", icon: FileText, description: "Custom text patterns and content" },
  ]

  const handleDataTypeToggle = (typeId: string) => {
    setSelectedDataTypes((prev) => (prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]))
  }

  const handleStartScraping = async () => {
    if (!currentJob.url || selectedDataTypes.length === 0) return

    const newJob: ScrapingJob = {
      id: Date.now().toString(),
      name: currentJob.name || `Scrape ${new URL(currentJob.url).hostname}`,
      url: currentJob.url,
      dataTypes: selectedDataTypes,
      status: "running",
      progress: 0,
      results: 0,
    }

    setJobs((prev) => [...prev, newJob])
    setIsRunning(true)

    // Mock scraping process
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setJobs((prev) =>
        prev.map((job) => (job.id === newJob.id ? { ...job, progress: i, results: Math.floor(i / 10) * 3 } : job)),
      )
    }

    // Mock scraped data
    const mockData: ScrapedData[] = [
      { type: "email", value: "contact@example.com", source: currentJob.url!, confidence: 95 },
      { type: "email", value: "info@company.com", source: currentJob.url!, confidence: 88 },
      { type: "phone", value: "+1 (555) 123-4567", source: currentJob.url!, confidence: 92 },
      { type: "names", value: "John Smith", source: currentJob.url!, confidence: 85 },
      { type: "companies", value: "Tech Solutions Inc", source: currentJob.url!, confidence: 90 },
    ]

    setScrapedData((prev) => [...prev, ...mockData])
    setJobs((prev) => prev.map((job) => (job.id === newJob.id ? { ...job, status: "completed", progress: 100 } : job)))
    setIsRunning(false)
    setCurrentJob({ name: "", url: "", dataTypes: [] })
    setSelectedDataTypes([])
  }

  const exportData = (format: "csv" | "json") => {
    const dataStr = format === "json" ? JSON.stringify(scrapedData, null, 2) : convertToCSV(scrapedData)
    const blob = new Blob([dataStr], { type: format === "json" ? "application/json" : "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `scraped-data.${format}`
    a.click()
  }

  const convertToCSV = (data: ScrapedData[]) => {
    const headers = ["Type", "Value", "Source", "Confidence"]
    const rows = data.map((item) => [item.type, item.value, item.source, item.confidence.toString()])
    return [headers, ...rows].map((row) => row.join(",")).join("\n")
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[color:var(--data-extraction)]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[color:var(--data-extraction)]" />
              <CardTitle className="text-lg">Jobs</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
            <p className="text-sm text-muted-foreground">Scraping jobs</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">Extracted</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scrapedData.length}</div>
            <p className="text-sm text-muted-foreground">Data points</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <CardTitle className="text-lg">Success Rate</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-sm text-muted-foreground">Extraction accuracy</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-lg">Sources</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(scrapedData.map((d) => d.source)).size}</div>
            <p className="text-sm text-muted-foreground">Unique websites</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scraper" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scraper">Scraper</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="scraper" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Web Scraper
              </CardTitle>
              <CardDescription>Extract data from websites automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job-name">Job Name (Optional)</Label>
                  <Input
                    id="job-name"
                    value={currentJob.name || ""}
                    onChange={(e) => setCurrentJob((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="My scraping job"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-url">Target URL</Label>
                  <Input
                    id="target-url"
                    value={currentJob.url || ""}
                    onChange={(e) => setCurrentJob((prev) => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Data Types to Extract</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dataTypes.map((dataType) => {
                    const Icon = dataType.icon
                    const isSelected = selectedDataTypes.includes(dataType.id)

                    return (
                      <Card
                        key={dataType.id}
                        className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary" : ""}`}
                        onClick={() => handleDataTypeToggle(dataType.id)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5 text-primary" />
                            <CardTitle className="text-sm">{dataType.name}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">{dataType.description}</p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleStartScraping}
                  disabled={!currentJob.url || selectedDataTypes.length === 0 || isRunning}
                  className="flex-1"
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Scraping
                    </>
                  )}
                </Button>
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>

              {!currentJob.url && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">Please enter a target URL</p>
                </div>
              )}

              {selectedDataTypes.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Select at least one data type to extract
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Scraping Jobs
              </CardTitle>
              <CardDescription>Monitor your data extraction jobs</CardDescription>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No scraping jobs</h3>
                  <p className="text-muted-foreground">Start your first data extraction job</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div key={job.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium">{job.name}</h3>
                          <p className="text-sm text-muted-foreground">{job.url}</p>
                        </div>
                        <Badge
                          variant={
                            job.status === "completed"
                              ? "default"
                              : job.status === "running"
                                ? "secondary"
                                : job.status === "error"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {job.status}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} className="w-full" />
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          {job.dataTypes.map((type) => {
                            const dataType = dataTypes.find((dt) => dt.id === type)
                            if (!dataType) return null
                            const Icon = dataType.icon
                            return <Icon key={type} className="w-4 h-4 text-muted-foreground" />
                          })}
                          <span className="text-sm text-muted-foreground">{job.results} results</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Extracted Data
                  </CardTitle>
                  <CardDescription>View and export your scraped data</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportData("csv")}>
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportData("json")}>
                    <Download className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {scrapedData.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No data extracted yet</h3>
                  <p className="text-muted-foreground">Run a scraping job to see extracted data here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="email">Email Addresses</SelectItem>
                        <SelectItem value="phone">Phone Numbers</SelectItem>
                        <SelectItem value="names">Names</SelectItem>
                        <SelectItem value="companies">Companies</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Search data..." className="max-w-xs" />
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {scrapedData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const dataType = dataTypes.find((dt) => dt.id === item.type)
                              if (!dataType) return null
                              const Icon = dataType.icon
                              return <Icon className="w-4 h-4 text-muted-foreground" />
                            })()}
                            <div>
                              <p className="font-medium">{item.value}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.type} • {item.confidence}% confidence
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{new URL(item.source).hostname}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Scraper Settings
              </CardTitle>
              <CardDescription>Configure scraping behavior and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Respect robots.txt</Label>
                    <p className="text-sm text-muted-foreground">Follow website scraping guidelines</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Use proxy rotation</Label>
                    <p className="text-sm text-muted-foreground">Rotate IP addresses to avoid blocking</p>
                  </div>
                  <Switch />
                </div>

                <div className="space-y-2">
                  <Label>Request delay (seconds)</Label>
                  <Select defaultValue="2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 second</SelectItem>
                      <SelectItem value="2">2 seconds</SelectItem>
                      <SelectItem value="5">5 seconds</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Delay between requests to be respectful</p>
                </div>

                <div className="space-y-2">
                  <Label>Max pages per job</Label>
                  <Select defaultValue="100">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 pages</SelectItem>
                      <SelectItem value="50">50 pages</SelectItem>
                      <SelectItem value="100">100 pages</SelectItem>
                      <SelectItem value="500">500 pages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
