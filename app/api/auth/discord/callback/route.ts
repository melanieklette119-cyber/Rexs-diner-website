import { type NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const discordError = searchParams.get("error")
  const state = searchParams.get("state") || "/login"
  const safeState = state.startsWith("/") && !state.startsWith("//") ? state : "/login"

  // common cookie options for clearing data
  const deleteOptions = {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  }

  // clear any discord-related cookie present in the request
  const clearCookies = (res: NextResponse) => {
    for (const [name] of request.cookies) {
      if (name.startsWith("discord_")) {
        res.cookies.set(name, "", deleteOptions)
      }
    }
  }

  if (discordError || !code) {
    const errorCode = discordError === "access_denied" ? "discord_denied" : "no_code"
    const res = NextResponse.redirect(new URL(`${safeState}?error=${errorCode}`, request.url))
    clearCookies(res)
    return res
  }

  // Fetch discord_bot config - try service role first, fall back to anon key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log("[v0] Callback - supabaseUrl:", !!supabaseUrl, "supabaseKey:", !!supabaseKey)
  
  if (!supabaseUrl || !supabaseKey) {
    console.log("[v0] Missing Supabase credentials")
    const res = NextResponse.redirect(new URL(`${state}?error=db_error`, request.url))
    clearCookies(res)
    return res
  }
  
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

  const { data: configData, error: configError } = await supabase
    .from("website_config")
    .select("config_value")
    .eq("config_key", "discord_bot")
    .single()

  console.log("[v0] Discord config query result - data:", JSON.stringify(configData), "error:", JSON.stringify(configError))

  if (configError || !configData) {
    console.log("[v0] Discord config not found or error occurred")
    const res = NextResponse.redirect(new URL(`${state}?error=not_configured`, request.url))
    clearCookies(res)
    return res
  }

  let discordBotConfig = configData.config_value
  if (typeof discordBotConfig === "string") {
    try {
      discordBotConfig = JSON.parse(discordBotConfig)
    } catch {
      const res = NextResponse.redirect(new URL(`${state}?error=invalid_config`, request.url))
      clearCookies(res)
      return res
    }
  }

  const clientId = discordBotConfig?.clientId
  const botToken = discordBotConfig?.token
  const guildId = discordBotConfig?.guildId
  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  const redirectUri = `${new URL(request.url).origin}/api/auth/discord/callback`

  if (!clientId || !clientSecret) {
    const res = NextResponse.redirect(new URL(`${state}?error=not_configured`, request.url))
    clearCookies(res)
    return res
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Discord token error:", errorText)
      const res = NextResponse.redirect(new URL(`${state}?error=token_failed`, request.url))
      clearCookies(res)
      return res
    }

    const tokenData = await tokenResponse.json()

    // Get user info
    const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      const res = NextResponse.redirect(new URL(`${state}?error=user_failed`, request.url))
      clearCookies(res)
      return res
    }

    const userData = await userResponse.json()

    const updateDiscordRoleConnection = async () => {
      const metadata = {
        platform_name: "Rex's Diner SRP",
        platform_username: userData.username,
        metadata: {
          verified: "true",
          member: "true",
        },
      }

      const roleConnectionResponse = await fetch(
        `https://discord.com/api/v10/users/@me/applications/${clientId}/role-connection`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metadata),
        },
      )

      if (!roleConnectionResponse.ok) {
        console.error("Discord role connection update failed:", await roleConnectionResponse.text())
      }
    }

    await updateDiscordRoleConnection()

    const avatarUrl = userData.avatar
      ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
      : ""

    // if we have bot credentials, check membership and add if missing
    const DISCORD_API = "https://discord.com/api/v10"

    if (botToken && guildId) {
      try {
        // check if user is already a member
        const memberRes = await fetch(
          `${DISCORD_API}/guilds/${guildId}/members/${userData.id}`,
          {
            headers: { Authorization: `Bot ${botToken}` },
          }
        )

        if (memberRes.status === 404) {
          // not in guild yet, attempt to add
          const joinRes = await fetch(
            `${DISCORD_API}/guilds/${guildId}/members/${userData.id}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bot ${botToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ access_token: tokenData.access_token }),
            }
          )

          if (!joinRes.ok) {
            console.error("Discord guild join failed:", await joinRes.text())
          } else {
            console.log("Discord user added to guild", guildId)
          }
        }
      } catch (err) {
        console.error("Error checking/adding guild member:", err)
      }
    }

    const redirectUrl = new URL(safeState, request.url)
    const response = NextResponse.redirect(redirectUrl)

    // before setting new cookies take a fresh suffix and wipe the previous ones

    // Short-lived cookies (12 h). Pure session cookies (no maxAge) are
    // unreliable because modern browsers restore them via "Continue where
    // you left off" / session-restore.  A finite maxAge guarantees they
    // expire even when the browser keeps them across restarts.
    const TWELVE_HOURS = 60 * 60 * 12
    
    // Check if we're running on HTTPS
    const isSecure = request.url.startsWith("https://")
    console.log("[v0] Setting cookies - isSecure:", isSecure, "url:", request.url)
    
    const cookieOptions = {
      httpOnly: false,
      secure: isSecure,
      sameSite: "lax" as const,
      path: "/",
      maxAge: TWELVE_HOURS,
    }

    clearCookies(response)
    const newSuffix = Date.now().toString()
    response.cookies.set("discord_current_suffix", newSuffix, cookieOptions)

    // set discord data cookies for client
    response.cookies.set(`discord_id_${newSuffix}`, userData.id, cookieOptions)
    response.cookies.set(`discord_username_${newSuffix}`, userData.username, cookieOptions)
    response.cookies.set(`discord_avatar_${newSuffix}`, avatarUrl, cookieOptions)

    return response
  } catch (error) {
    console.error("Discord OAuth error:", error)
    const res = NextResponse.redirect(new URL(`${state}?error=server_error`, request.url))
    clearCookies(res)
    return res
  }
}
