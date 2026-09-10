import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, startDate, endDate, reason } = body || {}

    if (!userId || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: "Missing required fields: userId, startDate, endDate, reason" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Supabase ist nicht verfügbar." }, { status: 503 })
    const { data, error } = await supabase
      .from("vacation_requests")
      .insert({
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        status: "Ausstehend",
      })
      .select()
      .single()

    if (error) {
      console.error("Supabase insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Supabase ist nicht verfügbar." }, { status: 503 })
    const { data, error } = await supabase
      .from("vacation_requests")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Supabase select error:", error)
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
