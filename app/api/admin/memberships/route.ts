import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMembershipPlans } from "@/lib/membership"

async function getAdminClient(request: Request) {
  const username = request.headers.get("x-admin-username")?.trim()
  if (!username) return null

  const supabase = await createClient()
  if (!supabase) throw new Error("Supabase ist nicht verfügbar.")

  const { data: user, error } = await supabase
    .from("users")
    .select("username, role, user_group")
    .eq("username", username)
    .single()

  if (error || !user || (user.role !== "admin" && user.user_group !== "owner")) return null
  return supabase
}

function planIdFromName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || `plan-${Date.now()}`
}

function parsePlan(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim()
  const description = String(body.description ?? "").trim()
  const price = Number(body.price)
  const minDurationMonths = Number(body.min_duration_months)
  const cancellationNoticeMonths = Number(body.cancellation_notice_months)
  const discountPercent = Number(body.discount_percent)
  const billingInterval = String(body.billing_interval ?? "")

  if (!name || name.length > 120) throw new Error("Bitte einen gültigen Namen für die Mitgliedschaft eingeben.")
  if (!Number.isFinite(price) || price < 0) throw new Error("Bitte einen gültigen Preis eingeben.")
  if (!["daily", "weekly", "monthly"].includes(billingInterval)) throw new Error("Bitte ein gültiges Abrechnungsintervall auswählen.")
  if (!Number.isInteger(minDurationMonths) || minDurationMonths < 1) throw new Error("Bitte eine gültige Mindestlaufzeit eingeben.")
  if (!Number.isInteger(cancellationNoticeMonths) || cancellationNoticeMonths < 0) throw new Error("Bitte eine gültige Kündigungsfrist eingeben.")
  if (!Number.isInteger(discountPercent) || discountPercent < 0 || discountPercent > 100) throw new Error("Bitte einen Rabatt zwischen 0 und 100 Prozent eingeben.")

  return {
    name,
    description,
    price,
    billing_interval: billingInterval,
    min_duration_months: minDurationMonths,
    cancellation_notice_months: cancellationNoticeMonths,
    newcomer_only: body.newcomer_only === true,
    includes_discount: body.includes_discount === true,
    discount_percent: body.includes_discount === true ? discountPercent : null,
    active: body.active !== false,
  }
}

export async function GET(request: Request) {
  try {
    if (!(await getAdminClient(request))) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 403 })
    return NextResponse.json({ plans: await getMembershipPlans() })
  } catch (error) {
    console.error("[admin/memberships] GET failed", error)
    return NextResponse.json({ error: "Mitgliedschaften konnten nicht geladen werden." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAdminClient(request)
    if (!supabase) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 403 })

    const body = await request.json() as Record<string, unknown>
    const plan = parsePlan(body)
    const baseId = planIdFromName(plan.name)
    let id = baseId

    const { data: existing } = await supabase.from("membership_plans").select("id").like("id", `${baseId}%`)
    if ((existing ?? []).some((item) => item.id === id)) id = `${baseId}-${Date.now().toString(36)}`

    const { data, error } = await supabase.from("membership_plans").insert({ id, ...plan }).select().single()
    if (error) throw error
    return NextResponse.json({ plan: data }, { status: 201 })
  } catch (error) {
    console.error("[admin/memberships] POST failed", error)
    const message = error instanceof Error ? error.message : "Mitgliedschaft konnte nicht gespeichert werden."
    return NextResponse.json({ error: message }, { status: message.startsWith("Bitte ") ? 422 : 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await getAdminClient(request)
    if (!supabase) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 403 })

    const body = await request.json() as Record<string, unknown>
    const id = String(body.id ?? "").trim()
    if (!id) return NextResponse.json({ error: "Mitgliedschaft nicht gefunden." }, { status: 404 })

    const plan = parsePlan(body)
    const { data, error } = await supabase.from("membership_plans").update(plan).eq("id", id).select().single()
    if (error) throw error
    return NextResponse.json({ plan: data })
  } catch (error) {
    console.error("[admin/memberships] PATCH failed", error)
    const message = error instanceof Error ? error.message : "Mitgliedschaft konnte nicht gespeichert werden."
    return NextResponse.json({ error: message }, { status: message.startsWith("Bitte ") ? 422 : 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await getAdminClient(request)
    if (!supabase) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 403 })

    const id = new URL(request.url).searchParams.get("id")?.trim()
    if (!id) return NextResponse.json({ error: "Mitgliedschaft nicht gefunden." }, { status: 404 })

    const { error } = await supabase.from("membership_plans").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[admin/memberships] DELETE failed", error)
    return NextResponse.json({ error: "Mitgliedschaft konnte nicht gelöscht werden." }, { status: 409 })
  }
}