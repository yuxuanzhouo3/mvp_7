import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 1x1 透明 GIF（最小体积追踪像素）
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// GET /api/tools/email-sender/track/[trackingId]
// 当邮件客户端加载图片时会请求这个URL，记录打开事件
export async function GET(
  req: Request,
  { params }: { params: { trackingId: string } }
) {
  const { trackingId } = params

  if (!trackingId) {
    return new Response(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  }

  // 异步更新打开记录，不阻塞返回
  try {
    // 先查找记录
    const { data: existing } = await supabaseAdmin
      .from('email_send_logs')
      .select('id, open_count, opened_at')
      .eq('tracking_id', trackingId)
      .single()

    if (existing) {
      const updateData: any = {
        open_count: (existing.open_count || 0) + 1,
      }
      // 只在首次打开时记录 opened_at
      if (!existing.opened_at) {
        updateData.opened_at = new Date().toISOString()
      }

      await supabaseAdmin
        .from('email_send_logs')
        .update(updateData)
        .eq('id', existing.id)
    }
  } catch (error) {
    // 追踪失败不影响返回图片
    console.error('[email-tracking] update error:', error)
  }

  return new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_GIF.length),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
