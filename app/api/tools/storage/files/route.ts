import { NextResponse } from "next/server"
import { listStoredFiles, saveDirectFile } from "@/lib/tools/storage"

export const runtime = "nodejs"

export async function GET() {
  try {
    const files = await listStoredFiles()
    return NextResponse.json({ success: true, files })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to list files" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "file is required" },
        { status: 400 }
      )
    }

    const data = Buffer.from(await file.arrayBuffer())
    const saved = await saveDirectFile({
      fileName: file.name || "file.bin",
      mimeType: file.type || "application/octet-stream",
      data,
    })

    return NextResponse.json({ success: true, file: saved })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to upload file" },
      { status: 500 }
    )
  }
}

