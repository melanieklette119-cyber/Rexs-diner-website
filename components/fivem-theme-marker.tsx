"use client"

import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

export function FiveMThemeMarker() {
  const searchParams = useSearchParams()
  const isFiveM = searchParams.get("fivem") === "1"

  useEffect(() => {
    const root = document.documentElement
    const hasFiveMParam = searchParams.get("fivem") === "1"
    const isFiveMContext = hasFiveMParam || sessionStorage.getItem("rex-fivem-context") === "1"

    if (isFiveMContext) {
      sessionStorage.setItem("rex-fivem-context", "1")
    }

    root.classList.toggle("fivem-compat", isFiveMContext)
  }, [isFiveM, searchParams])

  return null
}
