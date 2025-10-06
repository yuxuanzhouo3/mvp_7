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
import {
  Upload,
  MessageSquare,
  Users,
  FileText,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Settings,
  Smartphone,
  MessageCircle,
} from "lucide-react"

interface MessageTemplate {
  id: string
  name: string
  content: string
  platform: "sms" | "whatsapp"
}

interface Contact {
  phone: string
  name: string
  company?: string
}

export function TextMultiSender() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [customMessage, setCustomMessage] = useState("")
  const [selectedPlatform, setSelectedPlatform] = useState<"sms" | "whatsapp">("sms")
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)

  const templates: MessageTemplate[] = [
    {
      id: "job-inquiry",
      name: "Job Inquiry",
      platform: "sms",
      content:
        "Hi {name}, I'm interested in opportunities at {company}. Could we schedule a brief call to discuss potential roles? Thanks!",
    },
    {
      id: "follow-up",
      name: "Follow-up",
      platform: "sms",
      content: "Hi {name}, following up on my application. Would love to hear about next steps. Thanks for your time!",
    },
    {
      id: "networking",
      name: "Networking",
      platform: "whatsapp",
      content:
        "Hi {name}! I came across your profile and would love to connect. Are you open to a quick chat about the industry?",
    },
    {
      id: "thank-you",
      name: "Thank You",
      platform: "sms",
      content:
        "Thank you for taking the time to speak with me today, {name}. I'm excited about the opportunity at {company}!",
    },
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "text/csv") {
      // Mock CSV parsing
      const mockContacts: Contact[] = [
        { phone: "+1234567890", name: "John Doe", company: "Tech Corp" },
        { phone: "+1234567891", name: "Jane Smith", company: "StartupXYZ" },
        { phone: "+1234567892", name: "Mike Johnson", company: "Enterprise Inc" },
        { phone: "+1234567893", name: "Sarah Wilson", company: "Innovation Labs" },
      ]
      setContacts(mockContacts)
    }
  }

  const handleSendMessages = async () => {
    setIsSending(true)
    setSendProgress(0)

    // Mock sending process
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      setSendProgress(i)
    }

    setIsSending(false)
    setSendProgress(0)
  }

  const getTemplateContent = (template: MessageTemplate) => {
    return template.content.replace(/{(\w+)}/g, (match, key) => {
      switch (key) {
        case "name":
          return "[Contact Name]"
        case "company":
          return "[Company Name]"
        default:
          return match
      }
    })
  }

  const filteredTemplates = templates.filter((t) => t.platform === selectedPlatform)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[color:var(--job-application)]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[color:var(--job-application)]" />
              <CardTitle className="text-lg">Contacts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
            <p className="text-sm text-muted-foreground">Phone numbers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {selectedPlatform === "sms" ? (
                <Smartphone className="w-5 h-5 text-blue-500" />
              ) : (
                <MessageCircle className="w-5 h-5 text-blue-500" />
              )}
              <CardTitle className="text-lg">Platform</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedPlatform.toUpperCase()}</div>
            <p className="text-sm text-muted-foreground">Message platform</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-lg">Template</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedTemplate ? "Selected" : "None"}</div>
            <p className="text-sm text-muted-foreground">Message template</p>
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

      <Tabs defaultValue="contacts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="template">Template</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="send">Send</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Contacts
              </CardTitle>
              <CardDescription>Upload a CSV file with columns: phone, name, company</CardDescription>
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

              {contacts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Loaded Contacts</h3>
                    <Badge variant="secondary">{contacts.length} contacts</Badge>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {contacts.map((contact, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">{contact.phone}</p>
                          {contact.company && <p className="text-xs text-muted-foreground">{contact.company}</p>}
                        </div>
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Platform</CardTitle>
              <CardDescription>Choose between SMS and WhatsApp messaging</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className={`cursor-pointer transition-all ${selectedPlatform === "sms" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedPlatform("sms")}
                >
                  <CardHeader className="text-center">
                    <Smartphone className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                    <CardTitle>SMS</CardTitle>
                    <CardDescription>Traditional text messaging</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      <li>• Universal compatibility</li>
                      <li>• High delivery rates</li>
                      <li>• Character limit: 160</li>
                      <li>• Cost: $0.01 per message</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    selectedPlatform === "whatsapp" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedPlatform("whatsapp")}
                >
                  <CardHeader className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <CardTitle>WhatsApp</CardTitle>
                    <CardDescription>Rich messaging platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      <li>• Rich media support</li>
                      <li>• Read receipts</li>
                      <li>• Character limit: 4096</li>
                      <li>• Cost: $0.005 per message</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="template" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Template</CardTitle>
              <CardDescription>Choose a template or create a custom message</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && selectedTemplate !== "custom" && (
                <div className="space-y-2">
                  <Label>Message Preview</Label>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {getTemplateContent(filteredTemplates.find((t) => t.id === selectedTemplate)!)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Character count: {filteredTemplates.find((t) => t.id === selectedTemplate)?.content.length || 0}
                    {selectedPlatform === "sms" && " / 160"}
                    {selectedPlatform === "whatsapp" && " / 4096"}
                  </p>
                </div>
              )}

              {selectedTemplate === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="custom-message">Custom Message</Label>
                  <Textarea
                    id="custom-message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Enter your message. Use {name} and {company} for personalization"
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Character count: {customMessage.length}
                    {selectedPlatform === "sms" && " / 160"}
                    {selectedPlatform === "whatsapp" && " / 4096"}
                  </p>
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
                  <p className="text-sm text-muted-foreground">Send messages at a specific time</p>
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
                      <SelectItem value="slow">Slow (1 message/minute)</SelectItem>
                      <SelectItem value="normal">Normal (5 messages/minute)</SelectItem>
                      <SelectItem value="fast">Fast (10 messages/minute)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Slower rates help avoid spam detection</p>
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
              <CardDescription>Review and send your message campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Contacts</Label>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{contacts.length} contacts</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <div className="flex items-center gap-2">
                    {selectedPlatform === "sms" ? (
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">{selectedPlatform.toUpperCase()}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {selectedTemplate === "custom"
                        ? "Custom Message"
                        : filteredTemplates.find((t) => t.id === selectedTemplate)?.name || "None selected"}
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
                  onClick={handleSendMessages}
                  disabled={contacts.length === 0 || !selectedTemplate || isSending}
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

              {contacts.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">Please upload contacts before sending</p>
                </div>
              )}

              {!selectedTemplate && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">Please select a message template</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
