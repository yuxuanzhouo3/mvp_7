import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { grantReferralFirstUseReward } from "@/lib/market/referrals"
import { supabaseAdmin } from '@/lib/supabase-admin'

const MAX_ATTACHMENT_COUNT = 5
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024

type ParsedPayload = {
  smtpConfig: any
  mailOptions: any
  attachments: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}

function isConnectionTimeoutError(error: any): boolean {
  const code = String(error?.code || '').toUpperCase()
  const command = String(error?.command || '').toUpperCase()
  const message = String(error?.message || '').toLowerCase()

  return (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKET' ||
    command === 'CONN' ||
    message.includes('timed out') ||
    message.includes('connect etimedout')
  )
}

function isRetryableError(error: any): boolean {
  return (
    isConnectionTimeoutError(error) ||
    String(error?.code || '').toUpperCase() === 'ECONNRESET' ||
    String(error?.message || '').toLowerCase().includes('connection closed')
  )
}

function createTransporter(smtpConfig: any, port: number) {
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port,
    secure: port === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  })
}

async function verifyAndSendWithPort(port: number, smtpConfig: any, mailOptions: any) {
  const transporter = createTransporter(smtpConfig, port)
  await transporter.verify()
  return transporter.sendMail({
    from: `"${mailOptions.fromName || smtpConfig.user}" <${smtpConfig.user}>`,
    to: mailOptions.to,
    subject: mailOptions.subject,
    html: mailOptions.html,
    attachments: Array.isArray(mailOptions.attachments) ? mailOptions.attachments : undefined,
  })
}

// 带重试的发送
async function sendWithRetry(port: number, smtpConfig: any, mailOptions: any, maxRetries = 1): Promise<any> {
  let lastError: any = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await verifyAndSendWithPort(port, smtpConfig, mailOptions)
    } catch (error: any) {
      lastError = error
      if (attempt < maxRetries && isRetryableError(error)) {
        console.log(`[email-sender] Retry attempt ${attempt + 1} for ${mailOptions.to}`)
        // 重试前等待 2-4 秒
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000))
        continue
      }
      throw error
    }
  }
  throw lastError
}

function generateTrackingId(): string {
  return `trk_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
}

function injectTrackingPixel(html: string, trackingId: string, baseUrl: string): string {
  const trackingUrl = `${baseUrl}/api/tools/email-sender/track/${trackingId}`
  const pixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;border:0;" alt="" />`

  // 在 </body> 前插入，如果没有 </body> 则追加到末尾
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`)
  }
  return html + pixel
}

function parseJsonText(value: FormDataEntryValue | null, key: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing ${key}`)
  }

  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`Invalid JSON for ${key}`)
  }
}

async function parsePayload(req: Request): Promise<ParsedPayload> {
  const contentType = String(req.headers.get('content-type') || '').toLowerCase()

  if (!contentType.includes('multipart/form-data')) {
    const body = await req.json()
    return {
      smtpConfig: body?.smtpConfig,
      mailOptions: body?.mailOptions,
      attachments: [],
    }
  }

  const formData = await req.formData()
  const smtpConfig = parseJsonText(formData.get('smtpConfig'), 'smtpConfig')
  const mailOptions = parseJsonText(formData.get('mailOptions'), 'mailOptions')
  const files = formData.getAll('attachments').filter((value): value is File => value instanceof File)

  if (files.length > MAX_ATTACHMENT_COUNT) {
    throw new Error(`Too many attachments. Maximum ${MAX_ATTACHMENT_COUNT} files are allowed.`)
  }

  let totalSize = 0
  const attachments: ParsedPayload['attachments'] = []

  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new Error(`Attachment ${file.name} exceeds ${Math.floor(MAX_ATTACHMENT_SIZE / 1024 / 1024)}MB.`)
    }

    totalSize += file.size
    if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
      throw new Error(`Total attachments exceed ${Math.floor(MAX_TOTAL_ATTACHMENT_SIZE / 1024 / 1024)}MB.`)
    }

    attachments.push({
      filename: file.name || `attachment_${Date.now()}`,
      content: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || undefined,
    })
  }

  return { smtpConfig, mailOptions, attachments }
}

export async function POST(req: Request) {
  try {
    const { smtpConfig, mailOptions, attachments } = await parsePayload(req)
    const requestUserId = String(req.headers.get("x-user-id") || "").trim()
    const taskId = String(req.headers.get("x-task-id") || "").trim()

    if (!smtpConfig || !mailOptions) {
      return NextResponse.json(
        { success: false, error: 'Missing configuration or mail options' },
        { status: 400 }
      )
    }

    const primaryPort = Number(smtpConfig.port)

    // 生成追踪ID并注入追踪像素
    const trackingId = generateTrackingId()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
      || 'http://localhost:3000'

    const originalHtml = mailOptions.html || ''
    const htmlWithTracking = injectTrackingPixel(originalHtml, trackingId, baseUrl)

    const finalMailOptions = {
      ...mailOptions,
      html: htmlWithTracking,
      attachments,
    }

    let info: any

    try {
      info = await sendWithRetry(primaryPort, smtpConfig, finalMailOptions)
    } catch (verifyError: any) {
      console.error('SMTP Connection Failed:', verifyError)

      // 记录失败日志
      if (requestUserId && taskId) {
        try {
          const { error: logErr } = await supabaseAdmin
            .from('email_send_logs')
            .insert({
              user_id: requestUserId,
              task_id: taskId,
              recipient_email: mailOptions.to,
              recipient_name: mailOptions.recipientName || null,
              subject: mailOptions.subject,
              status: 'failed',
              error_message: verifyError.message,
              smtp_host: smtpConfig.host,
              tracking_id: trackingId,
            })
          if (logErr) console.error('[email-sender] log insert error:', logErr)
        } catch (e) {
          console.error('[email-sender] log insert crash:', e)
        }
      }

      return NextResponse.json(
        {
          success: false,
          errorCode: isConnectionTimeoutError(verifyError)
            ? 'SMTP_NETWORK_UNREACHABLE'
            : 'SMTP_AUTH_OR_CONFIG_ERROR',
          error: `SMTP Connection Failed: ${verifyError.message}`,
          userMessage: isConnectionTimeoutError(verifyError)
            ? 'SMTP server is unreachable or the port is blocked. Please check outbound connection for the current port.'
            : 'SMTP authentication or configuration error. Please check host, port, username, and app password.',
        },
        { status: 401 }
      )
    }

    console.log('Message sent: %s', info.messageId)

    // 记录成功日志
    if (requestUserId && taskId) {
      try {
        const { error: logErr } = await supabaseAdmin
          .from('email_send_logs')
          .insert({
            user_id: requestUserId,
            task_id: taskId,
            recipient_email: mailOptions.to,
            recipient_name: mailOptions.recipientName || null,
            subject: mailOptions.subject,
            status: 'sent',
            smtp_host: smtpConfig.host,
            message_id: info.messageId,
            tracking_id: trackingId,
          })
        if (logErr) console.error('[email-sender] log insert error:', logErr)
      } catch (e) {
        console.error('[email-sender] log insert crash:', e)
      }
    }

    if (requestUserId) {
      await grantReferralFirstUseReward({
        invitedUserId: requestUserId,
        toolId: "email-multi-sender",
      }).catch(() => null)
    }

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      usedPort: primaryPort,
      trackingId,
    })
  } catch (error: any) {
    console.error('Email sending error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
