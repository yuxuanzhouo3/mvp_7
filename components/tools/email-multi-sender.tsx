"use client"

import type React from "react"
import { useState } from "react"
import { useLanguage } from "@/components/language-provider";
import { useTranslations } from '@/lib/i18n'

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
import { Upload, Mail, Users, FileText, Send, Clock, CheckCircle, AlertCircle, Eye, Settings, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

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
  status?: 'pending' | 'sent' | 'failed'
  error?: string
}

interface SmtpConfig {
  host: string
  port: string
  user: string
  pass: string
}

export function EmailMultiSender() {
  const { language } = useLanguage();
  const t  = useTranslations(language)

  const formatWithCount = (template: string | undefined, count: number) =>
    (template || "{count}").replace("{count}", String(count))
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [customSubject, setCustomSubject] = useState("")
  const [customContent, setCustomContent] = useState("")
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)
  
  // New State for Real Sending
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: "",
    port: "465",
    user: "",
    pass: ""
  })
  const [sendingRate, setSendingRate] = useState("normal") // slow, normal, fast
  const [sendStats, setSendStats] = useState({ success: 0, failed: 0 })
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '', company: '', position: '' })

  const handleAddRecipient = () => {
    if (!newRecipient.email) return
    setRecipients([...recipients, { ...newRecipient, email: newRecipient.email, name: newRecipient.name || newRecipient.email.split('@')[0] }])
    setNewRecipient({ name: '', email: '', company: '', position: '' })
  }

  const handleClearRecipients = () => {
    setRecipients([])
  }

  const fillSmtpPreset = (preset: string) => {
    switch (preset) {
      case 'gmail':
        setSmtpConfig({ ...smtpConfig, host: 'smtp.gmail.com', port: '465' })
        break
      case 'outlook':
        setSmtpConfig({ ...smtpConfig, host: 'smtp.office365.com', port: '587' })
        break
      case 'qq':
        setSmtpConfig({ ...smtpConfig, host: 'smtp.qq.com', port: '465' })
        break
      case '163':
        setSmtpConfig({ ...smtpConfig, host: 'smtp.163.com', port: '465' })
        break
    }
  }

  const templates: EmailTemplate[] = [
    {
      id: "job-application",
      name: t.emailMultiSender.jobApplication,
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
      name: t.emailMultiSender.followUp,
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
      name: t.emailMultiSender.networking,
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

    if (!file) return

    const fileType = String(file.type || "").toLowerCase()
    const fileName = String(file.name || "").toLowerCase()
    const isCsv = fileName.endsWith(".csv") || fileType.includes("csv") || fileType === "application/vnd.ms-excel"

    if (!isCsv) {
      toast.error("Please select a CSV file")
      return
    }

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

  const handleSendEmails = async () => {
    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      alert(t.emailMultiSender.smtpConfigureFirst || "Please configure SMTP settings first.")
      return
    }

    setIsSending(true)
    setSendProgress(0)
    setSendStats({ success: 0, failed: 0 })

    const total = recipients.length
    let processed = 0
    let successCount = 0
    let failedCount = 0
    
    // Determine delay based on rate
    let delay = 2000
    if (sendingRate === 'slow') delay = 5000
    if (sendingRate === 'fast') delay = 1000

    const template = templates.find(t => t.id === selectedTemplate)
    const baseSubject = selectedTemplate === 'custom' ? customSubject : template?.subject || ''
    const baseContent = selectedTemplate === 'custom' ? customContent : template?.content || ''

    // Helper to replace variables
    const processText = (text: string, r: Recipient) => {
      return text
        .replace(/{name}/g, r.name)
        .replace(/{company}/g, r.company || '')
        .replace(/{position}/g, r.position || '')
        .replace(/{email}/g, r.email)
    }

    const newRecipients = [...recipients]

    for (let i = 0; i < total; i++) {
       // Check if cancelled (optional implementation)
      
       const recipient = newRecipients[i]
       
       // Skip if already sent successfully (in case of retry)
       if (recipient.status === 'sent') {
         processed++
         successCount++
         continue
       }

       const subject = processText(baseSubject, recipient)
       const content = processText(baseContent, recipient)

       try {
         const response = await fetch('/api/tools/email-sender', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             smtpConfig,
             mailOptions: {
               to: recipient.email,
               subject: subject,
               html: content.replace(/\n/g, '<br/>'), // Simple plain text to HTML
               fromName: t.emailMultiSender.senderName || t.emailMultiSender.senderToolName || "Email Sender Tool"
             }
           })
         })

         const result = await response.json()

         if (result.success) {
           newRecipients[i].status = 'sent'
           newRecipients[i].error = undefined
           successCount++
         } else {
           newRecipients[i].status = 'failed'
           newRecipients[i].error = result.error
           failedCount++
         }
       } catch (error: any) {
          newRecipients[i].status = 'failed'
          newRecipients[i].error = error.message
          failedCount++
       }

       // Update UI
       setRecipients([...newRecipients]) // Trigger re-render to show per-user status
       setSendStats({ success: successCount, failed: failedCount })
       
       processed++
       setSendProgress(Math.round((processed / total) * 100))

       // Wait before next email
       if (i < total - 1) {
         await new Promise(resolve => setTimeout(resolve, delay))
       }
    }

    setIsSending(false)
    toast.success(t.emailMultiSender.campaignFinished || "Email campaign finished!", {
      description: `${t.emailMultiSender.sentCount || "Sent"}: ${successCount}, ${t.emailMultiSender.failedCount || "Failed"}: ${failedCount}`,
    })
  }

  const getTemplateContent = (template: EmailTemplate) => {
    return template.content.replace(/{(\w+)}/g, (match, key) => {
      switch (key) {
        case "name":
          return t.emailMultiSender.recipientName
        case "company":
          return t.emailMultiSender.companyName
        case "position":
          return t.emailMultiSender.positionTitle
        default:
          return match
      }
    })
  }

  const downloadSampleCsv = () => {
    const headers = "name,email,company,position"
    const sampleData = "John Doe,john@example.com,Tech Corp,Developer"
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + sampleData
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${t.emailMultiSender.sampleCsvName || "sample_recipients"}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const isConfigValid = smtpConfig.host && smtpConfig.user && smtpConfig.pass
  const isReadyToSend = recipients.length > 0 && selectedTemplate && isConfigValid

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <Tabs defaultValue="recipients" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recipients">{t.emailMultiSender.recipients}</TabsTrigger>
            <TabsTrigger value="template">{t.emailMultiSender.template}</TabsTrigger>
            <TabsTrigger value="configuration">{t.emailMultiSender.configTab}</TabsTrigger>
            <TabsTrigger value="settings">{t.emailMultiSender.settingsTab}</TabsTrigger>
          </TabsList>

          <TabsContent value="recipients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t.emailMultiSender.manageRecipients}
                </CardTitle>
                <CardDescription>{t.emailMultiSender.addManuallyOrImport}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* File Upload Area */}
                  <label
                    htmlFor="csv-upload"
                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="bg-primary/10 p-3 rounded-full mb-3">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium mb-1">{t.emailMultiSender.importCsv}</p>
                    <p className="text-xs text-muted-foreground mb-3">.csv file with headers: name, email, company, position</p>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        downloadSampleCsv()
                      }}
                      className="h-7 text-xs"
                    >
                      Download Sample CSV
                    </Button>
                  </label>

                  {/* Manual Add Form */}
                  <div className="space-y-3 p-4 border rounded-lg bg-card">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Plus className="w-4 h-4" /> {t.emailMultiSender.addManually}
                    </h3>
                    <div className="space-y-2">
                      <Input 
                        placeholder={t.emailMultiSender.placeholderEmail}
                        value={newRecipient.email}
                        onChange={(e) => setNewRecipient({...newRecipient, email: e.target.value})}
                        className="h-8"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          placeholder={t.emailMultiSender.placeholderName}
                          value={newRecipient.name}
                          onChange={(e) => setNewRecipient({...newRecipient, name: e.target.value})}
                          className="h-8"
                        />
                        <Input 
                          placeholder={t.emailMultiSender.placeholderCompany}
                          value={newRecipient.company}
                          onChange={(e) => setNewRecipient({...newRecipient, company: e.target.value})}
                          className="h-8"
                        />
                      </div>
                      <Button onClick={handleAddRecipient} disabled={!newRecipient.email} size="sm" className="w-full">
                        {t.emailMultiSender.addRecipient}
                      </Button>
                    </div>
                  </div>
                </div>

                {recipients.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium">{t.emailMultiSender.loadedRecipients}</h3>
                          <Badge variant="secondary">{recipients.length}</Badge>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleClearRecipients} className="text-red-500 hover:text-red-700 h-8">
                          <Trash2 className="w-4 h-4 mr-2" /> {t.emailMultiSender.clearAll}
                        </Button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                        {recipients.map((recipient, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted/40 hover:bg-muted border rounded-lg transition-colors group">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-sm truncate">{recipient.email}</p>
                                  {recipient.name && <Badge variant="outline" className="text-[10px] h-4 px-1">{recipient.name}</Badge>}
                                </div>
                                {(recipient.company || recipient.position) && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {recipient.position} {recipient.position && recipient.company && 'at'} {recipient.company}
                                    </p>
                                )}
                                {recipient.error && (
                                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {recipient.error}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 pl-2">
                                {recipient.status === 'sent' && <Badge variant="default" className="bg-green-500 hover:bg-green-600">Sent</Badge>}
                                {recipient.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                                {!recipient.status && <div className="w-2 h-2 rounded-full bg-slate-300" />}
                                <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                  const newRecipients = [...recipients];
                                  newRecipients.splice(index, 1);
                                  setRecipients(newRecipients);
                                }}>
                                  <X className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configuration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {t.emailMultiSender.smtpSettingsTitle}
                </CardTitle>
                <CardDescription>{t.emailMultiSender.smtpSettingsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 {/* Quick Presets */}
                 <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">{t.emailMultiSender.quickPresets}</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('gmail')} className="bg-white dark:bg-slate-950">Gmail</Button>
                      <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('outlook')} className="bg-white dark:bg-slate-950">Outlook</Button>
                      <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('qq')} className="bg-white dark:bg-slate-950">QQ Mail</Button>
                      <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('163')} className="bg-white dark:bg-slate-950">163 Mail</Button>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>{t.emailMultiSender.smtpHost}</Label>
                          <Input 
                            placeholder="smtp.example.com" 
                            value={smtpConfig.host}
                            onChange={(e) => setSmtpConfig({...smtpConfig, host: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.emailMultiSender.smtpPort}</Label>
                          <Input 
                            placeholder="465" 
                            value={smtpConfig.port}
                            onChange={(e) => setSmtpConfig({...smtpConfig, port: e.target.value})}
                          />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>{t.emailMultiSender.smtpUser}</Label>
                          <Input 
                            placeholder="your-email@example.com" 
                            value={smtpConfig.user}
                            onChange={(e) => setSmtpConfig({...smtpConfig, user: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.emailMultiSender.smtpPass}</Label>
                          <div className="relative">
                            <Input 
                              type="password"
                              placeholder={t.emailMultiSender.smtpHint || "App Password"} 
                              value={smtpConfig.pass}
                              onChange={(e) => setSmtpConfig({...smtpConfig, pass: e.target.value})}
                            />
                          </div>
                   
                        </div>
                    </div>
                 </div>
                 <div className="text-[12px] text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-blue-700 dark:text-blue-300 flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{t.emailMultiSender.smtpHint}</span>
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="template" className="space-y-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {t.emailMultiSender.emailTemplate}
                </CardTitle>
                <CardDescription>{t.emailMultiSender.chooseTemplate}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.emailMultiSender.chooseTemplatePlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                      ))}
                      <SelectItem value="custom">{t.emailMultiSender.customTemplate}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 pt-4">
                {selectedTemplate === "custom" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="custom-subject">{t.emailMultiSender.subjectLine}</Label>
                        <Input
                            id="custom-subject"
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                            placeholder={t.emailMultiSender.enterSubject}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="custom-content">{t.emailMultiSender.emailContent}</Label>
                        <div className="text-xs text-muted-foreground mb-2 flex flex-wrap gap-2">
                          <span>Variables:</span>
                          <Badge variant="outline" className="font-mono text-[10px]">{`{name}`}</Badge>
                          <Badge variant="outline" className="font-mono text-[10px]">{`{company}`}</Badge>
                          <Badge variant="outline" className="font-mono text-[10px]">{`{position}`}</Badge>
                        </div>
                        <Textarea
                            id="custom-content"
                            value={customContent}
                            onChange={(e) => setCustomContent(e.target.value)}
                            placeholder={t.emailMultiSender.enterContent}
                            className="min-h-[300px] font-mono text-sm leading-relaxed"
                        />
                      </div>
                    </>
                ) : selectedTemplate ? (
                    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t.emailMultiSender.subjectPreview}</Label>
                        <p className="font-medium p-2 bg-background rounded border text-sm">
                          {templates.find((t) => t.id === selectedTemplate)?.subject}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t.emailMultiSender.contentPreview}</Label>
                        <div className="p-3 bg-background rounded border h-[300px] overflow-y-auto">
                           <pre className="text-sm whitespace-pre-wrap font-sans">
                              {templates.find((t) => t.id === selectedTemplate)?.content}
                           </pre>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                         <AlertCircle className="w-3 h-3" />
                         <span>Select "Custom Template" to edit this content.</span>
                      </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
                        <FileText className="w-10 h-10 mb-2 opacity-20" />
                        <p>Select a template to view or edit</p>
                    </div>
                )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {t.emailMultiSender.campaignSettings}
                </CardTitle>
                <CardDescription>{t.emailMultiSender.configureOptions}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
                  <div className="space-y-1">
                    <Label className="text-base">{t.emailMultiSender.scheduleSending}</Label>
                    <p className="text-sm text-muted-foreground">{t.emailMultiSender.sendAtSpecificTime}</p>
                  </div>
                  <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
                </div>

                {isScheduled && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Label htmlFor="schedule-date">{t.emailMultiSender.date}</Label>
                        <Input
                            id="schedule-date"
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="schedule-time">{t.emailMultiSender.time}</Label>
                        <Input
                            id="schedule-time"
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                        />
                      </div>
                    </div>
                )}

                <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                  <div className="space-y-2">
                    <Label className="text-base">{t.emailMultiSender.sendingRate}</Label>
                    <div className="flex items-center gap-4">
                        <Select defaultValue="normal" value={sendingRate} onValueChange={setSendingRate}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="slow">{t.emailMultiSender.slowRate} (5s delay)</SelectItem>
                            <SelectItem value="normal">{t.emailMultiSender.normalRate} (2s delay)</SelectItem>
                            <SelectItem value="fast">{t.emailMultiSender.fastRate} (1s delay)</SelectItem>
                        </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">{t.emailMultiSender.avoidSpam}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="lg:col-span-4 space-y-6">
         {/* Summary Status Card */}
         <Card className="border-t-4 border-t-primary shadow-lg sticky top-6">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{t.emailMultiSender.campaignSummary || "Campaign Summary"}</span>
                {isSending ? (
                  <Badge variant="secondary" className="animate-pulse bg-green-100 text-green-700">{t.emailMultiSender.sendingLabel || "Sending..."}</Badge>
                ) : (
                  <Badge variant="outline">{t.emailMultiSender.draft || "Draft"}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
               {/* Stats */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/40 p-3 rounded-lg text-center">
                     <span className="block text-2xl font-bold">{recipients.length}</span>
                     <span className="text-xs text-muted-foreground uppercase tracking-wider">{t.emailMultiSender.recipientsLabel || "Recipients"}</span>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-lg text-center">
                     <span className="block text-2xl font-bold text-primary">
                        {isSending ? sendStats.success + sendStats.failed : 0}
                     </span>
                     <span className="text-xs text-muted-foreground uppercase tracking-wider">{t.emailMultiSender.sentLabel || "Sent"}</span>
                  </div>
               </div>

               {/* Checklist */}
               <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">{t.emailMultiSender.readinessChecklist || "Readiness Checklist"}</h4>
                  
                  <div className="flex items-center justify-between text-sm">
                     <span className="flex items-center gap-2">
                        {recipients.length > 0 ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                        {t.emailMultiSender.recipientsLabel || "Recipients"}
                     </span>
                     <span className="text-muted-foreground">{formatWithCount(t.emailMultiSender.addedCount, recipients.length)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                     <span className="flex items-center gap-2">
                        {selectedTemplate ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                        {t.emailMultiSender.templateLabel || t.emailMultiSender.template || "Template"}
                     </span>
                     <span className="text-muted-foreground max-w-[100px] truncate block text-right">
                       {selectedTemplate === 'custom' ? (t.emailMultiSender.custom || "Custom") : templates.find(t=>t.id === selectedTemplate)?.name || (t.emailMultiSender.none || 'None')}
                     </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                     <span className="flex items-center gap-2">
                        {isConfigValid ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                        {t.emailMultiSender.smtpConfigLabel || "SMTP Config"}
                     </span>
                     <span className="text-muted-foreground">{isConfigValid ? (t.emailMultiSender.ready || 'Ready') : (t.emailMultiSender.missing || 'Missing')}</span>
                  </div>
               </div>

               {isSending && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{t.emailMultiSender.sendingProgressLabel || t.emailMultiSender.sendingProgress || "Sending Progress"}</span>
                      <span className="text-sm text-muted-foreground">{sendProgress}%</span>
                    </div>
                    <Progress value={sendProgress} className="h-2 w-full" />
                    <div className="flex justify-between text-xs pt-1">
                       <span className="text-green-600 font-medium">{t.emailMultiSender.sentCount || "Sent"}: {sendStats.success}</span>
                       <span className="text-red-500 font-medium">{t.emailMultiSender.failedCount || "Failed"}: {sendStats.failed}</span>
                    </div>
                  </div>
               )}

               <div className="pt-2 gap-3 flex flex-col">
                  <Button 
                    className="w-full text-lg h-12 shadow-md" 
                    size="lg" 
                    disabled={!isReadyToSend || isSending}
                    onClick={handleSendEmails}
                  >
                     {isSending ? (
                        <>
                          <Clock className="w-5 h-5 mr-2 animate-spin" />
                          {t.emailMultiSender.sendingLabel || "Sending..."}
                        </>
                    ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          {isScheduled ? t.emailMultiSender.scheduleCampaign : t.emailMultiSender.sendNow}
                        </>
                    )}
                  </Button>
                  
                  {!isReadyToSend && !isSending && (
                    <p className="text-xs text-center text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded">
                       {!isConfigValid ? (t.emailMultiSender.configureSmtpFirstInline || "Configure SMTP settings first.") : 
                        recipients.length === 0 ? (t.emailMultiSender.addRecipientsInline || "Add recipients to continue.") : (t.emailMultiSender.selectTemplateInline || "Select a template to continue.")}
                    </p>
                  )}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}
