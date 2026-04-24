import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MAX_ATTACHMENT_COUNT = 5
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024

interface TemplateAttachment {
  filename: string
  contentType: string
  size: number
  base64: string
}

// GET - 获取用户模板列表
export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('email_user_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[email-templates] query error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, templates: data || [] })
  } catch (error: any) {
    console.error('[email-templates] GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST - 创建新模板（支持附件）
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = String(req.headers.get('content-type') || '').toLowerCase()

    let name: string
    let subject: string
    let content: string
    let attachments: TemplateAttachment[] = []

    if (contentType.includes('multipart/form-data')) {
      // multipart: 文本字段 + 文件附件
      const formData = await req.formData()
      name = String(formData.get('name') || '').trim()
      subject = String(formData.get('subject') || '')
      content = String(formData.get('content') || '')

      const files = formData.getAll('attachments').filter(
        (value): value is File => value instanceof File && value.size > 0
      )

      if (files.length > MAX_ATTACHMENT_COUNT) {
        return NextResponse.json(
          { success: false, error: `Too many attachments. Maximum ${MAX_ATTACHMENT_COUNT} files allowed.` },
          { status: 400 }
        )
      }

      let totalSize = 0
      for (const file of files) {
        if (file.size > MAX_ATTACHMENT_SIZE) {
          return NextResponse.json(
            { success: false, error: `Attachment ${file.name} exceeds ${Math.floor(MAX_ATTACHMENT_SIZE / 1024 / 1024)}MB limit.` },
            { status: 400 }
          )
        }

        totalSize += file.size
        if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
          return NextResponse.json(
            { success: false, error: `Total attachments exceed ${Math.floor(MAX_TOTAL_ATTACHMENT_SIZE / 1024 / 1024)}MB limit.` },
            { status: 400 }
          )
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        attachments.push({
          filename: file.name || `attachment_${Date.now()}`,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
          base64: buffer.toString('base64'),
        })
      }
    } else {
      // JSON body (backwards compatible)
      const body = await req.json()
      name = (body.name || '').trim()
      subject = body.subject || ''
      content = body.content || ''
      // 支持从 JSON body 传入已编码的附件
      if (Array.isArray(body.attachments)) {
        attachments = body.attachments
      }
    }

    if (!name) {
      return NextResponse.json({ success: false, error: 'Template name is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('email_user_templates')
      .insert({
        user_id: userId,
        name,
        subject,
        content,
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : '[]',
      })
      .select()
      .single()

    if (error) {
      console.error('[email-templates] insert error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Parse attachments back from string if needed
    if (data && typeof data.attachments === 'string') {
      try { data.attachments = JSON.parse(data.attachments) } catch {}
    }

    return NextResponse.json({ success: true, template: data })
  } catch (error: any) {
    console.error('[email-templates] POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE - 删除模板
export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'Template ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('email_user_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', userId)

    if (error) {
      console.error('[email-templates] delete error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[email-templates] DELETE error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
