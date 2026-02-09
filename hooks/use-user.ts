"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase";

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
    // Load user from localStorage on mount
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
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
