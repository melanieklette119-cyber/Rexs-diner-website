"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ShoppingBag, Plus, Star, Minus, LogIn, CheckCircle } from "lucide-react"
import { getMenuItems, type MenuItem } from "@/lib/menu-data"
import { saveOrder, saveMenuRating, getMenuRatings, getDiscountCodes, updateDiscountCode, type MenuItemRating, type DiscountCode, getUserProfile, saveUserProfile, type UserProfile } from "@/lib/user-data"
import { getDiscordSession } from "@/lib/discord-session"

type CartItem = {
  id: number
  name: string
  price: string
  quantity: number
}

type Address = {
  id: string
  name: string
  deliveryCost: number
}

export default function BestellenPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [discordUser, setDiscordUser] = useState<{ id: string; username: string; avatar: string } | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    discordId: "",
    phone: "",
    address: "",
  })
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null)
  const [showSaveProfileDialog, setShowSaveProfileDialog] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<any>(null)
  const [availableAddresses] = useState<Address[]>([
    { id: "1", name: "Senora Way 3056 (Vorort)", deliveryCost: 0 },
    { id: "2", name: "Sinner ST 8047 (Landespolizei Teamstadt)", deliveryCost: 300 },
    { id: "3", name: "Elysian Fields FWY 93333 (Krankenhaus Teamstdt)", deliveryCost: 300 },
    { id: "4", name: "Hanger Way 9289 (Feuerwehr & Rettungswache Teamstadt)", deliveryCost: 300 },
    { id: "5", name: "Occupation Ave 7238 (Justizministerium Teamstadt)", deliveryCost: 300 },
    { id: "6", name: "Carcer Way 7204 (Autozentrum Teamstadt)", deliveryCost: 300 },
    { id: "7", name: "Mad Wayne Thunder DE 7227 (Perfomance Cars Teamstadt)", deliveryCost: 300 },
    { id: "8", name: "Marathon Ave 7224 (G&P Anwaltskanzlei Teamstadt)", deliveryCost: 300 },
    { id: "9", name: "San Andreas Ave 8054 (Würfelpark)", deliveryCost: 300 },
    { id: "10", name: "Weitere Folgen", deliveryCost: 300 },
  ])
  const [selectedAddressId, setSelectedAddressId] = useState<string>("")
  const [customAddress, setCustomAddress] = useState<string>("")
  const [tempCustomAddressInput, setTempCustomAddressInput] = useState<string>("")
  const [showCheckout, setShowCheckout] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState<number | null>(null)
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [discountCode, setDiscountCode] = useState("")
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number; remainingUsages: number; maxUsages: number } | null>(null)
  const [discountError, setDiscountError] = useState("")
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([])
  const [menuRatings, setMenuRatings] = useState<MenuItemRating[]>([])
  const [showMinimumOrderWarning, setShowMinimumOrderWarning] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      const items = await getMenuItems()
      setMenuItems(items)
      
      // Load discount codes from Supabase
      const codes = await getDiscountCodes()
      setDiscountCodes(codes)
      
      // Load menu ratings from Supabase
      const ratings = await getMenuRatings()
      setMenuRatings(ratings)
    }
    loadData()
  }, [])

  // Discord Session aus Cookies laden
  useEffect(() => {
    const loadSessionAndProfile = async () => {
      // Small delay to ensure cookies are available after redirect
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const session = getDiscordSession()
      if (session) {
        setDiscordUser(session)
        
        // Load user profile
        const profile = await getUserProfile(session.id)
        if (profile) {
          setOriginalProfile(profile)
          setCustomerInfo((prev) => ({
            ...prev,
            discordId: session.id,
            name: profile.full_name,
            phone: profile.phone,
          }))
        } else {
          setCustomerInfo((prev) => ({
            ...prev,
            discordId: session.id,
            name: session.username || prev.name,
          }))
        }
      }
      
      // Mark session check as complete
      setIsCheckingSession(false)
    }
    loadSessionAndProfile()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("fivem") !== "1") return

    setSelectedAddressId("1")
    setCustomerInfo((prev) => ({
      ...prev,
      address: "Senora Way 3056 (Vorort)",
    }))
  }, [])

  // Warten bis Session geprüft wurde
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Anmeldung wird geprüft...</p>
        </div>
      </div>
    )
  }

  // Wenn nicht eingeloggt, Login-Screen anzeigen
  if (!discordUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 bg-card border-border">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-[#5865F2]/10 flex items-center justify-center mx-auto">
              <LogIn className="h-10 w-10 text-[#5865F2]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-card-foreground mb-2">Discord Anmeldung erforderlich</h2>
              <p className="text-muted-foreground">
                Um bei Rex Diner bestellen zu können, melden Sie sich bitte mit Ihrem Discord-Account an.
              </p>
            </div>
            <Button
              onClick={() => {
                window.location.href = "/api/auth/discord?returnTo=/bestellen"
              }}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white py-6 text-lg"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Mit Discord anmelden
            </Button>
            <p className="text-xs text-muted-foreground">
              Ihre Discord-ID wird automatisch verwendet, um Bestellbenachrichtigungen zu senden.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getRatings = (menuItemId: number): MenuItemRating[] => {
    return menuRatings.filter((rating) => rating.menuItemId === menuItemId)
  }

  const getAverageRating = (menuItemId: number): number => {
    const ratings = getRatings(menuItemId)
    if (ratings.length === 0) return 0
    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0)
    return Math.round((sum / ratings.length) * 10) / 10
  }

  const submitRating = async () => {
    if (!showRatingModal || !customerName.trim()) return

    const newRatingData: MenuItemRating = {
      menuItemId: showRatingModal,
      rating: newRating,
      comment: newComment,
      customerName: customerName,
      timestamp: Date.now(),
    }

    // Save to Supabase
    const success = await saveMenuRating(newRatingData)
    
    if (!success) {
      alert("Fehler beim Speichern der Bewertung!")
      return
    }

    // Update local state
    setMenuRatings([newRatingData, ...menuRatings])

    // Send notification to Discord (server-side) so bot token stays secret
    try {
      const menuItem = menuItems.find((m) => m.id === newRatingData.menuItemId)
      await fetch("/api/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "new_menu_rating",
          data: {
            menuItemId: newRatingData.menuItemId,
            menuItemName: menuItem?.name || null,
            rating: newRatingData.rating,
            comment: newRatingData.comment,
            customerName: newRatingData.customerName,
            timestamp: newRatingData.timestamp,
          },
        }),
      })
    } catch (e) {
      console.error("Failed to notify Discord about menu rating:", e)
    }

    setShowRatingModal(null)
    setNewRating(5)
    setNewComment("")
    setCustomerName("")

    alert("Bewertung erfolgreich abgegeben!")
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

  const addToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id)
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        )
      } else {
        const flooredPrice = Math.floor(Number.parseFloat(item.price || "0")).toString()
        return [...prevCart, { id: item.id, name: item.name, price: flooredPrice, quantity: 1 }]
      }
    })
  }

  const removeFromCart = (id: number) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === id)
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map((cartItem) =>
          cartItem.id === id ? { ...cartItem, quantity: cartItem.quantity - 1 } : cartItem
        )
      } else {
        return prevCart.filter((cartItem) => cartItem.id !== id)
      }
    })
  }

  const setCartItemQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id)
      return
    }
    setCart((prevCart) =>
      prevCart.map((cartItem) =>
        cartItem.id === id ? { ...cartItem, quantity } : cartItem
      )
    )
  }

  const getDeliveryCost = () => {
    const subtotal = Number.parseFloat(getSubtotalPrice())
    
    // Kostenloser Versand ab 500€
    if (subtotal >= 500) {
      return 0
    }
    
    if (customAddress.trim()) {
      return 300
    }
    if (!selectedAddressId) return 0
    const selectedAddress = availableAddresses.find((addr) => addr.id === selectedAddressId)
    return selectedAddress?.deliveryCost || 0
  }

  const getSelectedAddressName = () => {
    if (customAddress.trim()) return customAddress
    if (!selectedAddressId) return ""
    return availableAddresses.find((addr) => addr.id === selectedAddressId)?.name || ""
  }

  const getTotalPrice = () => {
    const subtotal = cart.reduce(
      (total, item) => total + Math.floor(Number.parseFloat(item.price)) * item.quantity,
      0
    )
    const deliveryCost = getDeliveryCost()
    let total = subtotal + deliveryCost
    if (appliedDiscount) {
      const discount = subtotal * (appliedDiscount.percent / 100)
      total = subtotal - discount + deliveryCost
    }
    return Math.floor(total).toString()
  }

  const getSubtotalPrice = () => {
    const subtotal = cart.reduce(
      (total, item) => total + Math.floor(Number.parseFloat(item.price)) * item.quantity,
      0
    )
    return subtotal.toString()
  }

  const getDiscountAmount = () => {
    if (!appliedDiscount) return "0"
    const subtotal = parseFloat(getSubtotalPrice())
    const discount = subtotal * (appliedDiscount.percent / 100)
    return Math.floor(discount).toString()
  }

  const sendDiscordNotification = async (orderData: any) => {
    try {
      await fetch("/api/discord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "new_order",
          data: orderData,
        }),
      })
    } catch (error) {
      console.error("Failed to send Discord notification:", error)
    }
  }

  const sendUserConfirmationDM = async (discordId: string, orderDetails: any) => {
    try {
      await fetch("/api/discord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "order_confirmation_dm",
          data: {
            discordUserId: discordId,
            order: orderDetails,
          },
        }),
      })
    } catch (error) {
      console.error("Failed to send confirmation DM:", error)
    }
  }

  const handleCheckout = async () => {
    const subtotal = Number.parseFloat(getSubtotalPrice())
    
    // Mindestbestellwert nur für Lieferadressen, nicht für "Senora Way 3056 (Vorort)"
    const isLocalAddress = selectedAddressId === "1"
    
    if (!isLocalAddress && subtotal < 100) {
      setShowMinimumOrderWarning(true)
      return
    }
    
    if (cart.length === 0 || (!selectedAddressId && !customAddress)) return

    const order = {
      items: cart,
      customer_name: customerInfo.name,
      customer_email: customerInfo.discordId,
      customer_phone: customerInfo.phone,
      total: Number.parseFloat(getTotalPrice()),
      subtotal: Number.parseFloat(getSubtotalPrice()),
      discount_code: appliedDiscount?.code || null,
      discount_percent: appliedDiscount?.percent || 0,
      delivery_cost: getDeliveryCost(),
      status: "Neu",
      notes: `Adresse: ${getSelectedAddressName()}`,
    }

    // Check if profile data has changed
    const hasChanges =
      customerInfo.name !== originalProfile?.full_name ||
      customerInfo.phone !== originalProfile?.phone

    if (hasChanges) {
      setPendingOrder(order)
      setShowSaveProfileDialog(true)
    } else {
      await submitOrder(order)
    }
  }

  const submitOrder = async (order: any) => {
    const savedOrder = await saveOrder(order)

    if (!savedOrder) {
      alert("Fehler beim Speichern der Bestellung. Bitte versuchen Sie es erneut.")
      return
    }

    await sendDiscordNotification({ ...order, id: savedOrder.id, customerInfo })
    await sendUserConfirmationDM(customerInfo.discordId, { ...order, id: savedOrder.id })

    alert("Bestellung erfolgreich aufgegeben!")

    setCart([])
    setCustomerInfo({ name: "", discordId: "", phone: "", address: "" })
    setSelectedAddressId("")
    setCustomAddress("")
    setAppliedDiscount(null)
    setDiscountCode("")
    setShowCheckout(false)
  }

  const saveProfileAndSubmitOrder = async () => {
    if (!discordUser || !pendingOrder) return

    try {
      // Save the profile
      await saveUserProfile({
        discord_id: discordUser.id,
        discord_username: discordUser.username,
        full_name: customerInfo.name,
        phone: customerInfo.phone,
        avatar_url: discordUser.avatar,
      })

      // Update original profile
      setOriginalProfile({
        discord_id: discordUser.id,
        discord_username: discordUser.username,
        full_name: customerInfo.name,
        phone: customerInfo.phone,
        avatar_url: discordUser.avatar,
      })

      setShowSaveProfileDialog(false)
      await submitOrder(pendingOrder)
    } catch (error) {
      console.error("Error saving profile:", error)
      alert("Fehler beim Speichern des Profils")
    }
  }

  const submitOrderWithoutSaving = async () => {
    setShowSaveProfileDialog(false)
    if (pendingOrder) {
      await submitOrder(pendingOrder)
    }
  }

  const getItemsByCategory = () => {
    const categories = [...new Set(menuItems.map((item) => item.category).filter(Boolean))]
    const grouped: { [key: string]: MenuItem[] } = {}

    categories.sort().forEach((category) => {
      grouped[category] = menuItems.filter((item) => item.category === category)
    })

    return grouped
  }

  const getAllCategories = () => {
    return [...new Set(menuItems.map((item) => item.category).filter(Boolean))].sort()
  }

  const getDisplayItems = () => {
    const all = getItemsByCategory()
    if (selectedCategory === null) {
      return all
    }
    return { [selectedCategory]: all[selectedCategory] || [] }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Online bestellen</h1>
          <p className="text-xl text-muted-foreground">
            Bestellen Sie Ihre Lieblingsspeisen direkt nach Hause
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-6">Unsere Speisekarte</h2>
              <div className="flex flex-wrap gap-2 mb-6">
                <Button
                  onClick={() => setSelectedCategory(null)}
                  variant={selectedCategory === null ? "default" : "outline"}
                  className={
                    selectedCategory === null
                      ? "bg-primary hover:bg-primary/80 text-primary-foreground"
                      : ""
                  }
                >
                  Alle
                </Button>
                {getAllCategories().map((category) => (
                  <Button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className={
                      selectedCategory === category
                        ? "bg-primary hover:bg-primary/80 text-primary-foreground"
                        : ""
                    }
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            {selectedCategory === null ? (
              <Card className="bg-card border-border mb-6">
                <CardContent className="p-4">
                  <p className="font-medium text-lg">Hier siehst du unser komplettes Angebot</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border mb-6">
                <CardContent className="p-4">
                  <p className="font-medium text-lg">Hier siehst du alle Angebote aus {selectedCategory}</p>
                </CardContent>
              </Card>
            )}

            {Object.entries(getDisplayItems()).map(([category, items]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground border-b border-border pb-2 mb-4">
                  {category}
                </h3>
                {items.map((item) => {
                  const averageRating = getAverageRating(item.id)
                  const ratingsCount = getRatings(item.id).length

                  return (
                    <Card
                      key={item.id}
                      className="hover:shadow-lg transition-shadow bg-card border-border"
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start gap-4 mb-3">
                          {item.image && (
                            <div className="flex-shrink-0">
                              <img
                                src={item.image || "/placeholder.svg"}
                                alt={item.name}
                                className="w-24 h-24 object-cover rounded-lg"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).style.display = "none"
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-xl font-semibold text-card-foreground">
                                {item.name}
                              </h4>
                              <Badge variant="secondary">{item.category}</Badge>
                            </div>
                            <p className="text-muted-foreground mb-3">{item.description}</p>
                            <div className="flex items-center gap-4 mb-3">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm text-muted-foreground">
                                  {averageRating > 0
                                    ? averageRating
                                    : "Noch keine Bewertungen"}
                                  {ratingsCount > 0 && ` (${ratingsCount} Bewertungen)`}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowRatingModal(item.id)}
                                className="text-xs"
                              >
                                Bewerten
                              </Button>
                            </div>
                            {getRatings(item.id)
                              .slice(-2)
                              .map((rating, index) => (
                                <div key={index} className="text-xs text-muted-foreground mb-1">
                                  <span className="font-medium">{rating.customerName}:</span>{" "}
                                  {rating.rating}/5 - {rating.comment}
                                </div>
                              ))}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-2xl font-bold text-primary mb-3">€{item.price}</p>
                            <Button
                              onClick={() => addToCart(item)}
                              className="bg-primary hover:bg-primary/80 text-primary-foreground"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Hinzufügen
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Ihre Bestellung
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Ihr Warenkorb ist leer</p>
                    <p className="text-sm">Fügen Sie Gerichte hinzu, um zu bestellen</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center py-2 border-b border-border"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-card-foreground">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">€{item.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => removeFromCart(item.id)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => setCartItemQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-16 text-center"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              addToCart({
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                description: "",
                                category: "",
                                rating: 0,
                              })
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

                  {(appliedDiscount || getDeliveryCost() > 0) && (
                    <div className="space-y-1 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Zwischensumme:</span>
                        <span>€{getSubtotalPrice()}</span>
                      </div>
                      {appliedDiscount && (
                        <div className="flex justify-between text-green-600">
                          <span>Rabatt ({appliedDiscount.percent}%):</span>
                          <span>-€{getDiscountAmount()}</span>
                        </div>
                      )}
                      {getDeliveryCost() > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lieferkosten:</span>
                          <span>€{getDeliveryCost()}</span>
                        </div>
                      )}
                      {getDeliveryCost() === 0 && selectedAddressId && (
                        <div className="flex justify-between text-green-600">
                          <span className="font-medium">Lieferkosten:</span>
                          <span className="font-medium">Kostenlos!</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-4 border-t border-border pt-2">
                    <span className="font-semibold text-card-foreground">Gesamt:</span>
                    <span className="text-xl font-bold text-primary">€{getTotalPrice()}</span>
                  </div>

                  {showCheckout && cart.length > 0 && (
                    <div className="space-y-4 mb-4">
                      <div>
                        <Label htmlFor="customer-address">Lieferadresse</Label>
                        {customAddress ? (
                          <div className="space-y-2">
                            <div className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground">
                              {customAddress} (€300)
                            </div>
                            <Button
                              type="button"
                              onClick={() => {
                                setCustomAddress("")
                                setTempCustomAddressInput("")
                                setSelectedAddressId("")
                              }}
                              variant="outline"
                              className="w-full"
                            >
                              Adresse ändern
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <select
                              id="customer-address"
                              value={selectedAddressId}
                              onChange={(e) => {
                                const value = e.target.value
                                setSelectedAddressId(value)
                                if (value === "custom") {
                                  setCustomerInfo({
                                    ...customerInfo,
                                    address: "",
                                  })
                                } else {
                                  const addr = availableAddresses.find(
                                    (a) => a.id === value
                                  )
                                  setCustomerInfo({
                                    ...customerInfo,
                                    address: addr?.name || "",
                                  })
                                }
                              }}
                              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="" disabled title="Derzeit deaktiviert da es Kapput ist">-- Adresse auswählen --</option>
                              {availableAddresses.map((addr) => (
                                <option key={addr.id} value={addr.id}>
                                  {addr.name}
                                  {addr.deliveryCost === 0
                                    ? " (Kostenlos)"
                                    : ` (€${addr.deliveryCost})`}
                                </option>
                              ))}
                              <option value="custom">
                                -- Eigene Adresse eingeben --
                              </option>
                            </select>
                            {selectedAddressId === "custom" && (
                              <div className="text-sm">
                                <Input
                                  placeholder="Geben Sie Ihre Adresse ein..."
                                  value={tempCustomAddressInput}
                                  onChange={(e) => setTempCustomAddressInput(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter" && tempCustomAddressInput.trim()) {
                                      setCustomAddress(tempCustomAddressInput)
                                      setCustomerInfo({ ...customerInfo, address: tempCustomAddressInput })
                                      setTempCustomAddressInput("")
                                      setSelectedAddressId("")
                                    }
                                  }}
                                  className="text-sm flex-1"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    if (tempCustomAddressInput.trim()) {
                                      setCustomAddress(tempCustomAddressInput)
                                      setCustomerInfo({ ...customerInfo, address: tempCustomAddressInput })
                                      setTempCustomAddressInput("")
                                      setSelectedAddressId("")
                                    }
                                  }}
                                  disabled={!tempCustomAddressInput.trim()}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Anwenden
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {(selectedAddressId || customAddress) && (
                        <div className="space-y-4">
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
                              <p className="font-medium text-foreground">{discordUser.username}</p>
                              <p className="text-xs text-muted-foreground">ID: {discordUser.id}</p>
                            </div>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          </div>

                          <div>
                            <Label htmlFor="customer-name">Name</Label>
                            <Input
                              id="customer-name"
                              value={customerInfo.name}
                              onChange={(e) =>
                                setCustomerInfo({ ...customerInfo, name: e.target.value })
                              }
                              required
                            />
                          </div>

                          {selectedAddressId !== "1" && (
                            <div>
                              <Label htmlFor="customer-phone">Telefon</Label>
                              <Input
                                id="customer-phone"
                                value={customerInfo.phone}
                                onChange={(e) =>
                                  setCustomerInfo({ ...customerInfo, phone: e.target.value })
                                }
                                required
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {cart.length > 0 && !showCheckout && (
                    <Button
                      onClick={() => setShowCheckout(true)}
                      className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
                    >
                      Zur Kasse
                    </Button>
                  )}

                  {showCheckout && (
                    <div className="space-y-2">
                      <Button
                        onClick={handleCheckout}
                        className="w-full bg-accent hover:bg-accent/80 text-accent-foreground"
                        disabled={
                          !customerInfo.name ||
                          (!selectedAddressId && !customAddress) ||
                          (selectedAddressId !== "1" && !customerInfo.phone)
                        }
                      >
                        Bestellung aufgeben
                      </Button>
                      <Button
                        onClick={() => setShowCheckout(false)}
                        variant="outline"
                        className="w-full"
                      >
                        Zurück zum Warenkorb
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {showRatingModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4 bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Gericht bewerten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customer-name-rating">Ihr Name</Label>
                  <Input
                    id="customer-name-rating"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ihr Name"
                    required
                  />
                </div>

                <div>
                  <Label>Bewertung</Label>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= newRating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="rating-comment">Kommentar (optional)</Label>
                  <Textarea
                    id="rating-comment"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Wie hat Ihnen das Gericht geschmeckt?"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={submitRating}
                    className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground"
                    disabled={!customerName.trim()}
                  >
                    Bewertung abgeben
                  </Button>
                  <Button
                    onClick={() => setShowRatingModal(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    Abbrechen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {showMinimumOrderWarning && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4 bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground text-red-600">Mindestbestellwert nicht erreicht</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground mb-2">
                    Erforderlicher Mindestbestellwert: €100.00
                  </p>
                  <p className="text-red-600 text-lg font-bold">
                    Aktuelle Zwischensumme: €{Number.parseFloat(getSubtotalPrice()).toFixed(2)}
                  </p>
                  <p className="text-muted-foreground text-sm mt-4">
                    Bitte fügen Sie noch {(100 - Number.parseFloat(getSubtotalPrice())).toFixed(2)}€ mehr hinzu, um bestellen zu können.
                  </p>
                </div>

                <Button
                  onClick={() => setShowMinimumOrderWarning(false)}
                  className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
                >
                  Warenkorb anpassen
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {showSaveProfileDialog && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Profil aktualisieren?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Du hast deine Bestelldaten geändert. Möchtest du diese in deinem Profil speichern?
                  </p>
                  <div className="">
                    {customerInfo.name !== originalProfile?.full_name && (
                      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <span className="w-full max-w-md bg-card border-border">Name: </span>
                        <span className="w-full max-w-md bg-card border-border">{customerInfo.name}</span>
                      </div>
                    )}
                    {customerInfo.phone !== originalProfile?.phone && (
                      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <span className="w-full max-w-md bg-card border-border">Telefon: </span>
                        <span className="w-full max-w-md bg-card border-border">{customerInfo.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Diese Daten werden dann automatisch bei zukünftigen Bestellungen und Reservierungen verwendet.
                </p>

                <div className="flex gap-2">
                  <Button
                    onClick={saveProfileAndSubmitOrder}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Speichern & Bestellen
                  </Button>
                  <Button
                    onClick={submitOrderWithoutSaving}
                    variant="outline"
                    className="flex-1"
                  >
                    Nur bestellen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}