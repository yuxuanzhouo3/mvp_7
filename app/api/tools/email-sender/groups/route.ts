import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET - 获取用户收件人分组列表
export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('email_recipient_groups')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[email-groups] query error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, groups: data || [] })
  } catch (error: any) {
    console.error('[email-groups] GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST - 创建或更新收件人分组
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, recipients, id } = body

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Group name is required' }, { status: 400 })
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'Recipients are required' }, { status: 400 })
    }

    // 去重
    const emailMap = new Map<string, any>()
    for (const r of recipients) {
      const key = (r.email || '').trim().toLowerCase()
      if (key && key.includes('@')) {
        emailMap.set(key, {
          email: key,
          name: r.name || key.split('@')[0],
          company: r.company || undefined,
          position: r.position || undefined,
        })
      }
    }
    const deduped = Array.from(emailMap.values())

    if (id) {
      // 更新现有分组
      const { data, error } = await supabaseAdmin
        .from('email_recipient_groups')
        .update({
          name: name.trim(),
          recipients: deduped,
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('[email-groups] update error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, group: data })
    } else {
      // 创建新分组
      const { data, error } = await supabaseAdmin
        .from('email_recipient_groups')
        .insert({
          user_id: userId,
          name: name.trim(),
          recipients: deduped,
        })
        .select()
        .single()

      if (error) {
        console.error('[email-groups] insert error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, group: data })
    }
  } catch (error: any) {
    console.error('[email-groups] POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE - 删除收件人分组
export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get('id')

    if (!groupId) {
      return NextResponse.json({ success: false, error: 'Group ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('email_recipient_groups')
      .delete()
      .eq('id', groupId)
      .eq('user_id', userId)

    if (error) {
      console.error('[email-groups] delete error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[email-groups] DELETE error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
