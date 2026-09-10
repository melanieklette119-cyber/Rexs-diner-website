"use client"

import { useEffect, useState } from "react"
import { Edit3, Plus, Trash2, Power, CreditCard, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

type Plan = { id: string; name: string; description: string; price: number; billing_interval: "monthly" | "quarterly" | "yearly"; min_duration_months: number; cancellation_notice_months: number; newcomer_only: boolean; includes_discount: boolean; discount_percent: number | null; active: boolean }
type Form = { name: string; description: string; price: string; billing_interval: Plan["billing_interval"]; min_duration_months: string; cancellation_notice_months: string; newcomer_only: boolean; includes_discount: boolean; discount_percent: string; active: boolean }
const blank: Form = { name: "", description: "", price: "", billing_interval: "monthly", min_duration_months: "1", cancellation_notice_months: "0", newcomer_only: false, includes_discount: false, discount_percent: "10", active: true }
const intervals = { monthly: "Monatlich", quarterly: "Vierteljährlich", yearly: "Jährlich" }

export default function AdminMitgliedschaftenPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [form, setForm] = useState<Form>(blank)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    const response = await fetch("/api/admin/memberships")
    const data = await response.json()
    if (response.ok) setPlans(data.plans ?? [])
    else setError(data.error ?? "Mitgliedschaften konnten nicht geladen werden.")
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  const update = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }))
  const openCreate = () => { setEditingId(null); setForm(blank); setMessage(""); setError(""); setShowModal(true) }
  const openEdit = (plan: Plan) => { setEditingId(plan.id); setForm({ name: plan.name, description: plan.description, price: String(plan.price), billing_interval: plan.billing_interval, min_duration_months: String(plan.min_duration_months), cancellation_notice_months: String(plan.cancellation_notice_months), newcomer_only: plan.newcomer_only, includes_discount: plan.includes_discount, discount_percent: String(plan.discount_percent ?? 10), active: plan.active }); setMessage(""); setError(""); setShowModal(true) }
  async function save() {
    setSaving(true); setError("")
    const payload = { ...form, price: Number(form.price), min_duration_months: Number(form.min_duration_months), cancellation_notice_months: Number(form.cancellation_notice_months), discount_percent: form.includes_discount ? Number(form.discount_percent) : null }
    const response = await fetch("/api/admin/memberships", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload) })
    const data = await response.json()
    if (!response.ok) setError(data.error ?? "Speichern fehlgeschlagen.")
    else { setMessage(editingId ? "Mitgliedschaft aktualisiert." : "Mitgliedschaft erstellt."); setShowModal(false); await load() }
    setSaving(false)
  }
  async function remove(plan: Plan) {
    if (!window.confirm(`„${plan.name}“ wirklich löschen?`)) return
    const response = await fetch(`/api/admin/memberships?id=${encodeURIComponent(plan.id)}`, { method: "DELETE" })
    const data = await response.json()
    if (!response.ok) setError(data.error ?? "Löschen fehlgeschlagen.")
    else { setMessage("Mitgliedschaft gelöscht."); await load() }
  }
  async function toggle(plan: Plan) {
    const response = await fetch("/api/admin/memberships", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: plan.id, active: !plan.active }) })
    if (response.ok) await load(); else setError("Status konnte nicht geändert werden.")
  }

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground md:px-8"><div className="mx-auto max-w-6xl space-y-6">
    <div className="flex items-center justify-between gap-4"><h1 className="text-2xl font-bold">Mitgliedschaften</h1><Button onClick={openCreate} className="bg-primary text-primary-foreground"><Plus className="mr-2 size-4" />Neue Mitgliedschaft</Button></div>
    {message && <p className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm">{message}</p>}{error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
    {loading ? <Card><CardContent className="p-8 text-center text-muted-foreground">Mitgliedschaften werden geladen …</CardContent></Card> : plans.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-3 p-10 text-center"><CreditCard className="size-10 text-muted-foreground" /><h2 className="text-lg font-semibold">Keine Mitgliedschaften vorhanden</h2><p className="text-sm text-muted-foreground">Erstelle deine erste Mitgliedschaft.</p><Button onClick={openCreate}><Plus className="mr-2 size-4" />Erstellen</Button></CardContent></Card> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{plans.map((plan) => <Card key={plan.id} className="border-l-4 border-l-primary"><CardContent className="space-y-4 p-6"><div className="text-center"><h2 className="font-mono text-xl font-bold">{plan.name}</h2><div className="mt-2 flex flex-wrap justify-center gap-2"><Badge>{Number(plan.price).toFixed(2).replace(".", ",")} € / {intervals[plan.billing_interval]}</Badge><Badge variant={plan.active ? "default" : "secondary"}>{plan.active ? "Aktiv" : "Deaktiviert"}</Badge></div></div><p className="min-h-10 text-center text-sm text-muted-foreground">{plan.description || "Keine Beschreibung hinterlegt."}</p><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Mindestlaufzeit:</span><span>{plan.min_duration_months} Monat{plan.min_duration_months === 1 ? "" : "e"}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Kündigungsfrist:</span><span>{plan.cancellation_notice_months ? `${plan.cancellation_notice_months} Monat${plan.cancellation_notice_months === 1 ? "" : "e"}` : "Keine"}</span></div>{plan.newcomer_only && <Badge variant="secondary" className="w-full justify-center">Nur für Neukommer</Badge>}{plan.includes_discount && <Badge variant="secondary" className="w-full justify-center">{plan.discount_percent}% Rabatt inklusive</Badge>}</div><div className="flex justify-center gap-2 border-t border-border pt-3"><Button size="sm" variant="outline" onClick={() => openEdit(plan)}><Edit3 className="mr-1 size-4" />Bearbeiten</Button><Button size="sm" variant="outline" onClick={() => toggle(plan)}><Power className="mr-1 size-4" />{plan.active ? "Deaktivieren" : "Aktivieren"}</Button><Button size="sm" variant="outline" className="text-destructive" onClick={() => remove(plan)}><Trash2 className="mr-1 size-4" />Löschen</Button></div></CardContent></Card>)}</div>}
    {showModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-background/80" onClick={() => setShowModal(false)} /><Card className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{editingId ? "Mitgliedschaft bearbeiten" : "Neue Mitgliedschaft"}</CardTitle><Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X /></Button></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="flex flex-col gap-2"><Label>Name</Label><Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Gold" /></div><div className="flex flex-col gap-2"><Label>Preis</Label><Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} /></div><div className="flex flex-col gap-2 md:col-span-2"><Label>Beschreibung</Label><Input value={form.description} onChange={(e) => update("description", e.target.value)} /></div><div className="flex flex-col gap-2"><Label>Abbuchung</Label><select className="h-10 rounded-md border border-input bg-background px-3" value={form.billing_interval} onChange={(e) => update("billing_interval", e.target.value as Plan["billing_interval"])}><option value="monthly">Monatlich</option><option value="quarterly">Vierteljährlich</option><option value="yearly">Jährlich</option></select></div><div className="flex gap-2"><div className="flex flex-1 flex-col gap-2"><Label>Mindestmonate</Label><Input type="number" min="1" value={form.min_duration_months} onChange={(e) => update("min_duration_months", e.target.value)} /></div><div className="flex flex-1 flex-col gap-2"><Label>Kündigungsfrist</Label><Input type="number" min="0" value={form.cancellation_notice_months} onChange={(e) => update("cancellation_notice_months", e.target.value)} /></div></div><div className="flex items-center justify-between md:col-span-2"><Label>Neukommer-Abo</Label><Switch checked={form.newcomer_only} onCheckedChange={(value) => update("newcomer_only", value)} /></div><div className="flex items-center justify-between md:col-span-2"><Label>Rabatt inklusive</Label><Switch checked={form.includes_discount} onCheckedChange={(value) => update("includes_discount", value)} /></div>{form.includes_discount && <div className="flex flex-col gap-2 md:col-span-2"><Label>Rabatt Prozent</Label><Input type="number" min="1" max="100" value={form.discount_percent} onChange={(e) => update("discount_percent", e.target.value)} /></div>}<div className="flex justify-end gap-2 md:col-span-2"><Button variant="outline" onClick={() => setShowModal(false)}>Abbrechen</Button><Button onClick={save} disabled={saving}>{saving ? "Speichern …" : "Speichern"}</Button></div></CardContent></Card></div>}
  </div></main>
}
