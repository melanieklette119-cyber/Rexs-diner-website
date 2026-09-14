"use client"

import { useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Sparkles, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function GiftPage() {
  const { token } = useParams<{ token: string }>()
  const [gift, setGift] = useState<{ planName: string; durationMonths: number; endsAt: string } | null>(null)
  const [opened, setOpened] = useState(false)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [holding, setHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdStartedAt = useRef(0)
  const holdDuration = 1800

  const cancelHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current)
    holdTimer.current = null
    setHolding(false)
    setHoldProgress(0)
  }

  const openGift = async () => {
    setLoading(true)
    const response = await fetch(`/api/membership-gifts/${token}`)
    const data = await response.json()
    setLoading(false)
    if (!response.ok) return setMessage(data.error || "Geschenk konnte nicht geladen werden.")
    setGift(data.gift)
    setOpened(true)
  }

  const startHold = () => {
    if (loading || holding) return
    setHolding(true)
    holdStartedAt.current = performance.now()
    holdTimer.current = setInterval(() => {
      const progress = Math.min(100, ((performance.now() - holdStartedAt.current) / holdDuration) * 100)
      setHoldProgress(progress)
      if (progress >= 100) {
        if (holdTimer.current) clearInterval(holdTimer.current)
        holdTimer.current = null
        setHolding(false)
        setHoldProgress(100)
        void openGift()
      }
    }, 16)
  }

  const decide = async (action: "accept" | "reject") => {
    setLoading(true)
    const response = await fetch(`/api/membership-gifts/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) })
    const data = await response.json()
    setLoading(false)
    setMessage(response.ok ? data.message : data.error || "Aktion konnte nicht ausgeführt werden.")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#7b2d26,#171117_60%)] p-6 text-white">
      <Card className="w-full max-w-lg overflow-hidden border-white/15 bg-black/35 text-white shadow-2xl backdrop-blur-xl">
        <CardHeader className="items-center text-center">
          <div className={`relative mb-5 flex h-36 w-44 items-center justify-center transition-transform duration-300 ${holding ? "scale-105 animate-bounce" : ""} ${opened ? "scale-0 opacity-0" : ""}`}>
            {!opened && <>
              <div className="absolute bottom-3 h-24 w-36 rounded-lg border-2 border-orange-200/40 bg-gradient-to-br from-orange-500 to-red-700 shadow-[0_20px_35px_rgba(0,0,0,.35)]" />
              <div className="absolute bottom-3 h-24 w-7 rounded-sm bg-yellow-300/90 shadow-lg" />
              <div className="absolute bottom-[92px] h-7 w-40 rounded-md border-2 border-orange-200/40 bg-gradient-to-r from-red-600 to-orange-500" />
              <div className="absolute bottom-[108px] h-7 w-14 rounded-full border-4 border-yellow-300/90 border-b-0 rotate-[-24deg]" />
              <div className="absolute bottom-[108px] h-7 w-14 rounded-full border-4 border-yellow-300/90 border-b-0 rotate-[24deg]" />
              {holding && <div className="absolute inset-0 rounded-2xl bg-orange-300/20 blur-xl" />}
            </>}
            {opened && <Sparkles className="h-16 w-16 text-yellow-200" />}
          </div>
          <CardTitle className="text-3xl">{opened ? "Dein Geschenk" : "Ein Geschenk wartet auf dich"}</CardTitle>
          <CardDescription className="text-white/70">{opened ? "Du entscheidest, ob du es annehmen möchtest." : "Halte das Geschenk gedrückt, bis es platzt."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {!opened ? <div className="space-y-3">
            <button type="button" aria-label="Geschenk gedrückt halten zum Auspacken" onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} onPointerCancel={cancelHold} disabled={loading} className="group relative w-full touch-none select-none overflow-hidden rounded-2xl border border-orange-300/40 bg-orange-500/15 px-5 py-5 text-center shadow-lg transition hover:bg-orange-500/25 active:scale-[.98] disabled:cursor-wait disabled:opacity-60">
              <span className="relative z-10 font-semibold">{loading ? "Geschenk wird geöffnet..." : holding ? "Weiter gedrückt halten..." : "Geschenk gedrückt halten"}</span>
              <span className="absolute inset-y-0 left-0 bg-orange-400/35 transition-[width] duration-75" style={{ width: `${holdProgress}%` }} />
            </button>
            <p className="text-xs text-white/50">Halte ungefähr 2 Sekunden gedrückt, bis das Geschenk platzt.</p>
          </div> : gift && <>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-2xl font-bold">{gift.planName}</p><p className="mt-2 text-white/70">{gift.durationMonths} Monat{gift.durationMonths === 1 ? "" : "e"} Mitgliedschaft</p><p className="mt-1 text-sm text-white/50">Läuft ab am {new Date(gift.endsAt).toLocaleDateString("de-DE")}</p></div>
            {!message && <div className="grid gap-3 sm:grid-cols-2"><Button onClick={() => decide("accept")} disabled={loading} className="bg-emerald-500 hover:bg-emerald-400"><Check className="mr-2 h-4 w-4" />Annehmen</Button><Button onClick={() => decide("reject")} disabled={loading} variant="outline" className="border-white/20 text-white hover:bg-white/10"><X className="mr-2 h-4 w-4" />Ablehnen</Button></div>}
          </>}
          {message && <p className="rounded-xl bg-white/10 p-4 text-sm">{message}</p>}
        </CardContent>
      </Card>
    </main>
  )
}
