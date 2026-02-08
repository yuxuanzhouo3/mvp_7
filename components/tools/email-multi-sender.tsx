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
import { Upload, Mail, Users, FileText, Send, Clock, CheckCircle, AlertCircle, Eye, Settings, Plus, Trash2 } from "lucide-react"
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
    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      alert("Please configure SMTP settings first.")
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
               fromName: t.emailMultiSender.senderName || "Email Sender Tool"
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
    toast.success("Email campaign finished!", {
      description: `Sent: ${successCount}, Failed: ${failedCount}`,
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

  return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-[color:var(--job-application)]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[color:var(--job-application)]" />
                <CardTitle className="text-lg">{t.emailMultiSender.recipients}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recipients.length}</div>
              <p className="text-sm text-muted-foreground">{t.emailMultiSender.contactsLoaded}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-lg">{t.emailMultiSender.template}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedTemplate ? t.emailMultiSender.selected : t.emailMultiSender.none}</div>
              <p className="text-sm text-muted-foreground">{t.emailMultiSender.campaignStatus}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <CardTitle className="text-lg">{t.emailMultiSender.status}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{t.emailMultiSender.ready}</div>
              <p className="text-sm text-muted-foreground">{t.emailMultiSender.campaignStatus}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="recipients" className="space-y-6">
          <div className="overflow-x-auto pb-1 scrollbar-hide">
            <TabsList className="flex w-max min-w-full md:grid md:grid-cols-5">
              <TabsTrigger value="recipients" className="px-4">{t.emailMultiSender.recipients}</TabsTrigger>
              <TabsTrigger value="configuration" className="px-4">{t.emailMultiSender.configTab}</TabsTrigger>
              <TabsTrigger value="template" className="px-4">{t.emailMultiSender.template}</TabsTrigger>
              <TabsTrigger value="settings" className="px-4">{t.emailMultiSender.settingsTab}</TabsTrigger>
              <TabsTrigger value="send" className="px-4">{t.emailMultiSender.sendTab}</TabsTrigger>
            </TabsList>
          </div>

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
                
                {/* Manual Add Form */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h3 className="text-sm font-medium">{t.emailMultiSender.addManually}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Input 
                       placeholder={t.emailMultiSender.placeholderEmail}
                       value={newRecipient.email}
                       onChange={(e) => setNewRecipient({...newRecipient, email: e.target.value})}
                     />
                     <Input 
                       placeholder={t.emailMultiSender.placeholderName}
                       value={newRecipient.name}
                       onChange={(e) => setNewRecipient({...newRecipient, name: e.target.value})}
                     />
                     <Input 
                       placeholder={t.emailMultiSender.placeholderCompany}
                       value={newRecipient.company}
                       onChange={(e) => setNewRecipient({...newRecipient, company: e.target.value})}
                     />
                     <Input 
                       placeholder={t.emailMultiSender.placeholderPosition}
                       value={newRecipient.position}
                       onChange={(e) => setNewRecipient({...newRecipient, position: e.target.value})}
                     />
                  </div>
                  <Button onClick={handleAddRecipient} disabled={!newRecipient.email} size="sm">
                    <Plus className="w-4 h-4 mr-2" /> {t.emailMultiSender.addRecipient}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Label htmlFor="csv-upload" className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2">
                         <Upload className="w-4 h-4 mr-2" /> {t.emailMultiSender.importCsv}
                      </Label>
                      <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                      <p className="text-xs text-muted-foreground ml-2">(.csv with name, email, company columns)</p>
                   </div>
                   
                   {recipients.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={handleClearRecipients} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4 mr-2" /> {t.emailMultiSender.clearAll}
                      </Button>
                   )}
                </div>

                {recipients.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">{t.emailMultiSender.loadedRecipients}</h3>
                        <Badge variant="secondary">{recipients.length} {t.emailMultiSender.contacts}</Badge>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {recipients.map((recipient, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium">{recipient.name}</p>
                                <p className="text-sm text-muted-foreground">{recipient.email}</p>
                                {recipient.company && (
                                    <p className="text-xs text-muted-foreground">
                                      {recipient.position} at {recipient.company}
                                    </p>
                                )}
                                {recipient.error && (
                                  <p className="text-xs text-red-500 mt-1">Error: {recipient.error}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {recipient.status === 'sent' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                {recipient.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                {!recipient.status && <Mail className="w-4 h-4 text-muted-foreground" />}
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                       <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                       <p>{t.emailMultiSender.noRecipientsYet}</p>
                       <p className="text-sm">{t.emailMultiSender.addManuallyOrImport}</p>
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
                 <div className="space-y-2">
                    <Label>{t.emailMultiSender.quickPresets}</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('gmail')}>{t.emailMultiSender.presetGmail}</Button>
                      <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('outlook')}>{t.emailMultiSender.presetOutlook}</Button>
                      <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('qq')}>{t.emailMultiSender.presetQQ}</Button>
                      <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('163')}>{t.emailMultiSender.preset163}</Button>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
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

                 <div className="grid grid-cols-2 gap-4">
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
                       <Input 
                         type="password"
                         placeholder="App Password (Not login password)" 
                         value={smtpConfig.pass}
                         onChange={(e) => setSmtpConfig({...smtpConfig, pass: e.target.value})}
                       />
                       <p className="text-xs text-muted-foreground">
                         {t.emailMultiSender.smtpHint}
                       </p>
                    </div>
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="template" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t.emailMultiSender.emailTemplate}</CardTitle>
                <CardDescription>{t.emailMultiSender.chooseTemplate}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.emailMultiSender.emailTemplate}</Label>
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

                {selectedTemplate && selectedTemplate !== "custom" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t.emailMultiSender.subjectPreview}</Label>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm">
                            {templates.find((t) => t.id === selectedTemplate)?.subject.replace(/{(\w+)}/g, "[$1]")}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t.emailMultiSender.contentPreview}</Label>
                        <div className="p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap">
                        {getTemplateContent(templates.find((t) => t.id === selectedTemplate)!)}</pre>
                        </div>
                      </div>
                    </div>
                )}

                {selectedTemplate === "custom" && (
                    <div className="space-y-4">
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
                        <Textarea
                            id="custom-content"
                            value={customContent}
                            onChange={(e) => setCustomContent(e.target.value)}
                            placeholder={t.emailMultiSender.enterContent}
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
                  {t.emailMultiSender.campaignSettings}
                </CardTitle>
                <CardDescription>{t.emailMultiSender.configureOptions}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>{t.emailMultiSender.scheduleSending}</Label>
                    <p className="text-sm text-muted-foreground">{t.emailMultiSender.sendAtSpecificTime}</p>
                  </div>
                  <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
                </div>

                {isScheduled && (
                    <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t.emailMultiSender.sendingRate}</Label>
                    <Select defaultValue="normal" value={sendingRate} onValueChange={setSendingRate}>
                      <SelectTrigger>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="send" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  {t.emailMultiSender.sendCampaign}
                </CardTitle>
                <CardDescription>{t.emailMultiSender.reviewSend}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.emailMultiSender.recipients}</Label>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{recipients.length} {t.emailMultiSender.contacts}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.emailMultiSender.template}</Label>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                      {selectedTemplate === "custom"
                          ? t.emailMultiSender.customTemplate
                          : templates.find((t) => t.id === selectedTemplate)?.name || t.emailMultiSender.none}
                    </span>
                    </div>
                  </div>
                </div>

                {isSending && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{t.emailMultiSender.sendingProgress}</Label>
                        <span className="text-sm text-muted-foreground">{sendProgress}%</span>
                      </div>
                      <Progress value={sendProgress} className="w-full" />
                      <div className="flex justify-between text-xs text-muted-foreground pt-1">
                        <span className="text-green-600">Success: {sendStats.success}</span>
                        <span className="text-red-500">Failed: {sendStats.failed}</span>
                      </div>
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
                          {t.emailMultiSender.sending}
                        </>
                    ) : isScheduled ? (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          {t.emailMultiSender.scheduleCampaign}
                        </>
                    ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          {t.emailMultiSender.sendNow}
                        </>
                    )}
                  </Button>
                  <Button variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    {t.emailMultiSender.preview}
                  </Button>
                </div>

                {recipients.length === 0 && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        {t.emailMultiSender.uploadRecipientFirst}
                      </p>
                    </div>
                )}

                {!selectedTemplate && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">{t.emailMultiSender.selectTemplateFirst}</p>
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  )
}
