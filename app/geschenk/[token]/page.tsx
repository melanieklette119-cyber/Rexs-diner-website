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
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#8d3929,#24151b_46%,#100d12_100%)] p-6 text-white">
      <style>{`@keyframes gift-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-4deg) translateX(-2px)}75%{transform:rotate(4deg) translateX(2px)}}`}</style>
      <Card className="w-full max-w-lg overflow-hidden border-white/15 bg-black/35 text-white shadow-2xl backdrop-blur-xl">
        <CardHeader className="items-center text-center">
          <div className={`relative mb-7 flex h-48 w-56 items-center justify-center transition-all duration-700 ${holding ? "scale-110" : ""} ${opened ? "scale-125 opacity-0" : ""}`}>
            {!opened && <>
              <div className={`absolute bottom-5 h-32 w-44 rounded-xl border border-white/20 bg-gradient-to-br from-[#e87542] via-[#bc3f32] to-[#6f1e2b] shadow-[0_25px_45px_rgba(0,0,0,.45),inset_8px_8px_20px_rgba(255,255,255,.16)] ${holding ? "animate-[gift-shake_.16s_ease-in-out_infinite]" : ""}`} />
              <div className="absolute bottom-5 h-32 w-9 rounded-sm bg-gradient-to-b from-[#ffe6a0] via-[#f7b84b] to-[#c96b2d] shadow-[0_0_18px_rgba(255,203,94,.45)]" />
              <div className="absolute bottom-[125px] h-9 w-48 rounded-lg border border-white/20 bg-gradient-to-r from-[#d65038] via-[#ef8550] to-[#9f2f31] shadow-lg" />
              <div className="absolute bottom-[137px] h-12 w-16 rounded-full border-[6px] border-[#ffd66e] border-b-0 rotate-[-28deg] shadow-[0_0_12px_rgba(255,214,110,.45)]" />
              <div className="absolute bottom-[137px] h-12 w-16 rounded-full border-[6px] border-[#ffd66e] border-b-0 rotate-[28deg] shadow-[0_0_12px_rgba(255,214,110,.45)]" />
              <div className="absolute bottom-0 h-8 w-52 rounded-full bg-orange-950/40 blur-xl" />
              {holding && <div className="absolute inset-0 rounded-full bg-orange-300/30 blur-2xl animate-pulse" />}
              <span className="absolute -left-2 top-12 h-2 w-2 rounded-full bg-yellow-200 shadow-[20px_18px_0_#f7b84b,180px_8px_0_#ffd66e,160px_65px_0_#e87542]" />
            </>}
            {opened && <Sparkles className="h-20 w-20 text-yellow-200 animate-ping" />}
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
