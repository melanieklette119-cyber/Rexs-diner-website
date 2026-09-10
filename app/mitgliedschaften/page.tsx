"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, LogIn } from "lucide-react"
import { getDiscordSession } from "@/lib/discord-session"

type Plan = { id: string; name: string; description: string; price: number; billing_interval: string; min_duration_months: number; cancellation_notice_months: number; newcomer_only: boolean; includes_discount: boolean; discount_percent: number | null }

export default function MitgliedschaftenPage() {
  const [discordUser, setDiscordUser] = useState<{ id: string; username: string; avatar: string } | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [selected, setSelected] = useState<Plan | null>(null)
  const [form, setForm] = useState({ fullName: "", discordId: "", bankAccountId: "" })
  const [accepted, setAccepted] = useState(false)
  const [message, setMessage] = useState("")
    useEffect(() => {
      const session = getDiscordSession()
      setDiscordUser(session)
      if (session) {
        setForm((prev) => ({
          ...prev,
          discordId: session.id,
          fullName: session.username || prev.fullName,
        }))
      }
    }, [])
  useEffect(() => { fetch("/api/memberships").then((r) => r.json()).then((d) => setPlans(d.plans ?? [])) }, [])
  if (!discordUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 bg-card border-border">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-[#5865F2]/10 flex items-center justify-center mx-auto">
              <LogIn className="h-10 w-10 text-[#5865F2]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-card-foreground mb-2">Discord Anmeldung erforderlich</h2>
              <p className="text-muted-foreground">Um eine Mitgliedschaft abzuschließen, melden Sie sich bitte mit Ihrem Discord-Account an.</p>
            </div>
            <Button
              onClick={() => { window.location.href = "/api/auth/discord?returnTo=/mitgliedschaften" }}
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
  async function subscribe() {
    if (!selected || !accepted) return setMessage("Bitte Stufe auswählen und Vertrag bestätigen.")
    if (!form.fullName.trim()) return setMessage("Bitte einen Namen angeben.")
    if (!form.bankAccountId.trim()) return setMessage("Bitte deine FiveM-Bankkonto-ID angeben.")
    const response = await fetch("/api/memberships", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: selected.id, ...form }) })
    const data = await response.json()
    setMessage(response.ok ? "Der Vertrag wurde erstellt." : data.error ?? "Fehler beim Erstellen.")
    if (response.ok) setSelected(null)
  }
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <Badge>FiveM Ingame-Bank</Badge>
        <h1 className="mt-3 text-4xl font-bold">Mitgliedschaften</h1>
        <p className="mt-3 text-muted-foreground">Wähle eine Stufe und verwalte dein Abo jederzeit.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="text-3xl font-bold">
                {Number(plan.price).toFixed(2)} € <span className="text-sm font-normal text-muted-foreground">/ {plan.billing_interval === "monthly" ? "Monat" : plan.billing_interval}</span>
              </div>
              <p className="text-sm">Mindestlaufzeit: {Math.max(1, plan.min_duration_months)} Monat(e)</p>
              {plan.includes_discount && <Badge variant="secondary">{plan.discount_percent}% Rabatt inklusive</Badge>}
              <Button className="mt-auto" onClick={() => setSelected(plan)}>Stufe auswählen</Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {selected && (
        <Card className="mx-auto mt-10 max-w-2xl">
          <CardHeader><CardTitle>Vertrag für {selected.name}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label htmlFor="name">Name</Label><Input id="name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><Label htmlFor="bank">FiveM-Bankkonto-ID</Label><Input id="bank" placeholder="Deine Bankkonto-ID" value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })} required /></div>
            <div className="space-y-2">
              <Label>Angemeldet als</Label>
              <div className="flex items-center gap-3 rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/10 p-3">
                {discordUser.avatar ? (
                  <img src={discordUser.avatar} alt={discordUser.username} className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865F2] font-bold text-white">{discordUser.username.charAt(0).toUpperCase()}</div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-foreground">{discordUser.username}</p>
                  <p className="text-xs text-muted-foreground">ID: {discordUser.id}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <label className="flex items-start gap-3 text-sm"><Checkbox checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} /><span>Ich akzeptiere die Mindestlaufzeit von mindestens einem Monat und die Abbuchung per FiveM-Ingame-Bank.</span></label>
            {message && <p className="text-sm text-primary">{message}</p>}
            <div className="flex gap-3"><Button onClick={subscribe}>Vertrag abschließen</Button><Button variant="outline" onClick={() => setSelected(null)}>Abbrechen</Button></div>
          </CardContent>
        </Card>
      )}
    </main>
  )
}