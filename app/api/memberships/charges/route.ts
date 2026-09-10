import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { addBillingInterval, type MembershipPlan } from "@/lib/membership"

function authorized(request: Request) {
  const expected = process.env.MEMBERSHIP_CRON_SECRET
  return Boolean(expected && request.headers.get("x-membership-cron-secret") === expected)
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: "Supabase ist nicht verfügbar." }, { status: 503 })
  const now = new Date()
  const { data, error } = await supabase.from("membership_contracts").select("id, status, minimum_end_at, fivem_bank_account_id, next_charge_at, membership_plans(price, billing_interval)").in("status", ["active", "pending_cancellation"]).lte("next_charge_at", now.toISOString()).limit(100)
  if (error) return NextResponse.json({ error: "Fällige Abbuchungen konnten nicht geladen werden." }, { status: 500 })
  const due = (data ?? []).filter((charge) => charge.status === "active" || new Date(charge.next_charge_at) <= new Date(charge.minimum_end_at))
  const expired = (data ?? []).filter((charge) => charge.status === "pending_cancellation" && new Date(charge.minimum_end_at) <= now).map((charge) => charge.id)
  if (expired.length > 0) await supabase.from("membership_contracts").update({ status: "cancelled", updated_at: now.toISOString() }).in("id", expired)
  return NextResponse.json({ charges: due.filter((charge) => !expired.includes(charge.id)).map((charge) => ({ ...charge, idempotencyKey: `membership-${charge.id}-${charge.next_charge_at}` })) })
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })
  const body = await request.json()
  if (!body.contractId || !body.idempotencyKey || !["succeeded", "failed"].includes(body.status)) return NextResponse.json({ error: "Ungültiger Abbuchungsstatus." }, { status: 400 })
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: "Supabase ist nicht verfügbar." }, { status: 503 })
  const { data: contract } = await supabase.from("membership_contracts").select("id, status, minimum_end_at, next_charge_at, fivem_bank_account_id, membership_plans(price, billing_interval)").eq("id", body.contractId).in("status", ["active", "pending_cancellation"]).single()
  if (!contract) return NextResponse.json({ error: "Vertrag nicht gefunden." }, { status: 404 })
  if (contract.status === "pending_cancellation" && new Date(contract.minimum_end_at) <= new Date()) {
    await supabase.from("membership_contracts").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", contract.id)
    return NextResponse.json({ error: "Die Mindestlaufzeit ist abgelaufen; der Vertrag wurde beendet." }, { status: 409 })
  }
  const plan = Array.isArray(contract.membership_plans) ? contract.membership_plans[0] : contract.membership_plans
  const { error } = await supabase.from("membership_charge_attempts").upsert({ contract_id: contract.id, idempotency_key: body.idempotencyKey, scheduled_for: contract.next_charge_at, status: body.status, amount: Number(plan?.price ?? 0), fivem_bank_account_id: contract.fivem_bank_account_id, processed_at: new Date().toISOString(), error_message: body.errorMessage ?? null }, { onConflict: "idempotency_key" })
  if (error) return NextResponse.json({ error: "Abbuchungsergebnis konnte nicht gespeichert werden." }, { status: 500 })
  if (body.status === "succeeded") {
    const next = addBillingInterval(new Date(contract.next_charge_at), plan?.billing_interval as MembershipPlan["billing_interval"])
    const updates = { next_charge_at: next, updated_at: new Date().toISOString() } as Record<string, string>
    if (contract.status === "pending_cancellation" && new Date(next) >= new Date(contract.minimum_end_at)) updates.status = "cancelled"
    await supabase.from("membership_contracts").update(updates).eq("id", contract.id)
  }
  return NextResponse.json({ ok: true })
}