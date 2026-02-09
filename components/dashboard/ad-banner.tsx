"use client"

import { useEffect, useMemo, useState } from "react"

type AdRecord = {
  id: string
  title: string
  imageUrl: string
  linkUrl: string
}

function isValidImageUrl(url: string) {
  return /^https?:\/\//i.test(String(url || "").trim())
}

export function AdBanner({ placement = "dashboard_top" }: { placement?: string }) {
  const deploymentRegion =
    String(process.env.NEXT_PUBLIC_DEPLOYMENT_REGION || "CN").toUpperCase() === "INTL"
      ? "INTL"
      : "CN"

  const [ads, setAds] = useState<AdRecord[]>([])
  const [brokenIds, setBrokenIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch(
          `/api/ads?region=${deploymentRegion}&placement=${encodeURIComponent(placement)}`
        )
        const result = await response.json()
        if (!response.ok || !result?.success) return
        setAds(result.ads || [])
      } catch {
        // ignore ad errors
      }
    }

    run()
  }, [deploymentRegion, placement])

  const visibleAds = useMemo(
    () => ads.filter((ad) => isValidImageUrl(ad.imageUrl) && !brokenIds[ad.id]),
    [ads, brokenIds]
  )

  const reportClick = (adId: string) => {
    const body = JSON.stringify({ adId, placement, region: deploymentRegion })

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" })
      navigator.sendBeacon("/api/ads/click", blob)
      return
    }

    fetch("/api/ads/click", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined)
  }

  if (!visibleAds.length) return null

  return (
    <div className="mb-6 space-y-3">
      {visibleAds.slice(0, 2).map((ad) => (
        <a
          key={ad.id}
          href={ad.linkUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => reportClick(ad.id)}
          className="block overflow-hidden rounded-xl border border-border bg-card hover:shadow-md transition"
        >
          <img
            src={ad.imageUrl}
            alt={ad.title || "ad"}
            className="w-full h-auto object-cover max-h-52"
            onError={() => setBrokenIds((prev) => ({ ...prev, [ad.id]: true }))}
          />
        </a>
      ))}
    </div>
  )
}
