import type { Metadata } from "next"
import { geistMono, lato } from "@/lib/fontHelper"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import "./globals.css"
import Header from "@/components/layout/Header"

export const metadata: Metadata = {
  title: "Snipr",
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
        <Header />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
