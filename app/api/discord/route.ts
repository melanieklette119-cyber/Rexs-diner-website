import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Discord API Base URL
const DISCORD_API = "https://discord.com/api/v10"

// Base role IDs for employees
const BASE_ROLE_IDS = [
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

// Hole Discord-Konfiguration aus Supabase
async function getDiscordConfig(): Promise<{
  token: string
  clientId: string
  guildId: string
  channels: { reservations: string; orders: string; reviews: string; adminLogs: string; announcements?: string }
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase credentials not available")
    return {
      token: "",
      clientId: "",
      guildId: "",
      channels: { reservations: "", orders: "", reviews: "", adminLogs: "", announcements: "" },
    }
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase.from("website_config").select("*")

  if (error || !data) {
    console.error("Error fetching Discord config:", error)
    return {
      token: "",
      clientId: "",
      guildId: "",
      channels: { reservations: "", orders: "", reviews: "", adminLogs: "", announcements: "" },
    }
  }

  let botConfig = { token: "", clientId: "", guildId: "" }
  let channels = { reservations: "", orders: "", reviews: "", adminLogs: "", announcements: "" }

  for (const row of data) {
    if (row.config_key === "discord_bot") {
      botConfig = row.config_value || botConfig
    } else if (row.config_key === "discord_channels") {
      channels = row.config_value || channels
    }
  }

  console.log("[Discord] Config loaded - Guild ID:", botConfig.guildId, "Token exists:", !!botConfig.token)

  return {
    token: botConfig.token,
    clientId: botConfig.clientId,
    guildId: botConfig.guildId,
    channels,
  }
}

// Send message to Discord channel
async function sendToDiscordChannel(channelId: string, content: string, embedsOrToken?: any[] | string, token?: string) {
  const embeds = Array.isArray(embedsOrToken) ? embedsOrToken : []
  const DISCORD_TOKEN = token ?? (typeof embedsOrToken === "string" ? embedsOrToken : "")
  try {
    const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        embeds: embeds || [],
      }),
    })

    if (!response.ok) {
      console.error("Discord API Error:", await response.text())
    }

    return response.ok
  } catch (error) {
    console.error("Discord send error:", error)
    return false
  }
}

// Send DM to user
async function sendDirectMessage(userId: string, content: string, embeds?: any[], DISCORD_TOKEN = "") {
  console.log("[Rex´s Dinner & Repair] sendDirectMessage called with userId:", userId)

  if (!userId || !DISCORD_TOKEN) {
    console.error("[Rex´s Dinner & Repair] Missing userId or token - userId:", !!userId, "token:", !!DISCORD_TOKEN)
    return false
  }

  try {
    // Create DM channel
    console.log("[Rex´s Dinner & Repair] Creating DM channel for user:", userId)
    const dmResponse = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient_id: userId,
      }),
    })

    if (!dmResponse.ok) {
      const errorText = await dmResponse.text()
      console.error("[Rex´s Dinner & Repair] Failed to create DM channel. Status:", dmResponse.status, "Error:", errorText)
      return false
    }

    const dmChannel = await dmResponse.json()
    console.log("[Rex´s Dinner & Repair] DM channel created:", dmChannel.id)

    // Send message to DM channel
    const messageResponse = await fetch(`${DISCORD_API}/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        embeds: embeds || [],
      }),
    })

    if (!messageResponse.ok) {
      const msgError = await messageResponse.text()
      console.error("[Rex´s Dinner & Repair] Failed to send message. Status:", messageResponse.status, "Error:", msgError)
      return false
    }

    console.log("[Rex´s Dinner & Repair] DM sent successfully!")
    return true
  } catch (error) {
    console.error("[Rex´s Dinner & Repair] Discord DM error:", error)
    return false
  }
}

async function findUserByUsername(username: string, DISCORD_TOKEN: string, GUILD_ID: string) {
  try {
    // Hole alle Mitglieder des Servers
    const response = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000`, {
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
      },
    })

    if (!response.ok) {
      console.error("Failed to fetch guild members:", await response.text())
      return null
    }

    const members = await response.json()

    // Suche nach dem Benutzer (sowohl mit als auch ohne Diskriminator)
    const member = members.find((m: any) => {
      const userTag = `${m.user.username}#${m.user.discriminator}`
      const globalName = m.user.global_name || m.user.username

      return (
        userTag === username ||
        m.user.username === username ||
        globalName === username ||
        username.includes(m.user.username)
      )
    })

    return member ? member.user.id : null
  } catch (error) {
    console.error("Error finding user:", error)
    return null
  }
}

// Get guild roles
async function getGuildRoles(DISCORD_TOKEN: string, GUILD_ID: string) {
  try {
    const response = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, {
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
      },
    })

    if (!response.ok) {
      console.error("Failed to fetch guild roles:", await response.text())
      return []
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching guild roles:", error)
    return []
  }
}

// Assign role to user
async function assignRoleToUser(userId: string, roleId: string, DISCORD_TOKEN: string, GUILD_ID: string) {
  try {
    const response = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${userId}/roles/${roleId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Discord] Failed to assign role ${roleId} to user ${userId}: ${response.status} ${response.statusText} - ${errorText}`)
      return false
    }

    console.log(`[Discord] Successfully assigned role ${roleId} to user ${userId}`)
    return true
  } catch (error) {
    console.error(`[Discord] Error assigning role ${roleId} to user ${userId}:`, error)
    return false
  }
}

// Remove role from user
async function removeRoleFromUser(userId: string, roleId: string, DISCORD_TOKEN: string, GUILD_ID: string) {
  try {
    const response = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${userId}/roles/${roleId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Discord] Failed to remove role ${roleId} from user ${userId}: ${response.status} ${response.statusText} - ${errorText}`)
      return false
    }

    console.log(`[Discord] Successfully removed role ${roleId} from user ${userId}`)
    return true
  } catch (error) {
    console.error(`[Discord] Error removing role ${roleId} from user ${userId}:`, error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body
    const discordConfig = await getDiscordConfig()
    const DISCORD_TOKEN = discordConfig.token
    const GUILD_ID = discordConfig.guildId

    console.log(`[Discord] Processing ${type} for guild ${GUILD_ID}`)

    switch (type) {
      case "new_reservation":
        await sendToDiscordChannel(
          discordConfig.channels.reservations, // Reservierungen bleiben im ursprünglichen Channel
          "||<@&1466554753671630949>|| 🍽️ | **Neue Reservierung bei Rex Diner!**",
          [
            {
              title: "Neue Tischreservierung",
              color: 0xff6b35,
              fields: [
                { name: "Name", value: data.name, inline: true },
                { name: "Datum", value: data.date, inline: true },
                { name: "Uhrzeit", value: data.time, inline: true },
                { name: "Personen", value: data.guests.toString(), inline: true },
                { name: "Telefon", value: data.phone, inline: true },
                { name: "E-Mail", value: data.email, inline: true },
                { name: "Notizen", value: data.notes || "Keine", inline: false },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
          DISCORD_TOKEN
        )
        break

      case "new_order":
        const orderItems = data.items.map((item: any) => `${item.quantity}x ${item.name} (€${item.price})`).join("\n")

        // detect werkstatt booking by presence of vehicleInfo or pickupAddress
        const isWerkstatt = !!(
          data.customerInfo &&
          (data.customerInfo.vehicleInfo || data.customerInfo.pickupAddress)
        )

        // Build fields and include discount code if provided
        const orderFields: any[] = [
          { name: "Kunde", value: data.customerInfo.name, inline: true },
          { name: "Telefon", value: data.customerInfo.phone, inline: true },
        ]

        if (isWerkstatt) {
          // for workshop orders show vehicle info and pickup address
          if (data.customerInfo.vehicleInfo) {
            orderFields.push({ name: "Fahrzeug", value: data.customerInfo.vehicleInfo, inline: false })
          }
          if (data.customerInfo.pickupAddress) {
            orderFields.push({ name: "Abholadresse", value: data.customerInfo.pickupAddress, inline: false })
          }
        } else {
          orderFields.push({ name: "Adresse", value: data.customerInfo.address, inline: false })
        }

        if (data.discount_code) {
          orderFields.push({ name: "Rabattcode", value: `${data.discount_code}`, inline: true })
        }

        orderFields.push({ name: isWerkstatt ? "Ausgewählte Services" : "Bestellte Artikel", value: orderItems, inline: false })
        orderFields.push({ name: "Gesamtsumme", value: `€${data.total}`, inline: true })

        // send primary notification to orders channel
        await sendToDiscordChannel(
          discordConfig.channels.orders,
          isWerkstatt ? "||<@&1466554753671630949>||🛠️ | **Neue Werkstatt-Buchung**" : "||<@&1466554753671630949>||🛒 | **Neue Bestellung bei Rex Diner!**",
          [
            {
              title: isWerkstatt ? "Neue Werkstatt-Buchung" : "Neue Online-Bestellung",
              color: isWerkstatt ? 0x6f42c1 : 0x28a745,
              fields: orderFields,
              timestamp: new Date().toISOString(),
            },
          ],
          DISCORD_TOKEN
        )

      // if it's a workshop order, also send a duplicate notification so admins watching the orders channel don't miss it
      // if (isWerkstatt) {
      //   await sendToDiscordChannel(
      //     discordConfig.channels.orders,
      //     "🛠️ | **Werkstatt-Buchung (zusätzlich)**",
      //     [
      //       {
      //         title: "Werkstatt-Buchung erhalten",
      //         color: 0x6f42c1,
      //         fields: orderFields,
      //         timestamp: new Date().toISOString(),
      //       },
      //     ],
      //     DISCORD_TOKEN
      //   )
      // }
      // break

      case "new_review":
        const stars = "⭐".repeat(data.rating)

        await sendToDiscordChannel(
          discordConfig.channels.reviews, // Bewertungen gehen in separaten Channel
          "⭐ | **Neue Bewertung für Rex Diner!**",
          [
            {
              title: "Neue Kundenbewertung",
              color: 0xffd700,
              fields: [
                { name: "Name", value: data.name, inline: true },
                { name: "Bewertung", value: `${stars} (${data.rating}/5)`, inline: true },
                { name: "Kommentar", value: data.comment, inline: false },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
          DISCORD_TOKEN
        )
        break

      case "new_menu_rating":
        // Menu item (Essen) ratings - send to same reviews channel but with item name
        try {
          const menuStars = "⭐".repeat(data.rating || 0)
          await sendToDiscordChannel(
            discordConfig.channels.reviews,
            "🍽️⭐ | **Neue Essens-Bewertung bei Rex Diner!**",
            [
              {
                title: "Neue Essens-Bewertung",
                color: 0xffd700,
                fields: [
                  { name: "Gericht", value: data.menuItemName || `ID: ${data.menuItemId || "unbekannt"}`, inline: true },
                  { name: "Name", value: data.customerName || data.name || "Anonym", inline: true },
                  { name: "Bewertung", value: `${menuStars} (${data.rating || 0}/5)`, inline: true },
                  { name: "Kommentar", value: data.comment || "Keine", inline: false },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
            DISCORD_TOKEN
          )
        } catch (e) {
          console.error("Failed to send menu rating to Discord:", e)
        }
        break

      case "send_login_dm":
        const { discordUserId, username, password } = data

        await sendDirectMessage(discordUserId, "🔑 | **Rex Diner - Zugriff gewährt**", [
          {
            title: "Du hast bei Rex Diner Zugriff bekommen!",
            color: 0xff6b35,
            description: "Hier sind deine Login-Daten für das Admin-Panel:",
            fields: [
              { name: "Benutzername", value: username, inline: true },
              { name: "Passwort(Nicht Weitergeben!):", value: password, inline: true },
              { name: "Login-URL", value: "rex-dinner-ts.vercel.app/login", inline: false },
            ],
            footer: {
              text: "Bitte ändere dein Passwort beim ersten Login. Bitte gebe keine privaten Daten ein oder Sonstiges. Danke!",
            },
            timestamp: new Date().toISOString(),
          },
        ], DISCORD_TOKEN)
        break

      case "user_access_revoked":
        const { revokedUser, adminName, reason: terminationReason } = data

        if (revokedUser.discordUserId) {
          const dmFields = [
            { name: "Betroffener Benutzer", value: revokedUser.username, inline: true },
            { name: "Entfernt von", value: adminName, inline: true },
          ]

          // Grund hinzufuegen wenn vorhanden
          if (terminationReason) {
            dmFields.push({ name: "Grund", value: terminationReason, inline: false })
          }

          await sendDirectMessage(revokedUser.discordUserId, "🚫 | **Rex Diner - Zugriff entzogen**", [
            {
              title: "Dein Zugriff wurde entzogen",
              color: 0xff0000,
              description: "Dein Zugriff auf das Rex Diner Admin-Panel wurde entfernt.",
              fields: dmFields,
              timestamp: new Date().toISOString(),
            },
          ], DISCORD_TOKEN)
        }

        // Auch Benachrichtigung an Admin-Logs-Channel senden
        const revokedAdminLogsChannel = discordConfig.channels.adminLogs || discordConfig.channels.reservations
        if (revokedAdminLogsChannel) {
          const logFields = [
            { name: "Entfernter Benutzer", value: revokedUser.username, inline: true },
            { name: "Gruppe", value: revokedUser.group, inline: true },
            { name: "Entfernt von", value: adminName, inline: true },
          ]

          // Grund auch im Log hinzufuegen
          if (terminationReason) {
            logFields.push({ name: "Grund", value: terminationReason, inline: false })
          }

          await sendToDiscordChannel(
            revokedAdminLogsChannel,
            "🚫 **Benutzer-Zugriff entzogen**",
            [
              {
                title: "Benutzer-Zugriff wurde entfernt",
                color: 0xff0000,
                fields: logFields,
                timestamp: new Date().toISOString(),
              },
            ],
            DISCORD_TOKEN
          )
        }
        // Öffentliche Ankündigung für entzogenen Zugriff deaktiviert.
        // Hinweis: Entfernt, damit "🚫 Zugriff entzogen" nicht im Ankündigungs-Channel erscheint.
        break

      case "reservation_confirmation_dm":
        const reservationUserId = data.discordUserId // Umbenannt um Redeclaration zu vermeiden

        try {
          const dmSent = await sendDirectMessage(reservationUserId, "🍽️ | **Rex Diner - Reservierungsbestätigung**", [
            {
              title: "Reservierung erfolgreich eingereicht!",
              color: 0xff6b35,
              description:
                "Deine Reservierung wurde erfolgreich eingereicht. Warte bis die Mitarbeiter die Reservierung annehmen oder ablehnen.",
              fields: [
                { name: "Status", value: "⏳ | Warten auf Bestätigung", inline: true },
                {
                  name: "Nächste Schritte",
                  value: "Du erhältst eine weitere Nachricht, sobald deine Reservierung bearbeitet wurde.",
                  inline: false,
                },
              ],
              footer: {
                text: "Rex Diner - Dein Lieblingsrestaurant",
              },
              timestamp: new Date().toISOString(),
            },
          ], DISCORD_TOKEN)

          if (!dmSent) {
            await sendToDiscordChannel(
              discordConfig.channels.reservations,
              // `📩 | **Discord ID ${reservationUserId}**: Deine Reservierung wurde erfolgreich eingereicht. Warte bis die Mitarbeiter die Reservierung annehmen oder ablehnen. (DM konnte nicht gesendet werden)`,
              "",
              DISCORD_TOKEN
            )
          }
        } catch (error) {
          console.error("Failed to send confirmation:", error)
          await sendToDiscordChannel(
            discordConfig.channels.reservations,
            // `📩 | **Discord ID ${data.discordUserId}**: Deine Reservierung wurde erfolgreich eingereicht. Warte bis die Mitarbeiter die Reservierung annehmen oder ablehnen.`,
            "",
            DISCORD_TOKEN
          )
        }
        break

      case "reservation_accepted":
        const acceptedUserId = data.discordUserId
        const acceptedReservation = data.reservation

        try {
          await sendDirectMessage(acceptedUserId, "✅ | | **Rex Diner - Reservierung bestätigt!**", [
            {
              title: "Deine Reservierung wurde angenommen!",
              color: 0x28a745,
              description: "Wir freuen uns auf deinen Besuch bei Rex Diner!",
              fields: [
                { name: "Name", value: acceptedReservation.name, inline: true },
                { name: "Datum", value: acceptedReservation.date, inline: true },
                { name: "Uhrzeit", value: acceptedReservation.time, inline: true },
                { name: "Personen", value: acceptedReservation.guests.toString(), inline: true },
                { name: "Status", value: "✅ | | Bestätigt", inline: true },
                {
                  name: "Wichtige Hinweise",
                  value:
                    "Bitte sei pünktlich und bringe einen gültigen Ausweis mit. Bei Verspätungen über 15 Minuten kann der Tisch anderweitig vergeben werden.",
                  inline: false,
                },
              ],
              footer: {
                text: "Rex Diner - Wir freuen uns auf dich!",
              },
              timestamp: new Date().toISOString(),
            },
          ], DISCORD_TOKEN)
        } catch (error) {
          console.error("Failed to send acceptance notification:", error)
        }
        break

      case "reservation_rejected":
        const rejectedUserId = data.discordUserId
        const rejectedReservation = data.reservation

        try {
          await sendDirectMessage(rejectedUserId, "❌ | **Rex Diner - Reservierung abgelehnt**", [
            {
              title: "Deine Reservierung wurde leider abgelehnt",
              color: 0xff0000,
              description: "Leider können wir deine Reservierung nicht bestätigen.",
              fields: [
                { name: "Name", value: rejectedReservation.name, inline: true },
                { name: "Datum", value: rejectedReservation.date, inline: true },
                { name: "Uhrzeit", value: rejectedReservation.time, inline: true },
                { name: "Personen", value: rejectedReservation.guests.toString(), inline: true },
                { name: "Status", value: "❌ | Abgelehnt", inline: true },
                {
                  name: "Alternative Termine",
                  value:
                    "Bitte versuche es mit einem anderen Datum oder einer anderen Uhrzeit. Du kannst auch telefonisch unter unserer Hotline nachfragen.",
                  inline: false,
                },
              ],
              footer: {
                text: "Rex Diner - Vielen Dank für dein Verständnis",
              },
              timestamp: new Date().toISOString(),
            },
          ], DISCORD_TOKEN)
        } catch (error) {
          console.error("Failed to send rejection notification:", error)
        }
        break

      case "user_rights_changed":
        const { targetUser, adminName: changedByAdmin, previousGroup, newGroup, previousRank, newRank } = data

        // Bestimme ob mehr oder weniger Rechte
        const previousLevel = previousRank?.level || 0
        const newLevel = newRank?.level || 0
        const rightsChange = newLevel > previousLevel ? "mehr" : newLevel < previousLevel ? "weniger" : "gleich viele"
        const changeColor = newLevel > previousLevel ? 0x28a745 : newLevel < previousLevel ? 0xff0000 : 0xffa500
        const changeEmoji = newLevel > previousLevel ? "⬆️ | " : newLevel < previousLevel ? "⬇️ | " : "↔️ | "

        // Formatiere Berechtigungen für Anzeige
        const formatPermissions = (permissions: string[]) => {
          if (!permissions || permissions.length === 0) return "Keine"
          if (permissions.includes("all")) return "Vollzugriff"
          return permissions.map(p => {
            switch (p) {
              case "reservations": return "Reservierungen"
              case "orders": return "Bestellungen"
              case "reviews": return "Bewertungen"
              case "menu": return "Speisekarte"
              case "users_limited": return "Benutzer (eingeschränkt)"
              case "users": return "Benutzerverwaltung"
              default: return p
            }
          }).join(", ")
        }

        if (targetUser.discordUserId) {
          await sendDirectMessage(targetUser.discordUserId, `${changeEmoji} **Rex Diner - Rechte wurden verändert**`, [
            {
              title: "Deine Rechte wurden verwaltet",
              color: changeColor,
              description: `Deine Berechtigungen bei Rex Diner wurden von **${changedByAdmin}** geändert.`,
              fields: [
                { name: "Benutzername", value: targetUser.username, inline: true },
                { name: "Geändert von", value: changedByAdmin, inline: true },
                { name: "\u200B", value: "\u200B", inline: true },
                { name: "Rang davor", value: previousRank?.name || previousGroup || "Unbekannt", inline: true },
                { name: "Rang danach", value: newRank?.name || newGroup || "Unbekannt", inline: true },
                { name: "\u200B", value: "\u200B", inline: true },
                { name: "Rechte davor", value: formatPermissions(previousRank?.permissions || []), inline: false },
                { name: "Rechte danach", value: formatPermissions(newRank?.permissions || []), inline: false },
                { name: "Ergebnis", value: `Du hast jetzt **${rightsChange}** Rechte als vorher.`, inline: false },
              ],
              footer: {
                text: "Rex Diner - Berechtigungsverwaltung",
              },
              timestamp: new Date().toISOString(),
            },
          ], DISCORD_TOKEN)
        }

        // Auch Benachrichtigung an Admin-Logs-Channel senden
        const rightsAdminLogsChannel = discordConfig.channels.adminLogs || discordConfig.channels.reservations
        if (rightsAdminLogsChannel) {
          await sendToDiscordChannel(
            rightsAdminLogsChannel,
            `${changeEmoji} **Benutzer-Rechte geändert**`,
            [
              {
                title: "Benutzer-Rechte wurden verwaltet",
                color: changeColor,
                fields: [
                  { name: "Benutzer", value: targetUser.username, inline: true },
                  { name: "Geändert von", value: changedByAdmin, inline: true },
                  { name: "Rang", value: `${previousRank?.name || previousGroup} → ${newRank?.name || newGroup}`, inline: true },
                  { name: "Level", value: `${previousLevel} → ${newLevel}`, inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
            DISCORD_TOKEN
          )
        }

        // Öffentliche Ankündigung bei Beförderung/Degradierung (wenn Level sich geändert hat)
        if (newLevel !== previousLevel) {
          const announcementsChannel = discordConfig.channels.announcements || ""
          if (announcementsChannel) {
            const mentionedUserId = targetUser?.discordUserId ?? data?.discordUserId ?? null
            const userMention = mentionedUserId ? `<@${mentionedUserId}>` : "Nicht verknüpft"

            if (newLevel > previousLevel) {
              // Beförderung Embed
              const embed = {
                title: "🎉 | Beförderung",
                color: 0x28a745,
                description: `${userMention} wurde befördert! Herzlichen Glückwunsch!`,
                fields: [
                  { name: "Benutzer", value: targetUser.username, inline: true },
                  { name: "Rang davor", value: previousRank?.name || previousGroup || "Unbekannt", inline: true },
                  { name: "Rang danach", value: newRank?.name || newGroup || "Unbekannt", inline: true },
                  { name: "Geändert von", value: changedByAdmin || "Admin", inline: true },
                ],
                footer: { text: "Rex Diner - Glückwunsch" },
                timestamp: new Date().toISOString(),
              }
              await sendToDiscordChannel(announcementsChannel, userMention, [embed], DISCORD_TOKEN)
            } else {
              // Degradierung Embed
              const embed = {
                title: "⚠️ | Degradierung",
                color: 0xff0000,
                description: `${userMention} wurde herabgestuft. Bitte bei Fragen an das Team wenden.`,
                fields: [
                  { name: "Benutzer", value: targetUser.username, inline: true },
                  { name: "Rang davor", value: previousRank?.name || previousGroup || "Unbekannt", inline: true },
                  { name: "Rang danach", value: newRank?.name || newGroup || "Unbekannt", inline: true },
                  { name: "Geändert von", value: changedByAdmin || "Admin", inline: true },
                ],
                footer: { text: "Rex Diner - Information" },
                timestamp: new Date().toISOString(),
              }
              await sendToDiscordChannel(announcementsChannel, userMention, [embed], DISCORD_TOKEN)
            }
          }
        }
        break

      case "user_added":
        // Neuer Benutzer wurde hinzugefügt
        const addedAdminLogsChannel = discordConfig.channels.adminLogs || discordConfig.channels.reservations
        if (addedAdminLogsChannel) {
          await sendToDiscordChannel(
            addedAdminLogsChannel,
            "✅ | **Neuer Benutzer hinzugefügt**",
            [
              {
                title: "Neuer Benutzer wurde erstellt",
                color: 0x28a745,
                fields: [
                  { name: "Benutzername", value: data.username, inline: true },
                  { name: "Rang", value: data.group, inline: true },
                  { name: "Hinzugefügt von", value: data.addedBy, inline: true },
                  { name: "Discord ID", value: data.discordUserId || "Nicht verknüpft", inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
            DISCORD_TOKEN
          )
        }
        // Öffentliche Ankündigung (Ankündigungen-Channel)
        try {
          const announcementsChannel = discordConfig.channels.announcements || ""
          if (announcementsChannel) {
            const userMention = data.discordUserId ? `<@${data.discordUserId}>` : "Nicht verknüpft"
            const embed = {
              title: "✅ | Neuer Mitarbeiter eingestellt",
              color: 0x28a745,
              description: `${userMention} wurde neu im Team aufgenommen. Herzlich willkommen!`,
              fields: [
                { name: "Benutzer", value: data.discordUserId ? `<@${data.discordUserId}>` : "Nicht verknüpft", inline: true },
                { name: "Rang", value: data.group || "Unbekannt", inline: true },
                { name: "Eingestellt von", value: data.addedBy || "Admin", inline: true },
              ],
              footer: { text: "Rex Diner - Willkommen im Team" },
              timestamp: new Date().toISOString(),
            }
            await sendToDiscordChannel(announcementsChannel, userMention, [embed], DISCORD_TOKEN)
          }
        } catch (e) {
          console.error("Failed to announce new user:", e)
        }
        break

      case "user_deleted":
        // Benutzer wurde gelöscht
        const deletedAdminLogsChannel = discordConfig.channels.adminLogs || discordConfig.channels.reservations
        if (deletedAdminLogsChannel) {
          await sendToDiscordChannel(
            deletedAdminLogsChannel,
            "🗑️ | **Benutzer gelöscht**",
            [
              {
                title: "Benutzer wurde gelöscht",
                color: 0xff0000,
                fields: [
                  { name: "Discord ID", value: data.discordUserId || "Nicht verknüpft", inline: true },
                  { name: "Rang", value: data.group, inline: true },
                  { name: "Gelöscht von", value: data.deletedBy, inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
            DISCORD_TOKEN
          )
        }
        // Öffentliche Ankündigung (Ankündigungen-Channel)
        try {
          const deletedAnnouncementsChannel = discordConfig.channels.announcements || ""
          if (deletedAnnouncementsChannel) {
            let mentionedUserId: string | null = data.discordUserId ?? null
            if (!mentionedUserId && data.username) {
              try {
                mentionedUserId = await findUserByUsername(data.username, DISCORD_TOKEN, GUILD_ID)
              } catch (err) {
                console.error('Failed to lookup user by username for announcement:', err)
              }
            }

            const displayName = data.username || "Nicht verknüpft"
            const userMention = mentionedUserId ? `<@${mentionedUserId}>` : displayName
            const embed = {
              title: "🗑️ | Mitarbeiter Gekündigt",
              color: 0xff0000,
              description: `${userMention} wurde gekündigt.`,
              fields: [
                { name: "Benutzer", value: userMention, inline: true },
                { name: "Rang", value: data.group || "Unbekannt", inline: true },
                { name: "Grund", value: "Gründe werden allgemein nicht genannt. Wenn Interesse besteht, fragen Sie gerne den Mitarbeiter.", inline: false },
                { name: "Gekündigt von", value: data.deletedBy || "Admin", inline: true },
              ],
              footer: { text: "Rex Diner - Personal" },
              timestamp: new Date().toISOString(),
            }
            await sendToDiscordChannel(deletedAnnouncementsChannel, userMention, [embed], DISCORD_TOKEN)
          }
        } catch (e) {
          console.error("Failed to announce deleted user:", e)
        }
        break

      case "password_reset":
        // Passwort wurde zurückgesetzt
        const passwordAdminLogsChannel = discordConfig.channels.adminLogs || discordConfig.channels.reservations
        const newPassword = data.newPassword || data.password || data.resetPassword || data.tempPassword || ""
        
        if (passwordAdminLogsChannel) {
          await sendToDiscordChannel(
            passwordAdminLogsChannel,
            "🔐 | **Passwort zurückgesetzt**",
            [
              {
                title: "Benutzer-Passwort wurde zurückgesetzt",
                color: 0xffa500,
                fields: [
                  { name: "Benutzer", value: data.username, inline: true },
                  { name: "Zurückgesetzt von", value: data.resetBy, inline: true },
                  { name: "Neues Passwort", value: newPassword || "Nicht verfügbar", inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
            DISCORD_TOKEN
          )
        }

        // Zusätzlich: Sende das neue Passwort per DM an den Benutzer, falls Discord-ID vorhanden
        try {
          const passwordUserId = data.discordUserId

          if (passwordUserId && newPassword) {
            await sendDirectMessage(passwordUserId, "🔐 | **Rex Diner - Dein neues Passwort**", [
              {
                title: "Dein Passwort wurde zurückgesetzt",
                color: 0xffa500,
                description: "Hier ist dein neues Passwort. Bitte ändere es nach dem ersten Login.",
                fields: [
                  { name: "Benutzer", value: data.username || "Unbekannt", inline: true },
                  { name: "Neues Passwort", value: newPassword, inline: true },
                  { name: "Hinweis", value: "Nicht weitergeben!", inline: false },
                ],
                footer: { text: "Rex Diner - Sicherheits-Info" },
                timestamp: new Date().toISOString(),
              },
            ], DISCORD_TOKEN)
          }
        } catch (e) {
          console.error("Failed to DM new password:", e)
        }

        break

      case "rank_created":
        // Neuer Rang wurde erstellt
        const rankCreatedChannel = discordConfig.channels.adminLogs || discordConfig.channels.reservations
        if (rankCreatedChannel) {
          await sendToDiscordChannel(
            rankCreatedChannel,
            "🏷️ | **Neuer Rang erstellt**",
            [
              {
                title: "Ein neuer Rang wurde erstellt",
                color: 0x9b59b6,
                fields: [
                  { name: "Rang-Name", value: data.rankName, inline: true },
                  { name: "Level", value: `${data.rankLevel}`, inline: true },
                  { name: "Erstellt von", value: data.createdBy, inline: true },
                  { name: "Berechtigungen", value: data.permissions || "Keine", inline: false },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
            DISCORD_TOKEN
          )
        }
        break

      case "rank_deleted":
        // Rang wurde gelöscht
        const rankDeletedChannel = discordConfig.channels.adminLogs || discordConfig.channels.reservations
        if (rankDeletedChannel) {
          await sendToDiscordChannel(
            rankDeletedChannel,
            "🗑️ | **Rang gelöscht**",
            [
              {
                title: "Ein Rang wurde gelöscht",
                color: 0xff0000,
                fields: [
                  { name: "Rang-Name", value: data.rankName, inline: true },
                  { name: "Gelöscht von", value: data.deletedBy, inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
            DISCORD_TOKEN
          )
        }
        break

      case "rank_updated":
        // Rang wurde aktualisiert
        const rankUpdatedChannel = discordConfig.channels.adminLogs || discordConfig.channels.reservations
        if (rankUpdatedChannel) {
          await sendToDiscordChannel(
            rankUpdatedChannel,
            "✏️ | **Rang aktualisiert**",
            [
              {
                title: "Ein Rang wurde bearbeitet",
                color: 0x3498db,
                fields: [
                  { name: "Rang-Name", value: data.rankName, inline: true },
                  { name: "Neues Level", value: `${data.rankLevel}`, inline: true },
                  { name: "Aktualisiert von", value: data.updatedBy, inline: true },
                  { name: "Neue Berechtigungen", value: data.permissions || "Keine", inline: false },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
            DISCORD_TOKEN
          )
        }
        break

      case "settings_changed":
        // Einstellungen wurden geändert
        try {
          const { changedBy, settings } = data
          const settingsAdminChannel = discordConfig.channels.adminLogs || discordConfig.channels.reservations
          const changedSections = settings ? Object.keys(settings).join(", ") : "Unbekannt"

          if (settingsAdminChannel) {
            await sendToDiscordChannel(
              settingsAdminChannel,
              "⚙️ | **Einstellungen geändert**",
              [
                {
                  title: "Website-Einstellungen wurden aktualisiert",
                  color: 0x3498db,
                  fields: [
                    { name: "Geändert von", value: changedBy || "Unbekannt", inline: true },
                    { name: "Bereiche", value: changedSections, inline: true },
                  ],
                  timestamp: new Date().toISOString(),
                },
              ],
              DISCORD_TOKEN
            )
          }

          // Note: settings changes are only posted to admin logs, not the public announcements channel.
        } catch (e) {
          console.error("Failed to announce settings change:", e)
        }
        break

      case "order_confirmation_dm":
        // legacy order confirmation for restaurant purchases
        const orderUserId = data.discordUserId
        const orderDetails = data.order
        const orderItemsList = orderDetails.items.map((item: any) => `${item.quantity}x ${item.name}`).join("\n")

        console.log("[Rex´s Dinner & Repair] Sending order confirmation DM to:", orderUserId)
        console.log("[Rex´s Dinner & Repair] Discord Token available:", !!DISCORD_TOKEN)

        if (!orderUserId) {
          console.error("[Rex´s Dinner & Repair] No Discord user ID provided")
          return NextResponse.json({ error: "No Discord user ID provided" }, { status: 400 })
        }

        if (!DISCORD_TOKEN) {
          console.error("[Rex´s Dinner & Repair] No Discord token configured")
          return NextResponse.json({ error: "Discord bot not configured" }, { status: 500 })
        }

        try {
          // Build fields and include discount code if present
          const fields: any[] = [
            { name: "Bestellnummer", value: `#${orderDetails.id}`, inline: true },
            { name: "Gesamtsumme", value: `€${orderDetails.total}`, inline: true },
          ]

          if (orderDetails.discount_code) {
            fields.push({ name: "Rabattcode", value: `${orderDetails.discount_code}`, inline: true })
          }

          fields.push(
            { name: "Status", value: "⏳ | Wird bearbeitet", inline: true },
            { name: "Bestellte Artikel", value: orderItemsList || "Keine Artikel", inline: false },
            { name: "Lieferadresse", value: orderDetails.notes || "Nicht angegeben", inline: false },
            {
              name: "Nächste Schritte",
              value: "Du erhältst eine weitere Nachricht, sobald deine Bestellung fertig ist.",
              inline: false,
            },
          )

          const orderDmSent = await sendDirectMessage(orderUserId, "🛒 | **Rex Diner - Bestellbestätigung**", [
            {
              title: "Bestellung erfolgreich aufgegeben!",
              color: 0x28a745,
              description:
                "Deine Bestellung wurde erfolgreich eingereicht. Warte bis die Mitarbeiter die Bestellung bearbeiten.",
              fields,
              footer: {
                text: "Rex Diner - Guten Appetit!",
              },
              timestamp: new Date().toISOString(),
            },
          ], DISCORD_TOKEN)

          console.log("[Rex´s Dinner & Repair] Order DM sent result:", orderDmSent)
          if (!orderDmSent) {
            console.log("[Rex´s Dinner & Repair] DM failed, sending to channel instead")
            const fallbackMessage = `📩 | **Discord ID ${orderUserId}**: Deine Bestellung #${orderDetails.id} wurde erfolgreich eingereicht.` +
              (orderDetails.discount_code ? ` Rabattcode: ${orderDetails.discount_code}` : "") +
              " (DM konnte nicht gesendet werden)"
            await sendToDiscordChannel(
              discordConfig.channels.orders,
              fallbackMessage,
              "",
              DISCORD_TOKEN
            )
          }
        } catch (error) {
          console.error("[Rex´s Dinner & Repair] Failed to send order confirmation:", error)
        }
        break

      case "werkstatt_confirmation_dm":
        // new, styled DM for workshop bookings
        const werkUserId = data.discordUserId
        const booking = data.order
        const werkItemsList = booking.items.map((item: any) => `${item.quantity}x ${item.name}`).join("\n")

        console.log("[Rex´s Dinner & Repair] Sending werkstatt confirmation DM to:", werkUserId)

        if (!werkUserId) {
          console.error("[Rex´s Dinner & Repair] No Discord user ID provided for werkstatt DM")
          return NextResponse.json({ error: "No Discord user ID provided" }, { status: 400 })
        }

        try {
          const werkFields: any[] = [
            { name: "Buchungsnummer", value: `#${booking.id}`, inline: true },
            { name: "Gesamtsumme", value: `€${booking.total}`, inline: true },
            { name: "Status", value: "⏳ | Wird bearbeitet", inline: true },
            { name: "Service(s)", value: werkItemsList || "Keine", inline: false },
            { name: "Fahrzeug", value: booking.customerInfo.vehicleInfo || "Nicht angegeben", inline: true },
            { name: "Abholadresse", value: booking.customerInfo.pickupAddress || "Keine", inline: false },
            { name: "Telefon", value: booking.customerInfo.phone || "Keine", inline: true },
            {
              name: "Weitere Infos",
              value: booking.notes ? booking.notes.replace(/\|/g, "\n") : "Keine",
              inline: false,
            },
          ]

          const werkDmSent = await sendDirectMessage(werkUserId, "🛠️ | **Rex Diner Werkstatt - Buchungsbestätigung**", [
            {
              title: "Werkstatt-Buchung erhalten!",
              color: 0x0055aa,
              description:
                "Deine Anfrage wurde erfolgreich übermittelt. Wir melden uns, sobald dein Service bearbeitet wird.",
              fields: werkFields,
              footer: {
                text: "Rex Diner Werkstatt – Wir kümmern uns um dein Fahrzeug",
              },
              timestamp: new Date().toISOString(),
            },
          ], DISCORD_TOKEN)

          console.log("[Rex´s Dinner & Repair] Werkstatt DM sent result:", werkDmSent)
          if (!werkDmSent) {
            const fallback = `📩 | **Discord ID ${werkUserId}**: Deine Werkstatt-Buchung #${booking.id} wurde eingereicht. (DM fehlgeschlagen)`
            await sendToDiscordChannel(discordConfig.channels.orders, fallback, undefined, DISCORD_TOKEN)
          }
        } catch (error) {
          console.error("[Rex´s Dinner & Repair] Failed to send werkstatt confirmation:", error)
        }
        break

      case "order_status_changed":
        console.log("[Rex´s Dinner & Repair] Processing order_status_changed")
        const statusOrderUserId = data.discordUserId
        const statusOrder = data.order
        const newStatus = data.newStatus

        console.log("[Rex´s Dinner & Repair] Status change - User ID:", statusOrderUserId)
        console.log("[Rex´s Dinner & Repair] Status change - New status:", newStatus)
        console.log("[Rex´s Dinner & Repair] Status change - Order:", statusOrder)

        if (!statusOrderUserId) {
          console.error("[Rex´s Dinner & Repair] No Discord user ID for status update")
          return NextResponse.json({ error: "No Discord user ID provided" }, { status: 400 })
        }
        const statusOrderItems = statusOrder.items?.map((item: any) => `${item.quantity}x ${item.name}`).join("\n") || "Keine Artikel"

        // Status-spezifische Farben und Nachrichten
        let statusColor = 0x3498db
        let statusEmoji = "📋 | "
        let statusTitle = "Bestellstatus aktualisiert"
        let statusDescription = "Der Status deiner Bestellung wurde geändert."

        switch (newStatus) {
          case "In Bearbeitung":
            statusColor = 0xffa500
            statusEmoji = "👨‍🍳 | "
            statusTitle = "Deine Bestellung wird zubereitet!"
            statusDescription = "Unser Küchenteam bereitet deine Bestellung jetzt zu."
            break
          case "Fertig":
            statusColor = 0x28a745
            statusEmoji = "✅ | "
            statusTitle = "Deine Bestellung ist fertig!"
            statusDescription = "Deine Bestellung ist fertig und wartet auf Abholung/Lieferung."
            break
          case "Unterwegs":
            statusColor = 0x9b59b6
            statusEmoji = "🚗 | "
            statusTitle = "Deine Bestellung ist unterwegs!"
            statusDescription = "Dein Essen ist auf dem Weg zu dir!"
            break
          case "Geliefert":
            statusColor = 0x2ecc71
            statusEmoji = "🎉 | "
            statusTitle = "Bestellung geliefert!"
            statusDescription = "Deine Bestellung wurde erfolgreich geliefert. Guten Appetit!"
            break
          case "Storniert":
            statusColor = 0xff0000
            statusEmoji = "❌ | "
            statusTitle = "Bestellung storniert"
            statusDescription = "Deine Bestellung wurde leider storniert. Bei Fragen kontaktiere uns bitte."
            break
        }

        try {
          await sendDirectMessage(statusOrderUserId, `${statusEmoji} **Rex Diner - ${statusTitle}**`, [
            {
              title: statusTitle,
              color: statusColor,
              description: statusDescription,
              fields: [
                { name: "Bestellnummer", value: `#${statusOrder.id}`, inline: true },
                { name: "Neuer Status", value: newStatus, inline: true },
                { name: "Gesamtsumme", value: `€${statusOrder.total}`, inline: true },
                { name: "Bestellte Artikel", value: statusOrderItems, inline: false },
              ],
              footer: {
                text: "Rex Diner - Vielen Dank für deine Bestellung!",
              },
              timestamp: new Date().toISOString(),
            },
          ], DISCORD_TOKEN)
        } catch (error) {
          console.error("Failed to send order status update:", error)
        }
        break

      case "assign_role":
        try {
          const { userId, roleIds, roleName } = data
          console.log("[Discord] Assigning roles to user:", userId, "roleIds:", roleIds, "roleName:", roleName)
          // Assign base roles
          if (roleIds && Array.isArray(roleIds)) {
            for (const roleId of roleIds) {
              console.log("[Discord] Assigning base role:", roleId)
              const success = await assignRoleToUser(userId, roleId, DISCORD_TOKEN, GUILD_ID)
              console.log("[Discord] Base role assignment success:", success)
            }
          }
          // Note: Rank role assignment removed for testing
        } catch (error) {
          console.error("[Discord] Failed to assign role:", error)
        }
        break

      case "remove_role":
        try {
          const { userId, roleIds, roleName } = data
          console.log("[Discord] Removing roles from user:", userId, "roleIds:", roleIds, "roleName:", roleName)
          // Remove base roles
          if (roleIds && Array.isArray(roleIds)) {
            for (const roleId of roleIds) {
              console.log("[Discord] Removing base role:", roleId)
              const success = await removeRoleFromUser(userId, roleId, DISCORD_TOKEN, GUILD_ID)
              console.log("[Discord] Base role removal success:", success)
            }
          }
          // Note: Rank role removal removed for testing
        } catch (error) {
          console.error("[Discord] Failed to remove role:", error)
        }
        break

      case "remove_role":
        try {
          const { userId, roleName } = data
          const roles = await getGuildRoles(DISCORD_TOKEN, GUILD_ID)
          const role = roles.find((r: any) => r.name === roleName)
          if (role) {
            await removeRoleFromUser(userId, role.id, DISCORD_TOKEN, GUILD_ID)
          } else {
            console.error("Role not found:", roleName)
          }
        } catch (error) {
          console.error("Failed to remove role:", error)
        }
        break

      default:
        return NextResponse.json({ error: "Unknown notification type" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Discord notification error:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
