import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDiscordIdFromRequest, sendMembershipDM } from "@/lib/membership"

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const supabase = await createClient()
    if (!supabase) throw new Error("Supabase ist nicht verfügbar.")
    const { data, error } = await supabase.from("membership_gifts").select("token, plan_id, duration_months, ends_at, status").eq("token", token).single()
    if (error || !data) {
      console.error("[membership-gifts] GET lookup failed", error)
      return NextResponse.json({ error: "Dieses Geschenk ist nicht mehr verfügbar." }, { status: 404 })
    }
    if (data.status !== "pending" || new Date(data.ends_at) <= new Date()) return NextResponse.json({ error: "Dieses Geschenk ist nicht mehr verfügbar." }, { status: 404 })
    const { data: plan } = await supabase.from("membership_plans").select("name").eq("id", data.plan_id).maybeSingle()
    return NextResponse.json({ gift: { planName: plan?.name ?? "Mitgliedschaft", durationMonths: data.duration_months, endsAt: data.ends_at } })
  } catch (error) {
    console.error("[membership-gifts] GET failed", error)
    return NextResponse.json({ error: "Geschenk konnte nicht geladen werden." }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const action = String((await request.json()).action ?? "")
    if (!["accept", "reject"].includes(action)) return NextResponse.json({ error: "Ungültige Aktion." }, { status: 422 })
    const discordId = getDiscordIdFromRequest(request)
    if (!discordId) return NextResponse.json({ error: "Bitte zuerst mit Discord anmelden." }, { status: 401 })
    const supabase = await createClient()
    if (!supabase) throw new Error("Supabase ist nicht verfügbar.")
    const { data: gift, error: giftError } = await supabase.from("membership_gifts").select("*").eq("token", token).eq("status", "pending").single()
    if (giftError || !gift || gift.recipient_discord_id !== discordId || new Date(gift.ends_at) <= new Date()) return NextResponse.json({ error: "Dieses Geschenk ist nicht verfügbar." }, { status: 404 })
    const { data: plan, error: planError } = await supabase.from("membership_plans").select("id, name, billing_interval").eq("id", gift.plan_id).maybeSingle()
    if (planError || !plan) return NextResponse.json({ error: "Die geschenkte Mitgliedschaft ist nicht mehr verfügbar." }, { status: 404 })
    const { data: profile } = await supabase.from("user_profiles").select("full_name, discord_username").eq("discord_id", discordId).maybeSingle()
    const now = new Date().toISOString()
    if (action === "reject") {
      await supabase.from("membership_gifts").update({ status: "rejected", updated_at: now }).eq("id", gift.id).eq("status", "pending")
      void sendMembershipDM(discordId, { title: "Geschenk abgelehnt", description: "Du hast die geschenkte Mitgliedschaft abgelehnt.", color: 0xF07865 })
      return NextResponse.json({ message: "Das Geschenk wurde abgelehnt." })
    }
    const { count } = await supabase.from("membership_contracts").select("id", { count: "exact", head: true }).eq("user_id", discordId).in("status", ["active", "pending_cancellation"])
    if ((count ?? 0) > 0) return NextResponse.json({ error: "Du hast bereits eine aktive Mitgliedschaft." }, { status: 409 })
    const { error: contractError } = await supabase.from("membership_contracts").insert({
      user_id: discordId,
      plan_id: plan.id,
      full_name: profile?.full_name || profile?.discord_username || "Geschenkmitgliedschaft",
      discord_id: discordId,
      status: "active",
      minimum_end_at: gift.ends_at,
      next_charge_at: gift.ends_at,
      billing_interval: plan.billing_interval,
    })
    if (contractError) throw contractError
    const { error: updateError } = await supabase.from("membership_gifts").update({ status: "accepted", accepted_at: now, updated_at: now }).eq("id", gift.id).eq("status", "pending")
    if (updateError) throw updateError
    void sendMembershipDM(discordId, { title: "Geschenk angenommen", description: `Deine **${plan.name}** wurde aktiviert. Viel Spaß bei Rex’s Diner!`, color: 0x3DDC97 })
    return NextResponse.json({ message: "Dein Geschenk wurde angenommen und aktiviert." })
  } catch (error) {
    console.error("[membership-gifts] POST failed", error)
    const details = error instanceof Error ? error.message : "Unbekannter Datenbankfehler."
    return NextResponse.json({ error: `Geschenk konnte nicht verarbeitet werden: ${details}` }, { status: 500 })
  }
}
