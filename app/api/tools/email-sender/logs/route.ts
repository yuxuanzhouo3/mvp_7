import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET - 查询发送历史
export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const offset = (page - 1) * pageSize

    if (taskId) {
      // 查询某个任务的所有记录
      const { data, error } = await supabaseAdmin
        .from('email_send_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      const total = data?.length || 0
      const sent = data?.filter((r: any) => r.status === 'sent').length || 0
      const failed = data?.filter((r: any) => r.status === 'failed').length || 0
      const opened = data?.filter((r: any) => r.open_count > 0).length || 0

      return NextResponse.json({
        success: true,
        logs: data || [],
        stats: { total, sent, failed, opened, successRate: total > 0 ? Math.round((sent / total) * 100) : 0 },
      })
    }

    // 查询任务列表（按 taskId 分组）
    // 先获取所有不重复的 taskId 及其摘要信息
    const { data: allLogs, error: logsError } = await supabaseAdmin
      .from('email_send_logs')
      .select('task_id, status, subject, smtp_host, created_at, open_count')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (logsError) {
      return NextResponse.json({ success: false, error: logsError.message }, { status: 500 })
    }

    // 按 taskId 分组
    const taskMap = new Map<string, {
      taskId: string
      subject: string
      smtpHost: string
      total: number
      sent: number
      failed: number
      opened: number
      createdAt: string
    }>()

    for (const log of (allLogs || [])) {
      const existing = taskMap.get(log.task_id)
      if (!existing) {
        taskMap.set(log.task_id, {
          taskId: log.task_id,
          subject: log.subject || '',
          smtpHost: log.smtp_host || '',
          total: 1,
          sent: log.status === 'sent' ? 1 : 0,
          failed: log.status === 'failed' ? 1 : 0,
          opened: log.open_count > 0 ? 1 : 0,
          createdAt: log.created_at,
        })
      } else {
        existing.total++
        if (log.status === 'sent') existing.sent++
        if (log.status === 'failed') existing.failed++
        if (log.open_count > 0) existing.opened++
      }
    }

    const tasks = Array.from(taskMap.values())
    const totalTasks = tasks.length
    const paginatedTasks = tasks.slice(offset, offset + pageSize)

    return NextResponse.json({
      success: true,
      tasks: paginatedTasks,
      pagination: { page, pageSize, total: totalTasks },
    })
  } catch (error: any) {
    console.error('[email-logs] GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
