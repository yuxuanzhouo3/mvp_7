import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

// POST - 创建新模板
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, subject, content } = body

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Template name is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('email_user_templates')
      .insert({
        user_id: userId,
        name: name.trim(),
        subject: subject || '',
        content: content || '',
      })
      .select()
      .single()

    if (error) {
      console.error('[email-templates] insert error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
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
