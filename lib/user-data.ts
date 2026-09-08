import { createClient } from "@/lib/supabase/client"

export type User = {
  id: number
  username: string
  password: string
  role: string
  group: string
  mustChangePassword: boolean
  isTemporaryPassword: boolean
  discordUserId?: string
  image?: string
  dienstvorschriftenAccepted?: boolean
  warningCount?: number
  suspendedUntil?: string | null
}

// ============ KUNDENPROFIL ============
export type UserProfile = {
  id?: number
  discord_id: string
  discord_username: string
  full_name: string
  phone: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export type CustomRank = {
  name: string
  level: number
  permissions: string[]
}

export const DEFAULT_RANKS: { [key: string]: CustomRank } = {
  owner: { name: "Website Entwickler", level: 100, permissions: ["all"] },
  suspendiert: { name: "Suspendiert", level: 0, permissions: [] },
}

export const getUsers = async (): Promise<User[]> => {
  const supabase = createClient()
  if (!supabase) {
    console.error("Supabase client not available")
    return []
  }
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("id", { ascending: true })

  if (error) {
    console.error("Error fetching users:", error)
    return []
  }

  return (data ?? []).map((u) => ({
    id: u.id,
    username: u.username,
    password: u.password,
    role: u.role,
    group: u.user_group,
    mustChangePassword: u.must_change_password,
    isTemporaryPassword: u.is_temporary_password,
    discordUserId: u.discord_user_id,
    image: u.image,
    dienstvorschriftenAccepted: u.dienstvorschriften_accepted,
    warningCount: u.warning_count,
    suspendedUntil: u.suspended_until,
  }))
}

export const saveUser = async (user: Omit<User, "id">): Promise<User | null> => {
  const supabase = createClient()
  if (!supabase) return null
  const { data, error } = await supabase
    .from("users")
    .insert({
      username: user.username,
      password: user.password,
      role: user.role,
      user_group: user.group,
      must_change_password: user.mustChangePassword,
      is_temporary_password: user.isTemporaryPassword,
      discord_user_id: user.discordUserId,
      image: user.image,
      warning_count: user.warningCount || 0,
      suspended_until: user.suspendedUntil || null,
    })
    .select()
    .single()

  if (error) {
    console.error("Error saving user:", error)
    return null
  }

  return {
    id: data.id,
    username: data.username,
    password: data.password,
    role: data.role,
    group: data.user_group,
    mustChangePassword: data.must_change_password,
    isTemporaryPassword: data.is_temporary_password,
    discordUserId: data.discord_user_id,
    image: data.image,
  }
}

export const updateUser = async (id: number, updates: Partial<User>): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const dbUpdates: Record<string, unknown> = {}

  if (updates.username !== undefined) dbUpdates.username = updates.username
  if (updates.password !== undefined) dbUpdates.password = updates.password
  if (updates.role !== undefined) dbUpdates.role = updates.role
  if (updates.group !== undefined) dbUpdates.user_group = updates.group
  if (updates.mustChangePassword !== undefined) dbUpdates.must_change_password = updates.mustChangePassword
  if (updates.isTemporaryPassword !== undefined) dbUpdates.is_temporary_password = updates.isTemporaryPassword
  if (updates.discordUserId !== undefined) dbUpdates.discord_user_id = updates.discordUserId
  if (updates.image !== undefined) dbUpdates.image = updates.image
  if (updates.dienstvorschriftenAccepted !== undefined) dbUpdates.dienstvorschriften_accepted = updates.dienstvorschriftenAccepted
  if (updates.warningCount !== undefined) dbUpdates.warning_count = updates.warningCount
  if (updates.suspendedUntil !== undefined) dbUpdates.suspended_until = updates.suspendedUntil

  const { error } = await supabase.from("users").update(dbUpdates).eq("id", id)

  if (error) {
    console.error("Error updating user:", error)
    return false
  }

  return true
}

export const deleteUser = async (id: number): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase.from("users").delete().eq("id", id)

  if (error) {
    console.error("Error deleting user:", error)
    return false
  }

  return true
}

// ============ KUNDENPROFIL FUNKTIONEN ============

export const getUserProfile = async (discordId: string): Promise<UserProfile | null> => {
  const supabase = createClient()
  if (!supabase) return null
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("discord_id", discordId)
    .single()

  if (error) {
    console.error("Error fetching user profile:", error)
    return null
  }

  return data
}

export const saveUserProfile = async (profile: Omit<UserProfile, "id" | "created_at" | "updated_at">): Promise<UserProfile | null> => {
  const supabase = createClient()
  if (!supabase) return null

  const existing = await getUserProfile(profile.discord_id)

  if (existing) {
    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        discord_username: profile.discord_username,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq("discord_id", profile.discord_id)
      .select()
      .single()

    if (error) {
      console.error("Error updating user profile:", error)
      return null
    }

    return data
  } else {
    const { data, error } = await supabase
      .from("user_profiles")
      .insert({
        discord_id: profile.discord_id,
        full_name: profile.full_name,
        phone: profile.phone,
        discord_username: profile.discord_username,
        avatar_url: profile.avatar_url,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating user profile:", error)
      return null
    }

    return data
  }
}

export const getCustomRanks = async (): Promise<{ [key: string]: CustomRank }> => {
  const supabase = createClient()
  if (!supabase) return {}
  const { data, error } = await supabase.from("ranks").select("*")

  if (error) {
    console.error("Error fetching ranks:", error)
    return {}
  }

  const ranks: { [key: string]: CustomRank } = {}
  const normalizePermissions = (permissions: any): string[] => {
    if (!permissions) return []
    if (typeof permissions === "string") {
      return permissions
        .split(",")
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0)
    }
    if (Array.isArray(permissions)) {
      return Array.from(new Set(permissions.map((p: any) => (typeof p === "string" ? p.trim() : p))))
    }
    return []
  }

  for (const rank of data) {
    if (rank.rank_key !== "owner") {
      ranks[rank.rank_key] = {
        name: rank.name,
        level: rank.level,
        permissions: normalizePermissions(rank.permissions),
      }
    }
  }
  return ranks
}

export const saveCustomRank = async (key: string, rank: CustomRank): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase
    .from("ranks")
    .upsert({
      rank_key: key,
      name: rank.name,
      level: rank.level,
      permissions: rank.permissions,
    })

  if (error) {
    console.error("Error saving rank:", error)
    return false
  }

  return true
}

// Custom Rank löschen
export const deleteCustomRank = async (key: string): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase.from("ranks").delete().eq("rank_key", key)

  if (error) {
    console.error("Error deleting rank:", error)
    return false
  }

  return true
}

// Alle Ränge abrufen (Standard + Custom)
export const getAllRanks = async (): Promise<{ [key: string]: CustomRank }> => {
  const customRanks = await getCustomRanks()
  return { ...DEFAULT_RANKS, ...customRanks }
}

// Temporäres Passwort generieren
export const generateTemporaryPassword = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Benutzer authentifizieren
export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
  const supabase = createClient()
  if (!supabase) return null
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("password", password)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    username: data.username,
    password: data.password,
    role: data.role,
    group: data.user_group,
    mustChangePassword: data.must_change_password,
    isTemporaryPassword: data.is_temporary_password,
    discordUserId: data.discord_user_id,
    image: data.image,
    dienstvorschriftenAccepted: data.dienstvorschriften_accepted,
  }
}

// Benutzer-Session speichern (localStorage für Client-Session)
export const setUserSession = (user: User) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("isLoggedIn", "true")
    localStorage.setItem("userRole", user.role)
    localStorage.setItem("currentUser", user.username)
    localStorage.setItem("userGroup", user.group)
    localStorage.setItem("userId", user.id.toString())
    localStorage.setItem("discordUserId", user.discordUserId || "")
  }
}

// Benutzer-Session löschen
export const clearUserSession = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userRole")
    localStorage.removeItem("currentUser")
    localStorage.removeItem("userGroup")
    localStorage.removeItem("userId")
  }
}

// Prüfen ob eingeloggt
export const isLoggedIn = (): boolean => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("isLoggedIn") === "true"
  }
  return false
}

// Aktuellen Benutzer abrufen
export const getCurrentUser = async (): Promise<User | null> => {
  if (typeof window !== "undefined") {
    const userId = localStorage.getItem("userId")
    if (userId) {
      const supabase = createClient()
      if (!supabase) return null
      const { data, error } = await supabase.from("users").select("*").eq("id", parseInt(userId)).single()

      if (error || !data) return null

      return {
        id: data.id,
        username: data.username,
        password: data.password,
        role: data.role,
        group: data.user_group,
        mustChangePassword: data.must_change_password,
        isTemporaryPassword: data.is_temporary_password,
        discordUserId: data.discord_user_id,
        image: data.image,
        dienstvorschriftenAccepted: data.dienstvorschriften_accepted,
        warningCount: data.warning_count,
        suspendedUntil: data.suspended_until,
      }
    }
  }
  return null
}

// Benutzer per Discord ID authentifizieren
export const authenticateUserByDiscord = async (discordUserId: string): Promise<User | null> => {
  const users = await getUsersByDiscordId(discordUserId)
  return users.length > 0 ? users[0] : null
}

export const getUsersByDiscordId = async (discordUserId: string): Promise<User[]> => {
  const supabase = createClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .or(`discord_user_id.eq.${discordUserId},discord_user_id.eq.${parseInt(discordUserId) || 0}`)

  if (error || !data) {
    return []
  }

  return (data ?? []).map((u) => ({
    id: u.id,
    username: u.username,
    password: u.password,
    role: u.role,
    group: u.user_group,
    mustChangePassword: u.must_change_password,
    isTemporaryPassword: u.is_temporary_password,
    discordUserId: u.discord_user_id,
    image: u.image,
    dienstvorschriftenAccepted: u.dienstvorschriften_accepted,
    warningCount: u.warning_count,
    suspendedUntil: u.suspended_until,
  }))
}

// Dienstvorschriften akzeptieren
export const acceptDienstvorschriften = async (userId: number): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase
    .from("users")
    .update({ dienstvorschriften_accepted: true })
    .eq("id", userId)

  if (error) {
    console.error("Error accepting Dienstvorschriften:", error)
    return false
  }
  return true
}

// Discord Bot Config Type
export type DiscordBotConfig = {
  token: string
  clientId: string
  guildId: string
}

// Website Config von Supabase abrufen
export type SoonProject = {
  id: string
  title: string
  description: string
  targetDate: string
  status?: string
}

const parseConfigValue = <T>(value: unknown, fallback: T): T => {
  if (value === undefined || value === null) return fallback
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return value as T
}

export const getWebsiteConfig = async (): Promise<{
  discordChannels: { reservations: string; orders: string; reviews: string; adminLogs: string; announcements?: string }
  openingHours: { [key: string]: string }
  websiteSettings: {
    title: string
    description: string
    contactDiscord: string
    contactPhone: string
    contactAddress: string
    contactCity: string
  }
  discordBot: DiscordBotConfig
  soonProjects: SoonProject[]
}> => {
  const defaultConfig = {
    discordChannels: { reservations: "", orders: "", reviews: "", adminLogs: "", announcements: "" },
    openingHours: { "Mo-Do": "17:00 - 23:00", "Fr-Sa": "17:00 - 24:00", So: "12:00 - 22:00" },
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
    soonProjects: [],
  }

  const supabase = createClient()
  if (!supabase) return defaultConfig
  const { data, error } = await supabase.from("website_config").select("*")

  if (error || !data) {
    return defaultConfig
  }

  for (const row of data) {
    if (row.config_key === "discord_channels") {
      defaultConfig.discordChannels = parseConfigValue(row.config_value, defaultConfig.discordChannels)
    } else if (row.config_key === "opening_hours") {
      defaultConfig.openingHours = parseConfigValue(row.config_value, defaultConfig.openingHours)
    } else if (row.config_key === "website_settings") {
      defaultConfig.websiteSettings = parseConfigValue(row.config_value, defaultConfig.websiteSettings)
    } else if (row.config_key === "discord_bot") {
      defaultConfig.discordBot = parseConfigValue(row.config_value, defaultConfig.discordBot)
    } else if (row.config_key === "soon_projects") {
      defaultConfig.soonProjects = parseConfigValue(row.config_value, [])
    }
  }

  return defaultConfig
}

// Website Config in Supabase speichern
export const saveWebsiteConfig = async (
  key: "discord_channels" | "opening_hours" | "website_settings" | "discord_bot" | "soon_projects",
  value: unknown
): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) {
    console.error("Supabase client not available")
    return false
  }

  const { data, error } = await supabase
    .from("website_config")
    .upsert(
      {
        config_key: key,
        config_value: value,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "config_key",
      }
    )
    .select()

  if (error) {
    console.error("Error saving config:", error)
    return false
  }

  return true
}

// ============ RESERVIERUNGEN ============

export type Reservation = {
  id: number
  name: string
  email: string
  phone: string
  date: string
  time: string
  guests: number
  notes?: string
  status: string
  created_at?: string
}

export const getReservations = async (): Promise<Reservation[]> => {
  const supabase = createClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching reservations:", error)
    return []
  }

  return data || []
}

// fetch reservations for a specific user (we store the Discord ID in the email column)
export const getUserReservations = async (
  discordId: string
): Promise<Reservation[]> => {
  const supabase = createClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("email", discordId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching user reservations:", error)
    return []
  }

  return data || []
}

export const saveReservation = async (reservation: Omit<Reservation, "id" | "created_at">): Promise<Reservation | null> => {
  const supabase = createClient()
  if (!supabase) return null
  const { data, error } = await supabase
    .from("reservations")
    .insert(reservation)
    .select()
    .single()

  if (error) {
    console.error("Error saving reservation:", error)
    return null
  }

  return data
}

export const updateReservation = async (id: number, updates: Partial<Reservation>): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase
    .from("reservations")
    .update(updates)
    .eq("id", id)

  if (error) {
    console.error("Error updating reservation:", error)
    return false
  }

  return true
}

export const deleteReservation = async (id: number): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting reservation:", error)
    return false
  }

  return true
}

export const deleteAllReservations = async (): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase
    .from("reservations")
    .delete()
    .neq("id", 0) // Delete all

  if (error) {
    console.error("Error deleting all reservations:", error)
    return false
  }

  return true
}

// ============ BESTELLUNGEN ============

export type Order = {
  id: number
  customer_name: string
  customer_email: string
  customer_phone: string
  items: any[]
  total: number
  status: string
  notes?: string
  created_at?: string
}

export const getOrders = async (): Promise<Order[]> => {
  const supabase = createClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching orders:", error)
    return []
  }

  return data || []
}

// fetch orders for a specific user (Discord ID stored in customer_email)
export const getUserOrders = async (
  discordId: string
): Promise<Order[]> => {
  const supabase = createClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_email", discordId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching user orders:", error)
    return []
  }

  return data || []
}

export const saveOrder = async (order: Omit<Order, "id" | "created_at">): Promise<Order | null> => {
  const supabase = createClient()
  if (!supabase) return null
  const { data, error } = await supabase
    .from("orders")
    .insert(order)
    .select()
    .single()

  if (error) {
    console.error("Error saving order:", error)
    return null
  }

  return data
}

export const updateOrder = async (id: number, updates: Partial<Order>): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", id)

  if (error) {
    console.error("Error updating order:", error)
    return false
  }

  return true
}

export const deleteOrder = async (id: number): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting order:", error)
    return false
  }

  return true
}

export const deleteAllOrders = async (): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase
    .from("orders")
    .delete()
    .neq("id", 0)

  if (error) {
    console.error("Error deleting all orders:", error)
    return false
  }

  return true
}

// ============ WERKSTATT-BESTELLUNGEN (separate table) ============

export type WerkstattOrder = Order // identical structure for now

export const getWerkstattOrders = async (): Promise<WerkstattOrder[]> => {
  const supabase = createClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("werkstatt_orders")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching werkstatt orders:", error)
    return []
  }

  return data || []
}

export const getUserWerkstattOrders = async (
  discordId: string
): Promise<WerkstattOrder[]> => {
  const supabase = createClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("werkstatt_orders")
    .select("*")
    .eq("customer_email", discordId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching user werkstatt orders:", error)
    return []
  }

  return data || []
}

export const saveWerkstattOrder = async (
  order: Omit<WerkstattOrder, "id" | "created_at">
): Promise<WerkstattOrder | null> => {
  const supabase = createClient()
  if (!supabase) return null
  const { data, error } = await supabase
    .from("werkstatt_orders")
    .insert(order)
    .select()
    .single()

  if (error) {
    console.error("Error saving werkstatt order:", error)
    return null
  }

  return data
}

export const updateWerkstattOrder = async (
  id: number,
  updates: Partial<WerkstattOrder>
): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase
    .from("werkstatt_orders")
    .update(updates)
    .eq("id", id)

  if (error) {
    console.error("Error updating werkstatt order:", error)
    return false
  }

  return true
}

export const deleteWerkstattOrder = async (id: number): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase
    .from("werkstatt_orders")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting werkstatt order:", error)
    return false
  }

  return true
}

export const deleteAllWerkstattOrders = async (): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase
    .from("werkstatt_orders")
    .delete()
    .neq("id", 0)

  if (error) {
    console.error("Error deleting all werkstatt orders:", error)
    return false
  }

  return true
}

// ============ BEWERTUNGEN ============

export type Review = {
  id: number
  name: string
  rating: number
  comment: string
  date?: string
  created_at?: string
}

export const getReviews = async (): Promise<Review[]> => {
  const supabase = createClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching reviews:", error)
    return []
  }

  return data || []
}

export const saveReview = async (review: { name: string; rating: number; comment: string; date?: string }): Promise<Review | null> => {
  const supabase = createClient()
  if (!supabase) {
    console.error("Supabase client not available for saveReview")
    return null
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      name: review.name,
      rating: review.rating,
      comment: review.comment,
      date: review.date || new Date().toLocaleDateString("de-DE"),
    })
    .select()
    .single()

  if (error) {
    console.error("Error saving review:", error)
    return null
  }

  return data
}

export const deleteReview = async (id: number): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting review:", error)
    return false
  }

  return true
}

export const deleteAllReviews = async (): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false

  const { error } = await supabase.from("reviews").delete().neq("id", 0)

  if (error) {
    console.error("Error deleting reviews:", error)
    return false
  }

  return true
}

// Hilfsfunktion für alte Datenformat-Kompatibilität
export const saveUsers = async (users: User[]): Promise<boolean> => {
  // Diese Funktion ist für Batch-Updates - aktualisiert alle Benutzer
  const supabase = createClient()
  if (!supabase) return false

  for (const user of users) {
    const { error } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        username: user.username,
        password: user.password,
        role: user.role,
        user_group: user.group,
        must_change_password: user.mustChangePassword,
        is_temporary_password: user.isTemporaryPassword,
        discord_user_id: user.discordUserId,
        image: user.image,
      })

    if (error) {
      console.error("Error saving user:", error)
      return false
    }
  }

  return true
}

// Custom Ranks batch save
export const saveCustomRanks = async (ranks: { [key: string]: CustomRank }): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false

  for (const [key, rank] of Object.entries(ranks)) {
    const { error } = await supabase
      .from("ranks")
      .upsert({
        rank_key: key,
        name: rank.name,
        level: rank.level,
        permissions: rank.permissions,
      })

    if (error) {
      console.error("Error saving rank:", error)
      return false
    }
  }

  return true
}

// Menu Item Ratings - Essen Bewertungen
export type MenuItemRating = {
  id?: number
  menuItemId: number
  rating: number
  comment: string
  customerName: string
  timestamp: number
}

export const saveMenuRating = async (rating: MenuItemRating): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false

  const { error } = await supabase.from("menu_ratings").insert({
    menu_item_id: rating.menuItemId,
    rating: rating.rating,
    comment: rating.comment,
    customer_name: rating.customerName,
    timestamp: rating.timestamp,
  })

  if (error) {
    console.error("Error saving menu rating:", error)
    return false
  }

  return true
}

export const getMenuRatings = async (menuItemId?: number): Promise<MenuItemRating[]> => {
  const supabase = createClient()
  if (!supabase) return []

  let query = supabase.from("menu_ratings").select("*")

  if (menuItemId !== undefined) {
    query = query.eq("menu_item_id", menuItemId)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching menu ratings:", error)
    return []
  }

  return (data ?? []).map((r) => ({
    menuItemId: r.menu_item_id,
    rating: r.rating,
    comment: r.comment,
    customerName: r.customer_name,
    timestamp: r.created_at ? new Date(r.created_at).getTime() : r.id,
    id: r.id,
  }))
}

export const deleteMenuRating = async (id: number): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false

  const { error } = await supabase.from("menu_ratings").delete().eq("id", id)

  if (error) {
    console.error("Error deleting menu rating:", error)
    return false
  }

  return true
}

export const deleteAllMenuRatings = async (): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false

  const { error } = await supabase.from("menu_ratings").delete().neq("id", -1)

  if (error) {
    console.error("Error deleting all menu ratings:", error)
    return false
  }

  return true
}

// Discount Codes
export type DiscountCode = {
  id: string
  code: string
  discountPercent: number
  validUntil: string
  maxUsages: number
  usageCount: number
  createdAt?: number
  active?: boolean
}

export const saveDiscountCode = async (code: DiscountCode): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false

  const { error } = await supabase.from("discount_codes").upsert({
    id: code.id,
    code: code.code.toUpperCase(),
    discount_percent: code.discountPercent,
    valid_until: code.validUntil,
    max_usages: code.maxUsages,
    usage_count: code.usageCount,
    active: code.active !== false,
  })

  if (error) {
    console.error("Error saving discount code:", error)
    return false
  }

  return true
}

export const getDiscountCodes = async (): Promise<DiscountCode[]> => {
  const supabase = createClient()
  if (!supabase) return []

  const { data, error } = await supabase.from("discount_codes").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching discount codes:", error)
    return []
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    code: c.code,
    discountPercent: c.discount_percent,
    validUntil: c.valid_until,
    maxUsages: c.max_usages,
    usageCount: c.usage_count,
    createdAt: new Date(c.created_at).getTime(),
    active: c.active,
  }))
}

export const updateDiscountCode = async (id: string, updates: Partial<DiscountCode>): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false

  const dbUpdates: Record<string, unknown> = {}

  if (updates.code !== undefined) dbUpdates.code = updates.code.toUpperCase()
  if (updates.discountPercent !== undefined) dbUpdates.discount_percent = updates.discountPercent
  if (updates.validUntil !== undefined) dbUpdates.valid_until = updates.validUntil
  if (updates.maxUsages !== undefined) dbUpdates.max_usages = updates.maxUsages
  if (updates.usageCount !== undefined) dbUpdates.usage_count = updates.usageCount
  if (updates.active !== undefined) dbUpdates.active = updates.active

  const { error } = await supabase.from("discount_codes").update(dbUpdates).eq("id", id)

  if (error) {
    console.error("Error updating discount code:", error)
    return false
  }

  return true
}

export const deleteDiscountCode = async (id: string): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false

  const { error } = await supabase.from("discount_codes").delete().eq("id", id)

  if (error) {
    console.error("Error deleting discount code:", error)
    return false
  }

  return true
}

// ============ CALENDAR EVENTS ============
export type CalendarEvent = {
  id: number
  date: string
  title: string
  startTime: string
  endTime: string
  location: string
  description: string
}

export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const supabase = createClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .order("date", { ascending: true })

  if (error) {
    console.error("Error fetching calendar events:", error)
    return []
  }

  return (data ?? []).map((e) => ({
    id: e.id,
    date: e.date,
    title: e.title,
    startTime: e.start_time,
    endTime: e.end_time,
    location: e.location || "",
    description: e.description || "",
  }))
}

export const saveCalendarEvent = async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent | null> => {
  const supabase = createClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      date: event.date,
      title: event.title,
      start_time: event.startTime,
      end_time: event.endTime,
      location: event.location,
      description: event.description,
    })
    .select()
    .single()

  if (error) {
    console.error("Error saving calendar event:", error)
    return null
  }

  return {
    id: data.id,
    date: data.date,
    title: data.title,
    startTime: data.start_time,
    endTime: data.end_time,
    location: data.location || "",
    description: data.description || "",
  }
}

export const deleteCalendarEvent = async (id: number): Promise<boolean> => {
  const supabase = createClient()
  if (!supabase) return false

  const { error } = await supabase.from("calendar_events").delete().eq("id", id)

  if (error) {
    console.error("Error deleting calendar event:", error)
    return false
  }

  return true
}
