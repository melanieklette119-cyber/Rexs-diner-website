import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDiscordIdFromRequest } from "@/lib/membership"

async function requireAdmin(request: Request) {
  const discordId = getDiscordIdFromRequest(request)
  if (!discordId) return null
  const supabase = await createClient()
  if (!supabase) return null
  const { data } = await supabase.from("users").select("id, role, permissions").eq("discord_user_id", discordId).maybeSingle()
  if (!data) return null
  const role = String(data.role ?? "").toLowerCase()
  const permissions = Array.isArray(data.permissions) ? data.permissions : []
  const isOwner = role === "owner" || permissions.includes("all")
  const canManageMemberships = isOwner || permissions.includes("memberships_manage")
  if (!canManageMemberships) return null
  return supabase
}

export async function GET(request: Request) {
  const supabase = await requireAdmin(request)
  if (!supabase) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 })
  const { data, error } = await supabase.from("membership_plans").select("*").order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: "Stufen konnten nicht geladen werden." }, { status: 500 })
  return NextResponse.json({ plans: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await requireAdmin(request)
  if (!supabase) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 })
  const body = await request.json()
  const payload = { name: String(body.name ?? "").trim(), description: String(body.description ?? "").trim(), price: Number(body.price), billing_interval: body.billing_interval, min_duration_months: Math.max(1, Number(body.min_duration_months)), cancellation_notice_months: Math.max(0, Number(body.cancellation_notice_months)), newcomer_only: Boolean(body.newcomer_only), includes_discount: Boolean(body.includes_discount), discount_percent: body.includes_discount ? Number(body.discount_percent) : null, active: body.active !== false }
  if (!payload.name || !Number.isFinite(payload.price) || payload.price < 0 || !["monthly", "quarterly", "yearly"].includes(payload.billing_interval)) return NextResponse.json({ error: "Ungültige Stufendaten." }, { status: 400 })
  const { data, error } = await supabase.from("membership_plans").insert(payload).select().single()
  if (error) return NextResponse.json({ error: "Stufe konnte nicht gespeichert werden." }, { status: 500 })
  return NextResponse.json({ plan: data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await requireAdmin(request)
  if (!supabase) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 })
  const body = await request.json()
  const { id, ...updates } = body
  const { error } = await supabase.from("membership_plans").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) return NextResponse.json({ error: "Stufe konnte nicht aktualisiert werden." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
