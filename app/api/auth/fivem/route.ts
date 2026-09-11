import { type NextRequest, NextResponse } from "next/server"
import { verifyFiveMToken } from "@/lib/fivem-auth"

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || ""
  const session = verifyFiveMToken(token)

  if (!session) {
    return NextResponse.json({ error: "Der FiveM-Login ist abgelaufen oder ungültig." }, { status: 401 })
  }

  const suffix = crypto.randomUUID()
  const response = NextResponse.redirect(new URL("/bestellen?fivem=1", request.url))
  const cookieOptions = {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 12,
    path: "/",
  }

  response.cookies.set("discord_current_suffix", suffix, cookieOptions)
  response.cookies.set(`discord_id_${suffix}`, session.discordId, cookieOptions)
  response.cookies.set(`discord_username_${suffix}`, session.username, cookieOptions)
  response.cookies.set(`discord_avatar_${suffix}`, "", cookieOptions)

  return response
}
