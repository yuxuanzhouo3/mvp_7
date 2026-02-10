"use client"

import { useState, useEffect } from "react"

export interface User {
  id: string
  email: string
  name?: string
  full_name?: string
  avatar_url?: string
  credits: number
  subscription_tier: string
  subscription_expires_at?: string
  membership_expires_at?: string
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const syncProfile = async (candidate: any) => {
      if (!candidate) return

      const userId = String(candidate?.id || "").trim()
      const userEmail = String(candidate?.email || "").trim()

      if (!userId && !userEmail) return

      try {
        const byIdUrl = userId ? `/api/user/profile?id=${encodeURIComponent(userId)}` : ""
        const byIdResponse = byIdUrl ? await fetch(byIdUrl) : null
        const byIdResult = byIdResponse ? await byIdResponse.json() : null

        if (byIdResponse?.ok && byIdResult?.success && byIdResult?.user) {
          const merged = { ...candidate, ...byIdResult.user }
          setUser(merged)
          localStorage.setItem("user", JSON.stringify(merged))
          return
        }

        if (userEmail) {
          const byEmailResponse = await fetch(`/api/user/profile?email=${encodeURIComponent(userEmail)}`)
          const byEmailResult = await byEmailResponse.json()

          if (byEmailResponse.ok && byEmailResult?.success && byEmailResult?.user) {
            const merged = { ...candidate, ...byEmailResult.user }
            setUser(merged)
            localStorage.setItem("user", JSON.stringify(merged))
          }
        }
      } catch (error) {
        console.error("Failed to sync user profile:", error)
      }
    }

    // Load user from localStorage on mount
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        setUser(parsed)
        void syncProfile(parsed)
      } catch (error) {
        console.error("Failed to parse saved user:", error)
        localStorage.removeItem("user")
      }
    }
    setIsLoading(false)

    // Listen for URL parameters (e.g., after OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search)
    const userStr = urlParams.get('user')
    if (userStr) {
      try {
        const userInfo = JSON.parse(decodeURIComponent(userStr))
        localStorage.setItem("user", JSON.stringify(userInfo))
        setUser(userInfo)
        void syncProfile(userInfo)
      } catch (error) {
        console.error("Failed to parse user from URL:", error)
      }
    }
  }, [])

  const updateUser = (newUser: User | null) => {
    setUser(newUser)
    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser))
    } else {
      localStorage.removeItem("user")
    }
  }

  const updateCredits = (newCredits: number) => {
    if (user) {
      const updatedUser = { ...user, credits: newCredits }
      updateUser(updatedUser)
    }
  }

  return {
    user,
    isLoading,
    updateUser,
    updateCredits
  }
}
