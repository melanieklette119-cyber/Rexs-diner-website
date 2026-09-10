import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  addBillingInterval,
  addMonths,
  getDiscordIdFromRequest,
  getMembershipPlans,
  getMembershipPlan,
  makeDiscountCode,
  validateMembershipFields,
} from "@/lib/membership"

export async function GET(request: Request) {
  try {
    const discordId = getDiscordIdFromRequest(request)
    const url = new URL(request.url)

    if (url.searchParams.get("mine") === "true") {
      if (!discordId) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 })

      const supabase = await createClient()
      if (!supabase) throw new Error("Supabase ist nicht verfügbar.")

      const { data, error } = await supabase
        .from("membership_contracts")
        .select("*, membership_plans(*)")
        .eq("user_id", discordId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return NextResponse.json({ contracts: data ?? [] })
    }

    return NextResponse.json({ plans: await getMembershipPlans() })
  } catch (error) {
    console.error("[memberships] GET failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mitgliedschaften konnten nicht geladen werden." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const discordId = getDiscordIdFromRequest(request)

    if (!discordId) {
      return NextResponse.json({ error: "Bitte zuerst mit Discord anmelden." }, { status: 401 })
    }

    const body = await request.json()

    console.log("Membership body:", body)
    console.log("Discord:", discordId)

    const planId = String(body.planId ?? "").trim()

    if (!planId) {
      return NextResponse.json({ error: "Bitte zuerst eine Mitgliedschaft auswählen." }, { status: 400 })
    }

    const plan = await getMembershipPlan(planId)

    if (body.discordId && String(body.discordId).trim() !== discordId) {
      return NextResponse.json(
        { error: "Die Discord-ID passt nicht zur Sitzung. Bitte die Seite neu laden." },
        { status: 403 }
      )
    }

    const fields = validateMembershipFields({ ...body, discordId })

    const supabase = await createClient()
    if (!supabase) throw new Error("Supabase ist nicht verfügbar.")

    const now = new Date()
    const months = Math.max(1, plan.min_duration_months)

    const { data: contract, error } = await supabase
      .from("membership_contracts")
      .insert({
        user_id: discordId,
        plan_id: plan.id,
        full_name: fields.fullName,
        discord_id: fields.discordId,
        fivem_bank_account_id: fields.bankAccountId,
        minimum_end_at: addMonths(now, months),
        next_charge_at: addBillingInterval(now, plan.billing_interval),
        billing_interval: plan.billing_interval,
      })
      .select()
      .single()

    if (error) {
      console.error("Supabase insert error:", error)
      throw error
    }

    if (plan.includes_discount && plan.discount_percent && contract) {
      await supabase.from("membership_discount_codes").insert({
        contract_id: contract.id,
        code: makeDiscountCode(),
        discount_percent: plan.discount_percent,
      })
    }

    return NextResponse.json({ contract }, { status: 201 })
  } catch (error) {
    console.error("[memberships] POST failed", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Vertrag konnte nicht erstellt werden.",
      },
      { status: 400 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const discordId = getDiscordIdFromRequest(request)

    if (!discordId) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 })
    }

    const body = await request.json()
    const supabase = await createClient()

    if (!supabase) throw new Error("Supabase ist nicht verfügbar.")

    const { data: contract, error: readError } = await supabase
      .from("membership_contracts")
      .select("*, membership_plans(*)")
      .eq("id", body.contractId)
      .eq("user_id", discordId)
      .single()

    if (readError || !contract) {
      return NextResponse.json({ error: "Mitgliedschaft nicht gefunden." }, { status: 404 })
    }

    if (body.action === "cancel") {
      const minimumEnd = new Date(contract.minimum_end_at)

      if (minimumEnd > new Date()) {
        return NextResponse.json(
          { error: `Kündigung ist erst ab ${minimumEnd.toLocaleDateString("de-DE")} möglich.` },
          { status: 409 }
        )
      }

      const { error } = await supabase
        .from("membership_contracts")
        .update({
          status: "pending_cancellation",
          cancellation_requested_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id)
        .eq("user_id", discordId)

      if (error) throw error

      return NextResponse.json({ ok: true })
    }

    const plan = await getMembershipPlan(String(body.planId ?? ""))

    const { error } = await supabase
      .from("membership_contracts")
      .update({
        plan_id: plan.id,
        billing_interval: plan.billing_interval,
        next_charge_at: addBillingInterval(new Date(), plan.billing_interval),
        updated_at: new Date().toISOString(),
      })
      .eq("id", contract.id)
      .eq("user_id", discordId)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[memberships] PATCH failed", error)

    return NextResponse.json(
      { error: "Änderung konnte nicht gespeichert werden." },
      { status: 400 }
    )
  }
}