"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { LogIn, AlertCircle, Shield, ScrollText } from "lucide-react"
import {
  type User,
  authenticateUser,
  authenticateUserByDiscord,
  getUsersByDiscordId,
  acceptDienstvorschriften,
  setUserSession,
  updateUser,
  DEFAULT_RANKS,
  getAllRanks,
  getDienstvorschriften
} from "@/lib/user-data"
import { getDiscordSession } from "@/lib/discord-session"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showDienstvorschriften, setShowDienstvorschriften] = useState(false)
  const [dienstvorschriftenChecked, setDienstvorschriftenChecked] = useState(false)
  const [dienstvorschriftenText, setDienstvorschriftenText] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [multipleUsers, setMultipleUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [allRanks, setAllRanks] = useState<{ [key: string]: any }>(DEFAULT_RANKS)
  const router = useRouter()
  const searchParams = useSearchParams()

  const oauthError = searchParams.get("error")

  useEffect(() => {
    if (!oauthError) return
    const messages: Record<string, string> = {
      no_code: "Discord hat keine Anmeldung bestätigt. Prüfe die OAuth2-Redirect-URL und versuche es erneut.",
      discord_denied: "Die Discord-Anmeldung wurde abgebrochen. Du kannst es jederzeit erneut versuchen.",
      token_failed: "Discord konnte die Anmeldung nicht abschließen. Prüfe die Redirect-URL im Developer Portal.",
      not_configured: "Discord ist auf der Website noch nicht vollständig eingerichtet.",
      server_error: "Die Discord-Anmeldung ist fehlgeschlagen. Bitte versuche es später erneut.",
    }
    setError(messages[oauthError] || "Die Anmeldung ist fehlgeschlagen.")
  }, [searchParams])

  // Discord OAuth Callback aus Cookies verarbeiten
  useEffect(() => {
    const session = getDiscordSession()
    if (session) {
      handleDiscordLogin(session.id, session.username || "")
    }
  }, [])

  // Load all ranks on mount
  useEffect(() => {
    const loadRanks = async () => {
      const ranks = await getAllRanks()
      setAllRanks(ranks)
    }
    loadRanks()
  }, [])

  const processUserLogin = async (user: User) => {
    if (user.mustChangePassword || user.isTemporaryPassword) {
      setCurrentUser(user)
      setShowPasswordChange(true)
      setIsLoading(false)
      return
    }

    if (!user.dienstvorschriftenAccepted) {
      setCurrentUser(user)
      setShowDienstvorschriften(true)
      setIsLoading(false)
      return
    }

    setUserSession(user)
    router.push("/admin")
  }

  const handleSelectUser = async () => {
    console.log("handleSelectUser called with selectedUser:", selectedUser)
    if (!selectedUser) {
      console.log("No selectedUser, returning")
      return
    }
    setIsLoading(true)
    setError("")
    console.log("Processing login for user:", selectedUser.username)
    setMultipleUsers([]) // Clear multiple users selection
    await processUserLogin(selectedUser)
    setIsLoading(false)
  }

  async function handleDiscordLogin(discordId: string, discordUsername: string) {
    setIsLoading(true)
    setError("")

    const users = await getUsersByDiscordId(discordId)

    if (users.length === 0) {
      setIsLoading(false)
      router.push(`/login/fail?reason=no_account&discordId=${encodeURIComponent(discordId)}&discordName=${encodeURIComponent(discordUsername)}`)
      return
    }

    if (users.length === 1) {
      const user = users[0]
      await processUserLogin(user)
    } else {
      // Mehrere User gefunden, Auswahl anzeigen
      setMultipleUsers(users)
      setSelectedUser(null)
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const user = await authenticateUser(username, password)

      if (user) {

        if (user.mustChangePassword || user.isTemporaryPassword) {
          setCurrentUser(user)
          setShowPasswordChange(true)
          setIsLoading(false)
          return
        }

        if (!user.dienstvorschriftenAccepted) {
          setCurrentUser(user)
          setShowDienstvorschriften(true)
          setIsLoading(false)
          return
        }

        setUserSession(user)
        router.push("/admin")
      } else {
        setError("Ungueltige Anmeldedaten")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("Ein Fehler ist aufgetreten")
    }

    setIsLoading(false)
  }

  useEffect(() => {
    getDienstvorschriften().then(setDienstvorschriftenText)
  }, [])

  const handleAcceptDienstvorschriften = async () => {
    if (!currentUser || !dienstvorschriftenChecked) return

    const success = await acceptDienstvorschriften(currentUser.id)
    if (success) {
      setUserSession({ ...currentUser, dienstvorschriftenAccepted: true })
      router.push("/admin")
    } else {
      setError("Fehler beim Akzeptieren der Dienstvorschriften")
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError("Passwoerter stimmen nicht ueberein")
      return
    }

    if (newPassword.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein")
      return
    }

    if (currentUser) {
      try {
        const success = await updateUser(currentUser.id, {
          password: newPassword,
          mustChangePassword: false,
          isTemporaryPassword: false
        })

        if (success) {
          const updatedUser = { ...currentUser, password: newPassword, mustChangePassword: false, isTemporaryPassword: false }

          if (!updatedUser.dienstvorschriftenAccepted) {
            setCurrentUser(updatedUser)
            setShowPasswordChange(false)
            setShowDienstvorschriften(true)
            return
          }

          setUserSession(updatedUser)
          router.push("/admin")
        } else {
          setError("Fehler beim ändern des Passworts")
        }
      } catch (err) {
        console.error("Password change error:", err)
        setError("Ein Fehler ist aufgetreten")
      }
    }
  }

  // User Auswahl Screen bei mehreren Accounts
  if (multipleUsers.length > 0) {
    console.log("Rendering multiple users screen")
    console.log("multipleUsers:", multipleUsers)
    console.log("selectedUser:", selectedUser)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-card-foreground">Account auswählen </CardTitle>
              <p className="text-muted-foreground">Mehrere Accounts mit Ihrer Discord ID gefunden. Bitte wählen  Sie einen aus.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {multipleUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={`w-full p-4 border rounded-lg cursor-pointer transition-colors text-left ${selectedUser?.id === user.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                    }`}
                  onClick={() => {
                    console.log("Clicked user:", user.username, "ID:", user.id)
                    console.log("Current selectedUser:", selectedUser)
                    setSelectedUser(user)
                    console.log("New selectedUser should be:", user)
                  }}
                >
                  <div className="font-medium">{user.username}</div>
                  <div className="text-sm text-muted-foreground">Gruppe: {allRanks[user.group]?.name || user.group}</div>
                </button>
              ))}

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleSelectUser}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
                disabled={!selectedUser || isLoading}
              >
                {isLoading ? "Wird geladen..." : "Account auswählen "}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Dienstvorschriften Screen
  if (showDienstvorschriften && currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <Card className="shadow-lg bg-card border-border">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ScrollText className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-card-foreground">Dienstvorschriften</CardTitle>
              <p className="text-muted-foreground">
                Willkommen {currentUser.username}! Bitte lesen und akzeptieren Sie die Dienstvorschriften, bevor Sie fortfahren.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground border border-border">
                {dienstvorschriftenText || "Dienstvorschriften werden geladen..."}
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="accept-dienstvorschriften"
                  checked={dienstvorschriftenChecked}
                  onCheckedChange={(checked) => setDienstvorschriftenChecked(checked === true)}
                />
                <label htmlFor="accept-dienstvorschriften" className="text-sm text-foreground leading-snug cursor-pointer">
                  Ich habe die Dienstvorschriften gelesen und akzeptiere alle Regeln und Bedingungen.
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleAcceptDienstvorschriften}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
                disabled={!dienstvorschriftenChecked}
              >
                <Shield className="h-4 w-4 mr-2" />
                Dienstvorschriften akzeptieren und fortfahren
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Passwort ändern Screen
  if (showPasswordChange) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-card-foreground">Passwort ändern</CardTitle>
              <p className="text-muted-foreground">Sie muessen Ihr Passwort vor dem ersten Login ändern</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Neues Passwort</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Neues Passwort eingeben"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Passwort bestaetigen</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Passwort wiederholen"
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-primary-foreground">
                  Passwort ändern
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Login Screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">
        <Card className="shadow-lg bg-card border-border">
                <CardHeader className="text-center">
                  {oauthError && (
                    <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-left">
                      <div className="flex items-center gap-2 font-semibold text-destructive">
                        <AlertCircle className="h-5 w-5" /> Discord-Anmeldung fehlgeschlagen
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Prüfe im Discord Developer Portal unter OAuth2 → Redirects diese URL:</p>
                      <code className="mt-1 block break-all rounded bg-background/70 p-2 text-xs">https://rexs-diner-srp.vercel.app/api/auth/discord/callback</code>
                      <p className="mt-2 text-xs text-muted-foreground">Dein Website-Account bleibt erhalten. Melde dich nach der Korrektur erneut mit Discord an.</p>
                    </div>
                  )}
                  <CardTitle className="text-2xl font-bold text-card-foreground flex items-center justify-center gap-2">
              <LogIn className="h-6 w-6 text-primary" />
              Mitarbeiter Login
            </CardTitle>
            <p className="text-muted-foreground">Melden Sie sich an, um das Mitarbeiter-Panel zu verwenden</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Discord Login */}
            <Button
              onClick={() => {
                window.location.href = "/api/auth/discord?returnTo=/login"
              }}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white py-6 text-lg"
              disabled={isLoading}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Mit Discord anmelden
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">oder mit Benutzername</span>
              </div>
            </div>

            {/* Username/Password Login */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Benutzername eingeben"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passwort eingeben"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Anmelden..." : "Anmelden"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
