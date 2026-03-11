import type { Metadata } from "next"
import { geistMono, lato } from "@/lib/fontHelper"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import "./globals.css"
import Header from "@/components/layout/Header"
import { ThemeProvider } from "@/hooks/useTheme"
import Footer from "@/components/layout/Footer"
import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const metadata: Metadata = {
  title: "SniprUrl",
  description: "A minimal URL shortener built as a full-stack engineering project",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${lato.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <Button
            render={<Link href="#main-content" />}
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-foreground focus:ring-2 focus:ring-ring"
            nativeButton={false}
          >
            Skip to main content
          </Button>
          <Toaster />
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
