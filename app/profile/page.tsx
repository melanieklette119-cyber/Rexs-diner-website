"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, LogIn, Save, CheckCircle, AlertTriangle } from "lucide-react"
import { getDiscordSession } from "@/lib/discord-session"
import {
  getUserProfile,
  saveUserProfile,
  type UserProfile,
} from "@/lib/user-data"

export default function ProfilePage() {
  const [discordUser, setDiscordUser] = useState<{ id: string; username: string; avatar: string } | null>(null)
  const [profile, setProfile] = useState<UserProfile>({
    discord_id: "",
    discord_username: "",
    full_name: "",
    phone: "",
    iban: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const loadData = async () => {
      const session = getDiscordSession()
      if (!session) {
        return
      }

      setDiscordUser(session)
      
      // Load existing profile or create empty one
      const existingProfile = await getUserProfile(session.id)
      if (existingProfile) {
        setProfile(existingProfile)
        setOriginalProfile(existingProfile)
      } else {
        const newProfile: UserProfile = {
          discord_id: session.id,
          discord_username: session.username,
          full_name: session.username,
          phone: "",
          avatar_url: session.avatar,
        }
        setProfile(newProfile)
        setOriginalProfile(newProfile)
      }


    }

    loadData()
  }, [])

  // Wenn nicht eingeloggt, Login-Screen anzeigen
  if (!discordUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-[#5865F2]/10 flex items-center justify-center mx-auto">
              <LogIn className="h-10 w-10 text-[#5865F2]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-card-foreground mb-2">Anmeldung erforderlich</h2>
              <p className="text-muted-foreground">
                Melden Sie sich mit Discord an, um Ihr Profil zu verwalten.
              </p>
            </div>
            <Button
              onClick={() => {
                window.location.href = "/api/auth/discord?returnTo=/profile"
              }}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white py-6 text-lg"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Mit Discord anmelden
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await saveUserProfile(profile)
      if (result) {
        setSuccess(true)
        setOriginalProfile(result)
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError("Fehler beim Speichern des Profils")
      }
    } catch (err) {
      console.error("Error saving profile:", err)
      setError("Ein Fehler ist aufgetreten")
    } finally {
      setIsLoading(false)
    }
  }

  const isModified =
    profile.full_name !== originalProfile?.full_name || profile.phone !== originalProfile?.phone || profile.iban !== originalProfile?.iban

  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6">
          <ArrowLeft className="h-5 w-5" />
          Zurück zur Startseite
        </Link>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Profil bearbeiten</CardTitle>
            <CardDescription>Verwalte deine persönlichen Daten für Bestellungen und Reservierungen</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Discord Info */}
            <div className="bg-red-950/20 border border-red-950 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Discord Account</h3>
              <div className="flex items-center gap-3">
                {discordUser.avatar && (
                  <img
                    src={discordUser.avatar}
                    alt={discordUser.username}
                    className="h-12 w-12 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{discordUser.username}</p>
                  <p className="text-sm text-muted-foreground">ID: {discordUser.id}</p>
                </div>
              </div>
            </div>

            {/* Success Alert */}
            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Profil erfolgreich gespeichert!
                </AlertDescription>
              </Alert>
            )}

            {/* Error Alert */}
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-base font-medium">
                  Vollständiger Name
                </Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Z.B. Max Mustermann"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Wird automatisch bei Bestellungen und Reservierungen verwendet
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base font-medium">
                  Telefonnummer
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Z.B. +49 123 456789"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="iban" className="text-base font-medium">IBAN / FiveM-Bankkonto-ID</Label>
                <Input
                  id="iban"
                  type="text"
                  inputMode="numeric"
                  placeholder="Deine IBAN oder Bankkonto-ID"
                  value={profile.iban ?? ""}
                  onChange={(e) => setProfile({ ...profile, iban: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">Diese Angabe wird beim Abschluss einer Mitgliedschaft automatisch übernommen.</p>
                <p className="text-xs text-muted-foreground">
                  Wird automatisch bei Bestellungen und Reservierungen verwendet
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={!isModified || isLoading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isLoading ? "Wird gespeichert..." : "Profil speichern"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Abbrechen</Link>
              </Button>
            </div>

            {/* Info Box */}
            <div className="bg-red-950/20 border border-red-950 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-foreground mb-2">💡 Wie wird dein Profil verwendet?</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Automatisches Ausfüllen in Bestellungen und Reservierungen</li>
                <li>• Speichern neuer Daten auf Anfrage</li>
                <li>• Jederzeit hier abrufbar und aktualisierbar</li>
              </ul>
            </div>

            {/* Links to Dedicated Pages */}
            <div className="mt-12">
              <h2 className="text-xl font-semibold mb-6">Deine Übersicht</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/meine-reservierungen">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
                    <span className="text-2xl">📅</span>
                    <span className="font-semibold">Meine Reservierungen</span>
                  </Button>
                </Link>
                <Link href="/meine-bestellungen">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
                    <span className="text-2xl">🛍️</span>
                    <span className="font-semibold">Meine Bestellungen</span>
                  </Button>
                </Link>
                <Link href="/meine-werkstattbuchungen">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
                    <span className="text-2xl">🛠️</span>
                    <span className="font-semibold">Meine Werkstattbuchungen</span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
