import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getToolCreditCost } from "@/lib/credits/pricing"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"

let supabaseInstance: any = null

function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase configuration missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY"
      )
    }
    supabaseInstance = createClient(supabaseUrl, supabaseKey)
  }
  return supabaseInstance
}

function normalizeReferenceId(input: string | undefined, userId: string, toolId: string) {
  const raw = String(input || "").trim()
  if (raw) return raw.slice(0, 180)
  return `consume_${toolId}_${userId}_${Date.now()}`
}

function isCloudbaseCollectionMissing(error: any) {
  const message = String(error?.message || "")
  const code = String(error?.code || "")
  return (
    message.includes("Db or Table not exist") ||
    message.includes("DATABASE_COLLECTION_NOT_EXIST") ||
    code.includes("DATABASE_COLLECTION_NOT_EXIST")
  )
}

async function ensureCloudbaseCollection(db: any, collectionName: string) {
  try {
    await db.collection(collectionName).limit(1).get()
  } catch (error: any) {
    if (!isCloudbaseCollectionMissing(error)) {
      throw error
    }
    await db.createCollection(collectionName)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, toolId, referenceId } = body as {
      userId?: string
      toolId?: string
      referenceId?: string
    }

    if (!userId || !toolId) {
      return NextResponse.json({ error: "Missing required fields: userId, toolId" }, { status: 400 })
    }

    const cost = getToolCreditCost(toolId)
    if (!cost || cost <= 0) {
      return NextResponse.json({ error: "Unknown toolId" }, { status: 400 })
    }
    const finalReferenceId = normalizeReferenceId(referenceId, userId, toolId)

    const isChinaRegion = resolveDeploymentRegion() === "CN"

    if (!isChinaRegion) {
      const supabase = getSupabase()

      const { data: existingTx, error: existingTxError } = await supabase
        .from("credit_transactions")
        .select("id")
        .eq("reference_id", finalReferenceId)
        .maybeSingle()

      if (existingTxError) {
        console.error("Load existing consume tx failed:", existingTxError)
        return NextResponse.json({ error: "Failed to validate consume transaction" }, { status: 500 })
      }

      if (existingTx?.id) {
        const { data: currentUser, error: currentUserError } = await supabase
          .from("user")
          .select("credits")
          .eq("id", userId)
          .maybeSingle()

        if (currentUserError) {
          console.error("Load current user after idempotent hit failed:", currentUserError)
          return NextResponse.json({ error: "Failed to load user" }, { status: 500 })
        }

        const newCredits = Number(currentUser?.credits ?? 0)
        return NextResponse.json({ success: true, newCredits, alreadyProcessed: true })
      }

      const { data: user, error: loadError } = await supabase
        .from("user")
        .select("credits, email")
        .eq("id", userId)
        .maybeSingle()

      if (loadError) {
        console.error("Load user credits failed:", loadError)
        return NextResponse.json({ error: "Failed to load user" }, { status: 500 })
      }

      const currentCredits = Number(user?.credits ?? 0)
      if (!Number.isFinite(currentCredits) || currentCredits < cost) {
        return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
      }

      const newCredits = currentCredits - cost
      const { error: updateError } = await supabase.from("user").update({ credits: newCredits }).eq("id", userId)

      if (updateError) {
        console.error("Update credits failed:", updateError)
        return NextResponse.json({ error: "Failed to update credits" }, { status: 500 })
      }

      const { error: txError } = await supabase.from("credit_transactions").insert({
        user_id: userId,
        type: "consume",
        amount: -cost,
        description: `Consumed ${cost} credits for tool ${toolId}`,
        reference_id: finalReferenceId,
      })

      if (txError) {
        const isDuplicate = String(txError?.code || "") === "23505"
        if (isDuplicate) {
          const { data: currentUser } = await supabase.from("user").select("credits").eq("id", userId).maybeSingle()
          const currentCredits = Number(currentUser?.credits ?? newCredits)
          return NextResponse.json({ success: true, newCredits: currentCredits, alreadyProcessed: true })
        }
        console.error("Insert credit transaction failed:", txError)
        return NextResponse.json({ error: "Failed to record credit transaction" }, { status: 500 })
      }

      return NextResponse.json({ success: true, newCredits })
    }

    try {
      const cloudbaseService = await import("@/lib/database/cloudbase-service")
      const db = await cloudbaseService.getDatabase()

      if (!db) {
        return NextResponse.json({ error: "CloudBase unavailable" }, { status: 500 })
      }

      await ensureCloudbaseCollection(db, "web_credit_transactions")
      const users = db.collection("web_users")
      const existingTx = await db.collection("web_credit_transactions").where({ reference_id: finalReferenceId }).limit(1).get()
      if (Array.isArray(existingTx?.data) && existingTx.data.length > 0) {
        const currentUserDoc = await users.doc(userId).get()
        const currentUserData = currentUserDoc?.data?.[0]
        const currentCredits = Number(currentUserData?.credits ?? 0)
        return NextResponse.json({ success: true, newCredits: currentCredits, alreadyProcessed: true })
      }

      const userDoc = await users.doc(userId).get()
      const docData = userDoc?.data?.[0]

      if (!docData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const currentCredits = Number(docData?.credits ?? 0)

      if (!Number.isFinite(currentCredits) || currentCredits < cost) {
        return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
      }

      const newCredits = currentCredits - cost
      await users.doc(userId).update({ credits: newCredits })

      await db.collection("web_credit_transactions").add({
        user_id: userId,
        type: "consume",
        amount: -cost,
        description: `Consumed ${cost} credits for tool ${toolId}`,
        reference_id: finalReferenceId,
        created_at: new Date().toISOString(),
      })

      return NextResponse.json({ success: true, newCredits })
    } catch (error) {
      console.error("CloudBase consume credits failed:", error)
      return NextResponse.json({ error: "Failed to update credits in CloudBase" }, { status: 500 })
    }
  } catch (error) {
    console.error("Consume credits error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
