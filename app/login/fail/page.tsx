"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowRight, Ban, CheckCircle2, Clock3, ShieldCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LoginFailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [secondsLeft, setSecondsLeft] = useState(30)
  const reason = searchParams.get("reason") || "unknown"
  const discordId = searchParams.get("discordId")
  const discordName = searchParams.get("discordName")
  const hasDiscordData = Boolean(discordId || discordName)

  const details = useMemo(() => {
    if (reason === "no_account") {
      return {
        title: "Kein Website-Account gefunden",
        description: "Für diese Discord-ID wurde noch kein Mitarbeiter-Account auf der Website gefunden.",
        hint: "Lass dir zuerst einen Account im Panel anlegen oder melde dich mit dem Discord-Konto an, das deinem Team-Account zugewiesen wurde.",
      }
    }
    if (reason === "discord_denied") {
      return {
        title: "Discord-Verbindung abgebrochen",
        description: "Die Verbindung mit Discord wurde nicht bestätigt.",
        hint: "Du kannst die Verbindung erneut starten, ohne dass Daten verloren gehen.",
      }
    }
    return {
      title: "Anmeldung konnte nicht abgeschlossen werden",
      description: "Discord hat die Anmeldung nicht erfolgreich an die Website zurückgegeben.",
      hint: "Prüfe die Discord-Verbindung und versuche es anschließend erneut.",
    }
  }, [reason])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          router.replace("/login")
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [router])

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md items-center justify-center">
        <section className="w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="h-1 bg-primary" />
          <div className="p-6 sm:p-8">
            <div className="mb-7 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" /> Weiterleitung in {secondsLeft}s
              </div>
            </div>

            <p className="mb-2 text-sm font-medium uppercase tracking-[0.16em] text-primary">Mitarbeiter-Portal</p>
            <h1 className="text-2xl font-bold tracking-tight text-card-foreground sm:text-3xl">{details.title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{details.description}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-destructive">Website-Account</p>
                <p className="mt-2 font-semibold text-card-foreground">Kein Account gefunden</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{details.hint}</p>
              </div>
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Discord-Konto</p>
                <p className="mt-2 font-semibold text-card-foreground">{hasDiscordData ? "Verbindung erkannt" : "Keine Daten erhalten"}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {hasDiscordData ? "Die Discord-Daten wurden empfangen, aber keinem Website-Account zugeordnet." : "Discord hat keine Kontodaten an die Website übermittelt. Starte die Verbindung erneut."}
                </p>
                {discordName && <p className="mt-2 break-all text-xs text-muted-foreground">Name: {discordName}</p>}
                {discordId && <p className="mt-1 break-all text-xs text-muted-foreground">ID: {discordId}</p>}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-card-foreground">Was bedeutet das?</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{details.description}</p>
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-3">
              <Button className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/80" onClick={() => router.replace("/login")}>
                <ArrowRight className="mr-2 h-4 w-4" /> Weiter zur Anmeldung
              </Button>
              <Button variant="outline" className="h-11 w-full border-border bg-transparent text-foreground hover:bg-muted" onClick={() => router.replace("/")}>
                <X className="mr-2 h-4 w-4" /> Abbrechen
              </Button>
            </div>

            <div className="mt-7 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Deine Website-Daten bleiben unverändert.
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
