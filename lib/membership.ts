import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

const DISCORD_API = "https://discord.com/api/v10"

export async function sendMembershipDM(discordId: string, content: string) {
  if (!discordId || !content) return false
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) return false
    const configClient = createClient(supabaseUrl, supabaseKey)
    const { data } = await configClient.from("website_config").select("config_key, config_value").eq("config_key", "discord_bot").maybeSingle()
    const token = String((data?.config_value as { token?: string } | null)?.token ?? "")
    if (!token) return false
    const channelResponse = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: discordId }),
    })
    if (!channelResponse.ok) return false
    const channel = await channelResponse.json() as { id?: string }
    if (!channel.id) return false
    const messageResponse = await fetch(`${DISCORD_API}/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    return messageResponse.ok
  } catch (error) {
    console.error("[memberships] DM notification failed", error)
    return false
  }
}

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
  const supabase = await createServerClient()
  if (!supabase) throw new Error("Supabase ist nicht verfügbar.")
  const { data, error } = await supabase.from("membership_plans").select("*").eq("active", true).order("price")
  if (error) throw error
  return (Array.isArray(data) ? data : []) as MembershipPlan[]
}

export async function getMembershipPlan(id: string) {
  const supabase = await createServerClient()
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

function readCookie(cookieHeader: string, name: string) {
  const value = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}=([^;]*)`))?.[1]
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function getDiscordIdFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? ""
  const suffix = readCookie(cookie, "discord_current_suffix")
  if (!suffix) return null
  return readCookie(cookie, `discord_id_${suffix}`)
}
