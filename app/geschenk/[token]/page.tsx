"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Gift, Sparkles, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function GiftPage() {
  const { token } = useParams<{ token: string }>()
  const [gift, setGift] = useState<{ planName: string; durationMonths: number; endsAt: string } | null>(null)
  const [opened, setOpened] = useState(false)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const openGift = async () => {
    setLoading(true)
    const response = await fetch(`/api/membership-gifts/${token}`)
    const data = await response.json()
    setLoading(false)
    if (!response.ok) return setMessage(data.error || "Geschenk konnte nicht geladen werden.")
    setGift(data.gift)
    setOpened(true)
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
          <div className={`mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-400 to-red-700 shadow-xl ${!opened ? "animate-pulse" : ""}`}>
            {opened ? <Sparkles className="h-12 w-12" /> : <Gift className="h-12 w-12" />}
          </div>
          <CardTitle className="text-3xl">{opened ? "Dein Geschenk" : "Ein Geschenk wartet auf dich"}</CardTitle>
          <CardDescription className="text-white/70">{opened ? "Du entscheidest, ob du es annehmen möchtest." : "Klicke auf den Button, um dein Rex’s-Diner-Geschenk auszupacken."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {!opened ? <Button className="w-full bg-orange-500 text-white hover:bg-orange-400" onClick={openGift} disabled={loading}>{loading ? "Wird geöffnet..." : "Geschenk auspacken"}</Button> : gift && <>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-2xl font-bold">{gift.planName}</p><p className="mt-2 text-white/70">{gift.durationMonths} Monat{gift.durationMonths === 1 ? "" : "e"} Mitgliedschaft</p><p className="mt-1 text-sm text-white/50">Läuft ab am {new Date(gift.endsAt).toLocaleDateString("de-DE")}</p></div>
            {!message && <div className="grid gap-3 sm:grid-cols-2"><Button onClick={() => decide("accept")} disabled={loading} className="bg-emerald-500 hover:bg-emerald-400"><Check className="mr-2 h-4 w-4" />Annehmen</Button><Button onClick={() => decide("reject")} disabled={loading} variant="outline" className="border-white/20 text-white hover:bg-white/10"><X className="mr-2 h-4 w-4" />Ablehnen</Button></div>}
          </>}
          {message && <p className="rounded-xl bg-white/10 p-4 text-sm">{message}</p>}
        </CardContent>
      </Card>
    </main>
  )
}
