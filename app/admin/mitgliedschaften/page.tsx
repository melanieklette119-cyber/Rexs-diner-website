"use client"

import { useEffect, useState } from "react"
import { Check, CircleDollarSign, Edit3, Loader2, Plus, ShieldCheck, Trash2, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Plan = {
  id: string
  name: string
  description: string
  price: number
  billing_interval: "monthly" | "quarterly" | "yearly"
  min_duration_months: number
  cancellation_notice_months: number
  newcomer_only: boolean
  includes_discount: boolean
  discount_percent: number | null
  active: boolean
}

type FormState = {
  name: string
  description: string
  price: string
  billing_interval: Plan["billing_interval"]
  min_duration_months: string
  cancellation_notice_months: string
  newcomer_only: boolean
  includes_discount: boolean
  discount_percent: string
  active: boolean
}

const emptyForm: FormState = { name: "", description: "", price: "", billing_interval: "monthly", min_duration_months: "1", cancellation_notice_months: "0", newcomer_only: false, includes_discount: false, discount_percent: "10", active: true }
const intervalLabels = { monthly: "Monatlich", quarterly: "Vierteljährlich", yearly: "Jährlich" }

export default function AdminMitgliedschaftenPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    const response = await fetch("/api/admin/memberships")
    const data = await response.json()
    if (!response.ok) setError(data.error ?? "Mitgliedschaften konnten nicht geladen werden.")
    else setPlans(data.plans ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditingId(null); setForm(emptyForm); setMessage(""); setError(""); setIsEditorOpen(true)
  }

  function openEdit(plan: Plan) {
    setEditingId(plan.id)
    setForm({ name: plan.name, description: plan.description, price: String(plan.price), billing_interval: plan.billing_interval, min_duration_months: String(plan.min_duration_months), cancellation_notice_months: String(plan.cancellation_notice_months), newcomer_only: plan.newcomer_only, includes_discount: plan.includes_discount, discount_percent: String(plan.discount_percent ?? 10), active: plan.active })
    setMessage(""); setError(""); setIsEditorOpen(true)
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })) }

  async function save() {
    setSaving(true); setMessage(""); setError("")
    const payload = { ...form, price: Number(form.price), min_duration_months: Number(form.min_duration_months), cancellation_notice_months: Number(form.cancellation_notice_months), discount_percent: form.includes_discount ? Number(form.discount_percent) : null }
    const response = await fetch("/api/admin/memberships", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload) })
    const data = await response.json()
    if (!response.ok) setError(data.error ?? "Speichern fehlgeschlagen.")
    else { setMessage(editingId ? "Mitgliedschaft aktualisiert." : "Mitgliedschaft erstellt."); setIsEditorOpen(false); await load() }
    setSaving(false)
  }

  async function remove(plan: Plan) {
    if (!window.confirm(`„${plan.name}“ wirklich löschen?`)) return
    const response = await fetch(`/api/admin/memberships?id=${encodeURIComponent(plan.id)}`, { method: "DELETE" })
    const data = await response.json()
    if (!response.ok) setError(data.error ?? "Löschen fehlgeschlagen.")
    else { setMessage("Mitgliedschaft gelöscht."); await load() }
  }

  async function toggleActive(plan: Plan) {
    const response = await fetch("/api/admin/memberships", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: plan.id, active: !plan.active }) })
    if (response.ok) await load()
    else setError("Status konnte nicht geändert werden.")
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground md:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit gap-2"><ShieldCheck data-icon="inline-start" /> Adminbereich</Badge>
            <div><h1 className="text-3xl font-bold tracking-tight md:text-5xl">Mitgliedschaften</h1><p className="mt-2 max-w-2xl text-muted-foreground">Erstelle und verwalte deine Abo-Stufen, Preise und Vorteile an einem Ort.</p></div>
          </div>
          <Button onClick={openCreate} size="lg"><Plus data-icon="inline-start" /> Neue Mitgliedschaft</Button>
        </header>

        {message && <Alert><Check data-icon="inline-start" /><AlertDescription>{message}</AlertDescription></Alert>}
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        {isEditorOpen && <Card className="border-primary/40 shadow-lg"><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>{editingId ? "Mitgliedschaft bearbeiten" : "Neue Mitgliedschaft erstellen"}</CardTitle><CardDescription>Diese Informationen werden später im Abo-Vertrag angezeigt.</CardDescription></div><Button variant="ghost" size="icon" onClick={() => setIsEditorOpen(false)} aria-label="Editor schließen"><X /></Button></CardHeader><CardContent><div className="grid gap-5 md:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="name">Name</Label><Input id="name" value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="z. B. Gold Mitgliedschaft" /></div><div className="flex flex-col gap-2"><Label htmlFor="price">Preis pro Abbuchung</Label><Input id="price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => updateForm("price", e.target.value)} placeholder="29.99" /></div><div className="flex flex-col gap-2 md:col-span-2"><Label htmlFor="description">Beschreibung</Label><Input id="description" value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="Vorteile und Inhalt der Mitgliedschaft" /></div><div className="flex flex-col gap-2"><Label htmlFor="interval">Abbuchungsintervall</Label><select id="interval" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.billing_interval} onChange={(e) => updateForm("billing_interval", e.target.value as Plan["billing_interval"])}><option value="monthly">Monatlich</option><option value="quarterly">Vierteljährlich</option><option value="yearly">Jährlich</option></select></div><div className="grid grid-cols-2 gap-3"><div className="flex flex-col gap-2"><Label htmlFor="minimum">Mindestmonate</Label><Input id="minimum" type="number" min="1" value={form.min_duration_months} onChange={(e) => updateForm("min_duration_months", e.target.value)} /></div><div className="flex flex-col gap-2"><Label htmlFor="notice">Kündigungsfrist</Label><Input id="notice" type="number" min="0" value={form.cancellation_notice_months} onChange={(e) => updateForm("cancellation_notice_months", e.target.value)} /></div></div></div><div className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4"><label className="flex items-center justify-between gap-4 text-sm">Neukommer-Abo <Switch checked={form.newcomer_only} onCheckedChange={(value) => updateForm("newcomer_only", value)} /></label><label className="flex items-center justify-between gap-4 text-sm">Rabatt inklusive <Switch checked={form.includes_discount} onCheckedChange={(value) => updateForm("includes_discount", value)} /></label>{form.includes_discount && <div className="flex flex-col gap-2"><Label htmlFor="discount">Rabatt in Prozent</Label><Input id="discount" type="number" min="1" max="100" value={form.discount_percent} onChange={(e) => updateForm("discount_percent", e.target.value)} /></div>}<label className="flex items-center justify-between gap-4 text-sm">Für neue Verträge aktiv <Switch checked={form.active} onCheckedChange={(value) => updateForm("active", value)} /></label></div><div className="mt-6 flex flex-wrap justify-end gap-3"><Button variant="outline" onClick={() => setIsEditorOpen(false)}>Abbrechen</Button><Button onClick={save} disabled={saving || !form.name || !form.price}>{saving && <Loader2 data-icon="inline-start" className="animate-spin" />} {editingId ? "Änderungen speichern" : "Mitgliedschaft erstellen"}</Button></div></CardContent></Card>}

        <section className="flex flex-col gap-4"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-semibold">Deine Abo-Stufen</h2><p className="text-sm text-muted-foreground">{plans.length} {plans.length === 1 ? "Stufe" : "Stufen"} angelegt</p></div></div>{loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Card><CardContent className="flex h-48 items-center justify-center text-muted-foreground">Lade Mitgliedschaften …</CardContent></Card></div> : plans.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-4 py-16 text-center"><CircleDollarSign className="size-10 text-muted-foreground" /><h3 className="text-xl font-semibold">Noch keine Mitgliedschaften</h3><p className="max-w-md text-muted-foreground">Erstelle deine erste Abo-Stufe, damit Kunden sie auswählen können.</p><Button onClick={openCreate}><Plus data-icon="inline-start" /> Erste Mitgliedschaft erstellen</Button></CardContent></Card> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{plans.map((plan) => <Card key={plan.id} className="flex flex-col"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{plan.name}</CardTitle><CardDescription className="mt-1">{plan.description || "Keine Beschreibung hinterlegt."}</CardDescription></div><Badge variant={plan.active ? "default" : "secondary"}>{plan.active ? "Aktiv" : "Deaktiviert"}</Badge></div></CardHeader><CardContent className="flex flex-1 flex-col gap-5"><div className="flex items-end gap-2"><span className="text-3xl font-bold">{Number(plan.price).toFixed(2).replace(".", ",")} €</span><span className="pb-1 text-sm text-muted-foreground">/ {intervalLabels[plan.billing_interval]}</span></div><div className="flex flex-col gap-2 text-sm text-muted-foreground"><span>Mindestlaufzeit: {plan.min_duration_months} Monat{plan.min_duration_months === 1 ? "" : "e"}</span><span>Kündigungsfrist: {plan.cancellation_notice_months === 0 ? "Keine" : `${plan.cancellation_notice_months} Monat${plan.cancellation_notice_months === 1 ? "" : "e"}`}</span>{plan.newcomer_only && <Badge variant="outline" className="w-fit">Nur für Neukommer</Badge>}{plan.includes_discount && <Badge variant="outline" className="w-fit">{plan.discount_percent}% Rabatt inklusive</Badge>}</div><div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4"><Button variant="outline" size="sm" onClick={() => openEdit(plan)}><Edit3 data-icon="inline-start" /> Bearbeiten</Button><Button variant="ghost" size="sm" onClick={() => toggleActive(plan)}>{plan.active ? "Deaktivieren" : "Aktivieren"}</Button><Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(plan)}><Trash2 data-icon="inline-start" /> Löschen</Button></div></CardContent></Card>)}</div>}</section>
      </div>
    </main>
  )
}
