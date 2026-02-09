import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/downloads/admin-auth"
import { uploadToCloudbaseStorage } from "@/lib/downloads/cloudbase-storage"
import {
  createDownloadPackage,
  listAllDownloadPackagesForAdmin,
} from "@/lib/downloads/repository"
import { getSupabaseAdminForDownloads, getSupabaseDownloadBucket } from "@/lib/downloads/supabase-admin"
import { PackageRegion } from "@/lib/downloads/types"

export const runtime = "nodejs"

function normalizeRegion(value?: string | null): PackageRegion {
  return String(value || "").toUpperCase() === "INTL" ? "INTL" : "CN"
}

async function uploadToSupabaseStorage(input: { file: File }) {
  const supabase = getSupabaseAdminForDownloads()
  const bucket = getSupabaseDownloadBucket()
  const fileName = input.file.name || `package_${Date.now()}`
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const objectPath = `downloads/${Date.now()}_${safeName}`
  const buffer = Buffer.from(await input.file.arrayBuffer())

  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false,
  })

  if (error) {
    throw new Error(error.message)
  }

  return objectPath
}

export async function GET(request: NextRequest) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const packages = await listAllDownloadPackagesForAdmin()
    return NextResponse.json({ success: true, packages })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to list packages" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const formData = await request.formData()
    const region = normalizeRegion(String(formData.get("region") || ""))
    const platform = String(formData.get("platform") || "").trim()
    const version = String(formData.get("version") || "").trim()
    const title = `Morntool ${platform || "package"}`
    const releaseNotes = String(formData.get("releaseNotes") || "").trim()
    const isActive = String(formData.get("isActive") || "true") !== "false"
    const fileValue = formData.get("file")

    if (!platform || !version || !(fileValue instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: region/platform/version/file" },
        { status: 400 }
      )
    }

    let storagePath = ""
    let storageProvider: "cloudbase" | "supabase" = "cloudbase"

    if (region === "INTL") {
      storagePath = await uploadToSupabaseStorage({ file: fileValue })
      storageProvider = "supabase"
    } else {
      const upload = await uploadToCloudbaseStorage({
        fileName: fileValue.name,
        data: Buffer.from(await fileValue.arrayBuffer()),
        mimeType: fileValue.type,
      })
      storagePath = upload.fileID
      storageProvider = "cloudbase"
    }

    const pkg = await createDownloadPackage({
      region,
      platform,
      version,
      title,
      fileName: fileValue.name,
      fileSize: fileValue.size,
      mimeType: fileValue.type || "application/octet-stream",
      releaseNotes: releaseNotes || null,
      isActive,
      storageProvider,
      storagePath,
    })

    return NextResponse.json({ success: true, package: pkg })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to upload package" },
      { status: 500 }
    )
  }
}
