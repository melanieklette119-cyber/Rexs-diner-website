'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function AlertPopout() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const originalAlert = window.alert
    const originalConfirm = window.confirm
    window.alert = (nextMessage?: unknown) => {
      setMessage(String(nextMessage ?? ""))
    }
    window.confirm = (nextMessage?: string) => {
      setMessage(String(nextMessage ?? ""))
      return true
    }

    return () => {
      window.alert = originalAlert
      window.confirm = originalConfirm
    }
  }, [])

  return (
    <Dialog open={message !== null} onOpenChange={(open) => !open && setMessage(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rex&apos;s Diner</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap text-base text-foreground">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setMessage(null)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
