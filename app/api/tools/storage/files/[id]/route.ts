import { promises as fs } from "fs"
import { NextResponse } from "next/server"
import { deleteStoredFileById, getStoredFileById } from "@/lib/tools/storage"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const record = await getStoredFileById(String(id || ""))

    if (!record) {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 })
    }

    const bytes = await fs.readFile(record.filePath)
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": record.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(record.fileName)}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to download file" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const ok = await deleteStoredFileById(String(id || ""))

    if (!ok) {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete file" },
      { status: 500 }
    )
  }
}
