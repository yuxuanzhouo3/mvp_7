"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useLanguage } from "@/components/language-provider";
import { useTranslations } from '@/lib/i18n'
import { useUser } from "@/hooks/use-user"

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
import { Upload, Mail, Users, FileText, Send, Clock, CheckCircle, AlertCircle, Eye, Settings, Plus, Trash2, X, Save, History, RefreshCw, ArrowLeft, Download, MailOpen, MailX, FolderPlus, Database, ShieldCheck, ShieldAlert, Loader2, Pause, Play, Square, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { emitToolSuccess } from "@/lib/credits/tool-success"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
}

interface TemplateAttachment {
  filename: string
  contentType: string
  size: number
  base64: string
}

interface UserTemplate {
  id: number
  name: string
  subject: string
  content: string
  attachments?: TemplateAttachment[]
  created_at: string
}

interface Recipient {
  email: string
  name: string
  company?: string
  position?: string
  status?: 'pending' | 'sent' | 'failed'
  error?: string
  domainValid?: boolean // true=MX/A valid, false=domain not found, undefined=not checked
}

interface RecipientGroup {
  id: number
  name: string
  recipients: Recipient[]
  created_at: string
}

interface SmtpConfig {
  host: string
  port: string
  user: string
  pass: string
}

interface SavedSmtpConfig {
  id: number
  name: string
  host: string
  port: string
  username: string
  pass: string
  sender_name: string
  created_at: string
}

interface SendTask {
  taskId: string
  subject: string
  smtpHost: string
  total: number
  sent: number
  failed: number
  opened: number
  createdAt: string
}

interface SendLogDetail {
  id: number
  recipient_email: string
  recipient_name: string
  subject: string
  status: string
  error_message: string | null
  message_id: string | null
  tracking_id: string | null
  opened_at: string | null
  open_count: number
  created_at: string
}

const MAX_ATTACHMENT_COUNT = 5
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024

export function EmailMultiSender() {
  const { language } = useLanguage();
  const t  = useTranslations(language)
  const { user } = useUser()

  const formatWithCount = (template: string | undefined, count: number) =>
    (template || "{count}").replace("{count}", String(count))
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [loadedUserTemplateName, setLoadedUserTemplateName] = useState<string>("")
  const [customSubject, setCustomSubject] = useState("")
  const [customContent, setCustomContent] = useState("")
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const isPausedRef = useRef(false)
  const isCancelledRef = useRef(false)
  const [showAdvancedSmtp, setShowAdvancedSmtp] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)
  
  // New State for Real Sending
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: "",
    port: "465",
    user: "",
    pass: ""
  })
  const [senderName, setSenderName] = useState("")
  const [smtpGuideProvider, setSmtpGuideProvider] = useState<'gmail' | 'outlook' | 'qq' | '163' | 'sina'>('gmail')
  const [sendingRate, setSendingRate] = useState("normal") // slow, normal, fast
  const [sendStats, setSendStats] = useState({ success: 0, failed: 0 })
  const [newRecipientEmail, setNewRecipientEmail] = useState("")
  const [rawRecipientsInput, setRawRecipientsInput] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])

  // User templates state
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([])
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  // Send history state
  const [sendTasks, setSendTasks] = useState<SendTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [taskDetails, setTaskDetails] = useState<SendLogDetail[]>([])
  const [taskStats, setTaskStats] = useState<any>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Current task results
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [activeMainTab, setActiveMainTab] = useState("recipients")

  // Recipient groups state
  const [recipientGroups, setRecipientGroups] = useState<RecipientGroup[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [showSaveGroup, setShowSaveGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

  // Saved SMTP configs state
  const [savedSmtpConfigs, setSavedSmtpConfigs] = useState<SavedSmtpConfig[]>([])
  const [isLoadingSmtpConfigs, setIsLoadingSmtpConfigs] = useState(false)
  const [showSaveSmtpConfig, setShowSaveSmtpConfig] = useState(false)
  const [newSmtpConfigName, setNewSmtpConfigName] = useState("")

  // Email domain validation state
  const [isValidating, setIsValidating] = useState(false)
  const [validationDone, setValidationDone] = useState(false)

  // Load user templates, groups, and smtp configs on mount
  useEffect(() => {
    if (user?.id) {
      loadUserTemplates()
      loadRecipientGroups()
      loadSavedSmtpConfigs()
    }
  }, [user?.id])

  const loadUserTemplates = async () => {
    if (!user?.id) return
    setIsLoadingTemplates(true)
    try {
      const res = await fetch('/api/tools/email-sender/templates', {
        headers: { 'x-user-id': String(user.id) },
      })
      const data = await res.json()
      if (data.success) {
        setUserTemplates(data.templates || [])
      }
    } catch (e) {
      console.error('[email-templates] load error:', e)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!user?.id) {
      toast.error(t.emailMultiSender.loginRequiredForTemplates)
      return
    }
    if (!newTemplateName.trim()) return
    try {
      // Use FormData to support file attachments
      const formData = new FormData()
      formData.set('name', newTemplateName.trim())
      formData.set('subject', customSubject)
      formData.set('content', customContent)

      // Include current attachments in the template
      for (const file of attachments) {
        formData.append('attachments', file, file.name)
      }

      const res = await fetch('/api/tools/email-sender/templates', {
        method: 'POST',
        headers: {
          'x-user-id': String(user.id),
        },
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        const savedMsg = attachments.length > 0
          ? (language === 'zh'
            ? `模板已保存（含 ${attachments.length} 个附件）`
            : `Template saved (with ${attachments.length} attachment${attachments.length > 1 ? 's' : ''})`)
          : (t.emailMultiSender.templateSaved || 'Template saved')
        toast.success(savedMsg)
        // Optimistic update: immediately add to local state
        if (data.template) {
          setUserTemplates(prev => [data.template, ...prev])
          // Auto-select the saved template so Campaign Summary shows the name
          setSelectedTemplate('custom')
          setLoadedUserTemplateName(data.template.name)
        } else {
          // fallback: reload from server
          loadUserTemplates()
          setSelectedTemplate('custom')
          setLoadedUserTemplateName(newTemplateName.trim())
        }
        setNewTemplateName("")
        setShowSaveTemplate(false)
      } else {
        toast.error(data.error || 'Failed to save template')
      }
    } catch (e: any) {
      console.error('[email-templates] save error:', e)
      toast.error(e.message)
    }
  }

  const handleDeleteTemplate = async (templateId: number) => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/tools/email-sender/templates?id=${templateId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': String(user.id) },
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t.emailMultiSender.templateDeleted)
        loadUserTemplates()
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Restore File objects from base64-encoded template attachments
  const restoreAttachmentsFromTemplate = (templateAttachments: TemplateAttachment[]): File[] => {
    if (!Array.isArray(templateAttachments) || templateAttachments.length === 0) return []
    return templateAttachments.map(att => {
      const byteString = atob(att.base64)
      const bytes = new Uint8Array(byteString.length)
      for (let i = 0; i < byteString.length; i++) {
        bytes[i] = byteString.charCodeAt(i)
      }
      return new File([bytes], att.filename, { type: att.contentType || 'application/octet-stream' })
    })
  }

  const handleLoadUserTemplate = (tmpl: UserTemplate) => {
    setSelectedTemplate('custom')
    setCustomSubject(tmpl.subject)
    setCustomContent(tmpl.content)
    setLoadedUserTemplateName(tmpl.name)

    // Always reset attachments to match the loaded template
    const restoredAttachments = restoreAttachmentsFromTemplate(tmpl.attachments || [])
    setAttachments(restoredAttachments)
    if (restoredAttachments.length > 0) {
      toast.success(
        language === 'zh'
          ? `模板已加载（含 ${restoredAttachments.length} 个附件）`
          : `Template loaded (with ${restoredAttachments.length} attachment${restoredAttachments.length > 1 ? 's' : ''})`
      )
    } else {
      toast.success(t.emailMultiSender.templateLoaded)
    }
  }

  // ====== Recipient Groups Functions ======
  const loadRecipientGroups = async () => {
    if (!user?.id) return
    setIsLoadingGroups(true)
    try {
      const res = await fetch('/api/tools/email-sender/groups', {
        headers: { 'x-user-id': String(user.id) },
      })
      const data = await res.json()
      if (data.success) {
        setRecipientGroups(data.groups || [])
      }
    } catch (e) {
      console.error('[email-groups] load error:', e)
    } finally {
      setIsLoadingGroups(false)
    }
  }

  const handleSaveGroup = async () => {
    if (!user?.id) {
      toast.error(t.emailMultiSender.loginRequiredForTemplates)
      return
    }
    if (!newGroupName.trim()) return
    if (recipients.length === 0) {
      toast.error(language === 'zh' ? '当前没有收件人可保存' : 'No recipients to save')
      return
    }
    try {
      const res = await fetch('/api/tools/email-sender/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({
          name: newGroupName.trim(),
          recipients: recipients.map(r => ({
            email: r.email,
            name: r.name,
            company: r.company,
            position: r.position,
          })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(language === 'zh' ? '分组已保存' : 'Group saved')
        if (data.group) {
          setRecipientGroups(prev => [data.group, ...prev])
        } else {
          loadRecipientGroups()
        }
        setNewGroupName("")
        setShowSaveGroup(false)
      } else {
        toast.error(data.error || 'Failed to save group')
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleLoadGroup = (group: RecipientGroup) => {
    const groupRecipients = (group.recipients || []).map((r: any) => ({
      email: r.email,
      name: r.name || r.email.split('@')[0],
      company: r.company,
      position: r.position,
    }))
    setRecipients(prev => mergeRecipientLists(prev, groupRecipients))
    const dedupCount = groupRecipients.length
    toast.success(
      language === 'zh'
        ? `已加载分组「${group.name}」(${dedupCount} 人，已自动去重)`
        : `Loaded group "${group.name}" (${dedupCount} contacts, auto-deduplicated)`
    )
  }

  const handleDeleteGroup = async (groupId: number) => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/tools/email-sender/groups?id=${groupId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': String(user.id) },
      })
      const data = await res.json()
      if (data.success) {
        toast.success(language === 'zh' ? '分组已删除' : 'Group deleted')
        setRecipientGroups(prev => prev.filter(g => g.id !== groupId))
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // ====== Saved SMTP Configs Functions ======
  const loadSavedSmtpConfigs = async () => {
    if (!user?.id) return
    setIsLoadingSmtpConfigs(true)
    try {
      const res = await fetch('/api/tools/email-sender/smtp-configs', {
        headers: { 'x-user-id': String(user.id) },
      })
      const data = await res.json()
      if (data.success) {
        setSavedSmtpConfigs(data.configs || [])
      }
    } catch (e) {
      console.error('[smtp-configs] load error:', e)
    } finally {
      setIsLoadingSmtpConfigs(false)
    }
  }

  const handleSaveSmtpConfig = async () => {
    if (!user?.id) {
      toast.error(t.emailMultiSender.loginRequiredForTemplates)
      return
    }
    if (!newSmtpConfigName.trim()) return
    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      toast.error(language === 'zh' ? '请先填写完整的 SMTP 配置' : 'Please fill in complete SMTP configuration')
      return
    }
    try {
      const res = await fetch('/api/tools/email-sender/smtp-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({
          name: newSmtpConfigName.trim(),
          host: smtpConfig.host,
          port: smtpConfig.port,
          username: smtpConfig.user,
          pass: smtpConfig.pass,
          senderName: senderName,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(language === 'zh' ? 'SMTP 配置已保存' : 'SMTP config saved')
        if (data.config) {
          setSavedSmtpConfigs(prev => [data.config, ...prev])
        } else {
          loadSavedSmtpConfigs()
        }
        setNewSmtpConfigName("")
        setShowSaveSmtpConfig(false)
      } else {
        toast.error(data.error || 'Failed to save config')
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleLoadSmtpConfig = async (config: SavedSmtpConfig) => {
    if (!user?.id) return
    try {
      // Fetch the full config with plaintext password
      const res = await fetch(`/api/tools/email-sender/smtp-configs?id=${config.id}`, {
        headers: { 'x-user-id': String(user.id) },
      })
      const data = await res.json()
      if (data.success && data.config) {
        const c = data.config
        setSmtpConfig({
          host: c.host,
          port: c.port,
          user: c.username,
          pass: c.pass,
        })
        setSenderName(c.sender_name || '')
        toast.success(
          language === 'zh'
            ? `已加载 SMTP 配置「${config.name}」`
            : `Loaded SMTP config "${config.name}"`
        )
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDeleteSmtpConfig = async (configId: number) => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/tools/email-sender/smtp-configs?id=${configId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': String(user.id) },
      })
      const data = await res.json()
      if (data.success) {
        toast.success(language === 'zh' ? 'SMTP 配置已删除' : 'SMTP config deleted')
        setSavedSmtpConfigs(prev => prev.filter(c => c.id !== configId))
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Send history functions
  const loadSendHistory = async () => {
    if (!user?.id) return
    setIsLoadingHistory(true)
    try {
      const res = await fetch('/api/tools/email-sender/logs', {
        headers: { 'x-user-id': String(user.id) },
      })
      const data = await res.json()
      if (data.success) {
        setSendTasks(data.tasks || [])
      }
    } catch (e) {
      console.error('[email-history] load error:', e)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const loadTaskDetails = async (taskId: string) => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/tools/email-sender/logs?taskId=${taskId}`, {
        headers: { 'x-user-id': String(user.id) },
      })
      const data = await res.json()
      if (data.success) {
        setTaskDetails(data.logs || [])
        setTaskStats(data.stats || null)
        setSelectedTaskId(taskId)
      }
    } catch (e) {
      console.error('[email-history] detail error:', e)
    }
  }

  const formatFileSize = (size: number) => {
    if (!Number.isFinite(size) || size <= 0) return "0 B"
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }

  const getTotalAttachmentSize = (files: File[]) => files.reduce((sum, item) => sum + item.size, 0)

  const handleAttachmentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const selected = Array.from(input.files || [])
    if (selected.length === 0) return

    const merged: File[] = [...attachments]

    for (const file of selected) {
      const duplicate = merged.some(
        (item) =>
          item.name === file.name &&
          item.size === file.size &&
          item.lastModified === file.lastModified
      )
      if (duplicate) continue

      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(
          t.emailMultiSender.attachmentTooLarge ||
            (language === 'zh' ? `附件 ${file.name} 超过 10MB 限制` : `Attachment ${file.name} exceeds 10MB`) 
        )
        continue
      }

      if (merged.length >= MAX_ATTACHMENT_COUNT) {
        toast.error(
          t.emailMultiSender.attachmentCountExceeded ||
            (language === 'zh' ? '附件最多 5 个' : 'Maximum 5 attachments')
        )
        break
      }

      const nextTotal = getTotalAttachmentSize(merged) + file.size
      if (nextTotal > MAX_TOTAL_ATTACHMENT_SIZE) {
        toast.error(
          t.emailMultiSender.attachmentTotalTooLarge ||
            (language === 'zh' ? '附件总大小不能超过 20MB' : 'Total attachment size cannot exceed 20MB')
        )
        continue
      }

      merged.push(file)
    }

    setAttachments(merged)
    input.value = ''
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, i) => i !== index))
  }

  const mergeRecipientLists = (base: Recipient[], incoming: Recipient[]) => {
    const recipientMap = new Map<string, Recipient>()

    for (const item of base) {
      const key = normalizeEmail(item.email)
      if (!key) continue
      recipientMap.set(key, {
        ...item,
        email: key,
        name: item.name || key.split("@")[0],
      })
    }

    for (const item of incoming) {
      const key = normalizeEmail(item.email)
      if (!key) continue

      const previous = recipientMap.get(key)
      recipientMap.set(key, {
        ...previous,
        ...item,
        email: key,
        name: item.name?.trim() || previous?.name || key.split("@")[0],
      })
    }

    return Array.from(recipientMap.values())
  }

  const handleAddRecipient = () => {
    const normalized = normalizeEmail(newRecipientEmail)
    if (!normalized) return

    setRecipients((current) =>
      mergeRecipientLists(current, [{ email: normalized, name: normalized.split("@")[0] }])
    )
    setNewRecipientEmail("")
  }

  const handleParseRawInput = () => {
    const input = rawRecipientsInput.trim()
    if (!input) {
      toast.error(language === "zh" ? "请先粘贴文本内容" : "Please paste text content first")
      return
    }

    const parsedRecipients = parseRecipientsFromAnyText(input)

    if (parsedRecipients.length === 0) {
      toast.error(
        t.emailMultiSender.noEmailFound ||
          (language === "zh" ? "未识别到邮箱地址，请检查输入内容" : "No email addresses were detected")
      )
      return
    }

    setRecipients((current) => mergeRecipientLists(current, parsedRecipients))
    toast.success(
      formatWithCount(
        t.emailMultiSender.parsedEmailCount || (language === "zh" ? "已解析 {count} 个邮箱" : "Parsed {count} emails"),
        parsedRecipients.length
      )
    )
  }

  const handleClearRecipients = () => {
    setRecipients([])
  }

  // Auto-detect SMTP provider from email domain
  const SMTP_PROVIDER_MAP: Record<string, { host: string; port: string }> = {
    'gmail.com': { host: 'smtp.gmail.com', port: '465' },
    'googlemail.com': { host: 'smtp.gmail.com', port: '465' },
    'outlook.com': { host: 'smtp.office365.com', port: '587' },
    'hotmail.com': { host: 'smtp.office365.com', port: '587' },
    'live.com': { host: 'smtp.office365.com', port: '587' },
    'qq.com': { host: 'smtp.qq.com', port: '465' },
    'foxmail.com': { host: 'smtp.qq.com', port: '465' },
    '163.com': { host: 'smtp.163.com', port: '465' },
    '126.com': { host: 'smtp.126.com', port: '465' },
    'yeah.net': { host: 'smtp.yeah.net', port: '465' },
    'sina.com': { host: 'smtp.sina.com', port: '465' },
    'sina.cn': { host: 'smtp.sina.com', port: '465' },
    'yahoo.com': { host: 'smtp.mail.yahoo.com', port: '465' },
    'icloud.com': { host: 'smtp.mail.me.com', port: '587' },
    'me.com': { host: 'smtp.mail.me.com', port: '587' },
    'zoho.com': { host: 'smtp.zoho.com', port: '465' },
  }

  const autoDetectSmtpProvider = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase()
    if (domain && SMTP_PROVIDER_MAP[domain]) {
      const provider = SMTP_PROVIDER_MAP[domain]
      setSmtpConfig(prev => ({ ...prev, host: provider.host, port: provider.port }))
    }
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
      case 'sina':
        setSmtpConfig({ ...smtpConfig, host: 'smtp.sina.com', port: '465' })
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

  const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
  const DELIMITERS = [",", "\t", ";", "|"]

  const normalizeEmail = (value: string) => {
    return value
      .trim()
      .replace(/^[<(（【\[]+/, "")
      .replace(/[>)）】\],，。;；]+$/g, "")
      .toLowerCase()
  }

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  const extractEmails = (value: string): string[] => {
    const matches = String(value || "").match(EMAIL_REGEX) || []
    const uniq = new Set<string>()

    for (const item of matches) {
      const normalized = normalizeEmail(item)
      if (normalized.includes("@")) {
        uniq.add(normalized)
      }
    }

    return Array.from(uniq)
  }

  const detectDelimiter = (line: string): string => {
    let selected = ","
    let maxCount = 0

    for (const delimiter of DELIMITERS) {
      const count = (line.split(delimiter).length - 1)
      if (count > maxCount) {
        maxCount = count
        selected = delimiter
      }
    }

    return maxCount > 0 ? selected : ","
  }

  const parseDelimitedRow = (line: string, delimiter: string): string[] => {
    const result: string[] = []
    let current = ""
    let inQuotes = false

    for (let index = 0; index < line.length; index++) {
      const char = line[index]
      const next = line[index + 1]

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"'
          index += 1
        } else {
          inQuotes = !inQuotes
        }
        continue
      }

      if (char === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ""
        continue
      }

      current += char
    }

    result.push(current.trim())
    return result.map((cell) => cell.replace(/^"(.*)"$/, "$1").trim())
  }

  const deriveNameFromLine = (line: string, email: string): string => {
    const emailPattern = new RegExp(escapeRegExp(email), "ig")
    let cleaned = line.replace(emailPattern, " ")

    // 如果一行里有多个邮箱，去掉其他邮箱，避免被误当成姓名
    cleaned = cleaned.replace(EMAIL_REGEX, " ")

    cleaned = cleaned.replace(/\s+/g, " ").trim()
    cleaned = cleaned.replace(/^\d+\s*/, "")
    cleaned = cleaned.replace(/^(认证通过|认证未通过|已认证|通过)\s*/, "")
    cleaned = cleaned.replace(/^[，,;；:：\-]+/, "").trim()
    cleaned = cleaned.replace(/[，,;；:：]+$/, "").trim()

    if (!cleaned || cleaned.includes("@")) {
      return email.split("@")[0]
    }

    return cleaned.length > 48 ? cleaned.slice(0, 48).trim() : cleaned
  }

  const parseRecipientsFromStructuredText = (content: string): Recipient[] => {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length < 2) return []

    const delimiter = detectDelimiter(lines[0])
    const headers = parseDelimitedRow(lines[0], delimiter).map((cell) => cell.toLowerCase())
    const hasHeader = headers.some((header) => header.includes("email") || header.includes("邮箱"))

    if (!hasHeader) return []

    const findHeaderIndex = (patterns: RegExp[]) => {
      return headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)))
    }

    const emailIndex = findHeaderIndex([/email/, /邮箱/])
    const nameIndex = findHeaderIndex([/^name$/, /name/, /姓名/, /昵称/])
    const companyIndex = findHeaderIndex([/company/, /公司/])
    const positionIndex = findHeaderIndex([/position/, /title/, /职位/])

    const recipientsFromTable: Recipient[] = []

    for (const line of lines.slice(1)) {
      const cells = parseDelimitedRow(line, delimiter)
      if (!cells.some(Boolean)) continue

      const emailSource = emailIndex >= 0 ? (cells[emailIndex] || "") : line
      const emails = extractEmails(emailSource)

      for (const email of emails) {
        const nameSource = nameIndex >= 0 ? (cells[nameIndex] || "") : ""
        const companySource = companyIndex >= 0 ? (cells[companyIndex] || "") : ""
        const positionSource = positionIndex >= 0 ? (cells[positionIndex] || "") : ""

        const recipient: Recipient = {
          email,
          name: nameSource.trim() || deriveNameFromLine(line, email),
        }

        if (companySource.trim()) {
          recipient.company = companySource.trim()
        }

        if (positionSource.trim()) {
          recipient.position = positionSource.trim()
        }

        recipientsFromTable.push(recipient)
      }
    }

    return recipientsFromTable
  }

  const parseRecipientsFromAnyText = (content: string): Recipient[] => {
    const merged: Recipient[] = []
    const emailMap = new Map<string, Recipient>()

    const pushRecipient = (recipient: Recipient) => {
      const key = normalizeEmail(recipient.email)
      if (!key) return

      if (!emailMap.has(key)) {
        const normalizedRecipient: Recipient = {
          email: key,
          name: recipient.name?.trim() || key.split("@")[0],
          company: recipient.company?.trim() || undefined,
          position: recipient.position?.trim() || undefined,
        }
        emailMap.set(key, normalizedRecipient)
        merged.push(normalizedRecipient)
      }
    }

    const structured = parseRecipientsFromStructuredText(content)
    for (const item of structured) {
      pushRecipient(item)
    }

    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    for (const line of lines) {
      const emails = extractEmails(line)
      for (const email of emails) {
        pushRecipient({
          email,
          name: deriveNameFromLine(line, email),
        })
      }
    }

    return merged
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]

    if (!file) return

    try {
      const content = await file.text()
      const parsedRecipients = parseRecipientsFromAnyText(content)

      if (parsedRecipients.length === 0) {
        toast.error(
          t.emailMultiSender.noEmailFound ||
          (language === "zh" ? "未识别到邮箱地址，请检查文件内容" : "No email addresses were detected")
        )
        return
      }

      setRecipients((current) => mergeRecipientLists(current, parsedRecipients))
      toast.success(
        formatWithCount(
          t.emailMultiSender.parsedEmailCount || (language === "zh" ? "已解析 {count} 个邮箱" : "Parsed {count} emails"),
          parsedRecipients.length
        )
      )
    } catch (error) {
      console.error("[email-multi-sender] parse upload failed:", error)
      toast.error(
        t.emailMultiSender.fileReadFailed ||
        (language === "zh" ? "读取文件失败，请重试" : "Failed to read the uploaded file")
      )
    } finally {
      input.value = ""
    }
  }

  const handleSendEmails = async () => {
    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      alert(t.emailMultiSender.smtpConfigureFirst || "Please configure SMTP settings first.")
      return
    }

    setIsSending(true)
    setIsPaused(false)
    isPausedRef.current = false
    isCancelledRef.current = false
    setSendProgress(0)
    setSendStats({ success: 0, failed: 0 })

    // Generate a unique task ID for this batch
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    setCurrentTaskId(taskId)

    const total = recipients.length
    let processed = 0
    let successCount = 0
    let failedCount = 0
    
    // Determine delay with random jitter to improve deliverability
    const getDelay = () => {
      let base = 2000
      if (sendingRate === 'slow') base = 5000
      if (sendingRate === 'fast') base = 1000
      // Add ±30% jitter
      const jitter = base * 0.3
      return base + (Math.random() * 2 - 1) * jitter
    }

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
       // Check cancel state
       if (isCancelledRef.current) {
         break
       }
       // Check pause state
       while (isPausedRef.current && !isCancelledRef.current) {
         await new Promise(resolve => setTimeout(resolve, 500))
       }
       if (isCancelledRef.current) {
         break
       }

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
         const formData = new FormData()
         formData.set('smtpConfig', JSON.stringify(smtpConfig))
         formData.set(
           'mailOptions',
           JSON.stringify({
             to: recipient.email,
             subject,
             html: content.replace(/\n/g, '<br/>'),
             fromName: senderName.trim() || undefined,
             recipientName: recipient.name,
           })
         )

         attachments.forEach((file) => {
           formData.append('attachments', file, file.name)
         })

         const headers: Record<string, string> = {}
         if (user?.id) headers["x-user-id"] = String(user.id)
         if (taskId) headers["x-task-id"] = taskId

         const response = await fetch('/api/tools/email-sender', {
           method: 'POST',
           headers,
           body: formData,
         })

         const result = await response.json()

         if (result.success) {
           newRecipients[i].status = 'sent'
           newRecipients[i].error = undefined
           successCount++
         } else {
           newRecipients[i].status = 'failed'
           const friendlyError =
             result?.userMessage ||
             (typeof result?.error === 'string' &&
             (result.error.includes('ETIMEDOUT') ||
               result.error.includes('ESOCKET') ||
               result.error.includes('CONN'))
               ? (language === 'zh'
                   ? 'SMTP 网络不可达或端口被拦截，请检查服务器防火墙和当前端口出站策略。'
                   : 'SMTP network is unreachable or blocked. Please check firewall and outbound policy for the current port.')
               : result.error)

           newRecipients[i].error = friendlyError
           failedCount++
         }
       } catch (error: any) {
          newRecipients[i].status = 'failed'
          newRecipients[i].error =
            language === 'zh'
              ? `发送失败：${error.message}`
              : `Send failed: ${error.message}`
          failedCount++
       }

       // Update UI
       setRecipients([...newRecipients])
       setSendStats({ success: successCount, failed: failedCount })
       
       processed++
       setSendProgress(Math.round((processed / total) * 100))

       // Wait before next email with random jitter
       if (i < total - 1) {
         await new Promise(resolve => setTimeout(resolve, getDelay()))
       }
    }

    setIsSending(false)
    setIsPaused(false)
    isPausedRef.current = false
    const wasCancelled = isCancelledRef.current
    isCancelledRef.current = false

    if (successCount > 0) {
      emitToolSuccess("email-multi-sender")
    }

    if (wasCancelled) {
      toast.info(language === 'zh' ? '发送已取消' : 'Sending cancelled', {
        description: `${t.emailMultiSender.sentCount || "Sent"}: ${successCount}, ${t.emailMultiSender.failedCount || "Failed"}: ${failedCount}`,
      })
    } else {
      toast.success(t.emailMultiSender.campaignFinished || "Email campaign finished!", {
        description: `${t.emailMultiSender.sentCount || "Sent"}: ${successCount}, ${t.emailMultiSender.failedCount || "Failed"}: ${failedCount}`,
      })
    }

    // Auto-switch to send results view
    setActiveMainTab("history")
    if (user?.id) {
      // Small delay to allow backend to finish writing logs
      setTimeout(() => loadSendHistory(), 1500)
    }
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
    const headers = "email"
    const sampleData = "john@example.com"
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + sampleData
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${t.emailMultiSender.sampleCsvName || "sample_recipients"}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportResults = (logs: SendLogDetail[]) => {
    const headers = "Email,Name,Status,Error,Opened,Open Count,Opened At"
    const rows = logs.map(log => {
      return [
        log.recipient_email,
        log.recipient_name || '',
        log.status,
        log.error_message || '',
        log.open_count > 0 ? 'Yes' : 'No',
        log.open_count,
        log.opened_at || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows.join("\n")
    const link = document.createElement("a")
    link.setAttribute("href", encodeURI(csvContent))
    link.setAttribute("download", `email_results_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const isConfigValid = smtpConfig.host && smtpConfig.user && smtpConfig.pass
  const isReadyToSend = recipients.length > 0 && selectedTemplate && isConfigValid

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="recipients">{t.emailMultiSender.recipients}</TabsTrigger>
            <TabsTrigger value="template">{t.emailMultiSender.template}</TabsTrigger>
            <TabsTrigger value="configuration">{t.emailMultiSender.configTab}</TabsTrigger>
            <TabsTrigger value="settings">{t.emailMultiSender.settingsTab}</TabsTrigger>
            <TabsTrigger value="history" onClick={() => { if (user?.id) loadSendHistory() }}>
              <History className="w-4 h-4 mr-1" />
              {t.emailMultiSender.sendHistory}
            </TabsTrigger>
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
                    <p className="text-sm font-medium mb-1">{t.emailMultiSender.importCsvOrText || t.emailMultiSender.importCsv}</p>
                    <p className="text-xs text-muted-foreground mb-3">{t.emailMultiSender.uploadFlexibleDescription || "支持 CSV/TXT 或任意文本，系统会自动提取邮箱"}</p>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv,.txt,.tsv,.log,.md,.json,text/csv,text/plain"
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

                  {/* Manual Add / Text Parse */}
                  <div className="space-y-3 p-4 border rounded-lg bg-card">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Plus className="w-4 h-4" /> {t.emailMultiSender.addManually}
                    </h3>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        {language === "zh" ? "粘贴任意文本智能解析邮箱" : "Paste any text to auto-parse emails"}
                      </Label>
                      <Textarea
                        placeholder={
                          language === "zh"
                            ? "可直接粘贴聊天记录、表格、签名等，系统会自动提取邮箱"
                            : "Paste chat logs, tables, signatures, etc. Emails will be extracted automatically"
                        }
                        value={rawRecipientsInput}
                        onChange={(e) => setRawRecipientsInput(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <Button onClick={handleParseRawInput} variant="secondary" size="sm" className="w-full">
                        {language === "zh" ? "解析文本并添加" : "Parse text and add"}
                      </Button>
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        {language === "zh" ? "手动单个添加" : "Add single recipient"}
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Input 
                        placeholder={t.emailMultiSender.placeholderEmail}
                        value={newRecipientEmail}
                        onChange={(e) => setNewRecipientEmail(e.target.value)}
                        className="h-8"
                      />
                      <Button onClick={handleAddRecipient} disabled={!newRecipientEmail.trim()} size="sm" className="w-full">
                        {t.emailMultiSender.addRecipient}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Recipient Groups Section */}
                {user?.id && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <FolderPlus className="w-4 h-4" />
                        {language === 'zh' ? '收件人分组' : 'Recipient Groups'}
                      </h3>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={loadRecipientGroups} disabled={isLoadingGroups}>
                          <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingGroups ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>

                    {/* Saved groups list */}
                    {recipientGroups.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {language === 'zh' ? '暂无已保存的分组。添加收件人后可保存为分组。' : 'No saved groups. Add recipients then save as a group.'}
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {recipientGroups.map((group) => (
                          <div key={group.id} className="flex items-center justify-between p-2 rounded border bg-background hover:bg-muted/40 group/item transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{group.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {Array.isArray(group.recipients) ? group.recipients.length : 0} {language === 'zh' ? '个联系人' : 'contacts'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 pl-2">
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleLoadGroup(group)}>
                                {language === 'zh' ? '加载' : 'Load'}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/item:opacity-100 text-red-500" onClick={() => handleDeleteGroup(group.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Save current recipients as group */}
                    {recipients.length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        {showSaveGroup ? (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder={language === 'zh' ? '输入分组名称，如：国内投资人' : 'Group name, e.g. Domestic Investors'}
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              className="h-8"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGroup() }}
                            />
                            <Button size="sm" onClick={handleSaveGroup} disabled={!newGroupName.trim()}>
                              <Save className="w-3 h-3 mr-1" />
                              {language === 'zh' ? '保存' : 'Save'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowSaveGroup(false)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setShowSaveGroup(true)}>
                            <FolderPlus className="w-3 h-3 mr-1" />
                            {language === 'zh' ? '保存为分组' : 'Save as Group'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {recipients.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium">{t.emailMultiSender.loadedRecipients}</h3>
                          <Badge variant="secondary">{recipients.length}</Badge>
                          {validationDone && (
                            <>
                              <Badge variant="default" className="bg-green-500 text-[10px] h-5">
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                {recipients.filter(r => r.domainValid === true).length} {language === 'zh' ? '有效' : 'valid'}
                              </Badge>
                              {recipients.filter(r => r.domainValid === false).length > 0 && (
                                <Badge variant="destructive" className="text-[10px] h-5">
                                  <ShieldAlert className="w-3 h-3 mr-1" />
                                  {recipients.filter(r => r.domainValid === false).length} {language === 'zh' ? '无效' : 'invalid'}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Validate Emails Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setIsValidating(true)
                              try {
                                const emails = recipients.map(r => r.email)
                                const res = await fetch('/api/tools/email-sender/validate', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ emails }),
                                })
                                const data = await res.json()
                                if (data.success) {
                                  const resultMap = new Map<string, { valid: boolean; reason?: string }>()
                                  for (const r of data.results) {
                                    resultMap.set(r.email.toLowerCase(), { valid: r.valid, reason: r.reason })
                                  }
                                  setRecipients(prev => prev.map(rec => {
                                    const result = resultMap.get(rec.email.toLowerCase())
                                    if (result) {
                                      return {
                                        ...rec,
                                        domainValid: result.valid,
                                        error: result.valid ? undefined : (
                                          result.reason === 'DOMAIN_NOT_FOUND' ? (language === 'zh' ? '域名不存在 (DNS解析失败)' : 'Domain not found (DNS resolution failed)')
                                          : result.reason === 'NO_MX_RECORD' ? (language === 'zh' ? '无邮件服务器 (无MX记录)' : 'No mail server (no MX record)')
                                          : result.reason === 'INVALID_FORMAT' ? (language === 'zh' ? '邮箱格式错误' : 'Invalid email format')
                                          : (language === 'zh' ? 'DNS查询失败' : 'DNS lookup failed')
                                        ),
                                      }
                                    }
                                    return rec
                                  }))
                                  setValidationDone(true)
                                  if (data.invalid > 0) {
                                    toast.warning(
                                      language === 'zh'
                                        ? `验证完成：${data.valid} 个有效，${data.invalid} 个无效域名`
                                        : `Validation done: ${data.valid} valid, ${data.invalid} invalid domains`,
                                      { duration: 5000 }
                                    )
                                  } else {
                                    toast.success(
                                      language === 'zh'
                                        ? `所有 ${data.valid} 个邮箱域名均有效 ✓`
                                        : `All ${data.valid} email domains are valid ✓`
                                    )
                                  }
                                } else {
                                  toast.error(data.error || 'Validation failed')
                                }
                              } catch (e: any) {
                                toast.error(e.message || 'Validation error')
                              } finally {
                                setIsValidating(false)
                              }
                            }}
                            disabled={isValidating}
                            className="h-8 text-xs"
                          >
                            {isValidating ? (
                              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {language === 'zh' ? '验证中...' : 'Validating...'}</>
                            ) : (
                              <><ShieldCheck className="w-3 h-3 mr-1" /> {language === 'zh' ? '验证邮箱' : 'Validate'}</>
                            )}
                          </Button>
                          {/* Remove Invalid Button - only show after validation */}
                          {validationDone && recipients.some(r => r.domainValid === false) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const invalidCount = recipients.filter(r => r.domainValid === false).length
                                setRecipients(prev => prev.filter(r => r.domainValid !== false))
                                toast.success(
                                  language === 'zh'
                                    ? `已移除 ${invalidCount} 个无效邮箱`
                                    : `Removed ${invalidCount} invalid emails`
                                )
                              }}
                              className="h-8 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                            >
                              <ShieldAlert className="w-3 h-3 mr-1" />
                              {language === 'zh' ? '移除无效' : 'Remove Invalid'}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={handleClearRecipients} className="text-red-500 hover:text-red-700 h-8">
                            <Trash2 className="w-4 h-4 mr-2" /> {t.emailMultiSender.clearAll}
                          </Button>
                        </div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                        {recipients.map((recipient, index) => (
                            <div key={index} className={`flex items-center justify-between p-3 border rounded-lg transition-colors group ${
                              recipient.domainValid === false
                                ? 'bg-red-50/80 border-red-200 hover:bg-red-100/80 dark:bg-red-950/20 dark:border-red-900/40'
                                : recipient.domainValid === true
                                  ? 'bg-green-50/40 border-green-200/60 hover:bg-green-100/40 dark:bg-green-950/10 dark:border-green-900/30'
                                  : 'bg-muted/40 hover:bg-muted'
                            }`}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {recipient.domainValid === true && <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                                  {recipient.domainValid === false && <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />}
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
                                {!recipient.status && recipient.domainValid === undefined && <div className="w-2 h-2 rounded-full bg-slate-300" />}
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
                 {/* Saved SMTP Configs Section */}
                 {user?.id && (
                   <div className="space-y-3 p-4 border rounded-lg bg-green-50/50 dark:bg-green-900/10">
                     <div className="flex items-center justify-between">
                       <h3 className="text-sm font-semibold flex items-center gap-2">
                         <Database className="w-4 h-4" />
                         {language === 'zh' ? '已保存的 SMTP 配置' : 'Saved SMTP Configs'}
                       </h3>
                       <Button variant="ghost" size="sm" onClick={loadSavedSmtpConfigs} disabled={isLoadingSmtpConfigs}>
                         <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingSmtpConfigs ? 'animate-spin' : ''}`} />
                       </Button>
                     </div>
                     {savedSmtpConfigs.length === 0 ? (
                       <p className="text-xs text-muted-foreground">
                         {language === 'zh' ? '填写下方配置后可保存，下次直接选用。' : 'Fill in config below, then save for future use.'}
                       </p>
                     ) : (
                       <div className="space-y-2 max-h-[200px] overflow-y-auto">
                         {savedSmtpConfigs.map((cfg) => (
                           <div key={cfg.id} className="flex items-center justify-between p-2 rounded border bg-background hover:bg-muted/40 group/item transition-colors">
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-medium truncate">{cfg.name}</p>
                               <p className="text-xs text-muted-foreground truncate">{cfg.username} · {cfg.host}:{cfg.port}</p>
                             </div>
                             <div className="flex items-center gap-1 pl-2">
                               <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleLoadSmtpConfig(cfg)}>
                                 {language === 'zh' ? '使用' : 'Use'}
                               </Button>
                               <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/item:opacity-100 text-red-500" onClick={() => handleDeleteSmtpConfig(cfg.id)}>
                                 <Trash2 className="w-3 h-3" />
                               </Button>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 )}

                  {/* Primary fields: Email + Authorization Code */}
                  <div className="space-y-4">
                     <div className="space-y-2">
                       <Label>{t.emailMultiSender.smtpUser}</Label>
                       <Input
                         placeholder="your-email@example.com"
                         value={smtpConfig.user}
                         onChange={(e) => {
                           setSmtpConfig({...smtpConfig, user: e.target.value})
                           autoDetectSmtpProvider(e.target.value)
                         }}
                       />
                       {smtpConfig.host && (
                         <p className="text-xs text-green-600 dark:text-green-400">
                           {language === 'zh'
                             ? `✓ 已自动识别：${smtpConfig.host}:${smtpConfig.port}`
                             : `✓ Auto-detected: ${smtpConfig.host}:${smtpConfig.port}`}
                         </p>
                       )}
                     </div>
                     <div className="space-y-2">
                       <Label>{t.emailMultiSender.smtpPass}</Label>
                       <Input
                         type="password"
                         placeholder={language === 'zh' ? '请输入授权码 / App Password' : 'Enter authorization code / App Password'}
                         value={smtpConfig.pass}
                         onChange={(e) => setSmtpConfig({...smtpConfig, pass: e.target.value})}
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>{language === 'zh' ? '发件人名称（可选）' : 'Sender Name (optional)'}</Label>
                       <Input placeholder={language === 'zh' ? '例如：张三 / 品牌名' : 'e.g. Your Name / Brand'} value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                     </div>
                  </div>
                  <div className="text-[12px] text-muted-foreground bg-amber-50 dark:bg-amber-900/20 p-3 rounded text-amber-700 dark:text-amber-300 flex gap-2">
                     <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                     <span>{language === 'zh' ? '请使用授权码（非登录密码）。在邮箱设置中开启 SMTP 服务后获取授权码。' : 'Use an Authorization Code (not your login password). Enable SMTP in your email settings to get one.'}</span>
                  </div>
                  {/* Advanced: Host / Port / Guide */}
                  <div className="border rounded-lg">
                    <button type="button" className="flex items-center justify-between w-full p-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowAdvancedSmtp(!showAdvancedSmtp)}>
                      <span>{language === 'zh' ? '高级设置（SMTP 主机 / 端口 / 配置教程）' : 'Advanced (SMTP Host / Port / Setup Guide)'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedSmtp ? 'rotate-180' : ''}`} />
                    </button>
                    {showAdvancedSmtp && (
                      <div className="p-4 pt-0 space-y-4 border-t">
                        <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                           <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">{t.emailMultiSender.quickPresets}</Label>
                           <div className="flex flex-wrap gap-2">
                             <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('gmail')} className="bg-white dark:bg-slate-950">Gmail</Button>
                             <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('outlook')} className="bg-white dark:bg-slate-950">Outlook</Button>
                             <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('qq')} className="bg-white dark:bg-slate-950">QQ Mail</Button>
                             <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('163')} className="bg-white dark:bg-slate-950">163 / 126 Mail</Button>
                             <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('sina')} className="bg-white dark:bg-slate-950">Sina Mail</Button>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <Label>{t.emailMultiSender.smtpHost}</Label>
                             <Input placeholder="smtp.example.com" value={smtpConfig.host} onChange={(e) => setSmtpConfig({...smtpConfig, host: e.target.value})} />
                           </div>
                           <div className="space-y-2">
                             <Label>{t.emailMultiSender.smtpPort}</Label>
                             <Input placeholder="465" value={smtpConfig.port} onChange={(e) => setSmtpConfig({...smtpConfig, port: e.target.value})} />
                           </div>
                        </div>
                      </div>
                    )}
                  </div>

                 {/* Save current SMTP config button */}
                 {user?.id && (
                   <div className="border-t pt-4 space-y-2">
                     {showSaveSmtpConfig ? (
                       <div className="flex items-center gap-2">
                         <Input
                           placeholder={language === 'zh' ? '配置名称，如：我的 Gmail' : 'Config name, e.g. My Gmail'}
                           value={newSmtpConfigName}
                           onChange={(e) => setNewSmtpConfigName(e.target.value)}
                           className="h-8"
                           onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSmtpConfig() }}
                         />
                         <Button size="sm" onClick={handleSaveSmtpConfig} disabled={!newSmtpConfigName.trim() || !smtpConfig.host}>
                           <Save className="w-3 h-3 mr-1" />
                           {language === 'zh' ? '保存' : 'Save'}
                         </Button>
                         <Button size="sm" variant="ghost" onClick={() => setShowSaveSmtpConfig(false)}>
                           <X className="w-3 h-3" />
                         </Button>
                       </div>
                     ) : (
                       <Button size="sm" variant="outline" onClick={() => setShowSaveSmtpConfig(true)} disabled={!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass}>
                         <Database className="w-3 h-3 mr-1" />
                         {language === 'zh' ? '保存当前配置以便下次使用' : 'Save this config for next time'}
                       </Button>
                     )}
                   </div>
                 )}
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
                {/* User saved templates section */}
                {user?.id && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        {t.emailMultiSender.savedTemplates}
                      </h3>
                      <Button variant="ghost" size="sm" onClick={loadUserTemplates} disabled={isLoadingTemplates}>
                        <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingTemplates ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    {userTemplates.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t.emailMultiSender.noSavedTemplates}</p>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {userTemplates.map((tmpl) => (
                          <div key={tmpl.id} className="flex items-center justify-between p-2 rounded border bg-background hover:bg-muted/40 group transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{tmpl.name}</p>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                {tmpl.subject || (language === 'zh' ? '无主题' : 'No subject')}
                                {Array.isArray(tmpl.attachments) && tmpl.attachments.length > 0 && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                                    📎 {tmpl.attachments.length}
                                  </Badge>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 pl-2">
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleLoadUserTemplate(tmpl)}>
                                {t.emailMultiSender.loadTemplate}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => handleDeleteTemplate(tmpl.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Select value={selectedTemplate} onValueChange={(val) => {
                    setSelectedTemplate(val)
                    // Clear loaded user template name and attachments when switching templates
                    if (val !== 'custom') {
                      setLoadedUserTemplateName('')
                      setAttachments([])
                    }
                    // If selecting a user template from dropdown, load its content
                    if (val.startsWith('user-')) {
                      const tmplId = parseInt(val.replace('user-', ''))
                      const tmpl = userTemplates.find(ut => ut.id === tmplId)
                      if (tmpl) {
                        setCustomSubject(tmpl.subject)
                        setCustomContent(tmpl.content)
                        setLoadedUserTemplateName(tmpl.name)
                        setSelectedTemplate('custom')
                        // Always reset attachments to match the selected template
                        const restoredFiles = restoreAttachmentsFromTemplate(tmpl.attachments || [])
                        setAttachments(restoredFiles)
                      }
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.emailMultiSender.chooseTemplatePlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {/* User saved templates */}
                      {userTemplates.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {t.emailMultiSender.savedTemplates}
                          </div>
                          {userTemplates.map((tmpl) => (
                            <SelectItem key={`user-${tmpl.id}`} value={`user-${tmpl.id}`}>
                              ★ {tmpl.name}
                            </SelectItem>
                          ))}
                          <div className="my-1 border-t" />
                        </>
                      )}
                      {/* Built-in templates */}
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
                      {/* Save as template button */}
                      {user?.id && (
                        <div className="border-t pt-3 space-y-2">
                          {showSaveTemplate ? (
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder={t.emailMultiSender.templateNamePlaceholder}
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                className="h-8"
                              />
                              <Button size="sm" onClick={handleSaveTemplate} disabled={!newTemplateName.trim()}>
                                <Save className="w-3 h-3 mr-1" />
                                {t.emailMultiSender.saveTemplate}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setShowSaveTemplate(false)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setShowSaveTemplate(true)} disabled={!customSubject && !customContent}>
                              <Save className="w-3 h-3 mr-1" />
                              {attachments.length > 0
                                ? (language === 'zh'
                                  ? `保存为模板（含 ${attachments.length} 个附件）`
                                  : `Save as Template (with ${attachments.length} file${attachments.length > 1 ? 's' : ''})`)
                                : (t.emailMultiSender.saveAsTemplate)}
                            </Button>
                          )}
                        </div>
                      )}
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

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-base">{t.emailMultiSender.attachmentsLabel || 'Attachments'}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t.emailMultiSender.attachmentsHint || 'Up to 5 files, 10MB per file, 20MB total'}
                    </p>
                    <Input type="file" multiple onChange={handleAttachmentUpload} />
                  </div>

                  {attachments.length > 0 ? (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={`${file.name}_${file.size}_${file.lastModified}`}
                          className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAttachment(index)} disabled={isSending}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        {(t.emailMultiSender.attachmentsSummary || '{count} files, {size} total')
                          .replace('{count}', String(attachments.length))
                          .replace('{size}', formatFileSize(getTotalAttachmentSize(attachments)))}
                      </p>
                    </div>
                  ) : null}
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
                        <Input id="schedule-date" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="schedule-time">{t.emailMultiSender.time}</Label>
                        <Input id="schedule-time" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                      </div>
                    </div>
                )}

                <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                  <div className="space-y-2">
                    <Label className="text-base">{t.emailMultiSender.sendingRate}</Label>
                    <div className="space-y-2">
                        <Select defaultValue="normal" value={sendingRate} onValueChange={setSendingRate}>
                        <SelectTrigger className="w-full max-w-[320px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="slow">{t.emailMultiSender.slowRate} (3-7s)</SelectItem>
                            <SelectItem value="normal">{t.emailMultiSender.normalRate} (1.5-3s)</SelectItem>
                            <SelectItem value="fast">{t.emailMultiSender.fastRate} (0.8-1.5s)</SelectItem>
                        </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">{t.emailMultiSender.avoidSpam}</p>
                    </div>
                  </div>
                </div>

                {/* Tracking info */}
                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20 flex items-start gap-3">
                  <Eye className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">{t.emailMultiSender.trackingEnabled}</p>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-1">{t.emailMultiSender.trackingPixelNote}</p>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* Send History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  {selectedTaskId ? t.emailMultiSender.sendResults : t.emailMultiSender.sendHistory}
                </CardTitle>
                {selectedTaskId && (
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedTaskId(null); setTaskDetails([]) }} className="w-fit">
                    <ArrowLeft className="w-4 h-4 mr-1" /> {t.emailMultiSender.backToList}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {!user?.id ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>{t.emailMultiSender.loginRequiredForHistory}</p>
                  </div>
                ) : selectedTaskId && taskDetails.length > 0 ? (
                  /* Task detail view */
                  <div className="space-y-4">
                    {/* Stats bar */}
                    {taskStats && (
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-muted/40 p-3 rounded-lg text-center">
                          <span className="block text-xl font-bold">{taskStats.total}</span>
                          <span className="text-xs text-muted-foreground">{t.emailMultiSender.totalEmails}</span>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                          <span className="block text-xl font-bold text-green-600">{taskStats.sent}</span>
                          <span className="text-xs text-green-600">{t.emailMultiSender.sentSuccess}</span>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                          <span className="block text-xl font-bold text-red-500">{taskStats.failed}</span>
                          <span className="text-xs text-red-500">{t.emailMultiSender.sentFailed}</span>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                          <span className="block text-xl font-bold text-blue-600">{taskStats.opened}</span>
                          <span className="text-xs text-blue-600">{t.emailMultiSender.opened}</span>
                        </div>
                      </div>
                    )}

                    {/* Success rate bar */}
                    {taskStats && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{t.emailMultiSender.successRate}</span>
                          <span className="font-semibold">{taskStats.successRate}%</span>
                        </div>
                        <Progress value={taskStats.successRate} className="h-2" />
                      </div>
                    )}

                    {/* Export button */}
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => loadTaskDetails(selectedTaskId)}>
                        <RefreshCw className="w-3 h-3 mr-1" /> {t.emailMultiSender.refreshTracking}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => exportResults(taskDetails)}>
                        <Download className="w-3 h-3 mr-1" /> {t.emailMultiSender.exportResults}
                      </Button>
                    </div>

                    {/* Detail list */}
                    <div className="max-h-[500px] overflow-y-auto space-y-2">
                      {taskDetails.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{log.recipient_email}</p>
                              {log.recipient_name && <span className="text-xs text-muted-foreground">({log.recipient_name})</span>}
                            </div>
                            {log.error_message && (
                              <p className="text-xs text-red-500 mt-1 truncate flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 shrink-0" /> {log.error_message}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pl-3 shrink-0">
                            {log.status === 'sent' ? (
                              <Badge className="bg-green-500 hover:bg-green-600 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {t.emailMultiSender.sentSuccess}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {t.emailMultiSender.sentFailed}
                              </Badge>
                            )}
                            {log.open_count > 0 ? (
                              <Badge variant="outline" className="text-blue-600 border-blue-300">
                                <MailOpen className="w-3 h-3 mr-1" />
                                {log.open_count}
                              </Badge>
                            ) : log.status === 'sent' ? (
                              <Badge variant="outline" className="text-muted-foreground">
                                <MailX className="w-3 h-3 mr-1" />
                                {t.emailMultiSender.notOpened}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Task list view */
                  <div className="space-y-3">
                    {isLoadingHistory ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                        <p className="text-sm">Loading...</p>
                      </div>
                    ) : sendTasks.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Mail className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p>{t.emailMultiSender.noSendHistory}</p>
                      </div>
                    ) : (
                      sendTasks.map((task) => (
                        <div
                          key={task.taskId}
                          className="p-4 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => loadTaskDetails(task.taskId)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium truncate flex-1">{task.subject || (language === 'zh' ? '无主题' : 'No subject')}</p>
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">
                              {new Date(task.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">{t.emailMultiSender.totalEmails}: {task.total}</span>
                            <span className="text-green-600">✓ {task.sent}</span>
                            {task.failed > 0 && <span className="text-red-500">✗ {task.failed}</span>}
                            {task.opened > 0 && (
                              <span className="text-blue-600 flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {task.opened}
                              </span>
                            )}
                            <span className="text-muted-foreground ml-auto">{t.emailMultiSender.successRate}: {task.total > 0 ? Math.round((task.sent / task.total) * 100) : 0}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
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
                     <span className="text-muted-foreground max-w-[120px] truncate block text-right">
                       {selectedTemplate === 'custom'
                         ? (loadedUserTemplateName || t.emailMultiSender.custom || "Custom")
                         : selectedTemplate?.startsWith('user-')
                           ? (userTemplates.find(u => `user-${u.id}` === selectedTemplate)?.name || t.emailMultiSender.custom)
                           : templates.find(t=>t.id === selectedTemplate)?.name || (t.emailMultiSender.none || 'None')}
                     </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                     <span className="flex items-center gap-2">
                        {isConfigValid ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                        {t.emailMultiSender.smtpConfigLabel || "SMTP Config"}
                     </span>
                     <span className="text-muted-foreground">{isConfigValid ? (t.emailMultiSender.ready || 'Ready') : (t.emailMultiSender.missing || 'Missing')}</span>
                  </div>

                  {/* Tracking indicator */}
                  <div className="flex items-center justify-between text-sm">
                     <span className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        {t.emailMultiSender.trackingEnabled}
                     </span>
                     <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">ON</Badge>
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
                    <div className="flex gap-2 pt-2">
                       <Button
                         variant={isPaused ? "default" : "outline"}
                         size="sm"
                         className="flex-1"
                         onClick={() => {
                           const next = !isPausedRef.current
                           isPausedRef.current = next
                           setIsPaused(next)
                         }}
                       >
                         {isPaused ? (
                           <><Play className="w-4 h-4 mr-1" />{language === 'zh' ? '继续发送' : 'Resume'}</>
                         ) : (
                           <><Pause className="w-4 h-4 mr-1" />{language === 'zh' ? '暂停发送' : 'Pause'}</>
                         )}
                       </Button>
                       <Button
                         variant="destructive"
                         size="sm"
                         className="flex-1"
                         onClick={() => {
                           isCancelledRef.current = true
                           isPausedRef.current = false
                           setIsPaused(false)
                         }}
                       >
                         <Square className="w-4 h-4 mr-1" />{language === 'zh' ? '取消发送' : 'Cancel'}
                       </Button>
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
