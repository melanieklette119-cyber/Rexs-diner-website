"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Contract = { id: string; status: string; full_name: string; fivem_bank_account_id: string; minimum_end_at: string; next_charge_at: string; membership_plans?: { name: string; price: number; billing_interval: string } }
export default function MeineMitgliedschaftenPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [message, setMessage] = useState("")
  const load = () => fetch("/api/memberships?mine=true").then((r) => r.json()).then((d) => setContracts(d.contracts ?? []))
  useEffect(() => { load() }, [])
  async function update(contractId: string, action: string) { const response = await fetch("/api/memberships", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractId, action }) }); const data = await response.json(); setMessage(response.ok ? "Änderung gespeichert." : data.error ?? "Änderung fehlgeschlagen."); if (response.ok) load() }
  return <main className="mx-auto max-w-5xl px-6 py-12"><div className="mb-8 flex items-end justify-between gap-4"><div><Badge>Mein Konto</Badge><h1 className="mt-3 text-4xl font-bold">Meine Mitgliedschaften</h1><p className="mt-3 text-muted-foreground">Verträge, Abbuchungen und Kündigungen verwalten.</p></div><Button asChild variant="outline"><Link href="/mitgliedschaften">Abo ändern</Link></Button></div>{message && <p className="mb-4 text-primary">{message}</p>}{contracts.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">Du hast noch keine Mitgliedschaft.</CardContent></Card> : <div className="grid gap-5">{contracts.map((contract) => <Card key={contract.id}><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{contract.membership_plans?.name ?? "Mitgliedschaft"}</CardTitle><Badge variant={contract.status === "active" ? "default" : "secondary"}>{contract.status}</Badge></CardHeader><CardContent className="space-y-4"><div className="grid gap-2 text-sm md:grid-cols-3"><span>Preis: {Number(contract.membership_plans?.price ?? 0).toFixed(2)} €</span><span>Nächste Abbuchung: {new Date(contract.next_charge_at).toLocaleDateString("de-DE")}</span><span>Mindestlaufzeit bis: {new Date(contract.minimum_end_at).toLocaleDateString("de-DE")}</span></div>{contract.status === "active" && <Button variant="destructive" onClick={() => update(contract.id, "cancel")}>Mitgliedschaft kündigen</Button>}</CardContent></Card>)}</div>}</main>
}
