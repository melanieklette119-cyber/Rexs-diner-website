import { createHmac, timingSafeEqual } from "crypto"

const TOKEN_TTL_SECONDS = 60

type FiveMTokenPayload = {
  discordId: string
  username: string
  expiresAt: number
}

function getSecret() {
  return process.env.FIVEM_AUTH_SECRET || process.env.MEMBERSHIP_CRON_SECRET || ""
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

export function createFiveMToken(discordId: string, username: string) {
  const secret = getSecret()
  if (!secret) return null

  const payload = Buffer.from(JSON.stringify({
    discordId,
    username: username || "FiveM Spieler",
    expiresAt: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  })).toString("base64url")

  return `${payload}.${sign(payload, secret)}`
}

export function verifyFiveMToken(token: string): FiveMTokenPayload | null {
  const secret = getSecret()
  const [payload, signature] = token.split(".")
  if (!secret || !payload || !signature) return null

  const expected = sign(payload, secret)
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as FiveMTokenPayload
    if (!/^\d{17,20}$/.test(parsed.discordId) || parsed.expiresAt < Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}

export function getFiveMAuthSecret() {
  return getSecret()
}
