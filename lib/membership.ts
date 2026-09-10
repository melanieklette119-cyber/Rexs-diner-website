import { createClient } from "@/lib/supabase/server"

export type MembershipPlan = {
  id: string
  name: string
  description: string
  price: number
  billing_interval: "daily" | "weekly" | "monthly"
  min_duration_months: number
  cancellation_notice_months: number
  newcomer_only: boolean
  includes_discount: boolean
  discount_percent: number | null
  active: boolean
}

export async function getMembershipPlans() {
  const supabase = await createClient()
  if (!supabase) throw new Error("Supabase ist nicht verfügbar.")
  const { data, error } = await supabase.from("membership_plans").select("*").eq("active", true).order("price")
  if (error) throw error
  return (data ?? []) as MembershipPlan[]
}

export async function getMembershipPlan(id: string) {
  const supabase = await createClient()
  if (!supabase) throw new Error("Supabase ist nicht verfügbar.")
  const { data, error } = await supabase.from("membership_plans").select("*").eq("id", id).eq("active", true).single()
  if (error) throw error
  return data as MembershipPlan
}

export function addMonths(date: Date, months: number) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + Math.max(1, months))
  return result.toISOString()
}

export function addBillingInterval(date: Date, interval: MembershipPlan["billing_interval"]) {
  const result = new Date(date)
  if (interval === "daily") result.setDate(result.getDate() + 1)
  if (interval === "weekly") result.setDate(result.getDate() + 7)
  if (interval === "monthly") result.setMonth(result.getMonth() + 1)
  return result.toISOString()
}

export function validateMembershipFields(input: Record<string, unknown>) {
  const fullName = String(input.fullName ?? "").trim()
  const discordId = String(input.discordId ?? "").trim()
  const bankAccountId = String(input.bankAccountId ?? "").trim()
  if (fullName.length < 2 || fullName.length > 120) throw new Error("Bitte einen gültigen Namen angeben.")
  if (!/^[0-9]{5,32}$/.test(discordId)) throw new Error("Bitte eine gültige Discord-ID angeben.")
  if (bankAccountId.length < 2 || bankAccountId.length > 80) throw new Error("Bitte eine gültige FiveM-Bankkonto-ID angeben.")
  return { fullName, discordId, bankAccountId }
}

export function makeDiscountCode() {
  return `MITGLIED-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`
}

export function getDiscordIdFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? ""
  const suffix = cookie.match(/(?:^|;\s*)discord_current_suffix=([^;]+)/)?.[1]
  if (!suffix) return null
  return cookie.match(new RegExp(`(?:^|;\\s*)discord_id_${suffix}=([^;]+)`))?.[1] ?? null
}