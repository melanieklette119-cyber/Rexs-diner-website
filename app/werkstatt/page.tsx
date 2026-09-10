"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Wrench,
  Truck,
  Settings,
  ArrowRight,
  Plus,
  Minus,
  ShoppingBag,
  LogIn,
  CheckCircle,
} from "lucide-react"
import { saveWerkstattOrder, getDiscountCodes, updateDiscountCode, type DiscountCode } from "@/lib/user-data"
import { getDiscordSession } from "@/lib/discord-session"

type Service = {
  id: number
  name: string
  description: string
  price: number
  icon: typeof Wrench
  features: string[]
}

type CartItem = {
  id: number
  name: string
  price: number
  quantity: number
}

const SERVICES: Service[] = [
  {
    id: 101,
    name: "Reparatur",
    description:
      "Professionelle Fahrzeugreparaturen aller Art. Egal ob Motor, Getriebe, Bremsen oder Karosserie - wir bringen Ihr Fahrzeug wieder in Schuss.",
    price: 800,
    icon: Wrench,
    features: [
      "Motordiagnose & Instandsetzung",
      "Bremsen & Fahrwerk",
      "Karosseriearbeiten",
      "Elektronik & Fehlersuche",
    ],
  },
  {
    id: 102,
    name: "Wartung",
    description:
      "Regelmässige Wartung verlängert die Lebensdauer Ihres Fahrzeugs. Unser Rundum-Service sorgt dafür, dass Ihr Auto immer in Top-Zustand bleibt.",
    price: 6500,
    icon: Settings,
    features: [
      "Ölwechsel & Filterwechsel",
      "Inspektion nach Herstellervorgaben",
      "Flüssigkeiten prüfen & nachfüllen",
      "Verschleissteile kontrollieren",
    ],
  },
  {
    id: 103,
    name: "Abschleppung",
    description:
      "Schneller und zuverlässiger Abschleppservice. Wir holen Ihr Fahrzeug ab und bringen es sicher in unsere Werkstatt.",
    price: 200,
    icon: Truck,
    features: [
      "24/7 erreichbar",
      "Schnelle Reaktionszeiten",
      "Sichere Fahrzeugbergung",
      "Transport zur Werkstatt",
    ],
  },
  {
    id: 104,
    name: "Rundum-sorglos-Pack",
    description:
      "Unser Komplett-Paket enthält Reparatur, Wartung und Abschleppung zum festen Paketpreis.",
    price: 7000,
    icon: Wrench,
    features: [
      "Komplette Fahrzeugreparatur",
      "Umfassende Wartung",
      "Abschleppung inklusive",
      "Ein fester Paketpreis",
    ],
  },
]

export default function WerkstattPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [discordUser, setDiscordUser] = useState<{
    id: string
    username: string
    avatar: string
  } | null>(null)
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    vehicleInfo: "",
    notes: "",
    pickupAddress: "",
  })

  // discount code states
  const [discountCode, setDiscountCode] = useState("")
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string
    percent: number
    remainingUsages: number
    maxUsages: number
  } | null>(null)
  const [discountError, setDiscountError] = useState("")
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([])

  // dialog state for towing service
  const [towDialogOpen, setTowDialogOpen] = useState(false)
  const [pendingService, setPendingService] = useState<Service | null>(null)

  useEffect(() => {
    const session = getDiscordSession()
    if (session) {
      setDiscordUser(session)
      setCustomerInfo((prev) => ({
        ...prev,
        name: session.username || prev.name,
      }))
    }
  }, [])

  // load discount codes once on mount
  useEffect(() => {
    const load = async () => {
      const codes = await getDiscountCodes()
      setDiscountCodes(codes)
    }
    load()
  }, [])

  if (!discordUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 bg-card border-border">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-[#5865F2]/10 flex items-center justify-center mx-auto">
              <LogIn className="h-10 w-10 text-[#5865F2]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-card-foreground mb-2">
                Discord Anmeldung erforderlich
              </h2>
              <p className="text-muted-foreground">
                Um einen Werkstatt-Service zu buchen, melden Sie sich bitte mit
                Ihrem Discord-Account an.
              </p>
            </div>
            <Button
              onClick={() => {
                window.location.href = "/api/auth/discord?returnTo=/werkstatt"
              }}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white py-6 text-lg"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Mit Discord anmelden
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const addToCart = (service: Service) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === service.id)
      if (existing) {
        return prev.map((item) =>
          item.id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        { id: service.id, name: service.name, price: service.price, quantity: 1 },
      ]
    })
  }

  // update tow price depending on whether a repair is in the cart
  const adjustTowPrice = (items: CartItem[]) => {
    const hasRepair = items.some((i) => i.id === 101)
    return items.map((item) => {
      if (item.id === 103) {
        const desired = hasRepair ? 100 : 200
        if (item.price !== desired) {
          return { ...item, price: desired }
        }
      }
      return item
    })
  }

  const addTowToCart = () => {
    const tow = SERVICES.find((s) => s.id === 103)
    if (!tow) return
    setCart((prev) => {
      const hasRepair = prev.some((i) => i.id === 101)
      const existing = prev.find((item) => item.id === tow.id)
      if (existing) {
        // increment quantity
        return adjustTowPrice(
          prev.map((item) =>
            item.id === tow.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        )
      }
      return adjustTowPrice([
        ...prev,
        { id: tow.id, name: tow.name, price: hasRepair ? 100 : 200, quantity: 1 },
      ])
    })
  }

  const handleServiceClick = (service: Service) => {
    // when towing is selected, ask for confirmation before adding
    if (service.id === 103) {
      setPendingService(service)
      setTowDialogOpen(true)
    } else {
      addToCart(service)
    }
  }

  const confirmTow = () => {
    if (!pendingService) return

    // add tow (will be adjusted if repair gets added below)
    addTowToCart()

    // add a repair if none is already in the cart
    setCart((prev) => {
      let updated = [...prev]
      if (!updated.some((i) => i.id === 101)) {
        const repairService = SERVICES.find((s) => s.id === 101)
        if (repairService) {
          updated.push({
            id: repairService.id,
            name: repairService.name,
            price: repairService.price,
            quantity: 1,
          })
        }
      }
      return adjustTowPrice(updated)
    })

    setTowDialogOpen(false)
    setPendingService(null)
  }

  const cancelTow = () => {
    // user cancelled dialog but still wants towing, no repair added
    addTowToCart()
    setTowDialogOpen(false)
    setPendingService(null)
  }

  const validateAndApplyDiscount = async () => {
    setDiscountError("")

    if (!discountCode.trim()) {
      setDiscountError("Bitte einen Code eingeben")
      return
    }

    const code = discountCodes.find((c) => c.code === discountCode.toUpperCase())

    if (!code) {
      setDiscountError("Rabattcode nicht gefunden")
      return
    }

    if (code.active === false) {
      setDiscountError("Dieser Code wurde deaktiviert")
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const validUntilDate = new Date(code.validUntil)
    validUntilDate.setHours(0, 0, 0, 0)

    if (validUntilDate < today) {
      setDiscountError("Dieser Code ist abgelaufen")
      return
    }

    if (code.usageCount >= code.maxUsages) {
      setDiscountError("Maximale Verwendungen für diesen Code erreicht")
      return
    }

    const remainingUsages = code.maxUsages - code.usageCount - 1
    setAppliedDiscount({
      code: code.code,
      percent: code.discountPercent,
      remainingUsages: remainingUsages,
      maxUsages: code.maxUsages,
    })
    setDiscountError("")

    // Update usage count in Supabase
    await updateDiscountCode(code.id, {
      usageCount: code.usageCount + 1,
    })

    // Update local state
    const updatedCodes = discountCodes.map((c) =>
      c.id === code.id ? { ...c, usageCount: c.usageCount + 1 } : c
    )
    setDiscountCodes(updatedCodes)
  }

  const removeDiscount = async () => {
    if (appliedDiscount) {
      const code = discountCodes.find((c) => c.code === appliedDiscount.code)
      if (code) {
        // Update usage count in Supabase
        await updateDiscountCode(code.id, {
          usageCount: Math.max(0, code.usageCount - 1),
        })

        // Update local state
        const updatedCodes = discountCodes.map((c) =>
          c.id === code.id ? { ...c, usageCount: Math.max(0, c.usageCount - 1) } : c
        )
        setDiscountCodes(updatedCodes)
      }
    }
    setAppliedDiscount(null)
    setDiscountCode("")
    setDiscountError("")
  }

  const removeFromCart = (id: number) => {
    setCart((prev) => {
      let updated: CartItem[]
      const existing = prev.find((item) => item.id === id)
      if (existing && existing.quantity > 1) {
        updated = prev.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
      } else {
        updated = prev.filter((item) => item.id !== id)
      }
      return adjustTowPrice(updated)
    })
  }

  const setCartQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => adjustTowPrice(prev.filter((item) => item.id !== id)))
      return
    }
    setCart((prev) =>
      adjustTowPrice(
        prev.map((item) => (item.id === id ? { ...item, quantity } : item))
      )
    )
  }

  const getSubtotal = () =>
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const getDiscountAmount = () => {
    if (!appliedDiscount) return 0
    return Math.floor(getSubtotal() * (appliedDiscount.percent / 100))
  }

  const getTotal = () => getSubtotal() - getDiscountAmount()

  const sendDiscordNotification = async (orderData: Record<string, unknown>) => {
    try {
      await fetch("/api/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "new_order", data: orderData }),
      })
    } catch (error) {
      console.error("Failed to send Discord notification:", error)
    }
  }

  // send a confirmation DM via the Discord API
  // type can be either the generic order confirmation or a special werkstatt variant
  const sendUserConfirmationDM = async (
    discordId: string,
    orderDetails: any,
    type: "order_confirmation_dm" | "werkstatt_confirmation_dm" = "order_confirmation_dm"
  ) => {
    try {
      await fetch("/api/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          data: { discordUserId: discordId, order: orderDetails },
        }),
      })
    } catch (error) {
      console.error("Failed to send confirmation DM:", error)
    }
  }

  const handleCheckout = async () => {
    const requiresAddress = cart.some(i => i.name.toLowerCase().includes("abschlepp"))
    if (
      cart.length === 0 ||
      !customerInfo.name ||
      !customerInfo.vehicleInfo ||
      (requiresAddress && !customerInfo.pickupAddress)
    ) return

    const order = {
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price.toString(),
        quantity: item.quantity,
      })),
      customer_name: customerInfo.name,
      customer_email: discordUser.id,
      customer_phone: customerInfo.phone,
      total: getTotal(),
      discount_code: appliedDiscount?.code || null,
      discount_percent: appliedDiscount?.percent || 0,
      status: "Neu",
      // Keep the saved 'notes' field minimal (only the user's free-text note).
      notes: customerInfo.notes || "",
    }

    const savedOrder = await saveWerkstattOrder(order)

    if (!savedOrder) {
      alert("Fehler beim Speichern der Buchung. Bitte versuchen Sie es erneut.")
      return
    }

    const fullOrder = {
      ...order,
      id: savedOrder.id,
      customerInfo: {
        name: customerInfo.name,
        discordId: discordUser.id,
        phone: customerInfo.phone,
        pickupAddress: customerInfo.pickupAddress,
        vehicleInfo: customerInfo.vehicleInfo,
      },
    }

    // channel notification
    await sendDiscordNotification(fullOrder)
    // DM confirmation to user using the werkstatt-specific embed style
    if (discordUser.id) {
      await sendUserConfirmationDM(discordUser.id, fullOrder, "werkstatt_confirmation_dm")
    }

    alert("Werkstatt-Buchung erfolgreich aufgegeben!")

    setCart([])
    setCustomerInfo({ name: discordUser.username, phone: "", vehicleInfo: "", notes: "", pickupAddress: "" })
    setShowCheckout(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <Dialog
        open={towDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTowDialogOpen(false)
            setPendingService(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abschleppung bestätigen</DialogTitle>
            <DialogDescription>
              Möchtest du, dass wir dich zu unserer Werkstatt abschleppen? Wenn
              ja, drücke unten auf den Button. Eine Reparatur wird automatisch
              in den Warenkorb gelegt, falls noch keine vorhanden ist. Bei
              gleichzeitiger Reparatur kostet die Abschleppung nur 100 €.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelTow}
            >
              Abbrechen (nur Abschleppung)
            </Button>
            <Button onClick={confirmTow}>Mit Reparatur (Abschleppung 100 €)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">
            Rex Repair
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Professioneller Fahrzeugservice direkt bei Rex Diner. Schnell,
            zuverlässig und fair.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Services */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-8 bg-primary rounded-full" />
                <h2 className="text-2xl font-bold text-foreground">
                  Was bieten wir an?
                </h2>
              </div>

              <div className="space-y-6">
                {SERVICES.map((service) => {
                  const Icon = service.icon
                  return (
                    <Card
                      key={service.id}
                      className="bg-card border-border hover:shadow-lg transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Icon className="h-6 w-6 text-primary" />
                              </div>
                              <h3 className="text-xl font-bold text-card-foreground">
                                {service.name}
                              </h3>
                            </div>
                            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                              {service.description}
                            </p>
                            <ul className="space-y-1.5">
                              {service.features.map((feature) => (
                                <li
                                  key={feature}
                                  className="flex items-center gap-2 text-sm text-muted-foreground"
                                >
                                  <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-2xl font-bold text-primary mb-3">
                              ${service.price.toLocaleString("de-DE")}
                            </p>
                            <Button
                              onClick={() => handleServiceClick(service)}
                              className="bg-primary hover:bg-primary/80 text-primary-foreground"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Buchen
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Warenkorb / Buchung */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Ihre Buchung
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Noch keine Services ausgewählt</p>
                    <p className="text-sm">
                      Wählen Sie einen Service, um zu buchen
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center py-2 border-b border-border"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-card-foreground">
                            {item.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            ${item.price.toLocaleString("de-DE")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              setCartQuantity(
                                item.id,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-16 text-center"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              addToCart(
                                SERVICES.find((s) => s.id === item.id)!
                              )
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-border pt-4 mt-4">
                  <div className="space-y-2 mb-4">
                    {appliedDiscount && (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-green-800">
                            Code: <span className="font-mono">{appliedDiscount.code}</span>
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={removeDiscount}
                            className="h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        </div>
                        <div className="text-xs text-green-700">
                          -{appliedDiscount.percent}% Rabatt = -€{getDiscountAmount()}
                        </div>
                        <div className="text-xs text-green-600 mt-2 font-medium">
                          Noch {appliedDiscount.remainingUsages}x verwendbar
                        </div>
                      </div>
                    )}
                    {!appliedDiscount && (
                      <div className="space-y-2">
                        <Label htmlFor="discount-code" className="text-sm">
                          Rabattcode (optional)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="discount-code"
                            placeholder="Rabattcode eingeben..."
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                            onKeyPress={(e) =>
                              e.key === "Enter" && validateAndApplyDiscount()
                            }
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={validateAndApplyDiscount}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Anwenden
                          </Button>
                        </div>
                        {discountError && (
                          <p className="text-xs text-destructive">{discountError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-card-foreground">
                      Gesamt:
                    </span>
                    <span className="text-xl font-bold text-primary">
                      ${getTotal().toLocaleString("de-DE")}
                    </span>
                  </div>

                  {showCheckout && cart.length > 0 && (
                    <div className="space-y-4 mb-4">
                      {/* Discord user info */}
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/30">
                        {discordUser.avatar ? (
                          <img
                            src={discordUser.avatar}
                            alt={discordUser.username}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold">
                            {discordUser.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {discordUser.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ID: {discordUser.id}
                          </p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>

                      <div>
                        <Label htmlFor="werkstatt-name">Name *</Label>
                        <Input
                          id="werkstatt-name"
                          value={customerInfo.name}
                          onChange={(e) =>
                            setCustomerInfo({
                              ...customerInfo,
                              name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="werkstatt-phone">Telefon</Label>
                        <Input
                          id="werkstatt-phone"
                          value={customerInfo.phone}
                          onChange={(e) =>
                            setCustomerInfo({
                              ...customerInfo,
                              phone: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="werkstatt-vehicle">
                          Fahrzeuginfo *
                        </Label>
                        <Input
                          id="werkstatt-vehicle"
                          value={customerInfo.vehicleInfo}
                          onChange={(e) =>
                            setCustomerInfo({
                              ...customerInfo,
                              vehicleInfo: e.target.value,
                            })
                          }
                          placeholder="z.B. Marke, Modell, Kennzeichen"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="werkstatt-notes">
                          Weitere Infos (optional)
                        </Label>
                        <Textarea
                          id="werkstatt-notes"
                          value={customerInfo.notes}
                          onChange={(e) =>
                            setCustomerInfo({
                              ...customerInfo,
                              notes: e.target.value,
                            })
                          }
                          placeholder="Beschreiben Sie das Problem..."
                          rows={3}
                        />
                      </div>
                      {cart.some(i => i.name.toLowerCase().includes("abschlepp")) && (
                        <div>
                          <Label htmlFor="werkstatt-address">
                            Abholadresse *
                          </Label>
                          <Input
                            id="werkstatt-address"
                            value={customerInfo.pickupAddress}
                            onChange={(e) =>
                              setCustomerInfo({
                                ...customerInfo,
                                pickupAddress: e.target.value,
                              })
                            }
                            placeholder="Wo soll abgeschleppt werden?"
                            required
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {cart.length > 0 && !showCheckout && (
                    <Button
                      onClick={() => setShowCheckout(true)}
                      className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
                    >
                      Zur Buchung
                    </Button>
                  )}

                  {showCheckout && (
                    <div className="space-y-2">
                      <Button
                        onClick={handleCheckout}
                        className="w-full bg-accent hover:bg-accent/80 text-accent-foreground"
                        disabled={
                          !customerInfo.name || !customerInfo.vehicleInfo ||
                          (cart.some(i => i.name.toLowerCase().includes("abschlepp")) && !customerInfo.pickupAddress)
                        }
                      >
                        Buchung aufgeben
                      </Button>
                      <Button
                        onClick={() => setShowCheckout(false)}
                        variant="outline"
                        className="w-full"
                      >
                        Zurück
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
