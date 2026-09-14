import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { Navigation } from "@/components/navigation"
import { FiveMThemeMarker } from "@/components/fivem-theme-marker"
import { AlertPopout } from "@/components/alert-popout"
// Einkommentieren = Cookies werden beim Tab-Schliessen geloescht (Session-Modus)
// Auskommentiert  = Cookies laufen nur nach 12h ab (Standard)
// import { DiscordSessionGuard } from "@/components/discord-session-guard"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Rex´s Diner & Repair",
  description: "Rex's Diner & Repair – Ein authentisches 50er-Jahre-Diner mit dem Flair einer klassischen Werkstatt.",
  icons: {
    icon: "/images/rex-dinner-logo.png",
    shortcut: "/images/rex-dinner-logo.png",
    apple: "/images/rex-dinner-logo.png",
  },
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${inter.variable}`}>
        <Suspense fallback={null}>
          <FiveMThemeMarker />
        </Suspense>
        <Navigation />
        {/* <DiscordSessionGuard /> */}
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
        <AlertPopout />
      </body>
    </html>
  )
}
