import { createClient } from "@supabase/supabase-js"

let supabaseAdminInstance: any = null

export function getSupabaseAdminForDownloads() {
  if (!supabaseAdminInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

    if (!url || !key) {
      throw new Error("Supabase admin config missing")
    }

    supabaseAdminInstance = createClient(url, key)
  }

  return supabaseAdminInstance
}

export function getSupabaseDownloadBucket() {
  return process.env.SUPABASE_DOWNLOAD_BUCKET || "downloads"
}

export function getSupabaseAdBucket() {
  return process.env.SUPABASE_ADS_BUCKET || process.env.SUPABASE_DOWNLOAD_BUCKET || "downloads"
}
