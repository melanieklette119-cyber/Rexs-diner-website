import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { getMembershipPlans, sendMembershipDM } from "@/lib/membership"

async function getAdminClient(request: Request) {
  const username = request.headers.get("x-admin-username")?.trim()
  if (!username) return null
  const supabase = await createClient()
  if (!supabase) throw new Error("Supabase ist nicht verfügbar.")
  const { data: user } = await supabase.from("users").select("username, role, user_group").eq("username", username).single()
  return user && (user.role === "admin" || user.user_group === "owner") ? supabase : null
}

const addMonths = (date: Date, months: number) => {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

export async function GET(request: Request) {
  try {
    const supabase = await getAdminClient(request)
    if (!supabase) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 403 })
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? ""
    let builder = supabase
      .from("user_profiles")
      .select("id, discord_id, discord_username, full_name, avatar_url")
      .not("discord_id", "is", null)
      .neq("discord_id", "")
      .limit(20)
    if (query) {
      const safeQuery = query.replace(/[(),]/g, " ")
      builder = builder.or(`discord_username.ilike.%${safeQuery}%,discord_id.ilike.%${safeQuery}%,full_name.ilike.%${safeQuery}%`)
    }
    const { data, error } = await builder.order("discord_username")
    const users = (data ?? []).map((profile) => ({
      id: profile.id,
      username: profile.discord_username,
      discord_user_id: profile.discord_id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
    }))
    if (error) throw error
    return NextResponse.json({ users, plans: await getMembershipPlans() })
  } catch (error) {
    console.error("[membership-gifts] GET failed", error)
    return NextResponse.json({ error: "Nutzer konnten nicht geladen werden." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAdminClient(request)
    if (!supabase) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 403 })
    const body = await request.json() as Record<string, unknown>
    const userId = String(body.userId ?? "").trim()
    const planId = String(body.planId ?? "").trim()
    const durationMonths = Number(body.durationMonths)
    if (!userId || !planId || !Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 36) {
      return NextResponse.json({ error: "Bitte Empfänger, Mitgliedschaft und eine Dauer von 1 bis 36 Monaten angeben." }, { status: 422 })
    }
    const [{ data: recipient }, { data: plan }] = await Promise.all([
      supabase.from("user_profiles").select("id, discord_id, discord_username, full_name").eq("id", userId).single(),
      supabase.from("membership_plans").select("id, name").eq("id", planId).eq("active", true).single(),
    ])
    if (!recipient?.discord_id || !plan) return NextResponse.json({ error: "Empfänger oder Mitgliedschaft nicht gefunden." }, { status: 404 })
    const token = randomBytes(32).toString("hex")
    const expiresAt = addMonths(new Date(), durationMonths).toISOString()
    const { data: gift, error } = await supabase.from("membership_gifts").insert({
      token, recipient_user_id: null, recipient_discord_id: recipient.discord_id,
      plan_id: plan.id, duration_months: durationMonths, ends_at: expiresAt, status: "pending",
      created_by: request.headers.get("x-admin-username")?.trim() ?? "admin",
    }).select().single()
    if (error) throw error
    const baseUrl = new URL(request.url).origin
    const giftUrl = `${baseUrl}/geschenk/${token}`
    void sendMembershipDM(recipient.discord_id, {
      title: "Du hast ein Geschenk bekommen",
      description: "Du hast ein Geschenk bekommen. Öffne den Link, packe dein Geschenk aus und entscheide selbst, ob du es annimmst.",
      color: 0xD4673E,
      fields: [{ name: "Geschenk öffnen", value: giftUrl }],
    })
    return NextResponse.json({ gift }, { status: 201 })
  } catch (error) {
    console.error("[membership-gifts] POST failed", error)
    const details = error && typeof error === "object" && "message" in error ? String(error.message) : "Unbekannter Datenbankfehler."
    return NextResponse.json({ error: `Geschenkmitgliedschaft konnte nicht erstellt werden: ${details}` }, { status: 500 })
  }
}
