"use client"

import { getSupabaseClient } from "@/lib/supabase"

declare global {
  interface Window {
    JSBridge?: {
      postMessage?: (message: string) => void
    }
    median?: {
      nativebridge?: {
        custom?: (params: { callback?: string; [key: string]: unknown }) => void
      }
    }
  }
}

const EVENT_NAME = "native_google_login_result"
const DEFAULT_TIMEOUT_MS = 60_000

function isAndroidWebView(): boolean {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent || ""
  return /Android/i.test(ua) && /; wv\)|Version\/\d+\.\d+.*Chrome\//i.test(ua)
}

function isBridgeAvailable(): boolean {
  if (typeof window === "undefined") return false
  return (
    typeof window.JSBridge?.postMessage === "function" ||
    typeof window.median?.nativebridge?.custom === "function"
  )
}

async function loadNativeGoogleWebClientId(): Promise<string> {
  try {
    const response = await fetch("/api/auth/native-google-config", {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok) return ""

    const json = await response.json()
    return String(json?.clientId || "").trim()
  } catch {
    return ""
  }
}

function sendBridgeCommand(webClientId?: string): void {
  const resolvedClientId = String(webClientId || "").trim()
  const encodedClientId = encodeURIComponent(resolvedClientId)
  const uriCommand = `median://native-google-login/start?webClientId=${encodedClientId}`

  const postMessagePayload = JSON.stringify({
    medianCommand: uriCommand,
    command: "native-google-login/start",
    webClientId: resolvedClientId,
    data: {
      webClientId: resolvedClientId,
    },
  })

  const customPayload = {
    command: "native-google-login/start",
    medianCommand: uriCommand,
    webClientId: resolvedClientId,
    data: {
      webClientId: resolvedClientId,
    },
  }

  if (typeof window.median?.nativebridge?.custom === "function") {
    window.median.nativebridge.custom(customPayload)
    return
  }

  if (typeof window.JSBridge?.postMessage === "function") {
    window.JSBridge.postMessage(postMessagePayload)
    return
  }

  const jsonCommand = JSON.stringify({
    medianCommand: uriCommand,
    webClientId: resolvedClientId,
    data: {
      webClientId: resolvedClientId,
    },
  })

  if (typeof window.JSBridge?.postMessage === "function") {
    window.JSBridge.postMessage(jsonCommand)
    return
  }

  throw new Error("Native bridge is not available")
}

async function signInSupabaseWithGoogleIdToken(idToken: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  })

  if (error) {
    throw new Error(error.message || "Native Google token sign-in failed")
  }

  if (!data?.user) {
    throw new Error("No user returned from native Google token sign-in")
  }

  return data.user
}

export async function signInWithNativeGoogleBridge(input?: { timeoutMs?: number }) {
  const timeoutMs = input?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  if (!isBridgeAvailable()) {
    if (!isAndroidWebView()) {
      return { success: false as const, reason: "not_android_webview" as const }
    }
    return { success: false as const, reason: "bridge_unavailable" as const }
  }

  return new Promise<
    | { success: true; user: any }
    | { success: false; reason: "cancelled" | "timeout" | "bridge_unavailable" | "not_android_webview" | "native_error"; error?: string }
  >((resolve) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      window.removeEventListener(EVENT_NAME, onResult as EventListener)
      if (timer) clearTimeout(timer)
    }

    const finish = (
      payload:
        | { success: true; user: any }
        | { success: false; reason: "cancelled" | "timeout" | "bridge_unavailable" | "not_android_webview" | "native_error"; error?: string }
    ) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(payload)
    }

    const onResult = async (event: Event) => {
      const customEvent = event as CustomEvent
      const detail = customEvent?.detail || {}
      const success = Boolean(detail?.success)

      if (!success) {
        const errorText = String(detail?.error || "")
        if (/cancel/i.test(errorText)) {
          finish({ success: false, reason: "cancelled", error: errorText })
          return
        }

        finish({ success: false, reason: "native_error", error: errorText || "Native Google login failed" })
        return
      }

      const idToken = String(detail?.idToken || "")
      if (!idToken) {
        finish({ success: false, reason: "native_error", error: "Native Google idToken is missing" })
        return
      }

      try {
        const user = await signInSupabaseWithGoogleIdToken(idToken)
        finish({ success: true, user })
      } catch (error: any) {
        finish({
          success: false,
          reason: "native_error",
          error: error?.message || "Failed to exchange native Google token",
        })
      }
    }

    window.addEventListener(EVENT_NAME, onResult as EventListener)

    timer = setTimeout(() => {
      finish({ success: false, reason: "timeout", error: "Native Google login timeout" })
    }, timeoutMs)

    ;(async () => {
      const webClientId = await loadNativeGoogleWebClientId()

      try {
        sendBridgeCommand(webClientId)
      } catch (error: any) {
        finish({
          success: false,
          reason: "bridge_unavailable",
          error: error?.message || "Native bridge is unavailable",
        })
      }
    })()
  })
}
