import { NextResponse } from "next/server"
import { completeChunkUpload } from "@/lib/tools/storage"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const uploadId = String(body?.uploadId || "").trim()
    const fileName = String(body?.fileName || "").trim()
    const mimeType = body?.mimeType ? String(body.mimeType) : undefined

    if (!uploadId || !fileName) {
      return NextResponse.json(
        { success: false, error: "uploadId and fileName are required" },
        { status: 400 }
      )
    }

    const file = await completeChunkUpload({ uploadId, fileName, mimeType })
    return NextResponse.json({ success: true, file })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to complete upload" },
      { status: 500 }
    )
  }
}

