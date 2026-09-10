"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Settings,
  Users,
  Calendar,
  ShoppingBag,
  Download,
  Upload,
  Key,
  Star,
  Wrench,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  User2,
  Lock,
  Image as ImageIcon,
  MessageCircle,
  Clock,
  AlignLeft,
  MapPin,
} from "lucide-react"

import { getMenuItems, saveMenuItems, exportMenuToFile, importMenuFromFile, type MenuItem } from "@/lib/menu-data"
import {
  type User,
  type CustomRank,
  type Reservation,
  type Order,
  type Review,
  getUsers,
  getUsersByDiscordId,
  saveUser,
  updateUser,
  deleteUser as deleteUserFromDB,
  generateTemporaryPassword,
  getAllRanks,
  getCustomRanks,
  saveCustomRank,
  saveCustomRanks,
  deleteCustomRank as deleteRankFromDB,
  DEFAULT_RANKS,
  getWebsiteConfig,
  saveWebsiteConfig as saveWebsiteConfigToDB,
  getReservations,
  updateReservation,
  deleteReservation as deleteReservationFromDB,
  deleteAllReservations,
  getOrders,
  updateOrder,
  deleteOrder as deleteOrderFromDB,
  deleteAllOrders,
  getReviews,
  deleteReview as deleteReviewFromDB,
  deleteAllReviews,
  type MenuItemRating,
  getMenuRatings,
  deleteMenuRating as deleteMenuRatingFromDB,
  deleteAllMenuRatings,
  type DiscountCode,
  getDiscountCodes,
  saveDiscountCode,
  updateDiscountCode,
  deleteDiscountCode as deleteDiscountCodeFromDB,
  getWerkstattOrders,
  updateWerkstattOrder,
  type SoonProject,
  type CalendarEvent,
  getCalendarEvents,
  saveCalendarEvent,
  deleteCalendarEvent as deleteCalendarEventFromDB,
} from "@/lib/user-data"

import { clearDiscordSession } from "@/lib/discord-session"
import type { MembershipPlan } from "@/lib/membership"

const RANKS = DEFAULT_RANKS

// normalize incoming permission data to an array of unique strings
const normalizePermissions = (permissions: any): string[] => {
  if (!permissions) return []
  if (typeof permissions === "string") {
    // if somehow stored as comma-separated string
    return permissions
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter((p) => p !== "")
  }
  if (Array.isArray(permissions)) {
    return Array.from(new Set(permissions))
  }
  return []
}

const formatPermissions = (permissions: string[]) => {
  permissions = normalizePermissions(permissions)
  if (permissions.length === 0) return "Keine"
  return permissions.map(p => {
    switch (p) {
      case "reservations": return "Reservierung-Management"
      case "orders": return "Bestellübersicht"
      case "reviews": return "Kundenbewertungen"
      case "menu": return "Speisekartenverwaltung"
      case "users_limited": return "Mitarbeiterverwaltung (eingeschränkt)"
      case "users": return "Mitarbeiterverwaltung"
      case "config": return "Website-Konfiguration"
      case "hausverbote": return "Hausverbotsverwaltung"
      case "rabattcodes": return "Rabattcode-Management"
      case "rabattcodes_or_view": return "Rabattcodes einsehen"
      case "memberships_manage": return "Mitgliedschaften verwalten"
      case "kalender_or_view": return "Kalender ansehen und verwalten"
      case "werkstatt": return "Werkstattbuchungen"
      case "archive": return "Archivverwaltung"
      case "all": return "Voller Zugriff (Reservierungsverwaltung, Bestellübersicht, Kundenbewertungen, Speisekartenverwaltung...)"
      default: return p
    }
  }).join(", ")
}

const RankCard = ({
  rankKey,
  rank,
  customRanks,
  setCustomRanks,
  deleteCustomRank,
  onRankUpdated,
}: {
  rankKey: string
  rank: { name: string; level: number; permissions: string[] }
  customRanks: { [key: string]: { name: string; level: number; permissions: string[] } }
  setCustomRanks: (ranks: { [key: string]: { name: string; level: number; permissions: string[] } }) => void
  deleteCustomRank: Function
  onRankUpdated: (rankName: string, rankLevel: number, permissions: string) => void
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(rank.name)
  const [editLevel, setEditLevel] = useState(rank.level)
  const [editPermissions, setEditPermissions] = useState(normalizePermissions(rank.permissions))

  const handleSaveEdit = async () => {
    if (rankKey === "owner") return // Owner kann nicht bearbeitet werden

    const updatedRank = {
      name: editName,
      level: editLevel,
      permissions: normalizePermissions(editPermissions),
    }

    const updatedCustomRanks = {
      ...customRanks,
      [rankKey]: updatedRank,
    }

    setCustomRanks(updatedCustomRanks)
    // Save to Supabase
    await saveCustomRank(rankKey, updatedRank)

    // Benachrichtigung über Rang-Update senden
    onRankUpdated(editName, editLevel, formatPermissions(editPermissions))

    setIsEditing(false)
  }

  const toggleEditPermission = (permission: string) => {
    setEditPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    )
  }

  if (isEditing && rankKey !== "owner") {
    return (
      <Card className="border-l-4 border-l-secondary">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Rang bearbeiten</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Rang Name:</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Rang Level (10-90):</label>
              <input
                type="number"
                min="10"
                max="90"
                value={editLevel}
                onChange={(e) => setEditLevel(Number.parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Berechtigungen:</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "reservations", label: "Reservierungen verwalten" },
                  { key: "orders", label: "Bestellungen verwalten" },
                  { key: "reviews", label: "Bewertungen verwalten" },
                  { key: "menu", label: "Speisekarte bearbeiten" },
                  { key: "config", label: "Website-Konfiguration bearbeiten" },
                  { key: "hausverbote", label: "Hausverbote verwalten" },
                  { key: "rabattcodes", label: "Rabattcodes verwalten" },
                  { key: "rabattcodes_or_view", label: "Rabattcodes Einsehen" },
                  { key: "werkstatt", label: "Werkstatt-Buchungen verwalten" },
                  { key: "archive", label: "Archiv einsehen" },
                  { key: "users_limited", label: "Mitarbeiterverwaltung (eingeschränkt)" },
                  { key: "users", label: "Vollständige Mitarbeiterverwaltung" },
                  { key: "memberships_manage", label: "Mitgliedschaften verwalten" },
                ].map((permission) => (
                  <label key={permission.key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editPermissions.includes(permission.key)}
                      onChange={() => toggleEditPermission(permission.key)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-muted-foreground">{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button onClick={handleSaveEdit}>Speichern</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              {rank.name}
              <Badge variant="secondary" className="ml-2">
                Level {rank.level}
              </Badge>
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Berechtigungen:</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(normalizePermissions(rank.permissions))).map((permission) => (
                  <Badge key={permission} variant="outline" className="text-xs">
                    {formatPermissions([permission])}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Kann Dienstgrade bis Level {rank.level - 1} bearbeiten</p>
            <div className="flex gap-2 mt-2">
              {rankKey !== "owner" && (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="text-secondary hover:text-secondary hover:bg-secondary/20">
                  <Edit className="h-4 w-4 mr-1" />
                  Bearbeiten
                </Button>
              )}
              {rankKey !== "owner" && (
                <Button onClick={() => deleteCustomRank(rankKey, rank.name)} variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/20">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Löschen
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


export default function AdminPage({ initialTab }: { initialTab?: string } = {}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userGroup, setUserGroup] = useState("")
  const [activeTab, setActiveTab] = useState(initialTab ?? "welcome")
  const [tabCarouselIndex, setTabCarouselIndex] = useState(0)

  const adminRouter = useRouter()
  const pathname = usePathname()

  const routePathFromTab = (tabKey: string) => {
    switch (tabKey) {
      case "orders":
        return "bestellungen"
      case "reservations":
        return "reservierungen"
      case "reviews":
        return "bewertungen"
      case "users":
        return "mitarbeiter"
      default:
        return tabKey
    }
  }

  const tabKeyFromPath = (route: string) => {
    switch (route) {
      case "bestellungen":
        return "orders"
      case "reservierungen":
        return "reservations"
      case "bewertungen":
        return "reviews"
      case "mitarbeiter":
        return "users"
      default:
        return route
    }
  }

  const setUrlForTab = (tabKey: string) => {
    const route = routePathFromTab(tabKey)
    const newPath = tabKey === "welcome" ? "/admin" : `/admin/${route}`
    if (typeof window !== "undefined" && window.location.pathname !== newPath) {
      // Route zu frontend-gesteuerten Admin-Tabs setzen
      adminRouter.replace(newPath)
    }
  }

  const navigateToTab = (tabKey: string) => {
    setActiveTab(tabKey)
    setUrlForTab(tabKey)
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const currentPath = pathname || window.location.pathname
    if (!currentPath.startsWith("/admin")) return
    const pathSegments = currentPath.split("/").filter(Boolean)
    const requested = pathSegments[1]

    if (!requested) {
      if (activeTab !== "welcome") {
        setActiveTab("welcome")
      }
      return
    }

    const key = tabKeyFromPath(requested)
    if (key && key !== activeTab) {
      setActiveTab(key)
    }
  }, [pathname, activeTab])

  const getAvailableTabs = () => {
    const allTabs: { key: string; label: string; permission?: string }[] = [
      { key: "welcome", label: "Startseite" },
      { key: "reservations", label: "Reservierungen", permission: "reservations" },
      { key: "orders", label: "Bestellungen", permission: "orders" },
      { key: "werkstatt", label: "Werkstatt Bestellungen", permission: "werkstatt" },
      { key: "dienstvorschriften", label: "Dienstvorschriften", permission: "dienstvorschriften" },
      { key: "archive", label: "Archiv", permission: "archive" },
      { key: "reviews", label: "Bewertungen", permission: "reviews" },
      { key: "menu", label: "Speisekarte", permission: "menu" },
      { key: "users", label: "Mitarbeiterverwaltung", permission: "users" },
      { key: "ranks", label: "Dienstgrade", permission: "ranks" },
      { key: "config", label: "Website-Konfiguration", permission: "config" },
      { key: "hausverbote", label: "Hausverbote", permission: "hausverbote" },
  { key: "rabattcodes", label: "Rabattcodes", permission: "rabattcodes_or_view" },
  { key: "mitgliedschaften", label: "Mitgliedschaften", permission: "memberships_manage" },
  { key: "kalender", label: "Kalender (In Bearbeitung)", permission: "kalender_or_view" },
    ]

    return allTabs.filter((t) => (t.permission ? hasPermission(t.permission) : true))
  }
  const [menuItems, setMenuItems] = useState([] as MenuItem[])
  const [users, setUsers] = useState([] as User[])
  // suspension modal state
  const [suspendModalUser, setSuspendModalUser] = useState<User | null>(null)
  // instead of specifying a number of days we now pick an end date
  const [suspendUntil, setSuspendUntil] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [websiteConfig, setWebsiteConfig] = useState({
    discordChannels: {
      reservations: "1381651223140241438",
      orders: "1412869710474772631",
      reviews: "1412869710474772631",
      adminLogs: "",
      announcements: "",
    },
    openingHours: {
      "Mo-Do": "17:00 - 23:00",
      "Fr-Sa": "17:00 - 24:00",
      So: "12:00 - 22:00",
    },
    websiteSettings: {
      title: "Rex Diner",
      description: "Authentisches deutsches Restaurant",
      contactDiscord: "https://discord.gg/DHAb7BTs",
      contactPhone: "+49 (0) 123 456789",
      contactAddress: "Musterstraße 123",
      contactCity: "12345 Berlin",
    },
    discordBot: {
      token: "",
      clientId: "",
      guildId: "",
    },
    soonProjects: [] as SoonProject[],
  })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  const [newSoonProjectTitle, setNewSoonProjectTitle] = useState("")
  const [newSoonProjectDescription, setNewSoonProjectDescription] = useState("")
  const [newSoonProjectTargetDate, setNewSoonProjectTargetDate] = useState("")
  const [newSoonProjectStatus, setNewSoonProjectStatus] = useState("")

  const [reservations, setReservations] = useState([] as Reservation[])
  const [orders, setOrders] = useState([] as Order[])
  const [werkstattOrders, setWerkstattOrders] = useState([] as Order[])
  const [reviews, setReviews] = useState([] as Review[])
  const [menuRatings, setMenuRatings] = useState([] as MenuItemRating[])

  // Account switching state
  const [hasMultipleAccounts, setHasMultipleAccounts] = useState(false)

  // Kalender-State
  const [calendarDate, setCalendarDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month" | "year">("month")
  const [calendarEventTitle, setCalendarEventTitle] = useState("")
  const [calendarEventStartTime, setCalendarEventStartTime] = useState("12:00")
  const [calendarEventEndTime, setCalendarEventEndTime] = useState("13:00")
  const [calendarEventLocation, setCalendarEventLocation] = useState("")
  const [calendarEventDescription, setCalendarEventDescription] = useState("")
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null)
  const [showEventDetailsDialog, setShowEventDetailsDialog] = useState(false)
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<CalendarEvent | null>(null)

  const [draggingEventId, setDraggingEventId] = useState<number | null>(null)
  const [draggingStartY, setDraggingStartY] = useState(0)
  const [draggingOriginalStart, setDraggingOriginalStart] = useState(0)
  const [draggingOriginalEnd, setDraggingOriginalEnd] = useState(0)
  const [isDraggingEvent, setIsDraggingEvent] = useState(false)
  const [draggingMode, setDraggingMode] = useState<'move' | 'resize-start' | 'resize-end' | null>(null)

  const formatDateKey = (date: Date) => date.toISOString().slice(0, 10)

  const formatTimeFromMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingEvent || draggingEventId === null || draggingMode === null) return
      const deltaY = e.clientY - draggingStartY
      const deltaMinutes = Math.round(deltaY)
      if (Math.abs(deltaMinutes) < 1) return

      setCalendarEvents((prev) => prev.map((ev) => {
        if (ev.id !== draggingEventId) return ev

        if (draggingMode === 'move') {
          const duration = draggingOriginalEnd - draggingOriginalStart
          const newStart = Math.max(0, Math.min(24 * 60 - duration, draggingOriginalStart + deltaMinutes))
          const newEnd = newStart + duration
          return {
            ...ev,
            startTime: formatTimeFromMinutes(newStart),
            endTime: formatTimeFromMinutes(newEnd),
          }
        }

        if (draggingMode === 'resize-start') {
          const newStart = Math.max(0, Math.min(draggingOriginalEnd - 15, draggingOriginalStart + deltaMinutes))
          return {
            ...ev,
            startTime: formatTimeFromMinutes(newStart),
          }
        }

        if (draggingMode === 'resize-end') {
          const newEnd = Math.min(24 * 60, Math.max(draggingOriginalStart + 15, draggingOriginalEnd + deltaMinutes))
          return {
            ...ev,
            endTime: formatTimeFromMinutes(newEnd),
          }
        }

        return ev
      }))
    }

    const onMouseUp = async () => {
      if (!isDraggingEvent || draggingEventId === null) return

      const movedEvent = calendarEvents.find((ev) => ev.id === draggingEventId)
      if (movedEvent) {
        const savedEvent = await saveCalendarEvent({
          id: movedEvent.id,
          date: movedEvent.date,
          title: movedEvent.title,
          startTime: movedEvent.startTime,
          endTime: movedEvent.endTime,
          location: movedEvent.location || '',
          description: movedEvent.description || '',
        })

        if (savedEvent) {
          if (savedEvent.id && movedEvent.id !== savedEvent.id) {
            // Falls API einen neuen Eintrag erstellt statt zu aktualisieren,
            // lösche das alte und ersetze im Zustand.
            await deleteCalendarEventFromDB(movedEvent.id as number)
          }

          setCalendarEvents((prev) =>
            prev.map((ev) =>
              ev.id === movedEvent.id ? (savedEvent.id ? { ...savedEvent } : ev) : ev,
            ),
          )
        }
      }

      setIsDraggingEvent(false)
      setDraggingEventId(null)
      setDraggingMode(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isDraggingEvent, draggingEventId, draggingStartY, draggingOriginalStart, draggingOriginalEnd, calendarEvents])

  const getCalendarGrid = () => {
    if (calendarView === "day") {
      return [new Date(calendarDate)]
    }

    if (calendarView === "week") {
      const selected = new Date(calendarDate)
      const startOfWeek = new Date(selected)
      startOfWeek.setDate(selected.getDate() - ((selected.getDay() + 6) % 7))
      return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(startOfWeek)
        day.setDate(startOfWeek.getDate() + i)
        return day
      })
    }

    if (calendarView === "year") {
      const year = calendarMonth.getFullYear()
      return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1))
    }

    const firstOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const dayOfWeek = (firstOfMonth.getDay() + 6) % 7

    const gridStart = new Date(firstOfMonth)
    gridStart.setDate(firstOfMonth.getDate() - dayOfWeek)

    const days: Date[] = []
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      days.push(d)
    }
    return days
  }

  const changePeriod = (delta: number) => {
    if (calendarView === "year") {
      setCalendarMonth((prev) => new Date(prev.getFullYear() + delta, prev.getMonth(), 1))
    } else {
      setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
    }
  }

  const getEventsForDay = (dateStr: string) =>
    calendarEvents.filter((ev) => ev.date === dateStr)

  const getReservationsForDay = (dateStr: string) =>
    reservations.filter((res) => res.date === dateStr)

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const normalizeTimeString = (raw: string) => {
    if (!raw) return ""
    // 12:00, 12:00:00, 12.00, 12, 12 Uhr
    const trimmed = raw.toString().trim().toLowerCase().replace(/\s*uhr$/, '').replace(/\./g, ':')
    const match = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?$/)
    if (!match) return ""
    let hour = Number(match[1])
    let min = Number(match[2] ?? '0')
    if (isNaN(hour) || isNaN(min)) return ""
    if (hour < 0 || hour > 23 || min < 0 || min > 59) return ""
    return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }

  const parseTime = (raw: string) => {
    const normalized = normalizeTimeString(raw)
    if (!normalized) return null
    const [hour, minute] = normalized.split(":").map(Number)
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null
    return { hour, minute }
  }

  const getCalendarTitle = () => {
    if (calendarView === "day") {
      return new Date(calendarDate).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    }
    if (calendarView === "week") {
      const selected = new Date(calendarDate)
      const start = new Date(selected)
      start.setDate(selected.getDate() - ((selected.getDay() + 6) % 7))
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return `${start.toLocaleDateString("de-DE")} - ${end.toLocaleDateString("de-DE")}`
    }
    if (calendarView === "year") {
      return calendarMonth.getFullYear().toString()
    }
    return calendarMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" })
  }

  useEffect(() => {
    const loadCalendarEvents = async () => {
      const events = await getCalendarEvents()
      setCalendarEvents(events)
    }
    loadCalendarEvents()
  }, [])

  const addCalendarEvent = async () => {
    if (!calendarEventTitle.trim()) {
      alert("Bitte einen Titel eingeben.")
      return
    }

    if (!calendarEventStartTime || !calendarEventEndTime) {
      alert("Bitte Start- und Endzeit angeben.")
      return
    }

    const startNorm = normalizeTimeString(calendarEventStartTime)
    const endNorm = normalizeTimeString(calendarEventEndTime)
    if (!startNorm || !endNorm) {
      alert("Ungültiges Zeitformat. Bitte HH:MM eingeben.")
      return
    }

    const [startH, startM] = startNorm.split(":").map(Number)
    const [endH, endM] = endNorm.split(":").map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (endMinutes <= startMinutes) {
      alert("Die Endzeit muss nach der Startzeit liegen.")
      return
    }

    const eventPayload: any = {
      date: calendarDate,
      title: calendarEventTitle.trim(),
      startTime: startNorm,
      endTime: endNorm,
      location: calendarEventLocation.trim(),
      description: calendarEventDescription.trim(),
    }

    if (editingCalendarEvent && editingCalendarEvent.id !== undefined) {
      eventPayload.id = editingCalendarEvent.id
    }

    const savedEvent = await saveCalendarEvent(eventPayload)

    if (savedEvent) {
      if (editingCalendarEvent) {
        setCalendarEvents((prev) => prev.map((ev) => (ev.id === savedEvent.id ? savedEvent : ev)))
      } else {
        setCalendarEvents((prev) => [...prev, savedEvent])
      }

      setEditingCalendarEvent(null)
      setSelectedCalendarEvent(null)
      setCalendarEventTitle("")
      setCalendarEventStartTime("12:00")
      setCalendarEventEndTime("13:00")
      setCalendarEventLocation("")
      setCalendarEventDescription("")
      setShowEventDialog(false)
    } else {
      alert("Fehler beim Speichern des Events.")
    }
  }

  const deleteCalendarEvent = async (id: number) => {
    if (!confirm("Dieses Kalender-Ereignis wirklich löschen?")) return
    const success = await deleteCalendarEventFromDB(id)
    if (success) {
      setCalendarEvents((prev) => prev.filter((ev) => ev.id !== id))
    } else {
      alert("Fehler beim Löschen des Events.")
    }
  }
  const [editingItem, setEditingItem] = useState(null as MenuItem | null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    rating: 5.0,
    image: "",
  })
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "admin",
    group: "mitarbeiter",
    mustChangePassword: true,
    isTemporaryPassword: false,
    discordUserId: "",
    image: "",
  })
  const [editingUser, setEditingUser] = useState(null as User | null)
  const [resetPasswordUser, setResetPasswordUser] = useState(null as User | null)
  const [temporaryPassword, setTemporaryPassword] = useState("")

  // kündigungs-Modal State
  const [terminatingUser, setTerminatingUser] = useState(null as User | null)
  const [terminationReason, setTerminationReason] = useState("")
  const fileInputRef = useRef(null as HTMLInputElement | null)
  const router = useRouter()

  // Rabattcodes State
const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([])
  const [discountActionIndex, setDiscountActionIndex] = useState({} as { [key: string]: number })
  const [discountCarouselIndex, setDiscountCarouselIndex] = useState(0)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [editingDiscountId, setEditingDiscountId] = useState(null as string | null)
  const [newDiscountCode, setNewDiscountCode] = useState("")
  const [newDiscountPercent, setNewDiscountPercent] = useState(10)
  const [newDiscountValidUntil, setNewDiscountValidUntil] = useState("")
  const [newDiscountMaxUsages, setNewDiscountMaxUsages] = useState(1)

  // Mitgliedschaften
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([])
  const [membershipLoading, setMembershipLoading] = useState(false)
  const [membershipError, setMembershipError] = useState("")
  const [membershipSaving, setMembershipSaving] = useState(false)
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null)
  const [membershipForm, setMembershipForm] = useState({
    name: "",
    description: "",
    price: "0",
    billing_interval: "monthly" as MembershipPlan["billing_interval"],
    min_duration_months: "1",
    cancellation_notice_months: "0",
    newcomer_only: false,
    includes_discount: false,
    discount_percent: "10",
    active: true,
  })

  // Dienstvorschriften Bestätigung
  const [dienstvorschriftenAcknowledged, setDienstvorschriftenAcknowledged] = useState(false)

  // Maintenance Mode
  const [maintenanceActive, setMaintenanceActive] = useState(false)

  // Funktion um Dienstvorschriften zu speichern
  const saveDienstvorschriftenAcknowledgement = async () => {
    try {
      if (!isAuthenticated) {
        alert("Fehler: Sie sind nicht authentifiziert.")
        return
      }

      if (!Array.isArray(users) || users.length === 0) {
        alert("Fehler: Benutzerliste ist leer")
        return
      }

      const currentUsername = localStorage.getItem("currentUser")
      if (!currentUsername) {
        alert("Fehler: Benutzername nicht in localStorage")
        return
      }

      const userToUpdate = users.find((u) => u.username === currentUsername)

      if (!userToUpdate) {
        alert("Fehler: Ihr Benutzerkonto wurde nicht gefunden.")
        return
      }

      const success = await updateUser(userToUpdate.id, { dienstvorschriftenAccepted: true })

      if (success) {
        setUsers(users.map((u) =>
          u.username === currentUsername
            ? { ...u, dienstvorschriftenAccepted: true }
            : u
        ))
        setDienstvorschriftenAcknowledged(true)
        alert("Dienstvorschriften akzeptiert!")
      } else {
        alert("Fehler beim Speichern in der Datenbank.")
      }
    } catch (error) {
      console.error("Error in saveDienstvorschriftenAcknowledgement:", error)
      alert("Fehler beim Speichern: " + String(error))
    }
  }

  // Hausverbot: Zustand für Modal / Formular
  const [showHausverbotModal, setShowHausverbotModal] = useState(false)
  const [hausverbotWho, setHausverbotWho] = useState("")
  const [hausverbotReason, setHausverbotReason] = useState("")
  const [hausverbotFromDate, setHausverbotFromDate] = useState("")
  const [hausverbotToDate, setHausverbotToDate] = useState("")
  const [hausverbotPhotoUrl, setHausverbotPhotoUrl] = useState("")
  const [hausverbotEmployee, setHausverbotEmployee] = useState("")
  const [hausverbote, setHausverbote] = useState([] as { id?: number; who: string; reason: string; fromDate: string; toDate: string; photo: string; timestamp: number }[])

  const handleSaveHausverbot = async () => {
    if (!hausverbotWho.trim() || !hausverbotReason.trim()) {
      alert("Bitte 'Wer' und 'Warum' ausfüllen.")
      return
    }

    if (!hausverbotFromDate || !hausverbotToDate) {
      alert("Bitte 'Von' und 'Bis' Datum ausfüllen.")
      return
    }

    const fromDate = new Date(hausverbotFromDate)
    const toDate = new Date(hausverbotToDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Validierung: kein Datum in der Vergangenheit
    if (fromDate < today) {
      alert("Das 'Von' Datum darf nicht in der Vergangenheit liegen. Wählen Sie heute oder morgen.")
      return
    }

    if (toDate < today) {
      alert("Das 'Bis' Datum darf nicht in der Vergangenheit liegen.")
      return
    }

    if (toDate < fromDate) {
      alert("Das 'Bis' Datum muss nach dem 'Von' Datum liegen oder gleich sein.")
      return
    }

    const entry = {
      who: hausverbotWho,
      reason: hausverbotReason,
      fromDate: hausverbotFromDate,
      toDate: hausverbotToDate,
      photo: hausverbotPhotoUrl,
      employee: hausverbotEmployee || (typeof window !== "undefined" ? localStorage.getItem("currentUser") : null) || null,
      timestamp: Date.now(),
    }

    try {
      const res = await fetch("/api/hausverbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error("Save failed", err)
        alert("Fehler beim Speichern. Siehe Konsole.")
        return
      }

      const result = await res.json().catch(() => ({}))
      const saved = (result?.data && Array.isArray(result.data) ? result.data[0] : result.data) ?? result ?? entry

      setHausverbote((prev) => [saved, ...prev])
      setShowHausverbotModal(false)
      setHausverbotWho("")
      setHausverbotReason("")
      setHausverbotFromDate("")
      setHausverbotToDate("")
      setHausverbotPhotoUrl("")
      setHausverbotEmployee("")
    } catch (error) {
      console.error("Error saving hausverbot:", error)
      alert("Netzwerkfehler beim Speichern.")
    }
  }

  const fetchHausverbote = async () => {
    try {
      const res = await fetch("/api/hausverbot")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      // Expect data.data or data
      const rows = data.data ?? data
      setHausverbote(Array.isArray(rows) ? rows : [])
    } catch (error) {
      console.error("Failed to load hausverbote", error)
    }
  }

  // Automatisches Löschen abgelaufener Hausverbote
  const deleteExpiredHausverbote = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const entry of hausverbote) {
      if (!entry.toDate || !entry.id) continue

      const toDate = new Date(entry.toDate)
      toDate.setHours(0, 0, 0, 0)

      // Wenn das Enddatum heute oder in der Vergangenheit liegt, löschen
      if (toDate <= today) {
        try {
          const res = await fetch(`/api/hausverbot?id=${entry.id}`, { method: "DELETE" })
          if (res.ok) {
            setHausverbote((prev) => prev.filter((h: any) => h.id !== entry.id))
          }
        } catch (error) {
          console.error("Failed to auto-delete expired hausverbot:", error)
        }
      }
    }
  }

  const handleDeleteHausverbot = async (id: number) => {
    if (!confirm("Dieses Hausverbot wirklich löschen?")) return
    try {
      const res = await fetch(`/api/hausverbot?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      // remove locally
      setHausverbote((prev) => prev.filter((h: any) => h.id !== id))
    } catch (error) {
      console.error("Failed to delete hausverbot", error)
      alert("Löschen fehlgeschlagen")
    }
  }

  const [showCreateRankForm, setShowCreateRankForm] = useState(false)
  const [newRankName, setNewRankName] = useState("")
  const [newRankLevel, setNewRankLevel] = useState(30)
  const [newRankPermissions, setNewRankPermissions] = useState([] as string[])
  const [customRanks, setCustomRanks] = useState({} as {
    [key: string]: { name: string; level: number; permissions: string[] }
  })
  const [selectedCategory, setSelectedCategory] = useState(null as string | null)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [reservationSearch, setReservationSearch] = useState("")
  const [orderSearch, setOrderSearch] = useState("")
  const [werkstattSearch, setWerkstattSearch] = useState("")
  const [archiveReservationSearch, setArchiveReservationSearch] = useState("")
  const [archiveOrderSearch, setArchiveOrderSearch] = useState("")
  const [archiveWerkstattSearch, setArchiveWerkstattSearch] = useState("")
  const [showArchiveReservations, setShowArchiveReservations] = useState(false)
  const [showArchiveOrders, setShowArchiveOrders] = useState(false)
  const [showArchiveWerkstatt, setShowArchiveWerkstatt] = useState(false)

  // User Settings state
  const [showUserSettings, setShowUserSettings] = useState(false)
  const [userSettingsMode, setUserSettingsMode] = useState<"password" | "profile" | "discord">("password")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [profileImage, setProfileImage] = useState("")
  const [newDiscordId, setNewDiscordId] = useState("")
  const [showAccountSwitch, setShowAccountSwitch] = useState(false)
  const [isSavingUserSettings, setIsSavingUserSettings] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const getCategories = () => {
    const categories = [...new Set(menuItems.map((item) => item.category).filter(Boolean))]
    return categories.sort()
  }

  const getItemsByCategory = () => {
    const categories = getCategories()
    const grouped: { [key: string]: MenuItem[] } = {}

    categories.forEach((category) => {
      grouped[category] = menuItems.filter((item) => item.category === category)
    })

    return grouped
  }

  // Rabattcodes laden
  const loadDiscountCodes = async () => {
    try {
      const codes = await getDiscountCodes()
      setDiscountCodes(codes)
    } catch (error) {
      console.error("Error loading discount codes:", error)
    }
  }

  const resetMembershipForm = () => {
    setEditingMembershipId(null)
    setMembershipForm({
      name: "",
      description: "",
      price: "0",
      billing_interval: "monthly",
      min_duration_months: "1",
      cancellation_notice_months: "0",
      newcomer_only: false,
      includes_discount: false,
      discount_percent: "10",
      active: true,
    })
  }

  const loadMembershipPlans = async () => {
    setMembershipLoading(true)
    setMembershipError("")
    try {
      const response = await fetch("/api/admin/memberships")
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Mitgliedschaften konnten nicht geladen werden.")
      setMembershipPlans(data.plans ?? [])
    } catch (error) {
      setMembershipError(error instanceof Error ? error.message : "Mitgliedschaften konnten nicht geladen werden.")
    } finally {
      setMembershipLoading(false)
    }
  }

  const saveMembershipPlan = async () => {
    if (!membershipForm.name.trim()) {
      setMembershipError("Bitte einen Namen für die Mitgliedschaft eingeben.")
      return
    }

    setMembershipSaving(true)
    setMembershipError("")
    try {
      const response = await fetch("/api/admin/memberships", {
        method: editingMembershipId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingMembershipId ? { id: editingMembershipId } : {}),
          ...membershipForm,
          price: Number(membershipForm.price),
          min_duration_months: Number(membershipForm.min_duration_months),
          cancellation_notice_months: Number(membershipForm.cancellation_notice_months),
          discount_percent: Number(membershipForm.discount_percent),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Mitgliedschaft konnte nicht gespeichert werden.")
      await loadMembershipPlans()
      resetMembershipForm()
    } catch (error) {
      setMembershipError(error instanceof Error ? error.message : "Mitgliedschaft konnte nicht gespeichert werden.")
    } finally {
      setMembershipSaving(false)
    }
  }

  const deleteMembershipPlan = async (id: string) => {
    if (!confirm("Diese Mitgliedschaft wirklich löschen? Bestehende Verträge können das Löschen verhindern.")) return
    const response = await fetch(`/api/admin/memberships?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMembershipError(data.error || "Mitgliedschaft konnte nicht gelöscht werden.")
      return
    }
    setMembershipPlans((plans) => plans.filter((plan) => plan.id !== id))
  }

  const editMembershipPlan = (plan: MembershipPlan) => {
    setEditingMembershipId(plan.id)
    setMembershipForm({
      name: plan.name,
      description: plan.description || "",
      price: String(plan.price),
      billing_interval: plan.billing_interval,
      min_duration_months: String(plan.min_duration_months),
      cancellation_notice_months: String(plan.cancellation_notice_months),
      newcomer_only: plan.newcomer_only,
      includes_discount: plan.includes_discount,
      discount_percent: String(plan.discount_percent ?? 10),
      active: plan.active,
    })
  }

  // Rabattcodes speichern
  const saveDiscountCodesToStorage = async (codes: typeof discountCodes) => {
    try {
      for (const code of codes) {
        await saveDiscountCode(code)
      }
    } catch (error) {
      console.error("Error saving discount codes:", error)
    }
  }

  // Verwendungen eines Rabattcodes zurücksetzen
  const resetDiscountUsage = async (id: string) => {
    if (!confirm("Verwendungen dieses Rabattcodes wirklich zurücksetzen?")) return
    try {
      await updateDiscountCode(id, { usageCount: 0 })
      const updated = discountCodes.map((c) => (c.id === id ? { ...c, usageCount: 0 } : c))
      setDiscountCodes(updated)
    } catch (error) {
      console.error("Error resetting discount usage:", error)
    }
  }

  // Rabattcode deaktivieren
  const deactivateDiscount = async (id: string) => {
    if (!confirm("Rabattcode wirklich deaktivieren?")) return
    try {
      await updateDiscountCode(id, { active: false })
      const updated = discountCodes.map((c) => (c.id === id ? { ...c, active: false } : c))
      setDiscountCodes(updated)
    } catch (error) {
      console.error("Error deactivating discount:", error)
    }
  }

  const activateDiscount = async (id: string) => {
    if (!confirm("Rabattcode wirklich aktivieren?")) return
    try {
      await updateDiscountCode(id, { active: true })
      const updated = discountCodes.map((c) => (c.id === id ? { ...c, active: true } : c))
      setDiscountCodes(updated)
    } catch (error) {
      console.error("Error activating discount:", error)
    }
  }

  const cycleDiscountActions = (id: string, delta: number) => {
    setDiscountActionIndex((prev) => {
      const current = prev[id] ?? 0
      const next = (current + delta + 3) % 3
      return { ...prev, [id]: next }
    })
  }

  // Neuen Rabattcode erstellen
  const createDiscountCode = async () => {
    if (!newDiscountCode.trim()) {
      alert("Bitte einen Code eingeben")
      return
    }

    if (!newDiscountValidUntil) {
      alert("Bitte ein Gültig-bis-Datum eingeben")
      return
    }

    if (newDiscountPercent <= 0 || newDiscountPercent > 100) {
      alert("Rabatt muss zwischen 1 und 100% liegen")
      return
    }

    if (newDiscountMaxUsages <= 0) {
      alert("Max. Nutzungen muss größer als 0 sein")
      return
    }

    // When editing, ignore the current edited discount entry when checking for duplicates
    const codeExists = discountCodes.some(
      (c) => c.code.toUpperCase() === newDiscountCode.toUpperCase() && c.id !== editingDiscountId
    )
    if (codeExists) {
      alert("Dieser Code existiert bereits")
      return
    }

    if (editingDiscountId) {
      // Save edits
      const editedCode = {
        id: editingDiscountId,
        code: newDiscountCode.toUpperCase(),
        discountPercent: newDiscountPercent,
        validUntil: newDiscountValidUntil,
        maxUsages: newDiscountMaxUsages,
        usageCount: discountCodes.find(c => c.id === editingDiscountId)?.usageCount ?? 0,
        active: discountCodes.find(c => c.id === editingDiscountId)?.active ?? true,
      }

      await saveDiscountCode(editedCode)

      const updatedCodes = discountCodes.map((c) => {
        if (c.id !== editingDiscountId) return c
        return editedCode
      })

      setDiscountCodes(updatedCodes)
      setEditingDiscountId(null)
      setShowDiscountModal(false)

      // Reset form
      setNewDiscountCode("")
      setNewDiscountPercent(10)
      setNewDiscountValidUntil("")
      setNewDiscountMaxUsages(1)
      return
    }

    const newCode = {
      id: Date.now().toString(),
      code: newDiscountCode.toUpperCase(),
      discountPercent: newDiscountPercent,
      validUntil: newDiscountValidUntil,
      maxUsages: newDiscountMaxUsages,
      usageCount: 0,
      active: true,
      createdAt: Date.now(),
    }

    await saveDiscountCode(newCode)

    const updatedCodes = [...discountCodes, newCode]
    setDiscountCodes(updatedCodes)
    setDiscountCarouselIndex(0) // Zurück zum ersten Code

    // Reset form
    setNewDiscountCode("")
    setNewDiscountPercent(10)
    setNewDiscountValidUntil("")
    setNewDiscountMaxUsages(1)
    setShowDiscountModal(false)

  }

  const openNewDiscountModal = () => {
    setEditingDiscountId(null)
    setNewDiscountCode("")
    setNewDiscountPercent(10)
    setNewDiscountValidUntil("")
    setNewDiscountMaxUsages(1)
    setShowDiscountModal(true)
  }

  const closeDiscountModal = () => {
    setShowDiscountModal(false)
    setEditingDiscountId(null)
    setNewDiscountCode("")
    setNewDiscountPercent(10)
    setNewDiscountValidUntil("")
    setNewDiscountMaxUsages(1)
  }

  // Karussel Navigation
  const nextDiscountCode = () => {
    if (discountCodes.length > 0) {
      setDiscountCarouselIndex((prev) => (prev + 1) % discountCodes.length)
    }
  }

  const prevDiscountCode = () => {
    if (discountCodes.length > 0) {
      setDiscountCarouselIndex((prev) => (prev - 1 + discountCodes.length) % discountCodes.length)
    }
  }

  // Rabattcode löschen
  const deleteDiscountCode = async (id: string) => {
    if (!confirm("Diesen Rabattcode wirklich löschen?")) return

    await deleteDiscountCodeFromDB(id)
    const updatedCodes = discountCodes.filter(code => code.id !== id)
    setDiscountCodes(updatedCodes)
  }

  // keep the currently selected tab in sync with the user's permissions
  useEffect(() => {
    const availableKeys = getAvailableTabs().map((t) => t.key)

    // Welcome Page darf auch bleiben, sonst springt er immer von /admin weg
    if (activeTab !== "welcome" && !availableKeys.includes(activeTab)) {
      setActiveTab(availableKeys[0] || "menu")
    }

    if (activeTab === "hausverbote") {
      fetchHausverbote()
    }
    if (activeTab === "rabattcodes") {
      loadDiscountCodes()
    }
    if (activeTab === "mitgliedschaften") {
      loadMembershipPlans()
    }
  }, [activeTab, userGroup, customRanks])

  // whenever a suspension modal is shown, default the until-date to tomorrow
  useEffect(() => {
    if (suspendModalUser) {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      setSuspendUntil(d.toISOString().slice(0, 10))
    }
  }, [suspendModalUser])

  // Automatisches Löschen abgelaufener Hausverbote bei Laden oder wenn sich die Liste ändert
  useEffect(() => {
    if (hausverbote.length > 0) {
      deleteExpiredHausverbote()
    }
  }, [hausverbote.length])

  const loadReservationsAndOrders = async () => {
    // Load from Supabase
    const dbReservations = await getReservations()
    const dbOrders = await getOrders()
    const dbWerkstatt = await getWerkstattOrders()
    const dbReviews = await getReviews()
    const dbMenuRatings = await getMenuRatings()

    // Normalize different possible shapes returned from the loader
    // e.g. could be an array, or an object like { data: [...] } or { reviews: [...] }
    const rawReviews: any[] = Array.isArray(dbReviews) ? dbReviews : []

    // Some records might use different property names for type; fall back safely
    // If no type is present, treat as a restaurant review by default
    const getType = (r: any) => r.type ?? r.reviewType ?? r.kind ?? r.category ?? "restaurant"

    const restaurantReviews = rawReviews.filter((r) => getType(r) === "restaurant")

    setReservations(dbReservations as any)
    setOrders(dbOrders as any)
    setWerkstattOrders(dbWerkstatt as any)
    setReviews(restaurantReviews as any)
    setMenuRatings(dbMenuRatings as any)
  }

  const updateReservationStatus = async (id: number, status: string) => {
    const reservation = reservations.find((res) => res.id === id)
    if (!reservation) return

    // Update in Supabase
    await updateReservation(id, { status })

    const updatedReservations = reservations.map((res) => (res.id === id ? { ...res, status } : res))
    setReservations(updatedReservations)

    // Discord Benachrichtigung senden
    try {
      if (status === "Bestätigt") {
        await fetch("/api/discord", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "reservation_accepted",
            data: {
              discordUserId: reservation.email,
              reservation: reservation,
            },
          }),
        })
      } else if (status === "Abgelehnt") {
        await fetch("/api/discord", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "reservation_rejected",
            data: {
              discordUserId: reservation.email,
              reservation: reservation,
            },
          }),
        })
      }
    } catch (error) {
      console.error("Failed to send Discord notification:", error)
    }
  }

  const updateOrderStatusHandler = async (id: number, status: string) => {
    const order = orders.find((o) => o.id === id)
    if (!order) return

    await updateOrder(id, { status })
    const updatedOrders = orders.map((o) => (o.id === id ? { ...o, status } : o))
    setOrders(updatedOrders)

    // Discord DM senden wenn Discord ID vorhanden
    if (status !== "Archiviert" && order.customer_email) {
      try {
        await fetch("/api/discord", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "order_status_changed",
            data: {
              discordUserId: order.customer_email,
              order: order,
              newStatus: status,
            },
          }),
        })
      } catch (error) {
        console.error("Failed to send Discord notification:", error)
      }
    }
  }

  const updateWerkstattOrderStatusHandler = async (id: number, status: string) => {
    const order = werkstattOrders.find((o) => o.id === id)
    if (!order) return

    await updateWerkstattOrder(id, { status })
    const updated = werkstattOrders.map((o) => (o.id === id ? { ...o, status } : o))
    setWerkstattOrders(updated)

    if (status !== "Archiviert" && order.customer_email) {
      try {
        await fetch("/api/discord", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "order_status_changed",
            data: {
              discordUserId: order.customer_email,
              order: order,
              newStatus: status,
            },
          }),
        })
      } catch (error) {
        console.error("Failed to send Discord notification:", error)
      }
    }
  }

  const archiveReservationHandler = async (id: number) => {
    if (confirm("Sind Sie sicher, dass Sie diese Reservierung archivieren möchten?")) {
      await updateReservationStatus(id, "Archiviert")
      const updatedReservations = reservations.map((res) => (res.id === id ? { ...res, status: "Archiviert" } : res))
      setReservations(updatedReservations)
    }
  }

  const archiveOrderHandler = async (id: number) => {
    if (confirm("Sind Sie sicher, dass Sie diese Bestellung archivieren möchten?")) {
      await updateOrderStatusHandler(id, "Archiviert")
      const updatedOrders = orders.map((order) => (order.id === id ? { ...order, status: "Archiviert" } : order))
      setOrders(updatedOrders)
    }
  }

  const archiveWerkstattOrderHandler = async (id: number) => {
    if (confirm("Sind Sie sicher, dass Sie diese Werkstatt-Buchung archivieren möchten?")) {
      await updateWerkstattOrderStatusHandler(id, "Archiviert")
      const updated = werkstattOrders.map((order) => (order.id === id ? { ...order, status: "Archiviert" } : order))
      setWerkstattOrders(updated)
    }
  }

  const handleArchiveAllReservations = async () => {
    if (
      confirm(
        "Sind Sie sicher, dass Sie ALLE Reservierungen archivieren möchten?",
      )
    ) {
      const nonArchived = reservations.filter(res => res.status !== "Archiviert")
      for (const res of nonArchived) {
        await updateReservationStatus(res.id, "Archiviert")
      }
      const updatedReservations = reservations.map(res => ({ ...res, status: "Archiviert" }))
      setReservations(updatedReservations)
    }
  }

  const handleArchiveAllOrders = async () => {
    if (
      confirm(
        "Sind Sie sicher, dass Sie ALLE Bestellungen archivieren möchten?",
      )
    ) {
      const nonArchived = orders.filter(order => order.status !== "Archiviert")
      for (const order of nonArchived) {
        await updateOrderStatusHandler(order.id, "Archiviert")
      }
      const updatedOrders = orders.map(order => ({ ...order, status: "Archiviert" }))
      setOrders(updatedOrders)
    }
  }

  const handleArchiveAllWerkstatt = async () => {
    if (
      confirm(
        "Sind Sie sicher, dass Sie ALLE Werkstatt-Buchungen archivieren möchten?",
      )
    ) {
      const nonArchived = werkstattOrders.filter(order => order.status !== "Archiviert")
      for (const order of nonArchived) {
        await updateWerkstattOrderStatusHandler(order.id, "Archiviert")
      }
      const updated = werkstattOrders.map(order => ({ ...order, status: "Archiviert" }))
      setWerkstattOrders(updated)
    }
  }

  const handleLogout = async () => {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userRole")
    localStorage.removeItem("userGroup")
    localStorage.removeItem("userId")
    await clearDiscordSession()
    router.push("/")
  }

  const toggleMaintenance = async () => {
    try {
      const res = await fetch('/api/maintenance/toggle', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setMaintenanceActive(data.active)
        alert(`Wartungsmodus ${data.active ? 'aktiviert' : 'deaktiviert'}.`)
      } else {
        alert('Fehler beim Umschalten des Wartungsmodus.')
      }
    } catch (error) {
      console.error('Failed to toggle maintenance:', error)
      alert('Fehler beim Umschalten des Wartungsmodus.')
    }
  }

  const handleSaveUserSettings = async () => {
    const currentUsername = localStorage.getItem("currentUser")
    if (!currentUsername) {
      alert("Fehler: Benutzername nicht gefunden")
      return
    }

    const userToUpdate = users.find((u) => u.username === currentUsername)
    if (!userToUpdate) {
      alert("Fehler: Benutzer nicht gefunden")
      return
    }

    setIsSavingUserSettings(true)

    try {
      if (userSettingsMode === "password") {
        if (!oldPassword.trim()) {
          alert("Bitte geben Sie Ihr aktuelles Passwort ein")
          setIsSavingUserSettings(false)
          return
        }

        if (oldPassword !== userToUpdate.password) {
          alert("Das aktuelle Passwort ist falsch")
          setIsSavingUserSettings(false)
          return
        }

        if (!newPassword.trim()) {
          alert("Bitte geben Sie ein neues Passwort ein")
          setIsSavingUserSettings(false)
          return
        }

        if (newPassword !== confirmPassword) {
          alert("Passwörter stimmen nicht überein")
          setIsSavingUserSettings(false)
          return
        }

        if (newPassword.length < 6) {
          alert("Passwort muss mindestens 6 Zeichen lang sein")
          setIsSavingUserSettings(false)
          return
        }

        await updateUser(userToUpdate.id, {
          password: newPassword,
          mustChangePassword: false,
          isTemporaryPassword: false
        })

        const updatedUsers = users.map((u) =>
          u.username === currentUsername
            ? { ...u, password: newPassword, mustChangePassword: false, isTemporaryPassword: false }
            : u
        )
        setUsers(updatedUsers)

        alert("Passwort erfolgreich geändert! Du wirst abgemeldet und musst dich mit dem neuen Passwort erneut anmelden.")
        setOldPassword("")
        setNewPassword("")
        setConfirmPassword("")
        handleLogout()
        return
      } else if (userSettingsMode === "profile") {
        if (profileImage.trim()) {
          await updateUser(userToUpdate.id, { image: profileImage })
          const updatedUsers = users.map((u) =>
            u.username === currentUsername
              ? { ...u, image: profileImage }
              : u
          )
          setUsers(updatedUsers)
          alert("Profilbild erfolgreich aktualisiert!")
        }
      } else if (userSettingsMode === "discord") {
        // discord id change
        if (!newDiscordId.trim()) {
          alert("Bitte geben Sie eine gültige Discord-ID ein")
          setIsSavingUserSettings(false)
          return
        }

        // update and mark as changed in localStorage so it can only be done once
        await updateUser(userToUpdate.id, { discordUserId: newDiscordId })
        const updatedUsers = users.map((u) =>
          u.username === currentUsername
            ? { ...u, discordUserId: newDiscordId }
            : u
        )
        setUsers(updatedUsers)

        const flagKey = `discordChanged_${currentUsername}`
        try {
          localStorage.setItem(flagKey, "true")
        } catch { }

        alert("Discord-ID wurde aktualisiert. Du wirst nun automatisch abgemeldet und musst dich neu anmelden.")
        handleLogout()
        return // logout will unmount
      }

      setShowUserSettings(false)
      setProfileImage("")
      setUserSettingsMode("password")
    } catch (error) {
      console.error("Error saving user settings:", error)
      alert("Fehler beim Speichern: " + String(error))
    } finally {
      setIsSavingUserSettings(false)
    }
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem({ ...item })
    setIsAddingNew(false)
  }

  const handleSave = async () => {
    if (editingItem) {
      const updatedItems = menuItems.map((item) => (item.id === editingItem.id ? editingItem : item))
      setMenuItems(updatedItems)
      await saveMenuItems(updatedItems)
      setEditingItem(null)
    }
  }

  const handleDelete = async (id: number) => {
    const updatedItems = menuItems.filter((item) => item.id !== id)
    setMenuItems(updatedItems)
    await saveMenuItems(updatedItems)
  }

  const handleAddNew = async () => {
    const id = menuItems.length > 0 ? Math.max(...menuItems.map((item) => item.id)) + 1 : 1
    const updatedItems = [...menuItems, { ...newItem, id }]
    setMenuItems(updatedItems)
    await saveMenuItems(updatedItems)
    setNewItem({
      name: "",
      description: "",
      price: "",
      category: "",
      rating: 5.0,
      image: "",
    })
    setIsAddingNew(false)
  }

  const sendDiscordNotification = async (type: string, data: any) => {
    try {
      console.log(`[Admin] Sending Discord notification: ${type}`)
      const response = await fetch("/api/discord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, data }),
      })
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Admin] Discord API error for ${type}: ${response.status} ${response.statusText} - ${errorText}`)
      } else {
        console.log(`[Admin] Discord notification ${type} sent successfully`)
      }
    } catch (error) {
      console.error(`[Admin] Failed to send Discord notification ${type}:`, error)
    }
  }

  const exportRanks = () => {
    const allRanks = { ...DEFAULT_RANKS, ...customRanks }
    const dataStr = JSON.stringify(allRanks, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportFileDefaultName = "ranks_export.json"

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  const importRanks = (event: any) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const importedRanks = JSON.parse(e.target?.result as string)

        // Nur custom Ränge importieren (nicht Owner überschreiben)
        const customRanksToImport: { [key: string]: CustomRank } = {}
        Object.entries(importedRanks).forEach(([key, rank]) => {
          if (key !== "owner") {
            const r = rank as CustomRank
            r.permissions = normalizePermissions(r.permissions)
            customRanksToImport[key] = r
          }
        })

        setCustomRanks(customRanksToImport)
        // Save to Supabase
        await saveCustomRanks(customRanksToImport)
        alert("Dienstgrad erfolgreich importiert!")
      } catch (error) {
        alert("Fehler beim Importieren des Dienstgrades. Bitte überprüfen Sie die Datei.")
      }
    }
    reader.readAsText(file)

    // Reset file input
    if (event.target) {
      event.target.value = ""
    }
  }

  const handleAddUser = async () => {
    // Prüfe ob Username bereits existiert
    if (users.some((user) => user.username === newUser.username)) {
      alert("Ein Mitarbeiter mit diesem Namen existiert bereits. Bitte wähle einen anderen Namen.")
      return
    }

    const generatedPassword = generateTemporaryPassword()
    const defaultProfileImage = "https://i.ibb.co/dhzb9HZ/42994.png"

    const userWithGeneratedPassword = {
      ...newUser,
      password: generatedPassword,
      mustChangePassword: true,
      isTemporaryPassword: true,
      image: newUser.image || defaultProfileImage, // Verwende Standard-Bild wenn leer
    }

    const id = Math.max(...users.map((user) => user.id)) + 1
    const newUserWithId = { ...userWithGeneratedPassword, id }
    await saveUser(newUserWithId)
    const updatedUsers = [...users, newUserWithId]
    setUsers(updatedUsers)

    if (newUser.discordUserId) {
      await sendDiscordNotification("send_login_dm", {
        discordUserId: newUser.discordUserId,
        username: newUser.username,
        password: generatedPassword,
      })
    }

    // Admin-Log-Benachrichtigung senden
    const currentAdminUser = localStorage.getItem("currentUser") || "Admin"
    await sendDiscordNotification("user_added", {
      username: newUser.username,
      group: newUser.group,
      discordUserId: newUser.discordUserId || "",
      addedBy: currentAdminUser,
    })

    // Rolle im Discord zuweisen
    if (newUser.discordUserId) {
      console.log("[Admin] Assigning roles to Discord user:", newUser.discordUserId)
      const allRanks = getAllRanks()
      const rank = allRanks[newUser.group]
      if (rank) {
        await sendDiscordNotification("assign_role", {
          userId: newUser.discordUserId,
          roleIds: [
            "1470387715861254187",
            "1466803414469054720",
            "1466803489220067413",
            "1466803489220067413",
            "1466554758037897237",
            "1466554665167622164",
            "1466554835620073473",
            "1466554805689516246",
            "1466554796990402601",
            "1466554783900106835",
            "1466554780452130967",
            "1466554902225621185"
          ]
        })
      }
    } else {
      console.log("[Admin] No Discord User ID provided, skipping role assignment")
    }

    setTemporaryPassword(generatedPassword)
    setResetPasswordUser({ ...userWithGeneratedPassword, id })

    setNewUser({
      username: "",
      password: "",
      role: "admin",
      group: "owner", // Standard auf owner setzen
      mustChangePassword: true,
      isTemporaryPassword: false,
      discordUserId: "",
      image: "",
    })
    setIsAddingUser(false)
  }

  const handleEditUser = (user: User) => {
    setEditingUser({ ...user })
  }

  const handleSaveUser = async () => {
    if (editingUser) {
      // Finde den ursprünglichen Benutzer vor der Bearbeitung
      const originalUser = users.find((user) => user.id === editingUser.id)
      const allRanks = getAllRanks()

      // Prüfe ob sich die Gruppe geändert hat
      const groupChanged = originalUser && originalUser.group !== editingUser.group

      await updateUser(editingUser.id, editingUser)
      const updatedUsers = users.map((user) => (user.id === editingUser.id ? editingUser : user))
      setUsers(updatedUsers)

      // Sende Discord-Benachrichtigung wenn sich die Rechte geändert haben
      if (groupChanged && originalUser) {
        const currentAdminUser = localStorage.getItem("currentUser") || "Admin"
        const previousRank = allRanks[originalUser.group as keyof typeof allRanks]
        const newRank = allRanks[editingUser.group as keyof typeof allRanks]

        await sendDiscordNotification("user_rights_changed", {
          targetUser: {
            username: editingUser.username,
            discordUserId: editingUser.discordUserId,
          },
          adminName: currentAdminUser,
          previousGroup: originalUser.group,
          newGroup: editingUser.group,
          previousRank: previousRank ? {
            name: previousRank.name,
            level: previousRank.level,
            permissions: previousRank.permissions,
          } : null,
          newRank: newRank ? {
            name: newRank.name,
            level: newRank.level,
            permissions: newRank.permissions,
          } : null,
        })

        // Rollen im Discord ändern
        if (editingUser.discordUserId) {
          if (previousRank) {
            await sendDiscordNotification("remove_role", {
              userId: editingUser.discordUserId,
              roleIds: [
                "1470387715861254187",
                "1466803414469054720",
                "1466803489220067413",
                "1466803489220067413",
                "1466554758037897237",
                "1466554665167622164",
                "1466554835620073473",
                "1466554805689516246",
                "1466554796990402601",
                "1466554783900106835",
                "1466554780452130967",
                "1466554902225621185"
              ]
            })
          }
          if (newRank) {
            await sendDiscordNotification("assign_role", {
              userId: editingUser.discordUserId,
              roleIds: [
                "1470387715861254187",
                "1466803414469054720",
                "1466803489220067413",
                "1466803489220067413",
                "1466554758037897237",
                "1466554665167622164",
                "1466554835620073473",
                "1466554805689516246",
                "1466554796990402601",
                "1466554783900106835",
                "1466554780452130967",
                "1466554902225621185"
              ]
            })
          }
        }
      }

      setEditingUser(null)
    }
  }

  // Abmahnen: erhöhe warningCount
  const handleWarnUser = async (user: User) => {
    const newCount = (user.warningCount || 0) + 1
    const success = await updateUser(user.id, { warningCount: newCount })
    if (success) {
      setUsers(users.map((u) => (u.id === user.id ? { ...u, warningCount: newCount } : u)))
      alert(`Mitarbeiter ${user.username} abgemahnt (${newCount}x).`)
    }
  }

  // Suspensionsdialog bestätigen
  const handleSuspendUserConfirm = async () => {
    if (!suspendModalUser) return
    if (!suspendUntil) {
      alert("Bitte ein gültiges Enddatum auswählen.")
      return
    }
    const until = new Date(suspendUntil)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // don't allow past dates
    if (until < today) {
      alert("Das Enddatum darf nicht in der Vergangenheit liegen.")
      return
    }
    // to keep the user suspended for the *entire* chosen day, advance the stored timestamp
    const storedUntil = new Date(until)
    storedUntil.setDate(storedUntil.getDate() + 1)
    const suspendDate = storedUntil.toISOString()
    const success = await updateUser(suspendModalUser.id, {
      group: "suspendiert",
      suspendedUntil: suspendDate,
    })
    if (success) {
      setUsers(users.map((u) => (u.id === suspendModalUser.id ? { ...u, group: "suspendiert", suspendedUntil: suspendDate } : u)))
      alert(
        `Mitarbeiter ${suspendModalUser.username} wurde bis zum ${until.toLocaleDateString("de-DE")} suspendiert.`,
      )
    }
    setSuspendModalUser(null)
    // reset date to default (tomorrow)
    const d = new Date()
    d.setDate(d.getDate() + 1)
    setSuspendUntil(d.toISOString().slice(0, 10))
  }

  // Suspendierung aufheben
  const handleLiftSuspension = async (user: User) => {
    const updates: any = { suspendedUntil: null }
    if (user.group === "suspendiert") {
      updates.group = "mitarbeiter"
    }
    const success = await updateUser(user.id, updates)
    if (success) {
      setUsers(users.map((u) => (u.id === user.id ? { ...u, ...updates } : u)))
    }
  }

  // Oeffnet das kündigungs-Modal
  const handleDeleteUser = (id: number) => {
    const userToDelete = users.find((user) => user.id === id)
    if (userToDelete && users.length > 1) {
      setTerminatingUser(userToDelete)
      setTerminationReason("")
    }
  }

  // Fuehrt die eigentliche kündigung durch
  const confirmTerminateUser = async () => {
    if (!terminatingUser || !terminationReason.trim()) return

    const currentAdminUser = localStorage.getItem("currentUser") || "Admin"

    // Benachrichtigung an den Benutzer senden MIT Grund
    await sendDiscordNotification("user_access_revoked", {
      revokedUser: terminatingUser,
      adminName: currentAdminUser,
      reason: terminationReason.trim(),
    })

    // Admin-Log-Benachrichtigung senden
    await sendDiscordNotification("user_deleted", {
      username: terminatingUser.username,
      group: terminatingUser.group,
      deletedBy: currentAdminUser,
      reason: terminationReason.trim(),
    })

    // Rolle im Discord entfernen
    if (terminatingUser.discordUserId) {
      const allRanks = getAllRanks()
      const rank = allRanks[terminatingUser.group]
      if (rank) {
        await sendDiscordNotification("remove_role", {
          userId: terminatingUser.discordUserId,
          roleIds: [
            "1470387715861254187",
            "1466803414469054720",
            "1466803489220067413",
            "1466803489220067413",
            "1466554758037897237",
            "1466554665167622164",
            "1466554835620073473",
            "1466554805689516246",
            "1466554796990402601",
            "1466554783900106835",
            "1466554780452130967",
            "1466554902225621185"
          ]
        })
      }
    }

    await deleteUserFromDB(terminatingUser.id)
    const updatedUsers = users.filter((user) => user.id !== terminatingUser.id)
    setUsers(updatedUsers)

    // Modal schliessen
    setTerminatingUser(null)
    setTerminationReason("")
  }

  const handleExportMenu = () => {
    exportMenuToFile(menuItems)
  }

  const handleImportMenu = async (event: any) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        const importedItems = await importMenuFromFile(file)
        setMenuItems(importedItems)
        await saveMenuItems(importedItems)
        alert("Speisekarte erfolgreich importiert!")
      } catch (error) {
        alert("Fehler beim Importieren der Speisekarte: " + (error as Error).message)
      }
    }
  }

  const handleResetPassword = async (user: User) => {
    const tempPassword = generateTemporaryPassword()
    await updateUser(user.id, {
      password: tempPassword,
      mustChangePassword: true,
      isTemporaryPassword: true
    })
    const updatedUsers = users.map((u) =>
      u.id === user.id ? { ...u, password: tempPassword, mustChangePassword: true, isTemporaryPassword: true } : u,
    )
    setUsers(updatedUsers)
    setResetPasswordUser(user)
    setTemporaryPassword(tempPassword)

    // Sende Discord-Benachrichtigung über das zurückgesetzte Passwort
    const currentAdminUser = localStorage.getItem("currentUser") || "Admin"
    try {
      await fetch("/api/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "password_reset",
          data: {
            username: user.username,
            discordUserId: user.discordUserId,
            resetBy: currentAdminUser,
            newPassword: tempPassword,
          },
        }),
      })
    } catch (error) {
      console.error("Failed to send Discord notification for password reset:", error)
    }
  }

  const handleDeleteReview = async (id: string) => {
    const numericId = Number(id)
    await deleteReviewFromDB(numericId)
    const updatedReviews = reviews.filter((review) => review.id !== numericId)
    setReviews(updatedReviews)
  }

  const handleDeleteMenuRating = async (timestamp: number) => {
    if (!confirm("Diese Bewertung wirklich löschen?")) return

    await deleteMenuRatingFromDB(timestamp)
    const updatedRatings = menuRatings.filter((rating: any) => rating.timestamp !== timestamp)
    setMenuRatings(updatedRatings)
  }

  const handleDeleteAllReviews = async () => {
    if (
      confirm(
        "Sind Sie sicher, dass Sie ALLE Bewertungen (Restaurant + Essens-Bewertungen) löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
      )
    ) {
      await deleteAllReviews()
      await deleteAllMenuRatings()
      setReviews([])
      setMenuRatings([])
      alert("Alle Bewertungen wurden erfolgreich gelöscht!")
    }
  }

  const handleDeleteAllRestaurantReviews = async () => {
    if (confirm("Sind Sie sicher, dass Sie alle Restaurant-Bewertungen löschen möchten?")) {
      await deleteAllReviews()
      setReviews([])
      alert("Alle Restaurant-Bewertungen wurden gelöscht!")
    }
  }

  const handleDeleteAllMenuRatings = async () => {
    if (confirm("Sind Sie sicher, dass Sie alle Essens-Bewertungen löschen möchten?")) {
      await deleteAllMenuRatings()
      setMenuRatings([])
      alert("Alle Essens-Bewertungen wurden gelöscht!")
    }
  }

  const getMenuItemName = (menuItemId: number) => {
    const item = menuItems.find((item: any) => item.id === menuItemId)
    return item ? item.name : `Menü-Item #${menuItemId}`
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${rating >= index + 1 ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
      />
    ))
  }

  const getAllRanks = () => {
    return {
      ...RANKS,
      ...customRanks,
    }
  }

  const createNewRank = async () => {
    if (!newRankName.trim()) {
      alert("Bitte geben Sie einen Rang-Namen an.")
      return
    }

    const rankKey = newRankName.toLowerCase().replace(/\s+/g, "_")
    const newRank = {
      name: newRankName,
      level: newRankLevel,
      permissions: normalizePermissions(newRankPermissions),
    }

    const updatedCustomRanks = {
      ...customRanks,
      [rankKey]: newRank,
    }

    setCustomRanks(updatedCustomRanks)
    // Save to Supabase
    await saveCustomRank(rankKey, newRank)

    // Admin-Log-Benachrichtigung senden
    const currentAdminUser = localStorage.getItem("currentUser") || "Admin"
    const formatPermissions = (permissions: string[]) => {
      if (!permissions || permissions.length === 0) return "Keine"
      return permissions.map(p => {
        switch (p) {
          case "reservations": return "Reservierungen"
          case "orders": return "Bestellungen"
          case "reviews": return "Bewertungen"
          case "menu": return "Speisekarte"
          case "users_limited": return "Mitarbeiter (eingeschränkt)"
          case "users": return "Mitarbeiterverwaltung"
          default: return p
        }
      }).join(", ")
    }

    await sendDiscordNotification("rank_created", {
      rankName: newRank.name,
      rankLevel: newRank.level,
      permissions: formatPermissions(newRank.permissions),
      createdBy: currentAdminUser,
    })

    // Reset form
    setNewRankName("")
    setNewRankLevel(30)
    setNewRankPermissions([])
    setShowCreateRankForm(false)
  }

  const togglePermission = (permission: string) => {
    setNewRankPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    )
  }

  const hasPermission = (section: string): boolean => {
    const allRanks = getAllRanks()
    const userRank = allRanks[userGroup as keyof typeof allRanks]
    if (!userRank) return false

    if (userRank.permissions.includes("all")) return true

    // Spezielle Berechtigungen für verschiedene Sektionen
    switch (section) {
      case "ranks":
        return userGroup === "owner" // Nur Owner kann Ränge verwalten
      case "users":
        return userRank.permissions.includes("users") || userRank.permissions.includes("users_limited")
  case "rabattcodes_or_view":
  return userRank.permissions.includes("rabattcodes") || userRank.permissions.includes("rabattcodes_or_view")
  case "memberships_manage":
  return userGroup === "owner" || userRank.permissions.includes("memberships_manage")
  case "kalender_or_view":
        return userRank.permissions.includes("kalender") || userRank.permissions.includes("kalender_or_view") || userRank.permissions.includes("all")
      case "reservations":
      case "orders":
      case "reviews":
      case "menu":
      case "rabattcodes":
      case "config":
      case "hausverbote":
      case "archive":
      case "werkstatt":
      case "dienstvorschriften":
        return userRank.permissions.includes(section)
      default:
        return false
    }
  }

  const canManageDiscountCodes = (): boolean => {
    const allRanks = getAllRanks()
    const userRank = allRanks[userGroup as keyof typeof allRanks]
    if (!userRank) return false
    return userRank.permissions.includes("rabattcodes") || userRank.permissions.includes("all")
  }

  // Prüft ob der Benutzer überhaupt irgendwelche Berechtigungen hat
  const hasAnyPermission = (): boolean => {
    const allRanks = getAllRanks()
    const userRank = allRanks[userGroup as keyof typeof allRanks]
    if (!userRank) return false

    // Wenn "all" vorhanden ist, hat der Benutzer alle Rechte
    if (userRank.permissions.includes("all")) return true

    // Prüfe ob mindestens eine Berechtigung vorhanden ist
    return userRank.permissions && userRank.permissions.length > 0
  }

  const canEditUser = (targetUserGroup: string): boolean => {
    const allRanks = getAllRanks()
    const currentUserRank = allRanks[userGroup as keyof typeof allRanks]
    const targetUserRank = allRanks[targetUserGroup as keyof typeof allRanks]

    if (!currentUserRank || !targetUserRank) return false

    // Man kann nur Benutzer mit niedrigerem Rang bearbeiten
    return currentUserRank.level > targetUserRank.level
  }

  const saveWebsiteConfig = async () => {
    setSettingsSaving(true)
    setSettingsSaved(false)
    try {
      // Speichere in Supabase
      await saveWebsiteConfigToDB("discord_channels", websiteConfig.discordChannels)
      await saveWebsiteConfigToDB("opening_hours", websiteConfig.openingHours)
      await saveWebsiteConfigToDB("website_settings", websiteConfig.websiteSettings)
      if (websiteConfig.discordBot) {
        await saveWebsiteConfigToDB("discord_bot", websiteConfig.discordBot)
      }
      await saveWebsiteConfigToDB("soon_projects", websiteConfig.soonProjects || [])

      // Auch in localStorage speichern für schnelleren Zugriff
      localStorage.setItem("websiteConfig", JSON.stringify(websiteConfig))

      setSettingsSaved(true)
      const currentAdminUser = localStorage.getItem("currentUser") || "Admin"
      // Sende öffentliche Ankündigung über die Änderung der Einstellungen
      await sendDiscordNotification("settings_changed", {
        changedBy: currentAdminUser,
        settings: websiteConfig,
      })
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch (error) {
      console.error("Error saving website config:", error)
      alert("Fehler beim Speichern der Konfiguration!")
    } finally {
      setSettingsSaving(false)
    }
  }

  const saveSoonProjects = async (projects: SoonProject[]) => {
    try {
      setSettingsSaving(true)
      const success = await saveWebsiteConfigToDB("soon_projects", projects)
      if (!success) {
        throw new Error("Failed to save soon_projects")
      }
      // Update lokal, damit UI/Zustand direkt widerspiegelt was in DB liegt
      localStorage.setItem("websiteConfig", JSON.stringify({
        ...websiteConfig,
        soonProjects: projects,
      }))
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch (error) {
      console.error("Error saving soon projects:", error)
      alert("Fehler beim Speichern der Projekte!")
    } finally {
      setSettingsSaving(false)
    }
  }

  const addSoonProject = async () => {
    if (!newSoonProjectTitle.trim()) {
      alert("Bitte einen Projektnamen eingeben.")
      return
    }

    if (!newSoonProjectTargetDate) {
      alert("Bitte ein geplantes Fertigstellungsdatum eingeben.")
      return
    }

    const parsedDate = new Date(newSoonProjectTargetDate)
    if (Number.isNaN(parsedDate.getTime())) {
      alert("Ungültiges Datum. Bitte YYYY-MM-TT format verwenden.")
      return
    }

    const newProject: SoonProject = {
      id: Date.now().toString(),
      title: newSoonProjectTitle.trim(),
      description: newSoonProjectDescription.trim(),
      targetDate: newSoonProjectTargetDate,
      status: newSoonProjectStatus.trim() || "in Bearbeitung",
    }

    const nextSoonProjects = [...(websiteConfig.soonProjects || []), newProject]

    setWebsiteConfig((prev) => ({
      ...prev,
      soonProjects: nextSoonProjects,
    }))

    setNewSoonProjectTitle("")
    setNewSoonProjectDescription("")
    setNewSoonProjectTargetDate("")
    setNewSoonProjectStatus("")

    await saveSoonProjects(nextSoonProjects)
  }

  const removeSoonProject = async (id: string) => {
    if (!confirm("Projekt wirklich entfernen?")) return

    const nextSoonProjects = (websiteConfig.soonProjects || []).filter((p) => p.id !== id)
    setWebsiteConfig((prev) => ({
      ...prev,
      soonProjects: nextSoonProjects,
    }))

    await saveSoonProjects(nextSoonProjects)
  }

  const deleteCustomRankHandler = async (rankKey: string, rankName: string) => {
    if (
      confirm(
        `Sind Sie sicher, dass Sie den Rang "${rankName}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`,
      )
    ) {
      const updatedCustomRanks = { ...customRanks }
      delete updatedCustomRanks[rankKey]
      setCustomRanks(updatedCustomRanks)
      // Delete from Supabase
      await deleteRankFromDB(rankKey)

      // Admin-Log-Benachrichtigung senden
      const currentAdminUser = localStorage.getItem("currentUser") || "Admin"
      await sendDiscordNotification("rank_deleted", {
        rankName: rankName,
        deletedBy: currentAdminUser,
      })

      // Warnung für Benutzer mit diesem Rang
      alert(
        `Der Rang "${rankName}" wurde gelöscht. Mitarbeiter mit diesem Rang haben jetzt möglicherweise keine Berechtigungen mehr.`,
      )
    }
  }

  const exportUsers = () => {
    const usersData = JSON.stringify(users, null, 2)
    const blob = new Blob([usersData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rex-diner-mitarbeiter-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importUsers = (event: any) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedUsers = JSON.parse(e.target?.result as string)
        if (Array.isArray(importedUsers)) {
          setUsers(importedUsers)
          localStorage.setItem("users", JSON.stringify(importedUsers))
          alert("Mitarbeiter erfolgreich importiert!")
          window.location.reload()
        } else {
          alert("Ungültiges Dateiformat!")
        }
      } catch (error) {
        alert("Fehler beim Importieren der Datei!")
      }
    }
    reader.readAsText(file)
  }

  useEffect(() => {
    const loadData = async () => {
      const loggedIn = localStorage.getItem("isLoggedIn")
      const userRole = localStorage.getItem("userRole")
      const group = localStorage.getItem("userGroup") || "mitarbeiter"

      if (loggedIn === "true" && userRole === "admin") {
        setIsAuthenticated(true)
  setUserGroup(String(group ?? "").toLowerCase())

  // Load menu items from Supabase
        const menuData = await getMenuItems()
        setMenuItems(menuData)

        // Load users from Supabase
        let dbUsers = await getUsers()
        // Automatically lift any expired suspensions
        const now = new Date()
        for (const u of dbUsers) {
          if (u.suspendedUntil && new Date(u.suspendedUntil) <= now && u.group === "suspendiert") {
            await updateUser(u.id, { group: "mitarbeiter", suspendedUntil: null })
            u.group = "mitarbeiter"
            u.suspendedUntil = null
          }
        }
        setUsers(dbUsers)

        // Überprüfe ob der aktuelle Benutzer Dienstvorschriften bestätigt hat
        const currentUsername = localStorage.getItem("currentUser")
        const currentUser = dbUsers.find((u) => u.username === currentUsername)
        if (currentUser) {
          if (currentUser.dienstvorschriftenAccepted === true) {
            setDienstvorschriftenAcknowledged(true)
          } else {
            setDienstvorschriftenAcknowledged(false)
          }
        } else {
          setDienstvorschriftenAcknowledged(false)
        }

        // Load website config from Supabase
        const config = await getWebsiteConfig()
        setWebsiteConfig((previous) => ({
          ...previous,
          ...config,
          discordChannels: { ...previous.discordChannels, ...config.discordChannels },
          openingHours: { ...previous.openingHours, ...config.openingHours },
        }))

        // Load custom ranks from Supabase
        const ranks = await getCustomRanks()
        setCustomRanks(ranks)

        await loadReservationsAndOrders()

        // Load maintenance status
        try {
          const res = await fetch('/api/maintenance/status')
          if (res.ok) {
            const data = await res.json()
            setMaintenanceActive(data.active)
          }
        } catch (error) {
          console.error('Failed to load maintenance status:', error)
        }

      } else {
        router.push("/login")
      }
    }

    loadData()
  }, [router])

  useEffect(() => {
    if (isAuthenticated) {
      const savedReservations = JSON.parse(localStorage.getItem("reservations") || "[]")
      const savedOrders = JSON.parse(localStorage.getItem("orders") || "[]")
      const savedReviews = JSON.parse(localStorage.getItem("rex_diner_reviews") || "[]")
      const savedMenuRatings = JSON.parse(localStorage.getItem("menuRatings") || "[]")
      setReservations(savedReservations)
      setOrders(savedOrders)
      if (Array.isArray(savedReviews) && savedReviews.length > 0) {
        setReviews(savedReviews)
      }
      if (Array.isArray(savedMenuRatings) && savedMenuRatings.length > 0) {
        setMenuRatings(savedMenuRatings)
      }
    }
  }, [isAuthenticated])

  // Check for multiple accounts
  useEffect(() => {
    const checkMultipleAccounts = async () => {
      if (!isAuthenticated) {
        console.log("Not authenticated, skipping multiple accounts check")
        return
      }

      const discordUserId = localStorage.getItem("discordUserId")
      console.log("Checking for multiple accounts with discordUserId:", discordUserId)
      if (!discordUserId) {
        console.log("No discordUserId in localStorage")
        return
      }

      try {
        const usersWithSameDiscordId = await getUsersByDiscordId(discordUserId)
        console.log("Users with same Discord ID:", usersWithSameDiscordId.length, usersWithSameDiscordId)
        setHasMultipleAccounts(usersWithSameDiscordId.length > 1)
      } catch (error) {
        console.error("Error checking for multiple accounts:", error)
        setHasMultipleAccounts(false)
      }
    }

    checkMultipleAccounts()
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div>Laden...</div>
    )
  }

  if (!users || users.length === 0) {
    return (
      <div>Benutzerdaten werden geladen...</div>
    )
  }

  const itemsByCategory = getItemsByCategory()
  const currentUser = users.find((user) => user.username === "admin")
  const currentUserGroup = localStorage.getItem("userGroup") || "mitarbeiter"

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4"></div>
          <div className="flex items-center gap-4">
            {/* Maintenance Mode Button */}
            {/* <Button
              onClick={toggleMaintenance}
              variant={maintenanceActive ? "destructive" : "outline"}
              className="flex items-center gap-2"
            >
              <Wrench className="h-4 w-4" />
               {maintenanceActive ? "Wartung beenden" : "Wartung starten"} 
            </Button> */}
            {/* User Profile Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-4 px-6 py-3 rounded-lg hover:bg-secondary/20 transition-colors">
                {users.find((u) => u.username === localStorage.getItem("currentUser"))?.image ? (
                  <img
                    src={users.find((u) => u.username === localStorage.getItem("currentUser"))?.image}
                    alt="Profile"
                    className="h-14 w-14 rounded-full object-cover border-2 border-primary"
                  />
                ) : (
                  <User2 className="h-10 w-10 text-foreground" />
                )}
                <div className="flex flex-col items-start gap-0">
                  <span className="text-base font-semibold text-foreground">
                    {users.find((u) => u.group === userGroup)?.username || "Unbekannt"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {getAllRanks()[userGroup]?.name || userGroup}
                  </span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-56 bg-card border-2 border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-3 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setUserSettingsMode("password")
                      setShowUserSettings(true)
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded hover:bg-secondary/20 transition-colors text-base text-foreground"
                  >
                    <Lock className="h-5 w-5" />
                    Passwort ändern
                  </button>
                  <button
                    onClick={() => {
                      setUserSettingsMode("profile")
                      setShowUserSettings(true)
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded hover:bg-secondary/20 transition-colors text-base text-foreground"
                  >
                    <ImageIcon className="h-5 w-5" />
                    Profilbild ändern
                  </button>
                  {(() => {
                    const currentUsername = localStorage.getItem("currentUser") || ""
                    const flagKey = `discordChanged_${currentUsername}`
                    const already = typeof window !== "undefined" && !!localStorage.getItem(flagKey)
                    if (!already) {
                      return (
                        <button
                          onClick={() => {
                            setUserSettingsMode("discord")
                            setShowUserSettings(true)
                            setNewDiscordId(
                              users.find((u) => u.username === currentUsername)?.discordUserId || ""
                            )
                          }}
                          className="flex items-center gap-3 px-4 py-3 rounded hover:bg-secondary/20 transition-colors text-base text-foreground"
                        >
                          <MessageCircle className="h-5 w-5" />
                          Discord-ID ändern
                        </button>
                      )
                    }
                    return (
                      <span className="px-4 py-3 text-sm text-muted-foreground">
                        Discord-ID bereits geändert
                      </span>
                    )
                  })()}
                  {hasMultipleAccounts && (
                    <button
                      onClick={() => setShowAccountSwitch(true)}
                      className="flex items-center gap-3 px-4 py-3 rounded hover:bg-secondary/20 transition-colors text-base text-foreground"
                    >
                      <User2 className="h-5 w-5" />
                      Account wechseln
                    </button>
                  )}
                  <div className="h-px bg-border my-2" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded hover:bg-destructive/20 transition-colors text-base text-destructive"
                  >
                    <X className="h-5 w-5" />
                    Abmelden
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
            <Settings className="h-10 w-10 text-primary" />
            Mitarbeiter Panel
          </h1>
          <p className="text-xl text-muted-foreground">
            Verwalten Sie Ihre Speisekarte, Mitarbeiter, Reservierungen und Bestellungen
          </p>
        </div>

        {/* Suspendiert-Meldung wenn keine Berechtigungen */}
        {!hasAnyPermission() ? (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                  <X className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Keine Berechtigungen</h2>
                <p className="text-muted-foreground max-w-md">
                  Du hast derzeit keine Berechtigungen im Admin-Bereich.
                  Dies kann bedeuten, dass du suspendiert wurdest oder dein Rang keine Rechte hat.
                </p>
                <p className="text-sm text-muted-foreground">
                  Bitte wende dich an einen Administrator, wenn du glaubst, dass dies ein Fehler ist.
                </p>
                <Button onClick={handleLogout} variant="outline" className="mt-4 bg-transparent">
                  Abmelden
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Erweiterte Tab-Navigation mit Karussellverhalten */}
            <div className="flex items-center gap-2 mb-6">
              {(() => {
                const tabs = getAvailableTabs()
                const MAX_VISIBLE = 8
                const visibleCount = Math.min(tabs.length, MAX_VISIBLE)
                const showNavigation = tabs.length > MAX_VISIBLE

                return (
                  <>
                    {showNavigation && (
                      <div className="flex items-center">
                        <button
                          onClick={() => {
                            setTabCarouselIndex((idx) => (idx - 1 + tabs.length) % tabs.length)
                          }}
                          className="px-2 py-1 rounded-md text-sm"
                        >
                          ←
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const out: React.ReactNode[] = []
                        for (let i = 0; i < visibleCount; i++) {
                          if (tabs.length === 0) break
                          const idx = (tabCarouselIndex + i) % tabs.length
                          const t = tabs[idx]
                          out.push(
                            <button
                              key={t.key}
                              onClick={() => navigateToTab(t.key)}
                              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border-b-2 ${activeTab === t.key ? "text-red-600 border-red-600" : "text-muted-foreground hover:text-foreground border-transparent"
                                }`}
                            >
                              {t.label}
                            </button>
                          )
                        }
                        return out
                      })()}
                    </div>
                    {showNavigation && (
                      <div className="flex items-center">
                        <button
                          onClick={() => {
                            setTabCarouselIndex((idx) => (idx + 1) % tabs.length)
                          }}
                          className="px-2 py-1 rounded-md text-sm"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>


            {activeTab === "welcome" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Willkommen im Mitarbeiter-Panel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base text-foreground">
                      Willkommen im Mitarbeiter Panel! Hier kannst du einige Sachen machen. Schau sie dir gerne an.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Du kannst nur das benutzen, wo du Rechte drauf hast. Solltest du Bugs oder Probleme finden, reporte sie bitte.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Benutze das Menü oben, um zu Bestellungen, Reservierungen, Werkstatt und mehr zu wechseln.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "config" && hasPermission("config") && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Website-Konfiguration</h2>

                  {/* Opening hours configuration section */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Öffnungszeiten</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="hours-mo-do">Montag - Donnerstag</Label>
                        <Input
                          id="hours-mo-do"
                          value={websiteConfig.openingHours?.["Mo-Do"] || "17:00 - 23:00"}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              openingHours: {
                                ...websiteConfig.openingHours,
                                "Mo-Do": e.target.value,
                              },
                            })
                          }
                          placeholder="z.B. 17:00 - 23:00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hours-fr-sa">Freitag - Samstag</Label>
                        <Input
                          id="hours-fr-sa"
                          value={websiteConfig.openingHours?.["Fr-Sa"] || "17:00 - 24:00"}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              openingHours: {
                                ...websiteConfig.openingHours,
                                "Fr-Sa": e.target.value,
                              },
                            })
                          }
                          placeholder="z.B. 17:00 - 24:00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hours-so">Sonntag</Label>
                        <Input
                          id="hours-so"
                          value={websiteConfig.openingHours?.["So"] || "12:00 - 22:00"}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              openingHours: {
                                ...websiteConfig.openingHours,
                                So: e.target.value,
                              },
                            })
                          }
                          placeholder="z.B. 12:00 - 22:00"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Discord Channel Konfiguration */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Discord Channel IDs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="reservations-channel">Reservierungen Channel</Label>
                        <Input
                          id="reservations-channel"
                          value={websiteConfig.discordChannels.reservations}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              discordChannels: {
                                ...websiteConfig.discordChannels,
                                reservations: e.target.value,
                              },
                            })
                          }
                          placeholder="Discord Channel ID für Reservierungen"
                        />
                      </div>
                      <div>
                        <Label htmlFor="orders-channel">Bestellungen Channel</Label>
                        <Input
                          id="orders-channel"
                          value={websiteConfig.discordChannels.orders}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              discordChannels: {
                                ...websiteConfig.discordChannels,
                                orders: e.target.value,
                              },
                            })
                          }
                          placeholder="Discord Channel ID für Bestellungen"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reviews-channel">Bewertungen Channel</Label>
                        <Input
                          id="reviews-channel"
                          value={websiteConfig.discordChannels.reviews}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              discordChannels: {
                                ...websiteConfig.discordChannels,
                                reviews: e.target.value,
                              },
                            })
                          }
                          placeholder="Discord Channel ID für Bewertungen"
                        />
                      </div>
                      <div>
                        <Label htmlFor="admin-logs-channel">Mitarbeiter-Logs Channel</Label>
                        <Input
                          id="admin-logs-channel"
                          value={websiteConfig.discordChannels.adminLogs || ""}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              discordChannels: {
                                ...websiteConfig.discordChannels,
                                adminLogs: e.target.value,
                              },
                            })
                          }
                          placeholder="Discord Channel ID für Mitarbeiter-Logs (Mitarbeiter Einstellen/Kündigen, Rechte ändern)"
                        />
                      </div>
                      <div>
                        <Label htmlFor="announcements-channel">Ankündigungen Channel</Label>
                        <Input
                          id="announcements-channel"
                          value={websiteConfig.discordChannels.announcements || ""}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              discordChannels: {
                                ...websiteConfig.discordChannels,
                                announcements: e.target.value,
                              },
                            })
                          }
                          placeholder="Discord Channel ID für Mitarbeite Updates "
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Website Einstellungen */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Website-Einstellungen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="website-title">Website-Titel</Label>
                        <Input
                          id="website-title"
                          value={websiteConfig.websiteSettings.title}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              websiteSettings: {
                                ...websiteConfig.websiteSettings,
                                title: e.target.value,
                              },
                            })
                          }
                          placeholder="Website-Titel"
                        />
                      </div>
                      <div>
                        <Label htmlFor="website-description">Website-Beschreibung</Label>
                        <Input
                          id="website-description"
                          value={websiteConfig.websiteSettings.description}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              websiteSettings: {
                                ...websiteConfig.websiteSettings,
                                description: e.target.value,
                              },
                            })
                          }
                          placeholder="Website-Beschreibung"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-discord">Kontakt Discord-Link</Label>
                        <Input
                          id="contact-discord"
                          value={websiteConfig.websiteSettings.contactDiscord}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              websiteSettings: {
                                ...websiteConfig.websiteSettings,
                                contactDiscord: e.target.value,
                              },
                            })
                          }
                          placeholder="Discord Einladungslink"
                        />
                      </div>

                      <div>
                        <Label htmlFor="contact-phone">Telefonnummer</Label>
                        <Input
                          id="contact-phone"
                          value={websiteConfig.websiteSettings.contactPhone}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              websiteSettings: {
                                ...websiteConfig.websiteSettings,
                                contactPhone: e.target.value,
                              },
                            })
                          }
                          placeholder="z.B. +49 (0) 123 456789"
                        />
                      </div>

                      <div>
                        <Label htmlFor="contact-address">Adresse</Label>
                        <Input
                          id="contact-address"
                          value={websiteConfig.websiteSettings.contactAddress}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              websiteSettings: {
                                ...websiteConfig.websiteSettings,
                                contactAddress: e.target.value,
                              },
                            })
                          }
                          placeholder="z.B. Musterstraße 123"
                        />
                      </div>

                      <div>
                        <Label htmlFor="contact-city">Stadt</Label>
                        <Input
                          id="contact-city"
                          value={websiteConfig.websiteSettings.contactCity}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              websiteSettings: {
                                ...websiteConfig.websiteSettings,
                                contactCity: e.target.value,
                              },
                            })
                          }
                          placeholder="z.B. 12345 Berlin"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* /soon Projekte */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>In Bearbeitung - Projekte</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(websiteConfig.soonProjects || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Keine Projekte vorhanden. Bitte neuen Eintrag hinzufügen.</p>
                      ) : (
                        <div className="space-y-3">
                          {(websiteConfig.soonProjects || []).map((project) => (
                            <div key={project.id} className="border rounded-md p-3 flex justify-between items-start gap-4">
                              <div>
                                <h3 className="font-semibold text-foreground">{project.title}</h3>
                                <p className="text-sm text-muted-foreground">{project.description}</p>
                                <p className="text-xs text-muted-foreground">Fertigstellung: {project.targetDate}</p>
                                {project.status && <p className="text-xs text-muted-foreground">Status: {project.status}</p>}
                              </div>
                              <button
                                onClick={() => removeSoonProject(project.id)}
                                className="text-destructive underline text-sm"
                              >
                                Löschen
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="border-t pt-3">
                        <h4 className="font-medium">Neues Projekt hinzufügen</h4>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <Label htmlFor="new-soon-title">Projektname</Label>
                            <Input
                              id="new-soon-title"
                              value={newSoonProjectTitle}
                              onChange={(e) => setNewSoonProjectTitle(e.target.value)}
                              placeholder="z.B. Neue Website-Section"
                            />
                          </div>
                          <div>
                            <Label htmlFor="new-soon-date">Geplantes Fertigstellungsdatum</Label>
                            <Input
                              id="new-soon-date"
                              type="date"
                              value={newSoonProjectTargetDate}
                              onChange={(e) => setNewSoonProjectTargetDate(e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor="new-soon-description">Projektbeschreibung</Label>
                            <Textarea
                              id="new-soon-description"
                              value={newSoonProjectDescription}
                              onChange={(e) => setNewSoonProjectDescription(e.target.value)}
                              placeholder="Kurz beschreiben, was gemacht wird"
                              rows={3}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor="new-soon-status">Status</Label>
                            <Input
                              id="new-soon-status"
                              value={newSoonProjectStatus}
                              onChange={(e) => setNewSoonProjectStatus(e.target.value)}
                              placeholder="z.B. in Bearbeitung, geplant"
                            />
                          </div>
                        </div>
                        <div className="pt-2">
                          <Button onClick={addSoonProject}>Projekt hinzufügen</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Discord Bot Konfiguration - Nur für Owner */}
                  {currentUserGroup === "owner" && (
                    <Card className="mb-6 border-primary/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5 text-primary" />
                          Discord Bot Konfiguration
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="bg-accent/20 border border-accent/30 rounded-md p-4 mb-4">
                          <p className="text-sm text-foreground">
                            <strong>Wichtig:</strong> Diese Einstellungen sind sensibel und sollten nur vom Owner geändert werden.
                            Der Bot Token ist erforderlich, damit Discord-Benachrichtigungen funktionieren.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="discord-token">Discord Bot Token</Label>
                          <Input
                            id="discord-token"
                            type="password"
                            value={websiteConfig.discordBot?.token || ""}
                            onChange={(e) =>
                              setWebsiteConfig({
                                ...websiteConfig,
                                discordBot: {
                                  ...websiteConfig.discordBot,
                                  token: e.target.value,
                                },
                              })
                            }
                            placeholder="Bot Token vom Discord Developer Portal"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Den Token findest du im Discord Developer Portal unter deiner Bot-Anwendung.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="discord-client-id">Discord Client ID</Label>
                          <Input
                            id="discord-client-id"
                            value={websiteConfig.discordBot?.clientId || ""}
                            onChange={(e) =>
                              setWebsiteConfig({
                                ...websiteConfig,
                                discordBot: {
                                  ...websiteConfig.discordBot,
                                  clientId: e.target.value,
                                },
                              })
                            }
                            placeholder="z.B. 1234567890123456789"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Die Client ID findest du im Discord Developer Portal unter "OAuth2".
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="discord-guild-id">Discord Server (Guild) ID</Label>
                          <Input
                            id="discord-guild-id"
                            value={websiteConfig.discordBot?.guildId || ""}
                            onChange={(e) =>
                              setWebsiteConfig({
                                ...websiteConfig,
                                discordBot: {
                                  ...websiteConfig.discordBot,
                                  guildId: e.target.value,
                                },
                              })
                            }
                            placeholder="z.B. 1234567890123456789"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Aktiviere den Entwicklermodus in Discord, dann Rechtsklick auf deinen Server und "Server-ID kopieren".
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-end mb-6 gap-2">
                    {settingsSaved && (
                      <span className="text-secondary text-sm self-center mr-2">Website-Konfiguration gespeichert!</span>
                    )}
                    <Button
                      onClick={saveWebsiteConfig}
                      className="bg-primary hover:bg-primary/80"
                      disabled={settingsSaving}
                    >
                      {settingsSaving ? "Speichert..." : "Konfiguration Speichern"}
                    </Button>
                  </div>
                </div>
              </div>
            )}


            {activeTab === "menu" && hasPermission("menu") && (
              <div className="space-y-6">
                <div className="mb-6 flex gap-4 flex-wrap">
                  <Button onClick={() => setIsAddingNew(true)} className="bg-primary hover:bg-primary/80 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Neues Gericht hinzufügen
                  </Button>
                </div>

                {/* Kategorie-Filter */}
                <div className="bg-card rounded-lg p-4 border border-border">
                  <h3 className="text-sm font-medium text-foreground mb-3">Kategorien</h3>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => setSelectedCategory(null)}
                      variant={selectedCategory === null ? "default" : "outline"}
                      size="sm"
                      className={selectedCategory === null ? "bg-primary text-white" : ""}
                    >
                      Alle
                    </Button>
                    {getCategories().map((category) => (
                      <Button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        variant={selectedCategory === category ? "default" : "outline"}
                        size="sm"
                        className={selectedCategory === category ? "bg-primary text-white" : ""}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>

                {isAddingNew && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Neues Gericht hinzufügen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="new-name">Name</Label>
                          <Input
                            id="new-name"
                            value={newItem.name}
                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-category">Kategorie</Label>
                          <Input
                            id="new-category"
                            value={newItem.category}
                            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                            placeholder="z.B. Vorspeisen, Hauptgerichte, Desserts"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="new-description">Beschreibung</Label>
                        <Textarea
                          id="new-description"
                          value={newItem.description}
                          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="new-price">Preis (€)</Label>
                          <Input
                            id="new-price"
                            value={newItem.price}
                            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-rating">Bewertung</Label>
                          <Input
                            id="new-rating"
                            type="number"
                            min="1"
                            max="5"
                            step="0.1"
                            value={newItem.rating}
                            onChange={(e) => setNewItem({ ...newItem, rating: Number.parseFloat(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="new-image">Bild-URL (optional)</Label>
                        <Input
                          id="new-image"
                          type="url"
                          placeholder="https://example.com/bild.jpg"
                          value={newItem.image || ""}
                          onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                        />
                        <p className="text-sm text-muted-foreground mt-1">Link zu einem Bild des Gerichts</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAddNew} className="bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                          <Save className="h-4 w-4 mr-2" />
                          Hinzufügen
                        </Button>
                        <Button onClick={() => setIsAddingNew(false)} variant="outline">
                          <X className="h-4 w-4 mr-2" />
                          Abbrechen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-8">
                  {Object.entries(itemsByCategory).map(([category, items]) => {
                    // Wenn eine Kategorie ausgewählt ist, nur diese anzeigen
                    if (selectedCategory !== null && category !== selectedCategory) {
                      return null;
                    }

                    return (
                      <div key={category}>
                        <h2 className="text-2xl font-semibold text-foreground mb-4 border-b pb-2">{category}</h2>
                        <div className="space-y-4">
                          {items.map((item) => (
                            <Card key={item.id}>
                              <CardContent className="p-6">
                                {editingItem?.id === item.id ? (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor="edit-name">Name</Label>
                                        <Input
                                          id="edit-name"
                                          value={editingItem.name}
                                          onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="edit-category">Kategorie</Label>
                                        <Input
                                          id="edit-category"
                                          value={editingItem.category}
                                          onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label htmlFor="edit-description">Beschreibung</Label>
                                      <Textarea
                                        id="edit-description"
                                        value={editingItem.description}
                                        onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor="edit-price">Preis (€)</Label>
                                        <Input
                                          id="edit-price"
                                          value={editingItem.price}
                                          onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="edit-rating">Bewertung</Label>
                                        <Input
                                          id="edit-rating"
                                          type="number"
                                          min="1"
                                          max="5"
                                          step="0.1"
                                          value={editingItem.rating}
                                          onChange={(e) =>
                                            setEditingItem({ ...editingItem, rating: Number.parseFloat(e.target.value) })
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label htmlFor="edit-image">Bild-URL (optional)</Label>
                                      <Input
                                        id="edit-image"
                                        type="url"
                                        placeholder="https://example.com/bild.jpg"
                                        value={editingItem.image || ""}
                                        onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })}
                                      />
                                      <p className="text-sm text-muted-foreground mt-1">Link zu einem Bild des Gerichts</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button onClick={handleSave} className="bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                                        <Save className="h-4 w-4 mr-2" />
                                        Speichern
                                      </Button>
                                      <Button onClick={() => setEditingItem(null)} variant="outline">
                                        <X className="h-4 w-4 mr-2" />
                                        Abbrechen
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-start gap-4">
                                    {item.image && (
                                      <div className="flex-shrink-0">
                                        <img
                                          src={item.image || "/placeholder.svg"}
                                          alt={item.name}
                                          className="w-24 h-24 object-cover rounded-lg"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none"
                                          }}
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-xl font-semibold text-foreground">{item.name}</h3>
                                        <Badge variant="secondary">{item.category}</Badge>
                                      </div>
                                      <p className="text-muted-foreground mb-2">{item.description}</p>
                                      <p className="text-sm text-muted-foreground">Bewertung: {item.rating}/5</p>
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="text-2xl font-bold text-primary mb-3">{item.price}</p>
                                      <div className="flex gap-2">
                                        <Button onClick={() => handleEdit(item)} size="sm" variant="outline">
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          onClick={() => handleDelete(item.id)}
                                          size="sm"
                                          variant="outline"
                                          className="text-destructive hover:text-destructive/80"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === "reservations" && hasPermission("reservations") && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold text-foreground">Reservierungen verwalten</h2>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Reservierungen suchen... (z.B. Max oder 123)"
                        value={reservationSearch}
                        onChange={(e) => setReservationSearch(e.target.value)}
                        className="max-w-sm"
                      />
                      {reservationSearch && (
                        <Button
                          onClick={() => setReservationSearch("")}
                          variant="outline"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        onClick={handleArchiveAllReservations}
                        size="sm"
                        variant="destructive"
                        disabled={reservations.filter(res => res.status !== "Archiviert").length === 0}
                      >
                        Alle Reservierungen archivieren
                      </Button>
                    </div>
                  </div>
                  {reservations.filter(res => res.status !== "Archiviert" && (
                    res.name.toLowerCase().includes(reservationSearch.toLowerCase()) ||
                    String(res.id).includes(reservationSearch)
                  )).length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Keine Reservierungen vorhanden</p>
                      </CardContent>
                    </Card>
                  ) : (
                    reservations.filter(res => res.status !== "Archiviert" && (
                      res.name.toLowerCase().includes(reservationSearch.toLowerCase()) ||
                      String(res.id).includes(reservationSearch)
                    )).map((reservation) => (
                      <Card key={reservation.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">{reservation.name}</h3>
                                <Badge variant={reservation.status === "Bestätigt" ? "default" : "secondary"}>
                                  {reservation.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                                <p>
                                  <strong>Reservierungsnummer:</strong> {reservation.id}
                                </p>
                                <p>
                                  <strong>Datum:</strong> {reservation.date || 'N/A'}
                                </p>
                                <p>
                                  <strong>Uhrzeit:</strong> {reservation.time || 'N/A'}
                                </p>
                                <p>
                                  <strong>Personen:</strong> {reservation.guests || 'N/A'}
                                </p>
                                <p>
                                  <strong>Telefon:</strong> {reservation.phone || 'N/A'}
                                </p>
                                <p>
                                  <strong>Discord-ID:</strong> {reservation.email || 'N/A'}
                                </p>
                                <p>
                                  <strong>Eingegangen:</strong> {new Date(reservation.timestamp && reservation.timestamp > 0 ? reservation.timestamp : Date.now()).toLocaleString()}
                                </p>
                              </div>
                              {reservation.notes && (
                                <p className="mt-2 text-sm">
                                  <strong>Notizen:</strong> {reservation.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => updateReservationStatus(reservation.id, "Bestätigt")}
                                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                              >
                                Bestätigen
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateReservationStatus(reservation.id, "Abgelehnt")}
                                className="text-destructive hover:text-destructive/80"
                              >
                                Ablehnen
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => archiveReservationHandler(reservation.id)}>
                                Archivieren
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "orders" && hasPermission("orders") && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold text-foreground">Bestellungen verwalten</h2>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Bestellungen suchen... (z.B. Max oder 123)"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="max-w-sm"
                      />
                      {orderSearch && (
                        <Button
                          onClick={() => setOrderSearch("")}
                          variant="outline"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button onClick={handleArchiveAllOrders} size="sm" variant="destructive" disabled={orders.filter(order => order.status !== "Archiviert").length === 0}>
                        Alle Bestellungen archivieren
                      </Button>
                    </div>
                  </div>
                  {orders.filter(order => order.status !== "Archiviert" && (
                    order.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
                    String(order.id).includes(orderSearch)
                  )).length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Keine Bestellungen vorhanden</p>
                      </CardContent>
                    </Card>
                  ) : (
                    orders.filter(order => order.status !== "Archiviert" && (
                      order.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
                      String(order.id).includes(orderSearch)
                    )).map((order) => (
                      <Card key={order.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">{order.customer_name}</h3>
                                <Badge variant={order.status === "Zubereitet" ? "default" : "secondary"}>
                                  {order.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                                <p>
                                  <strong>Bestellnummer:</strong> {order.id}
                                </p>
                                <p>
                                  <strong>Telefon:</strong> {order.customer_phone}
                                </p>
                                <p>
                                  <strong>Adresse:</strong> {order.notes || "-"}
                                </p>
                                <p>
                                  <strong>Discord-ID:</strong> {order.customer_email}
                                </p>
                                <p>
                                  <strong>Gesamt:</strong> €{order.total}
                                </p>
                                <p>
                                  <strong>Eingegangen:</strong> {new Date(order.created_at || Date.now()).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Bestellte Artikel:</h4>
                                <div className="space-y-1">
                                  {order.items.map((item: any, index: number) => (
                                    <div key={index} className="flex justify-between text-sm">
                                      <span>
                                        {item.quantity}x {item.name}
                                      </span>
                                      <span>€{(Number.parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatusHandler(order.id, "In Zubereitung")}
                                className="bg-accent hover:bg-accent/80 text-accent-foreground"
                              >
                                In Zubereitung
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatusHandler(order.id, "Zubereitet")}
                                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                              >
                                Zubereitet
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatusHandler(order.id, "In Zustellung")}
                                className="bg-yellow-500 hover:bg-yellow-400 text-white"
                              >
                                In Zustellung
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatusHandler(order.id, "Ausgeliefert")}
                                className="bg-primary hover:bg-primary/80 text-primary-foreground"
                              >
                                Ausgeliefert
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatusHandler(order.id, "Keine Person Vorort Aufgefunden")}
                                className="bg-orange-500 hover:bg-red-400 text-white"
                              >
                                Keine Person Vorort Aufgefunden
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => archiveOrderHandler(order.id)}>
                                Archivieren
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "werkstatt" && hasPermission("werkstatt") && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold text-foreground">Werkstatt-Buchungen</h2>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Suchen... (Name oder ID)"
                        value={werkstattSearch}
                        onChange={(e) => setWerkstattSearch(e.target.value)}
                        className="max-w-sm"
                      />
                      {werkstattSearch && (
                        <Button
                          onClick={() => setWerkstattSearch("")}
                          variant="outline"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        onClick={handleArchiveAllWerkstatt}
                        size="sm"
                        variant="destructive"
                        disabled={werkstattOrders.filter(o => o.status !== "Archiviert").length === 0}
                      >
                        Alle Werkstatt-Buchungen archivieren
                      </Button>
                    </div>
                  </div>
                  {werkstattOrders.filter(order =>
                    order.status !== "Archiviert" &&
                    (
                      order.customer_name.toLowerCase().includes(werkstattSearch.toLowerCase()) ||
                      String(order.id).includes(werkstattSearch)
                    )
                  ).length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Keine Werkstatt-Buchungen vorhanden</p>
                      </CardContent>
                    </Card>
                  ) : (
                    werkstattOrders.filter(order =>
                      order.status !== "Archiviert" &&
                      (
                        order.customer_name.toLowerCase().includes(werkstattSearch.toLowerCase()) ||
                        String(order.id).includes(werkstattSearch)
                      )
                    ).map((order) => (
                      <Card key={order.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">{order.customer_name}</h3>
                                <Badge variant={order.status === "Zubereitet" ? "default" : "secondary"}>
                                  {order.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                                <p>
                                  <strong>Buchungsnummer:</strong> {order.id}
                                </p>
                                <p>
                                  <strong>Telefon:</strong> {order.customer_phone}</p>
                                {/* parse notes into vehicle and notizen parts */}
                                {(() => {
                                  const parts = order.notes ? order.notes.split("|").map(p => p.trim()) : []
                                  const vehiclePart = parts.find(p => p.toLowerCase().startsWith("fahrzeug:"))
                                  const notesPart = parts.find(p => p.toLowerCase().startsWith("notizen:"))
                                  return (
                                    <>
                                      <p>
                                        <strong>Notizen:</strong> {notesPart ? notesPart.replace(/^notizen:\s*/i, "") : "-"}
                                      </p>
                                      <p>
                                        <strong>Fahrzeug:</strong> {vehiclePart ? vehiclePart.replace(/^fahrzeug:\s*/i, "") : "-"}
                                      </p>
                                    </>
                                  )
                                })()}
                                <p>
                                  <strong>Discord-ID:</strong> {order.customer_email}
                                </p>
                                <p>
                                  <strong>Gesamt:</strong> €{order.total}
                                </p>
                                <p>
                                  <strong>Eingegangen:</strong> {new Date(order.created_at || Date.now()).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Bestellte Service:</h4>
                                <div className="space-y-1">
                                  {order.items.map((item: any, index: number) => (
                                    <div key={index} className="flex justify-between text-sm">
                                      <span>
                                        {item.quantity}x {item.name}
                                      </span>
                                      <span>€{(Number.parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => updateWerkstattOrderStatusHandler(order.id, "In Zubereitung")}
                                className="bg-accent hover:bg-accent/80 text-accent-foreground"
                              >
                                In Bearbeitung
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateWerkstattOrderStatusHandler(order.id, "Zubereitet")}
                                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                              >
                                Erledigt
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => archiveWerkstattOrderHandler(order.id)}>
                                Archivieren
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "archive" && hasPermission("archive") && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-foreground">Archiv</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg font-semibold">Archivierte Reservierungen</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowArchiveReservations(!showArchiveReservations)}
                        className="gap-2"
                      >
                        {showArchiveReservations ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Einklappen
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Ausklappen
                          </>
                        )}
                      </Button>
                    </div>
                    {showArchiveReservations && (
                      <>
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="Reservierungen suchen... (z.B. Max oder 123)"
                            value={archiveReservationSearch}
                            onChange={(e) => setArchiveReservationSearch(e.target.value)}
                            className="max-w-sm"
                          />
                          {archiveReservationSearch && (
                            <Button
                              onClick={() => setArchiveReservationSearch("")}
                              variant="outline"
                              size="sm"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {reservations.filter(res => res.status === "Archiviert" && (
                          res.name.toLowerCase().includes(archiveReservationSearch.toLowerCase()) ||
                          String(res.id).includes(archiveReservationSearch)
                        )).length === 0 ? (
                          <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Keine archivierten Reservierungen vorhanden</p>
                            </CardContent>
                          </Card>
                        ) : (
                          reservations.filter(res => res.status === "Archiviert" && (
                            res.name.toLowerCase().includes(archiveReservationSearch.toLowerCase()) ||
                            String(res.id).includes(archiveReservationSearch)
                          )).map((reservation) => (
                            <Card key={reservation.id}>
                              <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="text-lg font-semibold">{reservation.name}</h3>
                                      <Badge variant="secondary">
                                        {reservation.status}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                                      <p>
                                        <strong>Reservierungsnummer:</strong> {reservation.id}
                                      </p>
                                      <p>
                                        <strong>Datum:</strong> {reservation.date || 'N/A'}
                                      </p>
                                      <p>
                                        <strong>Uhrzeit:</strong> {reservation.time || 'N/A'}
                                      </p>
                                      <p>
                                        <strong>Gäste:</strong> {reservation.guests || 'N/A'}
                                      </p>
                                      <p>
                                        <strong>Telefon:</strong> {reservation.phone || 'N/A'}
                                      </p>
                                      <p>
                                        <strong>E-Mail:</strong> {reservation.email || 'N/A'}
                                      </p>
                                    </div>
                                    {reservation.notes && (
                                      <p className="text-sm text-muted-foreground mt-2">
                                        <strong>Notizen:</strong> {reservation.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg font-semibold">Archivierte Bestellungen</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowArchiveOrders(!showArchiveOrders)}
                        className="gap-2"
                      >
                        {showArchiveOrders ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Einklappen
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Ausklappen
                          </>
                        )}
                      </Button>
                    </div>
                    {showArchiveOrders && (
                      <>
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="Bestellungen suchen... (z.B. Max oder 123)"
                            value={archiveOrderSearch}
                            onChange={(e) => setArchiveOrderSearch(e.target.value)}
                            className="max-w-sm"
                          />
                          {archiveOrderSearch && (
                            <Button
                              onClick={() => setArchiveOrderSearch("")}
                              variant="outline"
                              size="sm"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {orders.filter(order => order.status === "Archiviert" && (
                          order.customer_name.toLowerCase().includes(archiveOrderSearch.toLowerCase()) ||
                          String(order.id).includes(archiveOrderSearch)
                        )).length === 0 ? (
                          <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Keine archivierten Bestellungen vorhanden</p>
                            </CardContent>
                          </Card>
                        ) : (
                          orders.filter(order => order.status === "Archiviert" && (
                            order.customer_name.toLowerCase().includes(archiveOrderSearch.toLowerCase()) ||
                            String(order.id).includes(archiveOrderSearch)
                          )).map((order) => (
                            <Card key={order.id}>
                              <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="text-lg font-semibold">{order.customer_name}</h3>
                                      <Badge variant="secondary">
                                        {order.status}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                      <p>
                                        <strong>Bestellnummer:</strong> {order.id}
                                      </p>
                                      <p>
                                        <strong>Datum:</strong> {new Date(order.timestamp ?? order.created_at ?? Date.now()).toLocaleDateString('de-DE')}
                                      </p>
                                      <p>
                                        <strong>Telefon:</strong> {order.phone}
                                      </p>
                                      <p>
                                        <strong>Adresse:</strong> {order.address}
                                      </p>
                                      <p>
                                        <strong>Gesamt:</strong> {order.total}€
                                      </p>
                                      <p>
                                        <strong>Discord-ID:</strong> {order.customer_email}
                                      </p>
                                      <p>
                                        <strong>Eingegangen:</strong> {new Date(order.created_at || Date.now()).toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="mt-2">
                                      <strong>Bestellte Artikel:</strong>
                                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                                        {order.items.map((item, idx) => (
                                          <li key={idx}>
                                            {item.name} - {item.quantity}x - {item.price}€
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    {order.notes && (
                                      <p className="text-sm text-muted-foreground mt-2">
                                        <strong>Notizen:</strong> {order.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg font-semibold">Archivierte Werkstatt-Buchungen</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowArchiveWerkstatt(!showArchiveWerkstatt)}
                        className="gap-2"
                      >
                        {showArchiveWerkstatt ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Einklappen
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Ausklappen
                          </>
                        )}
                      </Button>
                    </div>
                    {showArchiveWerkstatt && (
                      <>
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="Werkstatt-Buchungen suchen... (Name oder ID)"
                            value={archiveWerkstattSearch}
                            onChange={(e) => setArchiveWerkstattSearch(e.target.value)}
                            className="max-w-sm"
                          />
                          {archiveWerkstattSearch && (
                            <Button
                              onClick={() => setArchiveWerkstattSearch("")}
                              variant="outline"
                              size="sm"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {werkstattOrders.filter(order => order.status === "Archiviert" && (
                          order.customer_name.toLowerCase().includes(archiveWerkstattSearch.toLowerCase()) ||
                          String(order.id).includes(archiveWerkstattSearch)
                        )).length === 0 ? (
                          <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Keine archivierten Werkstatt-Buchungen vorhanden</p>
                            </CardContent>
                          </Card>
                        ) : (
                          werkstattOrders.filter(order => order.status === "Archiviert" && (
                            order.customer_name.toLowerCase().includes(archiveWerkstattSearch.toLowerCase()) ||
                            String(order.id).includes(archiveWerkstattSearch)
                          )).map((order) => (
                            <Card key={order.id}>
                              <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="text-lg font-semibold">{order.customer_name}</h3>
                                      <Badge variant="secondary">{order.status}</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                                      <p><strong>Buchungsnummer:</strong> {order.id}</p>
                                      <p><strong>Telefon:</strong> {order.customer_phone}</p>
                                      <p><strong>Notizen:</strong> {order.notes || "-"}</p>
                                      <p><strong>Discord-ID:</strong> {order.customer_email}</p>
                                      <p><strong>Gesamt:</strong> €{order.total}</p>
                                      <p><strong>Eingegangen:</strong> {new Date(order.created_at || Date.now()).toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">Bestellte Service:</h4>
                                      <div className="space-y-1">
                                        {order.items.map((item: any, index: number) => (
                                          <div key={index} className="flex justify-between text-sm">
                                            <span>
                                              {item.quantity}x {item.name}
                                            </span>
                                            <span>€{(Number.parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "kalender" && hasPermission("kalender_or_view") && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">Kalender</h2>
                    <div className="flex items-center gap-2">
                      {(['day', 'week', 'month', 'year'] as const).map((mode) => (
                        <Button
                          key={mode}
                          size="sm"
                          variant={calendarView === mode ? 'default' : 'outline'}
                          onClick={() => setCalendarView(mode)}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => changePeriod(-1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const now = new Date()
                      setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                      setCalendarDate(now.toISOString().slice(0, 10))
                    }}>
                      Heute
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => changePeriod(1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Zeitraum:</span>
                  <span>{getCalendarTitle()}</span>
                </div>

                <div className="flex justify-start">
                  <Button
                    onClick={() => {
                      setEditingCalendarEvent(null)
                      setSelectedCalendarEvent(null)
                      setCalendarEventTitle("")
                      setCalendarEventStartTime("12:00")
                      setCalendarEventEndTime("13:00")
                      setCalendarEventLocation("")
                      setCalendarEventDescription("")
                      setShowEventDialog(true)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Neues Ereignis eintragen
                  </Button>
                </div>

                {calendarView === 'day' ? (() => {
                  const selectedDate = calendarDate
                  const dayEvents = getEventsForDay(selectedDate)
                  const dayReservations = getReservationsForDay(selectedDate).filter((res) => res.status !== 'Neu' && res.status !== 'Abgelehnt')
                  const allDayEntries = [
                    ...dayEvents.map((item: CalendarEvent) => {
                      const startNorm = normalizeTimeString(item.startTime)
                      const endNorm = normalizeTimeString(item.endTime)
                      if (!startNorm || !endNorm) return null
                      const [startH, startM] = startNorm.split(':').map(Number)
                      const [endH, endM] = endNorm.split(':').map(Number)
                      return {
                        id: item.id,
                        title: item.title,
                        start: startH * 60 + startM,
                        end: endH * 60 + endM,
                        time: `${startNorm} - ${endNorm}`,
                        type: 'event' as const,
                        location: item.location || '',
                        description: item.description || '',
                        originalEvent: item,
                      }
                    }),
                    ...dayReservations.map((item: any) => {
                      const startNorm = normalizeTimeString(item.time || item.zeit || '')
                      if (!startNorm) return null
                      const [startH, startM] = startNorm.split(':').map(Number)
                      const startMinutes = startH * 60 + startM
                      const endMinutes = startMinutes + 60 // Reservierungen dauern 60 Minuten
                      const endH = Math.floor(endMinutes / 60)
                      const endM = endMinutes % 60
                      return {
                        id: item.id ?? `${item.name}-${startNorm}-${Math.random()}`,
                        title: `${item.name || 'Reservierung'} (${item.guests || '?'} Pers.)`,
                        start: startMinutes,
                        end: endMinutes,
                        time: `${startNorm} - ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
                        type: 'reservation' as const,
                        reservationId: item.id,
                      }
                    }),
                  ].filter(Boolean) as Array<{ id: string | number; title: string; start: number; end: number; time: string; type: 'event' | 'reservation'; reservationId?: number; location?: string; description?: string; originalEvent?: CalendarEvent }>

                  // Zeige Stunden von 00:00 bis 24:00 (kompletter Tag)
                  const startHour = 0
                  const endHour = 24
                  const pixelsPerMinute = 1 // 1px pro Minute = 60px pro Stunde (passt zu h-[60px])

                  return (
                    <div className="border border-gray-700 rounded-md bg-slate-900 p-2 text-slate-100">
                      <div className="text-sm font-semibold mb-2 text-slate-100">
                        {new Date(calendarDate).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <div className="relative flex overflow-y-auto max-h-[600px]">
                        {/* Zeitachse links */}
                        <div className="w-16 flex-shrink-0">
                          {Array.from({ length: endHour - startHour }, (_, i) => {
                            const hour = startHour + i
                            return (
                              <div key={`time-${hour}`} className="h-[60px] border-t border-gray-700 text-right pr-2 text-xs text-slate-400">
                                {String(hour).padStart(2, '0')}:00
                              </div>
                            )
                          })}
                        </div>
                        {/* Kalender-Grid mit Events */}
                        <div className="flex-1 relative" style={{ height: `${(endHour - startHour) * 60}px` }}>
                          {/* Horizontale Linien für jede Stunde */}
                          {Array.from({ length: endHour - startHour }, (_, i) => (
                            <div key={`line-${i}`} className="absolute w-full border-t border-gray-700" style={{ top: `${i * 60}px` }} />
                          ))}
                          {/* Horizontale Linien für jede halbe Stunde */}
                          {Array.from({ length: endHour - startHour }, (_, i) => (
                            <div key={`line-half-${i}`} className="absolute w-full border-t border-gray-700/50 border-dashed" style={{ top: `${i * 60 + 30}px` }} />
                          ))}
                          {/* Events als positionierte Bloecke */}
                          {allDayEntries.map((entry) => {
                            const topOffset = (entry.start - startHour * 60) * pixelsPerMinute
                            const height = (entry.end - entry.start) * pixelsPerMinute
                            // Nur anzeigen wenn im sichtbaren Bereich
                            if (entry.start < startHour * 60 || entry.end > endHour * 60) return null

                            return (
                              <div
                                key={entry.id}
                                onMouseDown={(e) => {
                                  if (entry.type !== 'event' || !entry.originalEvent) return
                                  if (!e.shiftKey) return
                                  e.preventDefault()

                                  const offsetY = (e.nativeEvent as MouseEvent).offsetY
                                  const edgeThreshold = 8
                                  let mode: 'move' | 'resize-start' | 'resize-end' = 'move'
                                  if (offsetY <= edgeThreshold) {
                                    mode = 'resize-start'
                                  } else if (offsetY >= height - edgeThreshold) {
                                    mode = 'resize-end'
                                  }

                                  setDraggingMode(mode)
                                  setIsDraggingEvent(true)
                                  setDraggingEventId(entry.originalEvent.id as number)
                                  setDraggingStartY(e.clientY)
                                  setDraggingOriginalStart(entry.start)
                                  setDraggingOriginalEnd(entry.end)
                                }}
                                onClick={(e) => {
                                  if (entry.type !== 'event' || !entry.originalEvent) return
                                  if (e.shiftKey) return
                                  const ev = calendarEvents.find((ce) => ce.id === entry.originalEvent?.id)
                                  if (ev) {
                                    setSelectedCalendarEvent(ev)
                                    setShowEventDetailsDialog(true)
                                  }
                                }}
                                className={`absolute left-1 right-8 rounded-md px-2 py-1 text-xs text-white overflow-hidden ${entry.type === 'reservation'
                                  ? 'bg-emerald-600 border border-emerald-400'
                                  : 'bg-sky-500 border border-cyan-300'
                                  } ${entry.type === 'event' ? (isDraggingEvent ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
                                style={{
                                  top: `${topOffset}px`,
                                  height: `${Math.max(height, 20)}px`,
                                }}
                              >
                                <div className="font-semibold truncate">{entry.time}</div>
                                <div className="truncate">{entry.title}</div>
                                {entry.location && (
                                  <div className="text-[10px] text-slate-100/90 truncate">{entry.location}</div>
                                )}
                              </div>
                            )
                          })}
                          {/* Delete buttons for entries */}
                          {allDayEntries.map((entry) => {
                            const topOffset = (entry.start - startHour * 60) * pixelsPerMinute
                            if (entry.start < startHour * 60 || entry.end > endHour * 60) return null
                            if (entry.type !== 'event') return null

                            return (
                              <button
                                key={`delete-${entry.id}`}
                                onClick={() => {
                                  deleteCalendarEvent(entry.id as number)
                                }}
                                className="absolute right-1 w-6 h-6 flex items-center justify-center rounded bg-red-600 hover:bg-red-700 text-white text-xs"
                                style={{
                                  top: `${topOffset + 2}px`,
                                }}
                                title="Löschen"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      {/* Legende */}
                      <div className="mt-4 flex gap-4 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-emerald-600 border border-emerald-400" />
                          <span>Reservierung (60 Min.)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-sky-500 border border-cyan-300" />
                          <span>Ereignis</span>
                        </div>
                      </div>
                    </div>
                  )
                })() : (
                  <div className={`grid ${calendarView === 'year' ? 'grid-cols-3' : 'grid-cols-7'} gap-1 border border-border rounded-md bg-background p-1`}>
                    {getCalendarGrid().map((day) => {
                      if (calendarView === 'year') {
                        const monthIndex = day.getMonth()
                        const daysInMonth = getDaysInMonth(day.getFullYear(), monthIndex)
                        const firstWeekday = (new Date(day.getFullYear(), monthIndex, 1).getDay() + 6) % 7

                        return (
                          <div key={`month-${monthIndex}`} className="rounded-md border border-border p-2 bg-card">
                            <h4 className="text-sm font-semibold mb-1">{day.toLocaleDateString('de-DE', { month: 'long' })}</h4>
                            <div className="grid grid-cols-7 gap-0.5 text-[10px] text-center text-muted-foreground">
                              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                                <div key={`${monthIndex}-${d}`} className="font-semibold">{d}</div>
                              ))}
                              {Array.from({ length: firstWeekday }).map((_, idx) => (
                                <div key={`empty-${monthIndex}-${idx}`} />
                              ))}
                              {Array.from({ length: daysInMonth }, (_, idx) => {
                                const dayNum = idx + 1
                                const dateKey = `${day.getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                                const isToday = dateKey === formatDateKey(new Date())

                                return (
                                  <button
                                    key={`${monthIndex}-${dayNum}`}
                                    onClick={() => {
                                      setCalendarDate(dateKey)
                                      setCalendarMonth(new Date(day.getFullYear(), monthIndex, 1))
                                      setCalendarView('day')
                                    }}
                                    className={`rounded-sm h-6 ${isToday ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary/20'} ${dateKey === calendarDate ? 'font-bold border border-primary' : ''}`}
                                  >
                                    {dayNum}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      }

                      const dayKey = formatDateKey(day)
                      const isCurrentMonth = day.getMonth() === calendarMonth.getMonth()
                      const dayEvents = getEventsForDay(dayKey)
                      const dayReservations = getReservationsForDay(dayKey)
                      const isSelected = dayKey === calendarDate

                      return (
                        <button
                          key={dayKey}
                          onClick={() => {
                            setCalendarDate(dayKey)
                            setCalendarMonth(new Date(day.getFullYear(), day.getMonth(), 1))
                            if (calendarView === 'month' || calendarView === 'week') {
                              setCalendarView('day')
                            }
                          }}
                          className={`p-1 text-left rounded-md border ${isSelected ? 'border-primary bg-primary/10' : 'border-transparent'} ${calendarView === 'month' && !isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : 'bg-background'} h-20`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`text-xs ${isSelected ? 'font-bold text-primary' : 'text-sm'}`}>{day.getDate()}</span>
                            {dayKey === formatDateKey(new Date()) && <span className="text-[10px] bg-accent text-accent-foreground px-1 rounded">Heute</span>}
                          </div>

                          <div className="mt-1 space-y-0.5 text-[11px] overflow-hidden" style={{ maxHeight: '72px' }}>
                            {dayEvents.slice(0, 2).map((event) => (
                              <div key={event.id} className="rounded-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-1 truncate">
                                {event.title}
                              </div>
                            ))}
                            {dayReservations.slice(0, 2).map((res) => (
                              <div key={`r-${res.id}`} className="rounded-sm bg-emerald-600 text-white px-1 truncate">
                                {res.name || 'Reservierung'}
                              </div>
                            ))}
                            {dayEvents.length + dayReservations.length > 2 && (
                              <div className="text-[10px] text-muted-foreground">+{dayEvents.length + dayReservations.length - 2} weitere</div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="space-y-4">
                  {showEventDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEventDialog(false)}>
                      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-3 border-b border-border">
                          <div className="w-6" />
                          <span className="text-sm font-medium">{editingCalendarEvent ? "Ereignis bearbeiten" : "Neues Ereignis"}</span>
                          <button onClick={() => setShowEventDialog(false)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="p-4 space-y-4">
                          <input
                            type="text"
                            value={calendarEventTitle}
                            onChange={(e) => setCalendarEventTitle(e.target.value)}
                            placeholder="Titel hinzufügen"
                            className="w-full bg-transparent text-xl font-normal border-b-2 border-blue-500 pb-2 focus:outline-none placeholder:text-muted-foreground"
                            autoFocus
                          />

                          <div className="flex items-center gap-3 text-sm">
                            <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="date"
                                value={calendarDate}
                                onChange={(e) => setCalendarDate(e.target.value)}
                                className="bg-transparent border-none focus:outline-none text-foreground"
                              />
                              <input
                                type="time"
                                value={calendarEventStartTime}
                                onChange={(e) => setCalendarEventStartTime(e.target.value)}
                                className="bg-transparent border-none focus:outline-none text-foreground w-20"
                              />
                              <span className="text-muted-foreground">-</span>
                              <input
                                type="time"
                                value={calendarEventEndTime}
                                onChange={(e) => setCalendarEventEndTime(e.target.value)}
                                className="bg-transparent border-none focus:outline-none text-foreground w-20"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-sm">
                            <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <input
                              type="text"
                              value={calendarEventLocation}
                              onChange={(e) => setCalendarEventLocation(e.target.value)}
                              placeholder="Ort hinzufügen"
                              className="w-full bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground"
                            />
                          </div>

                          <div className="flex items-start gap-3 text-sm">
                            <AlignLeft className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <textarea
                              value={calendarEventDescription}
                              onChange={(e) => setCalendarEventDescription(e.target.value)}
                              placeholder="Beschreibung hinzufügen"
                              className="w-full bg-transparent border-none focus:outline-none resize-none text-foreground placeholder:text-muted-foreground min-h-[60px]"
                            />
                          </div>

                          <div className="flex justify-end pt-2">
                            <Button
                              onClick={addCalendarEvent}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                            >
                              Speichern
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {showEventDetailsDialog && selectedCalendarEvent && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
                      setShowEventDetailsDialog(false)
                      setSelectedCalendarEvent(null)
                    }}>
                      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-3 border-b border-border">
                          <h3 className="text-sm font-medium">Ereignisdetails</h3>
                          <button onClick={() => {
                            setShowEventDetailsDialog(false)
                            setSelectedCalendarEvent(null)
                          }} className="text-muted-foreground hover:text-foreground">
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="p-4 space-y-3 text-sm">
                          <p className="font-semibold text-base">{selectedCalendarEvent.title}</p>
                          <p className="text-muted-foreground">Datum: {selectedCalendarEvent.date || calendarDate}</p>
                          <p className="text-muted-foreground">Uhrzeit: {selectedCalendarEvent.startTime} - {selectedCalendarEvent.endTime}</p>
                          {selectedCalendarEvent.location && <p className="text-muted-foreground">Ort: {selectedCalendarEvent.location}</p>}
                          {selectedCalendarEvent.description && <p className="text-muted-foreground">Beschreibung: {selectedCalendarEvent.description}</p>}
                          <div className="flex justify-between pt-2">
                            <Button variant="secondary" onClick={() => {
                              if (selectedCalendarEvent) {
                                setEditingCalendarEvent(selectedCalendarEvent)
                                setCalendarEventTitle(selectedCalendarEvent.title)
                                setCalendarEventStartTime(selectedCalendarEvent.startTime)
                                setCalendarEventEndTime(selectedCalendarEvent.endTime)
                                setCalendarEventLocation(selectedCalendarEvent.location || "")
                                setCalendarEventDescription(selectedCalendarEvent.description || "")
                                setShowEventDetailsDialog(false)
                                setShowEventDialog(true)
                              }
                            }}>
                              Bearbeiten
                            </Button>
                            <Button variant="outline" onClick={() => {
                              setShowEventDetailsDialog(false)
                              setSelectedCalendarEvent(null)
                            }}>
                              Schließen
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {getEventsForDay(calendarDate).length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Ereignisse am {new Date(calendarDate).toLocaleDateString('de-DE')}</h3>
                      {getEventsForDay(calendarDate).map((event) => (
                        <div
                          key={event.id}
                          className="flex justify-between items-center bg-blue-500/10 text-blue-700 p-3 rounded-md hover:bg-blue-500/20"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{event.title}</span>
                            <span className="text-xs">{event.startTime} - {event.endTime}{event.location ? ` | ${event.location}` : ''}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={(e) => {
                              e.stopPropagation()
                              setEditingCalendarEvent(event)
                              setCalendarEventTitle(event.title)
                              setCalendarEventStartTime(event.startTime)
                              setCalendarEventEndTime(event.endTime)
                              setCalendarEventLocation(event.location || "")
                              setCalendarEventDescription(event.description || "")
                              setShowEventDetailsDialog(false)
                              setSelectedCalendarEvent(null)
                              setShowEventDialog(true)
                            }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => {
                              e.stopPropagation()
                              deleteCalendarEvent(event.id)
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {getReservationsForDay(calendarDate).filter((res) => res.status !== 'Neu' && res.status !== 'Abgelehnt').length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Reservierungen am {new Date(calendarDate).toLocaleDateString('de-DE')}</h3>
                      {getReservationsForDay(calendarDate).filter((res) => res.status !== 'Neu' && res.status !== 'Abgelehnt').map((res) => (
                        <div key={`r-${res.id}`} className="flex justify-between items-center bg-emerald-500/10 text-emerald-700 p-3 rounded-md">
                          <span className="text-sm">{res.time || '-'} - {res.name} ({res.guests} Pers.)</span>
                          <span className="text-xs text-muted-foreground">Löschen deaktiviert</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "reviews" && hasPermission("reviews") && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold text-foreground">Bewertungen verwalten</h2>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleDeleteAllRestaurantReviews}
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive/80 bg-transparent"
                        disabled={reviews.length === 0 || !hasPermission("reviews")}
                      >
                        Alle Restaurant-Bewertungen löschen
                      </Button>
                      <Button
                        onClick={handleDeleteAllMenuRatings}
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive/80 bg-transparent"
                        disabled={menuRatings.length === 0 || !hasPermission("reviews")}
                      >
                        Alle Essens-Bewertungen löschen
                      </Button>
                      <Button
                        onClick={handleDeleteAllReviews}
                        size="sm"
                        variant="destructive"
                        disabled={(reviews.length === 0 && menuRatings.length === 0) || !hasPermission("reviews")}
                      >
                        ALLE Bewertungen löschen
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-foreground">Restaurant-Bewertungen ({reviews.length})</h3>
                    {reviews.length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Keine Restaurant-Bewertungen vorhanden</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <Card key={review.id}>
                            <CardContent className="p-6">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-lg font-semibold">{review.name}</h4>
                                    <div className="flex items-center gap-1">
                                      {renderStars(review.rating)}
                                      <span className="text-sm text-muted-foreground ml-1">({review.rating}/5)</span>
                                    </div>
                                  </div>
                                  <p className="text-muted-foreground mb-2">{review.comment}</p>
                                  <p className="text-sm text-muted-foreground">Eingegangen am: {review.date || new Date().toLocaleDateString("de-DE")}</p>
                                </div>
                                <div className="ml-4">
                                  <Button
                                    onClick={() => handleDeleteReview(String(review.id))}
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive hover:text-destructive/80"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-foreground">Essens-Bewertungen ({menuRatings.length})</h3>
                    {menuRatings.length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Keine Essens-Bewertungen vorhanden</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {menuRatings
                          .sort((a, b) => b.timestamp - a.timestamp)
                          .map((rating) => (
                            <Card key={rating.timestamp}>
                              <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="text-lg font-semibold">{rating.customerName}</h4>

                                      <div className="flex items-center gap-1">
                                        {renderStars(rating.rating)}
                                        <span className="text-sm text-muted-foreground ml-1">({rating.rating}/5)</span>
                                      </div>
                                    </div>
                                    <p className="text-sm text-accent mb-2 font-medium">
                                      Gericht: {getMenuItemName(rating.menuItemId)}
                                    </p>
                                    <p className="text-muted-foreground mb-2">{rating.comment || "Keine Kommentare"}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Eingegangen am: {new Date(rating.timestamp && rating.timestamp > 0 ? rating.timestamp : Date.now()).toLocaleDateString("de-DE")}
                                    </p>
                                  </div>
                                  <div className="ml-4">
                                    <Button
                                      onClick={() => handleDeleteMenuRating(rating.timestamp)}
                                      size="sm"
                                      variant="outline"
                                      disabled={!hasPermission("reviews")}
                                      className="text-destructive hover:text-destructive/80"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <div className="space-y-6">
                <div className="mb-6 flex gap-4 flex-col">
                  <Button onClick={() => setIsAddingUser(true)} className="bg-primary hover:bg-primary/80 text-white w-fit">
                    <Plus className="h-4 w-4 mr-2" />
                    Neuen Mitarbeiter Einstellen
                  </Button>

                  {/* Benutzer-Suchfeld */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Mitarbeiter suchen... (z.B. Max Mustermann)"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="max-w-sm"
                    />
                    {userSearchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUserSearchQuery("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {isAddingUser && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Neuen Mitarbeiter Einstellen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="new-username">Mitarbeitername</Label>
                          <Input
                            id="new-username"
                            value={newUser.username}
                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="new-image">Profilbild (optional)</Label>
                          <Input
                            id="new-image"
                            type="url"
                            value={newUser.image || ""}
                            onChange={(e) => setNewUser({ ...newUser, image: e.target.value })}
                            placeholder="https://example.com/bild.jpg"
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            Sie können eine URL zu einem Profilbild angeben. Dies wird auf der Team-Seite angezeigt.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="new-discord-id">Discord User ID (optional)</Label>
                          <Input
                            id="new-discord-id"
                            value={newUser.discordUserId || ""}
                            onChange={(e) => setNewUser({ ...newUser, discordUserId: e.target.value })}
                            placeholder="z.B. 123456789012345678"
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            Wenn angegeben, erhält der Mitarbeiter eine DM mit den Login-Daten. Das Passwort wird automatisch
                            generiert.
                          </p>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="new-group">Mitarbeitergruppe</Label>
                        <Select value={newUser.group} onValueChange={(value) => setNewUser({ ...newUser, group: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Gruppe auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(getAllRanks()).map(([key, rank]) => (
                              <SelectItem key={key} value={key} disabled={!canEditUser(key)}>
                                {rank.name} (Level {rank.level})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAddUser}
                          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                          disabled={!newUser.username}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Hinzufügen
                        </Button>
                        <Button onClick={() => setIsAddingUser(false)} variant="outline">
                          <X className="h-4 w-4 mr-2" />
                          Abbrechen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {resetPasswordUser && (
                  <Card className="mb-6 border-primary/30 bg-primary/10">
                    <CardHeader>
                      <CardTitle className="text-foreground">Passwort zurückgesetzt</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4">
                        Das temporäre Passwort für <strong>{resetPasswordUser.username}</strong> lautet:
                      </p>
                      <div className="bg-card p-4 rounded border border-border font-mono text-lg text-center text-card-foreground">{temporaryPassword}</div>
                      <p className="text-sm text-muted-foreground mt-4">
                        Bitte teilen Sie dieses Passwort dem Mitarbeiter mit. Der Mitarbeiter muss das Passwort beim nächsten
                        Login ändern.
                      </p>
                      <Button
                        onClick={() => {
                          setResetPasswordUser(null)
                          setTemporaryPassword("")
                        }}
                        className="mt-4"
                      >
                        Verstanden
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* kündigungs-Modal */}
                {terminatingUser && (
                  <Card className="mb-6 border-destructive bg-destructive/10">
                    <CardHeader>
                      <CardTitle className="text-destructive">Mitarbeiter kündigen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4">
                        Sie sind dabei, <strong>{terminatingUser.username}</strong> zu kündigen.
                        Bitte geben Sie einen Grund an:
                      </p>
                      <Textarea
                        value={terminationReason}
                        onChange={(e) => setTerminationReason(e.target.value)}
                        placeholder="Grund für die kündigung eingeben..."
                        className="mb-4"
                        rows={3}
                      />
                      <p className="text-sm text-muted-foreground mb-4">
                        Der Mitarbeiter erhaelt eine Discord-DM mit dem Grund.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={confirmTerminateUser}
                          variant="destructive"
                          disabled={!terminationReason.trim()}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          kündigen
                        </Button>
                        <Button
                          onClick={() => {
                            setTerminatingUser(null)
                            setTerminationReason("")
                          }}
                          variant="outline"
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-4">
                  {users
                    .filter((user) =>
                      user.username.toLowerCase().includes(userSearchQuery.toLowerCase())
                    )
                    .map((user) => (
                      <Card key={user.id}>
                        <CardContent className="p-6">
                          {editingUser?.id === user.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="edit-username">Mitarbeitername</Label>
                                  <Input
                                    id="edit-username"
                                    value={editingUser.username}
                                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-password">Passwort</Label>
                                  <Input
                                    id="edit-password"
                                    type="password"
                                    value={editingUser.password}
                                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="edit-image">Profilbild</Label>
                                <Input
                                  id="edit-image"
                                  type="url"
                                  value={editingUser.image || ""}
                                  onChange={(e) => setEditingUser({ ...editingUser, image: e.target.value })}
                                  placeholder="https://platzhalter.com/bild.jpg"
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-group">Mitarbeitergruppe</Label>
                                <Select
                                  value={editingUser.group}
                                  onValueChange={(value) => setEditingUser({ ...editingUser, group: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(getAllRanks()).map(([key, rank]) => (
                                      <SelectItem key={key} value={key} disabled={!canEditUser(key)}>
                                        {rank.name} (Level {rank.level})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="edit-discord-id">Discord User ID (optional)</Label>
                                <Input
                                  id="edit-discord-id"
                                  value={editingUser.discordUserId || ""}
                                  onChange={(e) => setEditingUser({ ...editingUser, discordUserId: e.target.value })}
                                  placeholder="z.B. 123456789012345678"
                                />
                                <p className="text-sm text-muted-foreground mt-1">Wenn angegeben, erhält der Mitarbeiter Discord-Benachrichtigungen.</p>
                              </div>

                              <div className="flex gap-2">
                                <Button onClick={handleSaveUser} className="bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                                  <Save className="h-4 w-4 mr-2" />
                                  Speichern
                                </Button>
                                <Button onClick={() => setEditingUser(null)} variant="outline">
                                  <X className="h-4 w-4 mr-2" />
                                  Abbrechen
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                {user.image ? (
                                  <img
                                    src={user.image || "/placeholder.svg"}
                                    alt={user.username}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                ) : (
                                  <Users className="h-8 w-8 text-primary" />
                                )}
                                <div>
                                  <h3 className="text-lg font-semibold text-foreground">{user.username}</h3>
                                  <div className="flex gap-2 flex-wrap">
                                    <Badge variant="secondary">{user.role}</Badge>
                                    <Badge variant={user.group === "owner" ? "default" : "outline"}>
                                      {getAllRanks()[user.group]?.name || user.group}
                                    </Badge>
                                    {user.warningCount && user.warningCount > 0 && (
                                      <Badge variant="destructive">Abmahnungen: {user.warningCount}</Badge>
                                    )}
                                    {user.suspendedUntil && new Date(user.suspendedUntil) > new Date() && (
                                      <Badge variant="destructive">
                                        Suspendiert bis {(() => {
                                          const d = new Date(user.suspendedUntil!)
                                          d.setDate(d.getDate() - 1)
                                          return d.toLocaleDateString('de-DE')
                                        })()
                                        }
                                      </Badge>
                                    )}
                                    {user.mustChangePassword && (
                                      <Badge variant="destructive">Passwort ändern erforderlich</Badge>
                                    )}
                                    {!user.dienstvorschriftenAccepted && (
                                      <Badge variant="destructive">Dienstvorschriften ausstehend</Badge>
                                    )}
                                    {user.dienstvorschriftenAccepted && (
                                      <Badge variant="default">Dienstvorschriften akzeptiert</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {/* Bearbeiten/Löschen Buttons nur für niedrigere Ränge anzeigen */}
                              <div className="flex gap-2 flex-wrap justify-end">
                                {user.dienstvorschriftenAccepted && (
                                  <Button
                                    onClick={async () => {
                                      const success = await updateUser(user.id, { dienstvorschriftenAccepted: false })
                                      if (success) {
                                        setUsers(users.map((u) => u.id === user.id ? { ...u, dienstvorschriftenAccepted: false } : u))
                                      }
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="text-yellow-600 hover:text-yellow-700"
                                    disabled={!canEditUser(user.group)}
                                  >
                                    Dienstvorschriften zurücksetzen
                                  </Button>
                                )}
                                <Button
                                  onClick={() => handleWarnUser(user)}
                                  size="sm"
                                  variant="outline"
                                  className="text-yellow-600 hover:text-yellow-700"
                                  disabled={!canEditUser(user.group)}
                                >
                                  Abmahnen
                                </Button>
                                <Button
                                  onClick={() => setSuspendModalUser(user)}
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700"
                                  disabled={!canEditUser(user.group)}
                                >
                                  Suspendieren
                                </Button>
                                {user.suspendedUntil && new Date(user.suspendedUntil) > new Date() && canEditUser(user.group) && (
                                  <Button
                                    onClick={() => handleLiftSuspension(user)}
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    Suspendierung aufheben
                                  </Button>
                                )}
                                <Button
                                  onClick={() => handleResetPassword(user)}
                                  size="sm"
                                  variant="outline"
                                  className="text-accent hover:text-accent/80"
                                  disabled={!canEditUser(user.group)}
                                >
                                  <Key className="h-4 w-4 mr-1" />
                                  Passwort zurücksetzen
                                </Button>
                                <Button
                                  onClick={() => handleEditUser(user)}
                                  size="sm"
                                  variant="outline"
                                  className="text-secondary hover:text-secondary/80"
                                  disabled={!canEditUser(user.group)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Bearbeiten
                                </Button>
                                <Button
                                  onClick={() => handleDeleteUser(user.id)}
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive/80"
                                  disabled={!canEditUser(user.group)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Kündigen
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* modal für Suspendierung */}
            {suspendModalUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="fixed inset-0 bg-black/50" onClick={() => setSuspendModalUser(null)} />
                <Card className="w-full max-w-md mx-4 z-10">
                  <CardHeader>
                    <CardTitle>Suspendierung für {suspendModalUser.username}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="suspend-until">Bis Datum</Label>
                      <Input
                        id="suspend-until"
                        type="date"
                        value={suspendUntil}
                        onChange={(e) => setSuspendUntil(e.target.value)}
                      />
                    </div>
                  </CardContent>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setSuspendModalUser(null)}>
                      Abbrechen
                    </Button>
                    <Button onClick={handleSuspendUserConfirm}>Suspendieren</Button>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "hausverbote" && hasPermission("hausverbote") && (
              <div className="space-y-6">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">Hausverbote</h2>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowHausverbotModal(true)} className="bg-primary hover:bg-primary/80 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Neues Hausverbot
                    </Button>
                  </div>
                </div>

                {hausverbote.length === 0 ? (
                  <Card>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Keine Hausverbote vorhanden.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {hausverbote.map((h: any) => (
                      <Card key={h.id || h.timestamp}>
                        <CardContent className="flex justify-between items-start">
                          <div className="flex items-start gap-4">
                            {h.photo ? (
                              <img src={h.photo} alt={`Foto ${h.who}`} className="w-24 h-24 object-cover rounded" />
                            ) : (
                              <div className="w-24 h-24 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">kein Foto</div>
                            )}

                            <div>
                              <h3 className="font-semibold">{h.who}</h3>
                              <p className="text-sm text-muted-foreground">{h.reason}</p>
                              <p className="text-sm mt-1"><strong>Von:</strong> {h.fromDate ? new Date(h.fromDate).toLocaleDateString('de-DE') : "-"} <strong>Bis:</strong> {h.toDate ? new Date(h.toDate).toLocaleDateString('de-DE') : "-"}</p>
                              <p className="text-sm mt-1"><strong>Mitarbeiter:</strong> {h.employee ?? h.addedBy ?? h.createdBy ?? "-"}</p>
                              <p className="text-xs text-muted-foreground mt-2">{new Date(h.timestamp).toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button variant="outline" onClick={() => handleDeleteHausverbot(h.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-1" /> Löschen
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {showHausverbotModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setShowHausverbotModal(false)} />
                    <div className="bg-card p-6 rounded-lg shadow-lg z-10 w-full max-w-md max-h-[80vh] flex flex-col">
                      <h3 className="text-lg font-semibold mb-4">Hausverbot eintragen</h3>
                      <div className="space-y-3 overflow-auto flex-1 pr-2">
                        <div>
                          <Label>Wer</Label>
                          <Input value={hausverbotWho} onChange={(e) => setHausverbotWho(e.target.value)} placeholder="Name oder Identifikation" />
                        </div>
                        <div>
                          <Label>Warum</Label>
                          <Textarea value={hausverbotReason} onChange={(e) => setHausverbotReason(e.target.value)} placeholder="Grund" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Von</Label>
                            <Input
                              type="date"
                              value={hausverbotFromDate}
                              onChange={(e) => setHausverbotFromDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <div>
                            <Label>Bis</Label>
                            <Input
                              type="date"
                              value={hausverbotToDate}
                              onChange={(e) => setHausverbotToDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Mitarbeiter</Label>
                          <Input value={hausverbotEmployee} onChange={(e) => setHausverbotEmployee(e.target.value)} placeholder="Name des Mitarbeiters" />
                        </div>
                        <div>
                          <Label>Foto (Link)</Label>
                          <Input value={hausverbotPhotoUrl} onChange={(e) => setHausverbotPhotoUrl(e.target.value)} placeholder="https://..." />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowHausverbotModal(false)}>Abbrechen</Button>
                        <Button onClick={handleSaveHausverbot}>Speichern</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "rabattcodes" && hasPermission("rabattcodes_or_view") && (
              <div className="space-y-6">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">Rabattcodes</h2>
                  {canManageDiscountCodes() && (
                    <Button onClick={openNewDiscountModal} className="bg-green-600 hover:bg-green-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Neuer Rabattcode
                    </Button>
                  )}
                </div>

                {discountCodes.length === 0 ? (
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground text-center">Keine Rabattcodes vorhanden.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {discountCodes.map((discount) => {
                      const isExpired = new Date(discount.validUntil) < new Date()
                      const isMaxedOut = discount.usageCount >= discount.maxUsages
                      const isActive = discount.active !== false

                      return (
                        <Card key={discount.id} className="border-l-4 border-l-green-600">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="text-center">
                                <h3 className="text-2xl font-bold text-foreground font-mono mb-2">{discount.code}</h3>
                                <div className="flex justify-center gap-2 flex-wrap">
                                  <Badge variant={isExpired ? "destructive" : isMaxedOut ? "secondary" : "default"}>
                                    {discount.discountPercent}% Rabatt
                                  </Badge>
                                  {isExpired && <Badge variant="destructive">Abgelaufen</Badge>}
                                  {isMaxedOut && <Badge variant="secondary">Limit erreicht</Badge>}
                                  {!isActive && <Badge variant="destructive">Deaktiviert</Badge>}
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Gültig bis:</span>
                                  <span className="font-medium">{new Date(discount.validUntil).toLocaleDateString('de-DE')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Verwendungen:</span>
                                  <span className="font-medium">{discount.usageCount} / {discount.maxUsages}</span>
                                </div>
                              </div>

                              {canManageDiscountCodes() && (
                                <div className="flex justify-center pt-2">
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => cycleDiscountActions(discount.id, -1)}>
                                      ‹
                                    </Button>

                                    {/* Determine which action pair to show (0 or 1) */}
                                    {(() => {
                                      const idx = discountActionIndex[discount.id] ?? 0
                                      const editBtn = (
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            setEditingDiscountId(discount.id)
                                            setNewDiscountCode(discount.code)
                                            setNewDiscountPercent(discount.discountPercent)
                                            setNewDiscountValidUntil(discount.validUntil)
                                            setNewDiscountMaxUsages(discount.maxUsages)
                                            setShowDiscountModal(true)
                                          }}
                                          size="sm"
                                        >
                                          Bearbeiten
                                        </Button>
                                      )

                                      const deleteBtn = (
                                        <Button
                                          variant="outline"
                                          onClick={() => deleteDiscountCode(discount.id)}
                                          className="text-destructive"
                                          size="sm"
                                        >
                                          <Trash2 className="h-4 w-4 mr-1" />
                                          Löschen
                                        </Button>
                                      )

                                      const deactivateBtn = (
                                        <Button
                                          variant="outline"
                                          onClick={() => deactivateDiscount(discount.id)}
                                          className="text-destructive"
                                          size="sm"
                                        >
                                          Deaktivieren
                                        </Button>
                                      )

                                      const activateBtn = (
                                        <Button
                                          variant="outline"
                                          onClick={() => activateDiscount(discount.id)}
                                          size="sm"
                                        >
                                          Aktivieren
                                        </Button>
                                      )

                                      // Three sets: [Bearbeiten, Löschen], [Bearbeiten, Verwendungen zurücksetzen], [Bearbeiten, Deaktivieren/Aktivieren]
                                      if (idx === 0) {
                                        return <div className="flex gap-2">{editBtn}{deleteBtn}</div>
                                      }

                                      if (idx === 1) {
                                        const resetBtn = (
                                          <Button
                                            variant="outline"
                                            onClick={() => resetDiscountUsage(discount.id)}
                                            size="sm"
                                          >
                                            Verwendungen zurücksetzen
                                          </Button>
                                        )
                                        return <div className="flex gap-2">{editBtn}{resetBtn}</div>
                                      }

                                      return <div className="flex gap-2">{editBtn}{isActive ? deactivateBtn : activateBtn}</div>
                                    })()}

                                    <Button size="sm" variant="outline" onClick={() => cycleDiscountActions(discount.id, 1)}>
                                      ›
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}

                {/* Modal für neuen Code */}
                {showDiscountModal && canManageDiscountCodes() && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/50" onClick={closeDiscountModal} />
                    <Card className="w-full max-w-md mx-4 z-10">
                      <CardHeader>
                        <CardTitle>{editingDiscountId ? "Rabattcode bearbeiten" : "Neuer Rabattcode"}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="discount-code">Code</Label>
                          <Input
                            id="discount-code"
                            value={newDiscountCode}
                            onChange={(e) => setNewDiscountCode(e.target.value.toUpperCase())}
                            placeholder="z.B. SUMMER2025"
                            maxLength={20}
                          />
                        </div>

                        <div>
                          <Label htmlFor="discount-percent">Rabatt (%)</Label>
                          <Input
                            id="discount-percent"
                            type="number"
                            value={newDiscountPercent}
                            onChange={(e) => setNewDiscountPercent(parseInt(e.target.value) || 0)}
                            min={1}
                            max={100}
                          />
                        </div>

                        <div>
                          <Label htmlFor="discount-valid-until">Gültig bis</Label>
                          <Input
                            id="discount-valid-until"
                            type="date"
                            value={newDiscountValidUntil}
                            onChange={(e) => setNewDiscountValidUntil(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>

                        <div>
                          <Label htmlFor="discount-max-usages">Maximale Verwendungen</Label>
                          <Input
                            id="discount-max-usages"
                            type="number"
                            value={newDiscountMaxUsages}
                            onChange={(e) => setNewDiscountMaxUsages(parseInt(e.target.value) || 1)}
                            min={1}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={closeDiscountModal}>
                            Abbrechen
                          </Button>
                          <Button onClick={createDiscountCode} className="bg-green-600 hover:bg-green-700">
                            {editingDiscountId ? "Speichern" : "Erstellen"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {activeTab === "mitgliedschaften" && hasPermission("memberships_manage") && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Mitgliedschaften verwalten</h2>
                    <p className="text-muted-foreground">Erstelle und bearbeite die Mitgliedschaftsstufen für deine Website.</p>
                  </div>
                  <Button variant="outline" onClick={loadMembershipPlans} disabled={membershipLoading}>
                    {membershipLoading ? "Lädt..." : "Aktualisieren"}
                  </Button>
                </div>

                {membershipError && (
                  <Card className="border-destructive/50 bg-destructive/10">
                    <CardContent className="p-4 text-sm text-destructive">{membershipError}</CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>{editingMembershipId ? "Mitgliedschaft bearbeiten" : "Neue Mitgliedschaft erstellen"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="membership-name">Name</Label>
                        <Input
                          id="membership-name"
                          value={membershipForm.name}
                          onChange={(e) => setMembershipForm({ ...membershipForm, name: e.target.value })}
                          placeholder="z. B. Gold-Mitgliedschaft"
                        />
                      </div>
                      <div>
                        <Label htmlFor="membership-price">Preis pro Abrechnungszeitraum</Label>
                        <Input
                          id="membership-price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={membershipForm.price}
                          onChange={(e) => setMembershipForm({ ...membershipForm, price: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="membership-description">Beschreibung</Label>
                      <Textarea
                        id="membership-description"
                        value={membershipForm.description}
                        onChange={(e) => setMembershipForm({ ...membershipForm, description: e.target.value })}
                        placeholder="Welche Vorteile bietet diese Stufe?"
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label htmlFor="membership-interval">Abrechnungsintervall</Label>
                        <select
                          id="membership-interval"
                          value={membershipForm.billing_interval}
                          onChange={(e) => setMembershipForm({ ...membershipForm, billing_interval: e.target.value as MembershipPlan["billing_interval"] })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="monthly">Monatlich</option>
                          <option value="quarterly">Vierteljährlich</option>
                          <option value="yearly">Jährlich</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="membership-min-duration">Mindestlaufzeit (Monate)</Label>
                        <Input
                          id="membership-min-duration"
                          type="number"
                          min="1"
                          value={membershipForm.min_duration_months}
                          onChange={(e) => setMembershipForm({ ...membershipForm, min_duration_months: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="membership-notice">Kündigungsfrist (Monate)</Label>
                        <Input
                          id="membership-notice"
                          type="number"
                          min="0"
                          value={membershipForm.cancellation_notice_months}
                          onChange={(e) => setMembershipForm({ ...membershipForm, cancellation_notice_months: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={membershipForm.newcomer_only}
                          onChange={(e) => setMembershipForm({ ...membershipForm, newcomer_only: e.target.checked })}
                        />
                        Nur für Neukunden
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={membershipForm.includes_discount}
                          onChange={(e) => setMembershipForm({ ...membershipForm, includes_discount: e.target.checked })}
                        />
                        Rabatt enthalten
                      </label>
                      {membershipForm.includes_discount && (
                        <div className="flex items-center gap-2">
                          <Label htmlFor="membership-discount">Rabatt (%)</Label>
                          <Input
                            id="membership-discount"
                            className="w-24"
                            type="number"
                            min="0"
                            max="100"
                            value={membershipForm.discount_percent}
                            onChange={(e) => setMembershipForm({ ...membershipForm, discount_percent: e.target.value })}
                          />
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={membershipForm.active}
                          onChange={(e) => setMembershipForm({ ...membershipForm, active: e.target.checked })}
                        />
                        Auf der Website anzeigen
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={saveMembershipPlan} disabled={membershipSaving}>
                        {membershipSaving ? "Speichert..." : editingMembershipId ? "Änderungen speichern" : "Mitgliedschaft erstellen"}
                      </Button>
                      {editingMembershipId && (
                        <Button variant="outline" onClick={resetMembershipForm}>Abbrechen</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {membershipLoading && membershipPlans.length === 0 ? (
                  <Card><CardContent className="p-8 text-center text-muted-foreground">Mitgliedschaften werden geladen...</CardContent></Card>
                ) : membershipPlans.length === 0 ? (
                  <Card><CardContent className="p-8 text-center text-muted-foreground">Noch keine Mitgliedschaften angelegt.</CardContent></Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {membershipPlans.map((plan) => (
                      <Card key={plan.id} className={!plan.active ? "opacity-60" : ""}>
                        <CardHeader className="flex-row items-start justify-between space-y-0">
                          <div>
                            <CardTitle>{plan.name}</CardTitle>
                            <p className="mt-1 text-2xl font-bold">{Number(plan.price).toFixed(2)} €</p>
                          </div>
                          <Badge variant={plan.active ? "default" : "secondary"}>{plan.active ? "Aktiv" : "Deaktiviert"}</Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">{plan.description || "Keine Beschreibung"}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <span>Intervall: {plan.billing_interval === "monthly" ? "monatlich" : plan.billing_interval === "quarterly" ? "vierteljährlich" : "jährlich"}</span>
                            <span>Mindestlaufzeit: {plan.min_duration_months} Mon.</span>
                            <span>Kündigungsfrist: {plan.cancellation_notice_months} Mon.</span>
                            <span>{plan.includes_discount ? `${plan.discount_percent ?? 0}% Rabatt` : "Kein Rabatt"}</span>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="outline" onClick={() => editMembershipPlan(plan)}>
                              <Edit className="mr-1 h-4 w-4" /> Bearbeiten
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteMembershipPlan(plan.id)}>
                              <Trash2 className="mr-1 h-4 w-4" /> Löschen
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "dienstvorschriften" && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground mb-4">Dienstvorschriften</h2>
                </div>

                {/* Allgemeine Verhaltensregeln */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Allgemeine Verhaltensregeln
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-foreground">
                    <div>
                      <h4 className="font-semibold mb-2">1. Professionelles Verhalten</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Respektvoller und höflicher Umgang mit Gästen und Kollegen</li>
                        <li>Pünktlichkeit ist zwingend erforderlich (mindestens 15 Minuten vor Schichtbeginn)</li>
                        <li>Diskretion und Vertraulichkeit bei sensiblen Informationen</li>
                        <li>Keine persönlichen Handy-Gespräche während der Arbeitszeit</li>
                        <li>Rauchen nur in designated areas oder Pausen</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">2. Uniform und Erscheinung</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Bereitstellung der Uniform durch das Restaurant</li>
                        <li>Uniform muss sauber und in gutem Zustand sein</li>
                        <li>Geschlossene, rutschfeste Schuhe sind Pflicht</li>
                        <li>Dekorschmuck sollte minimal sein (Ringe, Ohrringe, Kette)</li>
                        <li>Haare müssen gebunden oder kurz sein</li>
                        <li>Fingernägel kurz und sauber halten</li>
                        <li>Nametag muss während der gesamten Schicht getragen werden</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">3. Hygiene und Gesundheit</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Regelmäßiges Händewaschen vor und nach jeder Tätigkeit</li>
                        <li>Im Falle von Krankheit (besonders Magen-Darm) Dienst nicht antreten</li>
                        <li>Wunden und Schnitte müssen abgedeckt sein</li>
                        <li>Keine Nahrungsmittel oder Getränke außerhalb von Pausen konsumieren</li>
                        <li>Regelmäßige Überprüfung auf Hygiene und Sauberkeit</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Service-Standards */}
                <Card>
                  <CardHeader>
                    <CardTitle>Service-Standards</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-foreground">
                    <div>
                      <h4 className="font-semibold mb-2">1. Gastfreundschaft</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Gäste werden innerhalb von 2 Minuten nach dem Sitzen begrüßt</li>
                        <li>Lächeln und Augenkontakt sind wichtig</li>
                        <li>Immer "Bitte" und "Danke" verwenden</li>
                        <li>Auf Beschwerden ruhig und professionell reagieren</li>
                        <li>Getränke sollen immer voll bleiben</li>
                        <li>Tellerwechsel erfolgt, wenn 80% des Gerichts gegessen ist</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">2. Tischservice</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Von rechts servieren, von links abräumen</li>
                        <li>Besteck wird korrekt angeordnet (außen nach innen nutzen)</li>
                        <li>Gläser werden nicht über den Gast hinweg befüllt</li>
                        <li>Teller sollten nie direkt mit den Händen berührt werden (Handschuhe oder Serviette)</li>
                        <li>Bestellungen werden mindestens zu zweit wiederholt zur Kontrolle</li>
                        <li>Bestellaufnahme: Damen zuerst, dann Herren</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">3. Kommunikation mit der Küche</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Klare und deutliche Bestellaufgabe in der Küche</li>
                        <li>Spezialwünsche werden deutlich gekennzeichnet</li>
                        <li>Respekt für die Arbeit des Küchenpersonals</li>
                        <li>Regelmäßige Kommunikation über Status von Bestellungen</li>
                        <li>Probleme werden ruhig und konstruktiv gelöst</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Sicherheit und Notfallverfahren */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sicherheit und Notfallverfahren</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-foreground">
                    <div>
                      <h4 className="font-semibold mb-2">1. Notfallplan</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Notausgänge müssen bekannt sein</li>
                        <li>Erste-Hilfe-Ausrüstung ist im Restaurant vorhanden</li>
                        <li>Evakuierungsplan wird bei Einstellung besprochen</li>
                        <li>Im Notfall ruhig bleiben und Anweisungen des Managers folgen</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">2. Allergien und Unverträglichkeiten</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Gäste müssen auf Allergien hingewiesen werden</li>
                        <li>Alle Zutaten müssen der Küche mitgeteilt werden</li>
                        <li>Spezielle Teller und Besteck für Allergiker verwenden</li>
                        <li>Keine Kontaminationsgefahr mit allergiehaltigen Produkten</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">3. Brandschutz und Sicherheit</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Notausgänge dürfen nicht blockiert werden</li>
                        <li>Brandmelder dürfen nicht manipuliert werden</li>
                        <li>Feuerlöscher müssen zugänglich sein</li>
                        <li>Offene Flammen (Kerzen) müssen beaufsichtigt werden</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Arbeitszeitregelungen */}
                <Card>
                  <CardHeader>
                    <CardTitle>Arbeitszeitregelungen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-foreground">
                    <div>
                      <h4 className="font-semibold mb-2">1. Schichtzeiten</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Schichten werden mindestens 2 Wochen im Voraus bekannt gegeben</li>
                        <li>Ankunft mindestens 15 Minuten vor Schichtbeginn erforderlich</li>
                        <li>Abfahrt erst nach Freigabe durch den Manager</li>
                        <li>Schichtübergaben müssen dokumentiert werden</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">2. Pausen</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Bei Schichten über 6 Stunden: 30 Minuten Pause obligatorisch</li>
                        <li>Pausen müssen mit dem Manager abgesprochen werden</li>
                        <li>Mahlzeiten können vom Restaurant bereitgestellt werden</li>
                        <li>Pausen müssen dokumentiert werden</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">3. Abwesenheiten und Krankmeldung</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Krankheitsmeldung spätestens 2 Stunden vor Schichtbeginn</li>
                        <li>Ärztliches Attest ab 3. Fehltag erforderlich</li>
                        <li>Unentschuldigtes Fehlen: ernsthafte Konsequenzen</li>
                        <li>Wiederholte Fehlzeiten führen zu Abmahnung</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Umgang mit Geld und Zahlungen */}
                <Card>
                  <CardHeader>
                    <CardTitle>Umgang mit Geld und Zahlungen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-foreground">
                    <div>
                      <h4 className="font-semibold mb-2">1. Zahlungsabwicklung</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Alle Zahlungen müssen korrekt im System erfasst werden</li>
                        <li>Wechselgeld muss korrekt berechnet werden</li>
                        <li>Falsches Wechselgeld ist aus eigener Tasche auszugleichen</li>
                        <li>Trinkgeld wird getrennt vom Restaurantgeld gehandhabt</li>
                        <li>Quittungen müssen allen Gästen ausgehändigt werden</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">2. Kasse und Kontrollen</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Kasse muss unter Verschluss sein</li>
                        <li>Kassenschluss erfolgt täglich mit Unterschrift</li>
                        <li>Differenzen werden dokumentiert und untersucht</li>
                        <li>Zugriff auf die Kasse ist limitiert</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Disciplinäre Maßnahmen */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-destructive">Disziplinarmaßnahmen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-foreground">
                    <div>
                      <h4 className="font-semibold mb-2">Verstöße gegen Dienstvorschriften können zu folgenden Maßnahmen führen:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li><strong>1. Verwarnung</strong> - Mündliche Verwarnung mit Dokumentation</li>
                        <li><strong>2. Schriftliche Abmahnung</strong> - Nach wiederholten Verstößen</li>
                        <li><strong>3. Abmahnung mit Ultimatum</strong> - Letzte Verwarnung vor Kündigung</li>
                        <li><strong>4. Fristlose Kündigung</strong> - Bei schwerwiegenden Verstößen (Diebstahl, Aggression, etc.)</li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mt-4">
                        Diese Dienstvorschriften sind Bestandteil des Arbeitsvertrages. Durch die Unterzeichnung bestätigen Sie, dass Sie diese Regeln verstanden haben und sich an sie halten werden.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Neue Ränge-Verwaltungssektion nur Für Owner */}
            {activeTab === "ranks" && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground mb-4">Dienstgrad-Verwaltung</h2>
                  <p className="text-muted-foreground mb-6">
                    Hier können Sie die Dienstgrad-Hierarchie und Berechtigungen verwalten. Höhere Level können niedrigere Level
                    bearbeiten.
                  </p>

                  <Card className="bg-muted border-border mb-6">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-card-foreground mb-2">Dienstgrad-Hierarchie Regeln</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Höhere Level können niedrigere Level bearbeiten und verwalten</li>
                        <li>• Nur der Owner (Level 100) kann alle Dienstgrade verwalten</li>
                        <li>• Mitarbeiter können ihren eigenen Dienstgrad nicht ändern</li>
                        <li>• Dienstgrad-Definitionen können nur vom Owner geändert werden</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <div className="mb-6">
                    <Button
                      onClick={() => setShowCreateRankForm(!showCreateRankForm)}
                      className="bg-primary hover:bg-primary/80 text-white"
                    >
                      {showCreateRankForm ? "Abbrechen" : "Neuen Dienstgrad Erstellen"}
                    </Button>
                  </div>

                  {showCreateRankForm && (
                    <Card className="mb-6 border-primary/30 bg-primary/10">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Neuen Rang Erstellen</h3>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Rang Name:</label>
                            <input
                              type="text"
                              value={newRankName}
                              onChange={(e) => setNewRankName(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="z.B. Küchenchef, Serviceleiter..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Rang Level (10-90):</label>
                            <input
                              type="number"
                              min="10"
                              max="90"
                              value={newRankLevel}
                              onChange={(e) => setNewRankLevel(Number.parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Höhere Zahlen = höhere Berechtigung. Owner = 100</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                              Was kann der Rang: (bitte auswählen)
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { key: "reservations", label: "Reservierungen verwalten" },
                                { key: "orders", label: "Bestellungen verwalten" },
                                { key: "reviews", label: "Bewertungen verwalten" },
                                { key: "menu", label: "Speisekarte bearbeiten" },
                                { key: "config", label: "Website-Konfiguration bearbeiten" },
                                { key: "hausverbote", label: "Hausverbote verwalten" },
                                { key: "rabattcodes", label: "Rabattcodes verwalten" },
                                { key: "werkstatt", label: "Werkstatt‐Buchungen verwalten" },
                                { key: "archive", label: "Archiv einsehen" },
                                { key: "users_limited", label: "Mitarbeiter (eingeschränkt)" },
                                { key: "users", label: "Vollständige Mitarbeiterverwaltung" },
                                { key: "kalender_or_view", label: "Kalender ansehen und verwalten" },
                              ].map((permission) => (
                                <label key={permission.key} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={newRankPermissions.includes(permission.key)}
                                    onChange={() => togglePermission(permission.key)}
                                    className="rounded border-border text-primary focus:ring-primary"
                                  />
                                  <span className="text-sm text-muted-foreground">{permission.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="flex space-x-3 pt-4">
                            <Button onClick={createNewRank} className="bg-secondary hover:bg-secondary/80 text-secondary-foreground text-white">
                              Rang Erstellen
                            </Button>
                            <Button onClick={() => setShowCreateRankForm(false)} variant="outline">
                              Abbrechen
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="grid gap-4">
                  {Object.entries(getAllRanks()).map(([key, rank]) => (
                    <RankCard
                      key={key}
                      rankKey={key}
                      rank={rank}
                      customRanks={customRanks}
                      setCustomRanks={setCustomRanks}
                      deleteCustomRank={deleteCustomRankHandler}
                      onRankUpdated={async (rankName, rankLevel, permissions) => {
                        const currentAdminUser = localStorage.getItem("currentUser") || "Admin"
                        await sendDiscordNotification("rank_updated", {
                          rankName,
                          rankLevel,
                          permissions,
                          updatedBy: currentAdminUser,
                        })
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* User Settings Modal */}
            {showUserSettings && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <Card className="w-full max-w-lg mx-4">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-2xl">
                      {userSettingsMode === "password" ? "Passwort ändern" : userSettingsMode === "discord" ? "Discord-ID ändern" : "Profilbild ändern"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {userSettingsMode === "password" ? (
                      <>
                        <div>
                          <Label htmlFor="old-password" className="text-base font-semibold mb-2 block">Aktuelles Passwort</Label>
                          <Input
                            id="old-password"
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="Aktuelles Passwort eingeben"
                            className="h-12 text-base"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-password" className="text-base font-semibold mb-2 block">Neues Passwort</Label>
                          <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mindestens 6 Zeichen"
                            className="h-12 text-base"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirm-password" className="text-base font-semibold mb-2 block">Passwort bestätigen</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Passwort wiederholen"
                            className="h-12 text-base"
                          />
                        </div>
                        <div className="text-center pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowUserSettings(false)
                              setShowForgotPassword(true)
                            }}
                            className="text-sm text-muted-foreground hover:text-primary underline"
                          >
                            Password vergessen?
                          </button>
                        </div>
                      </>
                    ) : userSettingsMode === "discord" ? (
                      <>
                        <div>
                          <Label htmlFor="discord-id" className="text-base font-semibold mb-2 block">Neue Discord-ID</Label>
                          <Input
                            id="discord-id"
                            type="text"
                            value={newDiscordId}
                            onChange={(e) => setNewDiscordId(e.target.value)}
                            placeholder="123456789012345678"
                            className="h-12 text-base"
                          />
                        </div>
                        <p className="text-sm text-destructive">
                          ⚠️ Wenn du deine Discord-ID änderst, wirst du automatisch abgemeldet und musst dich anschließend erneut anmelden.
                          Du kannst diese Aktion nur einmal durchführen.
                        </p>
                      </>
                    ) : (
                      <div>
                        <Label htmlFor="profile-image" className="text-base font-semibold mb-2 block">Profilbild URL</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Bitte lade dein Bild zuerst hoch auf <a href="https://postimages.org" target="_blank" rel="noopener noreferrer" className="underline text-primary">postimages.org</a> und kopiere anschließend den Direct Link von <a href="https://postimages.org" target="_blank" rel="noopener noreferrer" className="underline text-primary">postimages.org</a>. Der Grund: Discord-Bildlinks laufen nach etwa einem Monat ab, daher funktionieren sie nicht dauerhaft.
                        </p>
                        <Input
                          id="profile-image"
                          type="url"
                          value={profileImage}
                          onChange={(e) => setProfileImage(e.target.value)}
                          placeholder="https://beispiel.com/bild.jpg"
                          className="h-12 text-base"
                        />
                        {profileImage && (
                          <div className="mt-6 flex justify-center">
                            <img
                              src={profileImage}
                              alt="Preview"
                              className="h-32 w-32 rounded-full object-cover border-4 border-primary"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3 pt-6">
                      <Button
                        onClick={handleSaveUserSettings}
                        disabled={isSavingUserSettings}
                        className="flex-1 h-12 text-base font-semibold"
                      >
                        {isSavingUserSettings ? "Speichern..." : "Speichern"}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowUserSettings(false)
                          setOldPassword("")
                          setNewPassword("")
                          setConfirmPassword("")
                          setProfileImage("")
                          setNewDiscordId("")
                          setUserSettingsMode("password")
                        }}
                        variant="outline"
                        disabled={isSavingUserSettings}
                        className="flex-1 h-12 text-base font-semibold"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl">Password vergessen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-base text-center">
                Du hast dein Password vergessen. Informiere eine Person Aus der Personalabteilung der kann dein Password zurücksetzen.
              </p>
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => setShowForgotPassword(false)}
                  className="h-12 text-base font-semibold px-8"
                >
                  Verstanden
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Account Switch Modal */}
      {showAccountSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAccountSwitch(false)} />
          <Card className="w-full max-w-md mx-4 z-10">
            <CardHeader>
              <CardTitle>Account wechseln</CardTitle>
              <p className="text-sm text-muted-foreground">
                Wählen Sie einen anderen Account mit der gleichen Discord-ID aus.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const discordUserId = localStorage.getItem("discordUserId")
                if (!discordUserId) return <p className="text-sm text-muted-foreground">Keine Discord-ID gefunden.</p>

                const availableAccounts = users.filter(u => u.discordUserId === discordUserId)
                const currentUsername = localStorage.getItem("currentUser")

                return availableAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={async () => {
                      // Switch to this account
                      localStorage.setItem("currentUser", account.username)
                      localStorage.setItem("userGroup", account.group)
                      localStorage.setItem("userId", String(account.id))
                      localStorage.setItem("discordUserId", account.discordUserId || "")
  setUserGroup(String(account.group ?? "").toLowerCase())
  setShowAccountSwitch(false)
                      // Reload the page to apply changes
                      window.location.reload()
                    }}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${account.username === currentUsername
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-secondary/20"
                      }`}
                    disabled={account.username === currentUsername}
                  >
                    <div className="flex items-center gap-3">
                      {account.image ? (
                        <img
                          src={account.image}
                          alt={account.username}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <User2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{account.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {getAllRanks()[account.group]?.name || account.group}
                          {account.username === currentUsername && " (aktuell)"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              })()}
            </CardContent>
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setShowAccountSwitch(false)}>
                Abbrechen
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}