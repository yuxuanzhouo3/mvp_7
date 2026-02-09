import { getDatabase } from "@/lib/database/cloudbase-service"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { getSupabaseAdminForDownloads } from "@/lib/downloads/supabase-admin"

export type AdRegion = "CN" | "INTL"

export interface AdRecord {
  id: string
  region: AdRegion
  title: string
  imageUrl: string
  linkUrl: string
  placement: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CreateAdInput {
  region: AdRegion
  title: string
  imageUrl: string
  linkUrl: string
  placement?: string
  isActive?: boolean
  sortOrder?: number
}

function normalizeRegion(value?: string | null): AdRegion {
  return String(value || "").toUpperCase() === "INTL" ? "INTL" : "CN"
}

function mapSupabaseAd(row: any): AdRecord {
  return {
    id: String(row.id),
    region: normalizeRegion(row.region),
    title: String(row.title || ""),
    imageUrl: String(row.image_url || ""),
    linkUrl: String(row.link_url || ""),
    placement: String(row.placement || "dashboard_top"),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order || 0),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  }
}

function mapCloudbaseAd(row: any): AdRecord {
  return {
    id: String(row._id || row.id),
    region: normalizeRegion(row.region),
    title: String(row.title || ""),
    imageUrl: String(row.image_url || ""),
    linkUrl: String(row.link_url || ""),
    placement: String(row.placement || "dashboard_top"),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order || 0),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  }
}

async function ensureCloudbaseAdsCollection(db: any) {
  try {
    await db.collection("web_ads").limit(1).get()
  } catch (error: any) {
    const msg = String(error?.message || "")
    if (msg.includes("Db or Table not exist") || msg.includes("DATABASE_COLLECTION_NOT_EXIST")) {
      await db.createCollection("web_ads")
      return
    }
    throw error
  }
}

export async function listAds(options?: {
  region?: AdRegion
  onlyActive?: boolean
  placement?: string
}): Promise<AdRecord[]> {
  const region = options?.region || resolveDeploymentRegion()
  const onlyActive = options?.onlyActive !== false
  const placement = String(options?.placement || "dashboard_top").trim()

  if (region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    let query = supabase.from("web_ads").select("*").eq("region", "INTL")
    if (onlyActive) query = query.eq("is_active", true)
    if (placement) query = query.eq("placement", placement)
    query = query.order("sort_order", { ascending: true }).order("created_at", { ascending: false })

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data || []).map(mapSupabaseAd)
  }

  const db = await getDatabase()
  await ensureCloudbaseAdsCollection(db)

  let whereQuery: Record<string, any> = { region: "CN" }
  if (onlyActive) whereQuery.is_active = true
  if (placement) whereQuery.placement = placement

  const result = await db.collection("web_ads").where(whereQuery).get()
  const rows = (result?.data || []).map(mapCloudbaseAd)
  return rows.sort((a, b) => (a.sortOrder === b.sortOrder ? (a.createdAt > b.createdAt ? -1 : 1) : a.sortOrder - b.sortOrder))
}

export async function listAllAdsForAdmin(): Promise<AdRecord[]> {
  const [cn, intl] = await Promise.all([
    listAds({ region: "CN", onlyActive: false, placement: "" }).catch(() => []),
    listAds({ region: "INTL", onlyActive: false, placement: "" }).catch(() => []),
  ])

  return [...cn, ...intl].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
}

export async function createAd(input: CreateAdInput): Promise<AdRecord> {
  const payload = {
    region: input.region,
    title: input.title,
    image_url: input.imageUrl,
    link_url: input.linkUrl,
    placement: input.placement || "dashboard_top",
    is_active: input.isActive !== false,
    sort_order: Number(input.sortOrder || 0),
    updated_at: new Date().toISOString(),
  }

  if (input.region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    const { data, error } = await supabase
      .from("web_ads")
      .insert({ ...payload, created_at: new Date().toISOString() })
      .select("*")
      .single()

    if (error || !data) throw new Error(error?.message || "Failed to create ad")
    return mapSupabaseAd(data)
  }

  const db = await getDatabase()
  await ensureCloudbaseAdsCollection(db)
  const result = await db.collection("web_ads").add({ ...payload, created_at: new Date().toISOString() })
  const rowResult = await db.collection("web_ads").where({ _id: result.id }).get()
  const row = rowResult?.data?.[0]
  return mapCloudbaseAd(row || { ...payload, _id: result.id })
}

export async function updateAdStatus(input: { id: string; region: AdRegion; isActive: boolean }) {
  if (input.region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    const { error } = await supabase
      .from("web_ads")
      .update({ is_active: input.isActive, updated_at: new Date().toISOString() })
      .eq("id", input.id)
      .eq("region", "INTL")

    if (error) throw new Error(error.message)
    return
  }

  const db = await getDatabase()
  await ensureCloudbaseAdsCollection(db)
  await db.collection("web_ads").doc(input.id).update({
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  })
}

export async function deleteAd(input: { id: string; region: AdRegion }) {
  if (input.region === "INTL") {
    const supabase = getSupabaseAdminForDownloads()
    const { error } = await supabase.from("web_ads").delete().eq("id", input.id).eq("region", "INTL")
    if (error) throw new Error(error.message)
    return
  }

  const db = await getDatabase()
  await ensureCloudbaseAdsCollection(db)
  await db.collection("web_ads").doc(input.id).remove()
}
