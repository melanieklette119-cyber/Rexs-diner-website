import { NextResponse } from "next/server"
import { getAllRanks } from "@/lib/user-data"

export async function GET() {
  const ranks = await getAllRanks()
  return NextResponse.json(
    Object.values(ranks)
      .filter((rank) => rank.name.trim().toLowerCase() !== "suspendiert")
      .sort((a, b) => b.level - a.level),
    { headers: { "Cache-Control": "no-store" } },
  )
}
