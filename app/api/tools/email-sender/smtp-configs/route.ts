import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET - 获取用户保存的 SMTP 配置列表
export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const configId = searchParams.get('id')

    if (configId) {
      // 获取单个配置（含密码，用于加载到表单）
      const { data, error } = await supabaseAdmin
        .from('email_smtp_configs')
        .select('*')
        .eq('id', configId)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('[smtp-configs] single query error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, config: data })
    }

    // 列表模式：返回所有配置，密码用 mask 显示
    const { data, error } = await supabaseAdmin
      .from('email_smtp_configs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[smtp-configs] query error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // 掩码密码
    const masked = (data || []).map((c: any) => ({
      ...c,
      pass: c.pass ? '••••••••' : '',
    }))

    return NextResponse.json({ success: true, configs: masked })
  } catch (error: any) {
    console.error('[smtp-configs] GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST - 保存 SMTP 配置
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, host, port, username, pass, senderName } = body

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Config name is required' }, { status: 400 })
    }
    if (!host?.trim() || !username?.trim() || !pass?.trim()) {
      return NextResponse.json({ success: false, error: 'Host, username and password are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('email_smtp_configs')
      .insert({
        user_id: userId,
        name: name.trim(),
        host: host.trim(),
        port: port || '465',
        username: username.trim(),
        pass: pass,
        sender_name: senderName || '',
      })
      .select()
      .single()

    if (error) {
      console.error('[smtp-configs] insert error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      config: { ...data, pass: '••••••••' },
    })
  } catch (error: any) {
    console.error('[smtp-configs] POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE - 删除 SMTP 配置
export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const configId = searchParams.get('id')

    if (!configId) {
      return NextResponse.json({ success: false, error: 'Config ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('email_smtp_configs')
      .delete()
      .eq('id', configId)
      .eq('user_id', userId)

    if (error) {
      console.error('[smtp-configs] delete error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[smtp-configs] DELETE error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
