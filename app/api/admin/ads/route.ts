import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/downloads/admin-auth"
import { createAd, listAllAdsForAdmin, type AdRegion } from "@/lib/ads/repository"

export const runtime = "nodejs"

function normalizeRegion(value?: string | null): AdRegion {
  return String(value || "").toUpperCase() === "INTL" ? "INTL" : "CN"
}

export async function GET(request: NextRequest) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const ads = await listAllAdsForAdmin()
    return NextResponse.json({ success: true, ads })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load ads" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const region = normalizeRegion(body?.region)
    const title = String(body?.title || "").trim()
    const imageUrl = String(body?.imageUrl || "").trim()
    const linkUrl = String(body?.linkUrl || "").trim()
    const placement = String(body?.placement || "dashboard_top").trim()
    const sortOrder = Number(body?.sortOrder || 0)
    const isActive = Boolean(body?.isActive ?? true)

    if (!title || !imageUrl || !linkUrl) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title,imageUrl,linkUrl" },
        { status: 400 }
      )
    }

    const ad = await createAd({
      region,
      title,
      imageUrl,
      linkUrl,
      placement,
      sortOrder,
      isActive,
    })

    return NextResponse.json({ success: true, ad })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create ad" },
      { status: 500 }
    )
  }
}
