import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const returnTo = searchParams.get("returnTo") || "/bestellen"

  // Try service role first, fall back to anon key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log("[v0] Discord auth - supabaseUrl:", !!supabaseUrl, "supabaseKey:", !!supabaseKey)
  
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Datenbankverbindung fehlgeschlagen. Env vars fehlen." }, { status: 500 })
  }
  
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from("website_config")
    .select("config_value")
    .eq("config_key", "discord_bot")
    .single()

  console.log("[v0] Discord auth - config query result:", JSON.stringify(data), "error:", JSON.stringify(error))

  if (error || !data) {
    return NextResponse.json({ error: "Discord Bot Konfiguration nicht gefunden." }, { status: 500 })
  }

  let discordBotConfig = data.config_value
  if (typeof discordBotConfig === "string") {
    try {
      discordBotConfig = JSON.parse(discordBotConfig)
    } catch {
      return NextResponse.json({ error: "Ungültige Discord Bot Konfiguration." }, { status: 500 })
    }
  }

  const clientId = discordBotConfig?.clientId
  const botToken = discordBotConfig?.token || process.env.DISCORD_BOT_TOKEN

  if (!clientId) {
    return NextResponse.json({ error: "Discord Client ID nicht konfiguriert. Bitte in der Admin-Seite unter Discord Bot eintragen." }, { status: 500 })
  }

  if (botToken) {
    await fetch("https://discord.com/api/v10/applications/@me", {
      method: "PATCH",
      headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Rex's Diner ⌯ Verwaltung" }),
    })
    await fetch(`https://discord.com/api/v10/applications/${clientId}/role-connections/metadata`, {
      method: "PUT",
      headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        { key: "verified", name: "Website verifiziert", description: "Discord-Konto ist mit Rex's Diner & Repair verknüpft.", type: 7 },
        { key: "member", name: "Website-Mitglied", description: "Discord-Konto besitzt einen Website-Account.", type: 7 },
      ]),
    })
  }

  const requestUrl = new URL(request.url)
  const configuredOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : requestUrl.origin
  const redirectUri = `${configuredOrigin}/api/auth/discord/callback`
  const discordAuthUrl = new URL("https://discord.com/oauth2/authorize")
  discordAuthUrl.searchParams.set("client_id", clientId)
  discordAuthUrl.searchParams.set("redirect_uri", redirectUri)
  discordAuthUrl.searchParams.set("response_type", "code")
  discordAuthUrl.searchParams.set("scope", "identify")
  discordAuthUrl.searchParams.set("state", returnTo)
  discordAuthUrl.searchParams.set("prompt", "consent")

  return NextResponse.redirect(discordAuthUrl)
}
