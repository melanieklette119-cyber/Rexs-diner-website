"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Menu, X, LogOut, User, Calendar, ShoppingBag, Wrench, CreditCard } from "lucide-react"
import { getDiscordSession } from "@/lib/discord-session"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navigationItems: { href: string; label: string; external?: boolean }[] = [
  { href: "/", label: "Startseite" },
  { href: "/bestellen", label: "Speisekarte" },
  { href: "/reservierung", label: "Reservierung" },
  { href: "/werkstatt", label: "Werkstatt" },
  { href: "/mitgliedschaften", label: "Mitgliedschaften" },
  { href: "/bewertung", label: "Bewertungen" },
  { href: "/team", label: "Team" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/agb", label: "AGB" },
  { href: "/login", label: "Mitarbeiter Login" },
  { href: "/soon", label: "In Bearbeitungsliste" },
]

export function Navigation() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [discordUser, setDiscordUser] = useState<{ id: string; username: string; avatar: string } | null>(null)

  useEffect(() => {
    const session = getDiscordSession()
    setDiscordUser(session)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectTo: "/" }),
      })
      window.location.href = "/"
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <header className="bg-card shadow-md sticky top-0 z-50 border-b border-border">
      <div className="flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3 flex-shrink-0 py-3">
          <img
            src="/images/rex-dinner-logo.png"
            alt="Rex Diner Logo"
            className="h-16 w-auto object-contain"
          />
        </Link>

        <nav className="hidden xl:flex items-center gap-5">
          {navigationItems.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-base text-muted-foreground hover:text-primary transition-colors font-medium border-b-2 pb-1",
                  pathname === item.href ? "text-primary border-primary" : "border-transparent",
                )}
              >
                {item.label}
              </Link>
            ),
          )}
          <a
            href="https://discord.gg/v42GuchGEr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-base text-muted-foreground hover:text-primary transition-colors font-medium"
          >
            Kontakt
          </a>

          {discordUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-5 border-l border-border hover:opacity-80 transition-opacity">
                  {discordUser.avatar && (
                    <img
                      src={discordUser.avatar}
                      alt={discordUser.username}
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <span className="text-sm font-medium">{discordUser.username}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Profil bearbeiten
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/meine-reservierungen" className="flex items-center gap-2 cursor-pointer">
                    <Calendar className="h-4 w-4" />
                    Meine Reservierungen
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/meine-bestellungen" className="flex items-center gap-2 cursor-pointer">
                    <ShoppingBag className="h-4 w-4" />
                    Meine Bestellungen
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/meine-werkstattbuchungen" className="flex items-center gap-2 cursor-pointer">
                    <Wrench className="h-4 w-4" />
                    Meine Werkstattbuchungen
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/meine-mitgliedschaften" className="flex items-center gap-2 cursor-pointer">
                    <CreditCard className="h-4 w-4" />
                    Meine Mitgliedschaften
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-red-600 cursor-pointer">
                  <LogOut className="h-4 w-4" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        <button
          className="xl:hidden text-muted-foreground hover:text-primary"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Menu schliessen" : "Menu oeffnen"}
        >
          {mobileOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="xl:hidden border-t border-border px-6 py-4 space-y-3">
          {navigationItems.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-base text-muted-foreground hover:text-primary transition-colors font-medium py-1"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block text-base text-muted-foreground hover:text-primary transition-colors font-medium py-1",
                  pathname === item.href && "text-primary",
                )}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ),
          )}
          <a
            href="https://discord.gg/v42GuchGEr"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-base text-muted-foreground hover:text-primary transition-colors font-medium py-1"
            onClick={() => setMobileOpen(false)}
          >
            Kontakt
          </a>

          {discordUser && (
            <>
              <div className="border-t border-border pt-3 mt-3 space-y-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-base text-muted-foreground hover:text-primary transition-colors font-medium py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Profil bearbeiten
                </Link>
                <Link
                  href="/profile#reservations"
                  className="flex items-center gap-2 text-base text-muted-foreground hover:text-primary transition-colors font-medium py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  <Calendar className="h-4 w-4" />
                  Meine Reservierungen
                </Link>
                <Link
                  href="/profile#orders"
                  className="flex items-center gap-2 text-base text-muted-foreground hover:text-primary transition-colors font-medium py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Meine Bestellungen
                </Link>
                <Link
                  href="/meine-mitgliedschaften"
                  className="flex items-center gap-2 text-base text-muted-foreground hover:text-primary transition-colors font-medium py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  <CreditCard className="h-4 w-4" />
                  Meine Mitgliedschaften
                </Link>
                <Link
                  href="/profile#werkstatt"
                  className="flex items-center gap-2 text-base text-muted-foreground hover:text-primary transition-colors font-medium py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  <Wrench className="h-4 w-4" />
                  Meine Werkstattbuchungen
                </Link>
                <button
                  onClick={() => {
                    setMobileOpen(false)
                    handleLogout()
                  }}
                  className="flex items-center gap-2 text-base text-red-600 hover:text-red-700 transition-colors font-medium py-1 w-full"
                >
                  <LogOut className="h-4 w-4" />
                  Abmelden
                </button>
              </div>
            </>
          )}
        </nav>
      )}
    </header>
  )
}
