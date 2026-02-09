"use client"

import { useEffect, useState } from "react"

type AdRecord = {
  id: string
  title: string
  imageUrl: string
  linkUrl: string
}

export function AdBanner() {
  const deploymentRegion =
    String(process.env.NEXT_PUBLIC_DEPLOYMENT_REGION || "CN").toUpperCase() === "INTL"
      ? "INTL"
      : "CN"

  const [ads, setAds] = useState<AdRecord[]>([])

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch(`/api/ads?region=${deploymentRegion}&placement=dashboard_top`)
        const result = await response.json()
        if (!response.ok || !result?.success) return
        setAds(result.ads || [])
      } catch {
        // ignore ad errors
      }
    }

    run()
  }, [deploymentRegion])

  if (!ads.length) return null

  return (
    <div className="mb-6 space-y-3">
      {ads.slice(0, 2).map((ad) => (
        <a
          key={ad.id}
          href={ad.linkUrl}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-xl border border-border bg-card hover:shadow-md transition"
        >
          <img src={ad.imageUrl} alt={ad.title} className="w-full h-auto object-cover max-h-52" />
        </a>
      ))}
    </div>
  )
}
