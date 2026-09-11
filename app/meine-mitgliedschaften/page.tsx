"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Plan = { id: string; name: string; description?: string; price: number; billing_interval: string; newcomer_only: boolean }
type Contract = { id: string; status: string; full_name: string; created_at: string; cancellation_requested_at?: string; minimum_end_at: string; next_charge_at: string; membership_plans?: Plan }
type Charge = { id: string; contract_id: string; status: string; amount: number; scheduled_for?: string; processed_at?: string; error_message?: string }

function date(value?: string) { return value ? new Date(value).toLocaleDateString("de-DE", { dateStyle: "medium" }) : "–" }
function statusLabel(status: string) { return status === "active" ? "Aktiv" : status === "pending_cancellation" ? "Kündigung vorgemerkt" : status === "cancelled" ? "Beendet" : status }

export default function MeineMitgliedschaftenPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [charges, setCharges] = useState<Charge[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [message, setMessage] = useState("")
  const [changeContract, setChangeContract] = useState<Contract | null>(null)
  const [historyContract, setHistoryContract] = useState<Contract | null>(null)
  const [selectedPlan, setSelectedPlan] = useState("")

  async function load() {
    const response = await fetch("/api/memberships?mine=true")
    const data = await response.json()
    setContracts(data.contracts ?? [])
    setCharges(data.charges ?? [])
    setPlans(data.plans ?? [])
  }
  useEffect(() => { void load() }, [])

  async function update(contractId: string, action: string, planId?: string) {
    const response = await fetch("/api/memberships", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractId, action, planId }) })
    const data = await response.json()
    setMessage(response.ok ? "Änderung gespeichert." : data.error ?? "Änderung fehlgeschlagen.")
    if (response.ok) { setChangeContract(null); await load() }
  }

  const visiblePlans = useMemo(() => plans.filter((plan) => !plan.newcomer_only), [plans])
  const contractCharges = historyContract ? charges.filter((charge) => charge.contract_id === historyContract.id) : []

  return <main className="mx-auto max-w-5xl px-6 py-12"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><Badge>Mein Konto</Badge><h1 className="mt-3 text-4xl font-bold">Meine Mitgliedschaften</h1><p className="mt-3 text-muted-foreground">Verträge, Abo-Wechsel und Abbuchungsverlauf verwalten.</p></div><Button asChild variant="outline"><Link href="/mitgliedschaften">Alle Angebote ansehen</Link></Button></div>{message && <p className="mb-4 text-primary">{message}</p>}{contracts.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">Du hast noch keine Mitgliedschaft.</CardContent></Card> : <div className="grid gap-5">{contracts.map((contract) => <Card key={contract.id}><CardHeader className="flex flex-row items-center justify-between gap-4"><CardTitle>{contract.membership_plans?.name ?? "Mitgliedschaft"}</CardTitle><Badge variant={contract.status === "active" ? "default" : "secondary"}>{statusLabel(contract.status)}</Badge></CardHeader><CardContent className="flex flex-col gap-5"><div className="grid gap-2 text-sm md:grid-cols-4"><span>Preis: {Number(contract.membership_plans?.price ?? 0).toFixed(2)} €</span><span>Gestartet: {date(contract.created_at)}</span><span>Nächste Abbuchung: {contract.status === "cancelled" ? "–" : date(contract.next_charge_at)}</span><span>Ende: {contract.status === "active" ? "laufend" : date(contract.minimum_end_at)}</span></div><div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => { setChangeContract(contract); setSelectedPlan(contract.membership_plans?.id ?? "") }}>Abo ändern</Button><Button variant="outline" onClick={() => setHistoryContract(contract)}>Mitgliedschaftsverlauf ansehen</Button>{contract.status === "active" && <Button variant="destructive" onClick={() => void update(contract.id, "cancel")}>Mitgliedschaft kündigen</Button>}</div></CardContent></Card>)}</div>}

<Dialog open={Boolean(changeContract)} onOpenChange={(open) => !open && setChangeContract(null)}><DialogContent><DialogHeader><DialogTitle>Abo wechseln</DialogTitle></DialogHeader><div className="flex flex-col gap-4"><p className="text-sm text-muted-foreground">Neukunden-Angebote sind für bestehende oder bereits gekündigte Verträge nicht auswählbar.</p>{visiblePlans.map((plan) => <button type="button" key={plan.id} onClick={() => setSelectedPlan(plan.id)} className={`rounded-lg border p-4 text-left ${selectedPlan === plan.id ? "border-primary bg-primary/10" : "border-border"}`}><span className="font-semibold">{plan.name}</span><span className="mt-1 block text-sm text-muted-foreground">{Number(plan.price).toFixed(2)} € / {plan.billing_interval}</span></button>)}<Button disabled={!selectedPlan || selectedPlan === changeContract?.membership_plans?.id} onClick={() => changeContract && void update(changeContract.id, "change_plan", selectedPlan)}>Abo wechseln</Button></div></DialogContent></Dialog>

<Dialog open={Boolean(historyContract)} onOpenChange={(open) => !open && setHistoryContract(null)}><DialogContent><DialogHeader><DialogTitle>Mitgliedschaftsverlauf</DialogTitle></DialogHeader>{historyContract && <div className="flex flex-col gap-4 text-sm"><div className="rounded-lg border p-4"><p className="font-semibold">{historyContract.membership_plans?.name}</p><p className="text-muted-foreground">Gestartet am {date(historyContract.created_at)}</p>{historyContract.cancellation_requested_at && <p className="text-muted-foreground">Kündigung vorgemerkt am {date(historyContract.cancellation_requested_at)}</p>}{historyContract.status !== "active" && <p className="text-muted-foreground">Beendet am {date(historyContract.minimum_end_at)}</p>}</div><h3 className="font-semibold">Abbuchungen</h3>{contractCharges.length === 0 ? <p className="text-muted-foreground">Noch keine Abbuchungen vorhanden.</p> : contractCharges.map((charge) => <div key={charge.id} className="flex items-center justify-between rounded-lg border p-3"><div><p>{charge.status === "succeeded" ? "Erfolgreich" : "Fehlgeschlagen"}</p><p className="text-muted-foreground">{date(charge.processed_at ?? charge.scheduled_for)}{charge.error_message ? ` · ${charge.error_message}` : ""}</p></div><span className="font-semibold">{Number(charge.amount).toFixed(2)} €</span></div>)}</div>}</DialogContent></Dialog></main>
}
