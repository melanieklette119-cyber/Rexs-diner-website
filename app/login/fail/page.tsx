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
    <main className="min-h-screen bg-[#0b0c0e] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#111316] shadow-2xl shadow-black/40">
          <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-400 to-rose-500" />
          <div className="p-6 sm:p-10">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60">
                <Clock3 className="h-3.5 w-3.5" /> Weiterleitung in {secondsLeft}s
              </div>
            </div>

            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-amber-400">Website-Anmeldung</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{details.title}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/65">{details.description}</p>

            <div className="mt-7 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-5">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-200">Was bedeutet das?</p>
                  <p className="mt-1 text-sm leading-6 text-white/65">{details.hint}</p>
                </div>
              </div>
            </div>

            {(discordId || discordName) && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                <p className="font-semibold text-white/85">Discord-Verbindung</p>
                {discordName && <p className="mt-1">Name: {discordName}</p>}
                {discordId && <p className="mt-1 break-all">Discord-ID: {discordId}</p>}
              </div>
            )}

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Button className="h-12 bg-emerald-500 text-black hover:bg-emerald-400" onClick={() => router.replace("/login")}>
                <ArrowRight className="mr-2 h-4 w-4" /> Weiter zur Anmeldung
              </Button>
              <Button variant="outline" className="h-12 border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => router.replace("/")}>
                <X className="mr-2 h-4 w-4" /> Abbrechen
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-white/40">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Deine Website-Daten bleiben unverändert.
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
