"use client"

import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

export function FiveMThemeMarker() {
  const searchParams = useSearchParams()
  const isFiveM = searchParams.get("fivem") === "1"

  useEffect(() => {
    document.documentElement.classList.toggle("fivem-compat", isFiveM)
    return () => document.documentElement.classList.remove("fivem-compat")
  }, [isFiveM])

  return null
}
