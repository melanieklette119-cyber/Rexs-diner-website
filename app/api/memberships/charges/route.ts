import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function authorized(request: Request) {
  const expected = process.env.MEMBERSHIP_CRON_SECRET
  return Boolean(expected && request.headers.get("x-membership-cron-secret") === expected)
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: "Supabase ist nicht verfügbar." }, { status: 503 })
  const { data, error } = await supabase.from("membership_contracts").select("id, fivem_bank_account_id, next_charge_at, membership_plans(price, billing_interval)").eq("status", "active").lte("next_charge_at", new Date().toISOString()).limit(100)
  if (error) return NextResponse.json({ error: "Fällige Abbuchungen konnten nicht geladen werden." }, { status: 500 })
  return NextResponse.json({ charges: (data ?? []).map((charge) => ({ ...charge, idempotencyKey: `membership-${charge.id}-${charge.next_charge_at}` })) })
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })
  const body = await request.json()
  if (!body.contractId || !body.idempotencyKey || !["succeeded", "failed"].includes(body.status)) return NextResponse.json({ error: "Ungültiger Abbuchungsstatus." }, { status: 400 })
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: "Supabase ist nicht verfügbar." }, { status: 503 })
  const { data: contract } = await supabase.from("membership_contracts").select("id, next_charge_at, fivem_bank_account_id, membership_plans(price, billing_interval)").eq("id", body.contractId).eq("status", "active").single()
  if (!contract) return NextResponse.json({ error: "Vertrag nicht gefunden." }, { status: 404 })
  const plan = Array.isArray(contract.membership_plans) ? contract.membership_plans[0] : contract.membership_plans
  const { error } = await supabase.from("membership_charge_attempts").upsert({ contract_id: contract.id, idempotency_key: body.idempotencyKey, scheduled_for: contract.next_charge_at, status: body.status, amount: Number(plan?.price ?? 0), fivem_bank_account_id: contract.fivem_bank_account_id, processed_at: new Date().toISOString(), error_message: body.errorMessage ?? null }, { onConflict: "idempotency_key" })
  if (error) return NextResponse.json({ error: "Abbuchungsergebnis konnte nicht gespeichert werden." }, { status: 500 })
  if (body.status === "succeeded") {
    const months = plan?.billing_interval === "yearly" ? 12 : plan?.billing_interval === "quarterly" ? 3 : 1
    const next = new Date(contract.next_charge_at); next.setMonth(next.getMonth() + months)
    await supabase.from("membership_contracts").update({ next_charge_at: next.toISOString(), updated_at: new Date().toISOString() }).eq("id", contract.id)
  }
  return NextResponse.json({ ok: true })
}
