import { type NextRequest, NextResponse } from "next/server"
import { verifyFiveMToken } from "@/lib/fivem-auth"

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || ""
  const session = verifyFiveMToken(token)

  if (!session) {
    return NextResponse.json({ error: "Der FiveM-Login ist abgelaufen oder ungültig." }, { status: 401 })
  }

  const suffix = crypto.randomUUID()
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/"
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/"
  const destination = new URL(safeReturnTo, request.url)
  destination.searchParams.set("fivem", "1")
  const response = NextResponse.redirect(destination)
  const cookieOptions = {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none" as const,
    maxAge: 60 * 60 * 12,
    path: "/",
  }

  response.cookies.set("discord_current_suffix", suffix, cookieOptions)
  response.cookies.set(`discord_id_${suffix}`, session.discordId, cookieOptions)
  response.cookies.set(`discord_username_${suffix}`, session.username, cookieOptions)
  response.cookies.set(`discord_avatar_${suffix}`, "", cookieOptions)

  return response
}
