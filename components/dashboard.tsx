"use client"

import React, { useEffect, useState } from "react"
import { useLanguage } from "@/components/language-provider";
import { useTranslations } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import { passwordSecurity } from '@/lib/security/password-security'
import { useUser } from "@/hooks/use-user"
import { tools } from "./dashboard/tools-data"
import { Header } from "./dashboard/header"
import { Sidebar } from "./dashboard/sidebar"
import { MainContent } from "./dashboard/main-content"
import { AuthModal } from "./dashboard/auth-modal"
import { FeatureModal } from "./dashboard/feature-modal"

export function Dashboard() {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const { user, updateUser } = useUser();

  // State management
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [favorites, setFavorites] = useState<string[]>(tools.filter((t) => t.isFavorite).map((t) => t.id))
  const [recentTools, setRecentTools] = useState<string[]>([])
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [emailRef, setEmail] = useState("");
  const [passwordRef, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [selectedToolName, setSelectedToolName] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  // Detect deployment region
  const deploymentRegion = (process.env.NEXT_PUBLIC_DEPLOYMENT_REGION || 'CN').toUpperCase()
  const isChinaRegion = deploymentRegion === 'CN'

  useEffect(() => {
    // Load recent tools
    const saved = localStorage.getItem("recentTools")
    if (saved) {
      setRecentTools(JSON.parse(saved))
    }
  }, [isChinaRegion])

  const toggleFavorite = (toolId: string) => {
    setFavorites((prev) => (prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]))
  }

  const handleToolClick = (toolId: string) => {
    console.log("handleToolClick, user:", user)

    // Check if tool is uncompleted
    const uncompletedTools = ["text-multi-sender", "social-auto-poster"]
    if (uncompletedTools.includes(toolId)) {
      const toolName = tools.find((t) => t.id === toolId)?.name || toolId
      setSelectedToolName(toolName)
      setShowFeatureModal(true)
      return
    }

    if ((user && user.credits >= 0) || !user) {
      // Add to recent tools
      setRecentTools((prev) => {
        const updated = [toolId, ...prev.filter(id => id !== toolId)].slice(0, 10)
        localStorage.setItem("recentTools", JSON.stringify(updated))
        return updated
      })
      window.location.href = `/tools/${toolId}`
      return
    }
    alert(t.errors.promptForExceedingUsage)
  }

  const featureEmail = isChinaRegion ? 'morntool@sina.cn' : 'morntool@gmail.com'

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/email', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });

      const data = await response.json();
      if (data.error) {
        return { success: false, error: data.error };
      }
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("app-auth-state", JSON.stringify(data));
      updateUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('login error:' + error.message)
      return { error: 'Authentication failed' }
    }
  }

  const handleWeChatLogin = async () => {
    try {
      const response = await fetch('/api/auth/wechat/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUrl: window.location.href })
      })

      const data = await response.json()
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl
      } else {
        alert(t.notifications.wechatLoginFailed)
      }
    } catch (error) {
      console.error('微信登录错误:', error)
      alert(t.notifications.wechatLoginFailed)
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });

      if (error) {
        alert(t.notifications.googleLoginError.replace('{error}', error.message || ''));
        return { success: false, error: error.message };
      }

      if (data?.url) {
        window.location.href = data.url;
        return { success: true, url: data.url };
      }

      return { success: false, error: 'No redirect URL returned from provider' };
    } catch (error) {
      console.error('Google login error:', error.message);
      alert(t.notifications.googleLoginError.replace('{error}', error.message || ''));
      return { success: false, error: error.message };
    }
  };

  const registerUser = async (email: string, password: string, username: string, fullName: string) => {
    if (!isChinaRegion) {
      const passwordValidation = passwordSecurity.validatePassword(password);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.feedback }
      }
    }
    try {
      const response = await fetch('/api/auth/email', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signup", email, password }),
      });

      const data = await response.json();
      return { success: true, user: data.user };
    } catch (error) {
      console.error('注册异常:', error.message);
      return { success: false, error: error.message };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        user={user}
        setShowLoginModal={setShowLoginModal}
        showMobileSearch={showMobileSearch}
        setShowMobileSearch={setShowMobileSearch}
      />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <Sidebar
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            user={user}
            favorites={favorites}
            recentTools={recentTools}
          />

          <MainContent
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            favorites={favorites}
            recentTools={recentTools}
            user={user}
            toggleFavorite={toggleFavorite}
            handleToolClick={handleToolClick}
            setShowFeatureModal={setShowFeatureModal}
            setSelectedToolName={setSelectedToolName}
            isChinaRegion={isChinaRegion}
          />
        </div>

        {/* ICP Filing Section (CN Only) - Only visible when DEPLOYMENT_REGION is CN */}
        {isChinaRegion && (
          <div className="mt-6 py-3 border-t border-border/20 text-center">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors inline-flex items-center gap-1 mt-1"
            >
              粤ICP备2024281756号-3
            </a>
          </div>
        )}
      </div>

      <AuthModal
        showLoginModal={showLoginModal}
        setShowLoginModal={setShowLoginModal}
        showRegisterModal={showRegisterModal}
        setShowRegisterModal={setShowRegisterModal}
        emailRef={emailRef}
        setEmail={setEmail}
        passwordRef={passwordRef}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        signIn={signIn}
        signInWithGoogle={signInWithGoogle}
        handleWeChatLogin={handleWeChatLogin}
        registerUser={registerUser}
        isChinaRegion={isChinaRegion}
      />

      <FeatureModal
        showFeatureModal={showFeatureModal}
        setShowFeatureModal={setShowFeatureModal}
        selectedToolName={selectedToolName}
        featureEmail={featureEmail}
      />
    </div>
  )
}
