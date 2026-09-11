import { NextResponse } from "next/server"
import { createFiveMToken, getFiveMAuthSecret } from "@/lib/fivem-auth"

export async function POST(request: Request) {
  const secret = getFiveMAuthSecret()
  if (!secret) return NextResponse.json({ error: "FiveM Auth ist nicht konfiguriert." }, { status: 503 })

  let body: { discordId?: string; username?: string; secret?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 })
  }

  if (body.secret !== secret || !/^\d{17,20}$/.test(body.discordId || "")) {
    return NextResponse.json({ error: "FiveM Auth abgelehnt." }, { status: 401 })
  }

  const token = createFiveMToken(body.discordId!, body.username || "FiveM Spieler")
  return token
    ? NextResponse.json({ token })
    : NextResponse.json({ error: "FiveM Auth ist nicht konfiguriert." }, { status: 503 })
}
