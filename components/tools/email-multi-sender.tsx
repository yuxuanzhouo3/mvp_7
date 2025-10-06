"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Upload, Mail, Users, FileText, Send, Clock, CheckCircle, AlertCircle, Eye, Settings } from "lucide-react"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
}

interface Recipient {
  email: string
  name: string
  company?: string
  position?: string
}

export function EmailMultiSender() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [customSubject, setCustomSubject] = useState("")
  const [customContent, setCustomContent] = useState("")
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)

  const templates: EmailTemplate[] = [
    {
      id: "job-application",
      name: "Job Application",
      subject: "Application for {position} at {company}",
      content: `Dear Hiring Manager,

I am writing to express my interest in the {position} position at {company}. With my background in software development and passion for innovation, I believe I would be a valuable addition to your team.

I have attached my resume for your review and would welcome the opportunity to discuss how my skills and experience align with your needs.

Thank you for your consideration.

Best regards,
{name}`,
    },
    {
      id: "follow-up",
      name: "Follow-up",
      subject: "Following up on my application for {position}",
      content: `Dear {name},

I hope this email finds you well. I wanted to follow up on my application for the {position} position at {company} that I submitted last week.

I remain very interested in this opportunity and would be happy to provide any additional information you might need.

Thank you for your time and consideration.

Best regards,
{name}`,
    },
    {
      id: "networking",
      name: "Networking",
      subject: "Connecting with a fellow professional",
      content: `Hi {name},

I hope you're doing well. I came across your profile and was impressed by your work at {company}. I'm currently exploring opportunities in the industry and would love to connect.

Would you be open to a brief chat about your experience and any insights you might have about the field?

Thank you for your time.

Best regards,
{name}`,
    },
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "text/csv") {
      // Mock CSV parsing
      const mockRecipients: Recipient[] = [
        { email: "john.doe@company.com", name: "John Doe", company: "Tech Corp", position: "Software Engineer" },
        { email: "jane.smith@startup.com", name: "Jane Smith", company: "StartupXYZ", position: "Product Manager" },
        {
          email: "mike.johnson@enterprise.com",
          name: "Mike Johnson",
          company: "Enterprise Inc",
          position: "Senior Developer",
        },
      ]
      setRecipients(mockRecipients)
    }
  }

  const handleSendEmails = async () => {
    setIsSending(true)
    setSendProgress(0)

    // Mock sending process
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      setSendProgress(i)
    }

    setIsSending(false)
    setSendProgress(0)
  }

  const getTemplateContent = (template: EmailTemplate) => {
    return template.content.replace(/{(\w+)}/g, (match, key) => {
      switch (key) {
        case "name":
          return "[Recipient Name]"
        case "company":
          return "[Company Name]"
        case "position":
          return "[Position Title]"
        default:
          return match
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-[color:var(--job-application)]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[color:var(--job-application)]" />
              <CardTitle className="text-lg">Recipients</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recipients.length}</div>
            <p className="text-sm text-muted-foreground">Contacts loaded</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">Template</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedTemplate ? "Selected" : "None"}</div>
            <p className="text-sm text-muted-foreground">Email template</p>
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
            <div className="text-2xl font-bold">Ready</div>
            <p className="text-sm text-muted-foreground">Campaign status</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recipients" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recipients">Recipients</TabsTrigger>
          <TabsTrigger value="template">Template</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="send">Send</TabsTrigger>
        </TabsList>

        <TabsContent value="recipients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Recipients
              </CardTitle>
              <CardDescription>Upload a CSV file with columns: email, name, company, position</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Drop your CSV file here or click to browse</p>
                  <p className="text-xs text-muted-foreground">Supports CSV files up to 10MB</p>
                </div>
                <Input type="file" accept=".csv" onChange={handleFileUpload} className="mt-4 max-w-xs mx-auto" />
              </div>

              {recipients.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Loaded Recipients</h3>
                    <Badge variant="secondary">{recipients.length} contacts</Badge>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {recipients.map((recipient, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{recipient.name}</p>
                          <p className="text-sm text-muted-foreground">{recipient.email}</p>
                          {recipient.company && (
                            <p className="text-xs text-muted-foreground">
                              {recipient.position} at {recipient.company}
                            </p>
                          )}
                        </div>
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="template" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Template</CardTitle>
              <CardDescription>Choose a template or create a custom email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && selectedTemplate !== "custom" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject Preview</Label>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        {templates.find((t) => t.id === selectedTemplate)?.subject.replace(/{(\w+)}/g, "[$1]")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Content Preview</Label>
                    <div className="p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap">
                        {getTemplateContent(templates.find((t) => t.id === selectedTemplate)!)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {selectedTemplate === "custom" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom-subject">Subject Line</Label>
                    <Input
                      id="custom-subject"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Enter email subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-content">Email Content</Label>
                    <Textarea
                      id="custom-content"
                      value={customContent}
                      onChange={(e) => setCustomContent(e.target.value)}
                      placeholder="Enter email content. Use {name}, {company}, {position} for personalization"
                      rows={10}
                    />
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
                Campaign Settings
              </CardTitle>
              <CardDescription>Configure sending options and scheduling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Schedule Sending</Label>
                  <p className="text-sm text-muted-foreground">Send emails at a specific time</p>
                </div>
                <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
              </div>

              {isScheduled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="schedule-date">Date</Label>
                    <Input
                      id="schedule-date"
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schedule-time">Time</Label>
                    <Input
                      id="schedule-time"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Sending Rate</Label>
                  <Select defaultValue="normal">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">Slow (1 email/minute)</SelectItem>
                      <SelectItem value="normal">Normal (5 emails/minute)</SelectItem>
                      <SelectItem value="fast">Fast (10 emails/minute)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Slower rates help avoid spam filters</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send Campaign
              </CardTitle>
              <CardDescription>Review and send your email campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recipients</Label>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{recipients.length} contacts</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {selectedTemplate === "custom"
                        ? "Custom Template"
                        : templates.find((t) => t.id === selectedTemplate)?.name || "None selected"}
                    </span>
                  </div>
                </div>
              </div>

              {isSending && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Sending Progress</Label>
                    <span className="text-sm text-muted-foreground">{sendProgress}%</span>
                  </div>
                  <Progress value={sendProgress} className="w-full" />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleSendEmails}
                  disabled={recipients.length === 0 || !selectedTemplate || isSending}
                  className="flex-1"
                >
                  {isSending ? (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Sending...
                    </>
                  ) : isScheduled ? (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Schedule Campaign
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Now
                    </>
                  )}
                </Button>
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>

              {recipients.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Please upload recipients before sending
                  </p>
                </div>
              )}

              {!selectedTemplate && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">Please select an email template</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
