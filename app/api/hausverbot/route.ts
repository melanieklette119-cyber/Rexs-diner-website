import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Supabase ist nicht verfügbar." }, { status: 503 })
    const { data, error } = await supabase
      .from("hausverbote")
      .select("*")
      .order("timestamp", { ascending: false })

    if (error) {
      console.error("Supabase select error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { who, reason, fromDate, toDate, duration, photo, employee: payloadEmployee, timestamp } = body || {}

    if (!who || !reason) {
      return NextResponse.json({ error: "Missing required fields: who, reason" }, { status: 400 })
    }

    let finalFrom: string | null = fromDate ?? null
    let finalTo: string | null = toDate ?? null

    if ((!finalFrom || !finalTo) && duration) {
      const match = String(duration).match(/(\d+)/)
      const days = match ? parseInt(match[1], 10) : null
      if (!finalFrom) finalFrom = new Date().toISOString().split("T")[0]
      if (days != null) {
        const fromObj = new Date(finalFrom)
        const toObj = new Date(fromObj)
        toObj.setDate(toObj.getDate() + days)
        finalTo = toObj.toISOString().split("T")[0]
      }
    }

    if (!finalFrom || !finalTo) {
      return NextResponse.json({ error: "Missing required fields: fromDate, toDate" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Supabase ist nicht verfügbar." }, { status: 503 })
    // Try to get authenticated user, but fall back to provided employee in payload
    let employee: string | null = null
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (!authError && authData?.user) {
        employee = authData.user.email ?? authData.user.id ?? null
      }
    } catch (e) {
      // ignore auth errors; we'll use payloadEmployee if provided
    }

    if (!employee) {
      employee = payloadEmployee ?? null
    }

    const payload = {
      who,
      reason,
      fromDate: finalFrom,
      toDate: finalTo,
      photo: photo || null,
      employee: employee,
      timestamp: timestamp || Date.now(),
    }

    const { data, error } = await supabase.from("hausverbote").insert([payload]).select()

    if (error) {
      console.error("Supabase insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    let id = searchParams.get("id")

    if (!id) {
      const body = await request.json().catch(() => ({}))
      id = body.id
    }

    if (!id) {
      return NextResponse.json({ error: "Missing id for delete" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Supabase ist nicht verfügbar." }, { status: 503 })
    const { data, error } = await supabase.from("hausverbote").delete().eq("id", Number(id))

    if (error) {
      console.error("Supabase delete error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
