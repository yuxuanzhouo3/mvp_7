"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, Mail, Users, FileText, Send, Clock, CheckCircle, AlertCircle, Eye, Settings, Save, Trash2, BarChart3, HelpCircle, History } from "lucide-react"

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

interface Campaign {
  id: string
  name: string
  sentAt: string
  totalRecipients: number
  successCount: number
  failedCount: number
  openCount: number
}

interface SmtpConfig {
  host: string
  port: string
  user: string
  pass: string
  from: string
}

const defaultTemplates: EmailTemplate[] = [
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

export function EmailMultiSender() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates)
  const [customSubject, setCustomSubject] = useState("")
  const [customContent, setCustomContent] = useState("")
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: "",
    port: "587",
    user: "",
    pass: "",
    from: "",
  })
  const [saveTemplateName, setSaveTemplateName] = useState("")
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("recipients")

  useEffect(() => {
    const savedTemplates = localStorage.getItem("emailTemplates")
    if (savedTemplates) {
      const parsed = JSON.parse(savedTemplates)
      setTemplates([...defaultTemplates, ...parsed])
    }

    const savedCampaigns = localStorage.getItem("emailCampaigns")
    if (savedCampaigns) {
      setCampaigns(JSON.parse(savedCampaigns))
    }

    const savedSmtp = localStorage.getItem("smtpConfig")
    if (savedSmtp) {
      setSmtpConfig(JSON.parse(savedSmtp))
    }
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "text/csv") {
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

  const handleSaveTemplate = () => {
    if (!saveTemplateName || (!customSubject && !customContent)) return

    const newTemplate: EmailTemplate = {
      id: `custom-${Date.now()}`,
      name: saveTemplateName,
      subject: customSubject,
      content: customContent,
    }

    const existingCustomTemplates = templates.filter(t => !defaultTemplates.find(dt => dt.id === t.id))
    const updatedTemplates = [...existingCustomTemplates, newTemplate]
    
    localStorage.setItem("emailTemplates", JSON.stringify(updatedTemplates))
    setTemplates([...defaultTemplates, ...updatedTemplates])
    setShowSaveTemplateDialog(false)
    setSaveTemplateName("")
  }

  const handleDeleteTemplate = (templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId)
    const customTemplatesToSave = updatedTemplates.filter(t => !defaultTemplates.find(dt => dt.id === t.id))
    localStorage.setItem("emailTemplates", JSON.stringify(customTemplatesToSave))
    setTemplates(updatedTemplates)
    if (selectedTemplate === templateId) {
      setSelectedTemplate("")
    }
  }

  const handleSaveSmtpConfig = () => {
    localStorage.setItem("smtpConfig", JSON.stringify(smtpConfig))
  }

  const handleSendEmails = async () => {
    setIsSending(true)
    setSendProgress(0)

    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      setSendProgress(i)
    }

    const successCount = Math.floor(recipients.length * 0.9)
    const failedCount = recipients.length - successCount

    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name: `Campaign ${new Date().toLocaleDateString()}`,
      sentAt: new Date().toISOString(),
      totalRecipients: recipients.length,
      successCount,
      failedCount,
      openCount: 0,
    }

    const updatedCampaigns = [newCampaign, ...campaigns]
    localStorage.setItem("emailCampaigns", JSON.stringify(updatedCampaigns))
    setCampaigns(updatedCampaigns)

    setIsSending(false)
    setSendProgress(0)
    setActiveTab("history")
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

  const isDefaultTemplate = (templateId: string) => {
    return defaultTemplates.some(dt => dt.id === templateId)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <BarChart3 className="w-5 h-5 text-green-500" />
              <CardTitle className="text-lg">Campaigns</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-sm text-muted-foreground">Total sent</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-lg">Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ready</div>
            <p className="text-sm text-muted-foreground">Campaign status</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="recipients">Recipients</TabsTrigger>
          <TabsTrigger value="template">Template</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
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
              <CardDescription>Choose a template, create a custom email, or save your template for later</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Template</Label>
                <div className="flex gap-2">
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate} className="flex-1">
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{template.name}</span>
                            {!isDefaultTemplate(template.id) && <Badge variant="outline" className="ml-2">Custom</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom Template</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedTemplate && !isDefaultTemplate(selectedTemplate) && (
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteTemplate(selectedTemplate)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
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
                  <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Save Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Template</DialogTitle>
                        <DialogDescription>Save your custom template for future use</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Template Name</Label>
                          <Input
                            value={saveTemplateName}
                            onChange={(e) => setSaveTemplateName(e.target.value)}
                            placeholder="My Awesome Template"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveTemplate}>Save</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
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
                SMTP Configuration
              </CardTitle>
              <CardDescription>Configure your email provider settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                    placeholder="smtp.126.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input
                    id="smtp-port"
                    value={smtpConfig.port}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-user">Email Address</Label>
                <Input
                  id="smtp-user"
                  value={smtpConfig.user}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                  placeholder="your-email@126.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-pass">App Password / Authorization Code</Label>
                <Input
                  id="smtp-pass"
                  type="password"
                  value={smtpConfig.pass}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                  placeholder="Enter your app password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-from">From Name</Label>
                <Input
                  id="smtp-from"
                  value={smtpConfig.from}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, from: e.target.value })}
                  placeholder="Your Name"
                />
              </div>
              <Button onClick={handleSaveSmtpConfig} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Configuration
              </Button>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Best Practices to Avoid Bounces
                </h4>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>⚠️ <strong>Important Note:</strong> 126 and other free email providers have strict sending limits</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Send max 20-30 emails/hour to avoid triggering spam filters</li>
                    <li>Use a dedicated domain and professional email service for mass emails</li>
                    <li>Consider using SendGrid, Mailgun, or AWS SES for large campaigns</li>
                    <li>Warm up your new email address by sending to friends first</li>
                    <li>Always include an unsubscribe link in your emails</li>
                    <li>Verify recipient emails before sending to reduce bounces</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
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
                  <Select defaultValue="slow">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="very-slow">Very Slow (1 email/5 minutes)</SelectItem>
                      <SelectItem value="slow">Slow (1 email/minute)</SelectItem>
                      <SelectItem value="normal">Normal (3 emails/minute)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Slower rates help avoid spam filters and account restrictions</p>
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

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Campaign History
              </CardTitle>
              <CardDescription>View past campaigns, success rates, and track opens</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No campaigns sent yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {campaigns.reduce((sum, c) => sum + c.totalRecipients, 0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {campaigns.length > 0 
                            ? Math.round((campaigns.reduce((sum, c) => sum + c.successCount, 0) / 
                                campaigns.reduce((sum, c) => sum + c.totalRecipients, 0)) * 100)
                            : 0}%
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Opened</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {campaigns.reduce((sum, c) => sum + c.openCount, 0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Failed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {campaigns.reduce((sum, c) => sum + c.failedCount, 0)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Success</TableHead>
                          <TableHead>Failed</TableHead>
                          <TableHead>Opened</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaigns.map((campaign) => (
                          <TableRow key={campaign.id}>
                            <TableCell className="font-medium">{campaign.name}</TableCell>
                            <TableCell>{new Date(campaign.sentAt).toLocaleDateString()}</TableCell>
                            <TableCell>{campaign.totalRecipients}</TableCell>
                            <TableCell className="text-green-600">{campaign.successCount}</TableCell>
                            <TableCell className="text-red-600">{campaign.failedCount}</TableCell>
                            <TableCell className="text-blue-600">{campaign.openCount}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {Math.round((campaign.successCount / campaign.totalRecipients) * 100)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
