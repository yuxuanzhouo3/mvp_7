"use client"

import { useState } from "react"
import { useLanguage } from "@/components/language-provider"
import { t } from "@/lib/i18n"
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
  Link as LinkIcon,
} from "lucide-react"
import { toast } from "sonner"

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
  const { language } = useLanguage()
  const tr = (key: string) => t(language, `dataScraperTool.${key}`)

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
    { id: "email", name: tr("emailAddresses"), icon: Mail, description: tr("extractEmailAddresses") },
    { id: "phone", name: tr("phoneNumbers"), icon: Phone, description: tr("findPhoneNumbers") },
    { id: "names", name: tr("names"), icon: User, description: tr("extractNames") },
    { id: "companies", name: tr("companies"), icon: Building, description: tr("businessNames") },
    { id: "links", name: tr("links"), icon: LinkIcon, description: tr("urlsAndLinks") },
    { id: "text", name: tr("customText"), icon: FileText, description: tr("customPatterns") },
  ]

  const handleDataTypeToggle = (typeId: string) => {
    setSelectedDataTypes((prev) => (prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]))
  }

  const handleStartScraping = async () => {
    if (!currentJob.url || selectedDataTypes.length === 0) {
      toast.error(tr("enterUrlSelectType"))
      return
    }

    let urlObj: URL;
    try {
       urlObj = new URL(currentJob.url);
    } catch (e) {
       toast.error(tr("invalidUrlFormat"))
       return
    }

    const newJob: ScrapingJob = {
      id: Date.now().toString(),
      name: currentJob.name || `Scrape ${urlObj.hostname}`,
      url: currentJob.url,
      dataTypes: selectedDataTypes,
      status: "running",
      progress: 0,
      results: 0,
    }

    setJobs((prev) => [...prev, newJob])
    setIsRunning(true)
    
    // Fake progress starter
    setJobs((prev) => prev.map((job) => (job.id === newJob.id ? { ...job, progress: 10 } : job)))

    try {
      // Real API Call
      const response = await fetch('/api/tools/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: currentJob.url,
          dataTypes: selectedDataTypes
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Scraping failed');
      }

      setScrapedData((prev) => [...prev, ...result.data]);
      
      setJobs((prev) => prev.map((job) => (job.id === newJob.id ? { 
        ...job, 
        status: "completed", 
        progress: 100,
        results: result.count
      } : job)));

      toast.success(`Scraping completed! Found ${result.count} items.`);

    } catch (error: any) {
      console.error(error);
      setJobs((prev) => prev.map((job) => (job.id === newJob.id ? { ...job, status: "error", progress: 0 } : job)));
      toast.error(`Scraping failed: ${error.message}`);
    } finally {
      setIsRunning(false)
      setCurrentJob({ name: "", url: "", dataTypes: [] })
      setSelectedDataTypes([])
    }
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
              <CardTitle className="text-lg">{tr("jobs")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
            <p className="text-sm text-muted-foreground">{tr("activeJobs")}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">{tr("dataFound")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scrapedData.length}</div>
            <p className="text-sm text-muted-foreground">{tr("results")}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <CardTitle className="text-lg">Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.filter((j) => j.status === "completed").length}</div>
            <p className="text-sm text-muted-foreground">{tr("completed")}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-lg">{tr("sources")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(scrapedData.map((d) => d.source)).size}</div>
            <p className="text-sm text-muted-foreground">{tr("uniqueWebsites")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scraper" className="space-y-6">
        <div className="overflow-x-auto pb-1 scrollbar-hide">
          <TabsList className="flex w-max min-w-full md:grid md:grid-cols-4">
            <TabsTrigger value="scraper" className="px-4">{tr("scraper")}</TabsTrigger>
            <TabsTrigger value="jobs" className="px-4">{tr("jobs")}</TabsTrigger>
            <TabsTrigger value="data" className="px-4">{tr("data")}</TabsTrigger>
            <TabsTrigger value="settings" className="px-4">{tr("settings")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="scraper" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {tr("webScraper")}
              </CardTitle>
              <CardDescription>{tr("extractDataFromWebsites")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job-name">{tr("jobName")}</Label>
                  <Input
                    id="job-name"
                    value={currentJob.name || ""}
                    onChange={(e) => setCurrentJob((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={tr("myScrappingJob")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-url">{tr("targetUrl")}</Label>
                  <Input
                    id="target-url"
                    value={currentJob.url || ""}
                    onChange={(e) => setCurrentJob((prev) => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>{tr("dataTypesToExtract")}</Label>
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
                      {tr("scraping")}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      {tr("startScraping")}
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
                {tr("jobs")}
              </CardTitle>
              <CardDescription>{t(language, "tools.dataScraper.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{tr("noJobsYet")}</h3>
                  <p className="text-muted-foreground">{tr("startAScrapingJob")}</p>
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
                          {tr(job.status)}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{tr("progress")}</span>
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
                          <span className="text-sm text-muted-foreground">{job.results} {tr("results")}</span>
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
                    {tr("dataFound")}
                  </CardTitle>
                  <CardDescription>{t(language, "tools.dataScraper.description")}</CardDescription>
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
                {tr("scraperSettings")}
              </CardTitle>
              <CardDescription>{tr("configureScrapingBehavior")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>{tr("respectRobotsTxt")}</Label>
                    <p className="text-sm text-muted-foreground">{tr("followWebsiteGuidelines")}</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>{tr("useProxyRotation")}</Label>
                    <p className="text-sm text-muted-foreground">{tr("rotateIPAddresses")}</p>
                  </div>
                  <Switch />
                </div>

                <div className="space-y-2">
                  <Label>{tr("requestDelay")}</Label>
                  <Select defaultValue="2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{tr("oneSecond")}</SelectItem>
                      <SelectItem value="2">{tr("twoSeconds")}</SelectItem>
                      <SelectItem value="5">{tr("fiveSeconds")}</SelectItem>
                      <SelectItem value="10">{tr("tenSeconds")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{tr("delayBetweenRequests")}</p>
                </div>

                <div className="space-y-2">
                  <Label>{tr("maxPagesPerJob")}</Label>
                  <Select defaultValue="100">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">{tr("tenPages")}</SelectItem>
                      <SelectItem value="50">{tr("fiftyPages")}</SelectItem>
                      <SelectItem value="100">{tr("hundredPages")}</SelectItem>
                      <SelectItem value="500">{tr("fiveHundredPages")}</SelectItem>
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
