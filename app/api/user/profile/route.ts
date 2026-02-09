import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/cloudbase-service"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("id")
    if (!userId) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const result = await db.collection("web_users").where({ _id: userId }).get()
    const user = result?.data?.[0]

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        credits: Number.isFinite(user.credits) ? user.credits : 0,
        pro: Boolean(user.pro),
        subscription_tier: user.subscription_tier || (user.pro ? "pro" : "free"),
        subscription_expires_at: user.subscription_expires_at || user.membership_expires_at || null,
        membership_expires_at: user.membership_expires_at || null,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

