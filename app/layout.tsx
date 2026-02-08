import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
// import { Suspense } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/components/language-provider"
import { I18nProvider } from "@/lib/i18n/context"
// import { UserProvider } from "@/components/user-context";
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: "AutoTools - Professional Automation Toolkit",
  description: "Streamline your workflow with powerful automation tools for professionals",
  generator: "AutoTools MVP",
}

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode
}>) {
  // 从服务器端获取地理信息头
  const headersList = headers();
  const geoHeaders: Record<string, string> = {
    'x-user-region': headersList.get('x-user-region') || '',
    'x-user-country': headersList.get('x-user-country') || '',
    'x-user-currency': headersList.get('x-user-currency') || '',
  };

  // 过滤掉空值
  Object.keys(geoHeaders).forEach(key => {
    if (!geoHeaders[key as keyof typeof geoHeaders]) {
      delete geoHeaders[key as keyof typeof geoHeaders];
    }
  });

  return (
      <html lang="en" suppressHydrationWarning>
      <head>
        {/* 添加地理信息meta标签，供客户端使用 */}
        {geoHeaders['x-user-region'] && (
            <meta name="x-user-region" content={geoHeaders['x-user-region']} />
        )}
        {geoHeaders['x-user-country'] && (
            <meta name="x-user-country" content={geoHeaders['x-user-country']} />
        )}
        {geoHeaders['x-user-currency'] && (
            <meta name="x-user-currency" content={geoHeaders['x-user-currency']} />
        )}
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      <LanguageProvider headers={geoHeaders}>
        <I18nProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
              <div className="flex flex-col min-h-screen">
                <main className="flex-grow">
                  {children}
                </main>
              </div>
              <Toaster />
              <Analytics />
            </ThemeProvider>
        </I18nProvider>
      </LanguageProvider>
      </body>
      </html>
  )
}
