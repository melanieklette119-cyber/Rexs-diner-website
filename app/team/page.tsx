"use client" // Diese Zeile macht die Komponente zur Client Component

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type User, getUsers, getAllRanks, type CustomRank } from "@/lib/user-data"

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([])
  const [ranks, setRanks] = useState<{ [key: string]: CustomRank }>({})
  const [searchQuery, setSearchQuery] = useState("")

  // Liste der ausgeschlossenen Rollen, die ignoriert werden sollen
  const excludedRoles = ["fraktionsverwaltung", "owner"]

  // Zustand für die Sichtbarkeit der Gruppen (alle zu Beginn eingeklappt)
  const [isSonstigesOpen, setSonstigesOpen] = useState(false)
  const [isLeadershipOpen, setLeadershipOpen] = useState(false)
  const [isBoardOpen, setBoardOpen] = useState(false)
  const [isEmployeesOpen, setEmployeesOpen] = useState(false)
  const [isAushilfeOpen, setAushilfeOpen] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      // Load users from Supabase
      const allUsers = await getUsers()
      setUsers(allUsers)

      // Load all ranks (default + custom) from Supabase
      const allRanks = await getAllRanks()
      setRanks(allRanks)
    }

    loadData()
  }, [])

  const getRankDisplayName = (groupName: string) => {
    const rank = ranks[groupName]
    if (rank) return rank.name
    return groupName
  }

  const getRankColor = (groupName: string) => {
    const rank = ranks[groupName]
    if (rank) {
      if (rank.level >= 90) return "bg-red-100 text-red-800"
      if (rank.level >= 70) return "bg-purple-100 text-purple-800"
      if (rank.level >= 50) return "bg-blue-100 text-blue-800"
      return "bg-green-100 text-green-800"
    }

    return "bg-gray-100 text-gray-800"
  }

  // Benutzer nach Suchbegriff filtern
  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sortiere Benutzer nach Rang (bevorzugt `level`, andernfalls `id`) absteigend
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const rankA = ranks[a.group]
    const rankB = ranks[b.group]

    const valueA = (rankA && (rankA.level ?? 0)) ?? 0
    const valueB = (rankB && (rankB.level ?? 0)) ?? 0

    // Primär: Rangwert absteigend
    if (valueB !== valueA) return valueB - valueA

    // Sekundär: alphabetisch nach Benutzernamen
    return a.username.localeCompare(b.username)
  })

  // Filtere Benutzer, die nicht in den ausgeschlossenen Rollen sind
  const filteredUsersWithoutExcludedRoles = sortedUsers.filter(user =>
    !excludedRoles.includes(user.group)
  )

  // Filtere Benutzer für "Sonstiges" (roles: owner, fraktionsverwaltung)
  const sonstigesUsers = users.filter(user =>
    excludedRoles.includes(user.group)
  )

  // Separate users into "Leitungsebene", "Vorstand", "Angestellte" und "Aushilfe"
  const leadershipRanks = [
    "geschäftsführer", 
    "stellv._geschäftsführer", 
    "abteilungsleitung", 
    "stellv._abteilungsleitung"
  ]
  const leadershipUsers = filteredUsersWithoutExcludedRoles.filter(user =>
    leadershipRanks.includes(user.group)
  )

  const boardRanks = [
    "betriebsleiter", 
    "stellv._betriebsleiter"
  ]
  const boardUsers = filteredUsersWithoutExcludedRoles.filter(user =>
    boardRanks.includes(user.group)
  )

  const employeesRanks = [
    "manager", 
    "supervisor", 
    "meister", 
    "vorarbeiter", 
    "geselle", 
    "facharbeiter", 
    "mitarbeiter", 
    "azubi", 
    "praktikant"
  ]
  const employees = filteredUsersWithoutExcludedRoles.filter(user =>
    employeesRanks.includes(user.group)
  )

  // Aushilfe
  const aushilfeRanks = ["aushilfe"]
  const aushilfeUsers = filteredUsersWithoutExcludedRoles.filter(user =>
    aushilfeRanks.includes(user.group)
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Unser Team</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Lernen Sie die Menschen kennen, die Rex Diner zu einem besonderen Ort machen
          </p>
        </div>

        <div className="mb-8 max-w-md mx-auto">
          <input
            type="text"
            placeholder="Nach Namen suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Sonstiges - Nur owner und fraktionsverwaltung */}
        <div className="mb-8">
          <button
            className="text-2xl font-bold text-foreground mb-4 w-full text-left"
            onClick={() => setSonstigesOpen(!isSonstigesOpen)}
          >
            Sonstiges
          </button>
          
          {isSonstigesOpen && (
            <div>
              {sonstigesUsers.length === 0 ? (
                <p className="text-muted-foreground text-lg">Keine Benutzer im Bereich Sonstiges.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {sonstigesUsers.map((user) => (
                    <Card key={user.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-card border-border">
                      <CardContent className="p-6 text-center">
                        <div className="mb-4">
                          {user.image ? (
                            <Image
                              src={user.image || "/placeholder.svg"}
                              alt={user.username}
                              width={100}
                              height={100}
                              className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-primary"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full mx-auto bg-muted flex items-center justify-center border-4 border-primary">
                              <span className="text-2xl font-bold text-muted-foreground">
                                {user.username ? user.username.charAt(0).toUpperCase() : "?"}
                              </span>
                            </div>
                          )}
                        </div>

                        <h3 className="text-xl font-semibold text-card-foreground mb-2">{user.username}</h3>

                        <Badge className={getRankColor(user.group)}>{getRankDisplayName(user.group)}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Leitungsebene */}
        <div className="mb-8">
          <button
            className="text-2xl font-bold text-foreground mb-4 w-full text-left"
            onClick={() => setLeadershipOpen(!isLeadershipOpen)}
          >
            Leitungsebene (Geschäftsführung)
          </button>
          {isLeadershipOpen && (
            <div>
              {leadershipUsers.length === 0 ? (
                <p className="text-muted-foreground text-lg">Keine Mitglieder in der Leitungsebene vorhanden.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {leadershipUsers.map((user) => (
                    <Card key={user.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-card border-border">
                      <CardContent className="p-6 text-center">
                        <div className="mb-4">
                          {user.image ? (
                            <Image
                              src={user.image || "/placeholder.svg"}
                              alt={user.username}
                              width={100}
                              height={100}
                              className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-primary"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full mx-auto bg-muted flex items-center justify-center border-4 border-primary">
                              <span className="text-2xl font-bold text-muted-foreground">
                                {user.username ? user.username.charAt(0).toUpperCase() : "?"}
                              </span>
                            </div>
                          )}
                        </div>

                        <h3 className="text-xl font-semibold text-card-foreground mb-2">{user.username}</h3>

                        <Badge className={getRankColor(user.group)}>{getRankDisplayName(user.group)}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Vorstand */}
        <div className="mb-8">
          <button
            className="text-2xl font-bold text-foreground mb-4 w-full text-left"
            onClick={() => setBoardOpen(!isBoardOpen)}
          >
            Vorstand
          </button>
          {isBoardOpen && (
            <div>
              {boardUsers.length === 0 ? (
                <p className="text-muted-foreground text-lg">Keine Vorstandsmitglieder vorhanden.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {boardUsers.map((user) => (
                    <Card key={user.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-card border-border">
                      <CardContent className="p-6 text-center">
                        <div className="mb-4">
                          {user.image ? (
                            <Image
                              src={user.image || "/placeholder.svg"}
                              alt={user.username}
                              width={100}
                              height={100}
                              className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-primary"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full mx-auto bg-muted flex items-center justify-center border-4 border-primary">
                              <span className="text-2xl font-bold text-muted-foreground">
                                {user.username ? user.username.charAt(0).toUpperCase() : "?"}
                              </span>
                            </div>
                          )}
                        </div>

                        <h3 className="text-xl font-semibold text-card-foreground mb-2">{user.username}</h3>

                        <Badge className={getRankColor(user.group)}>{getRankDisplayName(user.group)}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Angestellte */}
        <div className="mb-8">
          <button
            className="text-2xl font-bold text-foreground mb-4 w-full text-left"
            onClick={() => setEmployeesOpen(!isEmployeesOpen)}
          >
            Angestellte
          </button>
          {isEmployeesOpen && (
            <div>
              {employees.length === 0 ? (
                <p className="text-muted-foreground text-lg">Keine Angestellten vorhanden.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {employees.map((user) => (
                    <Card key={user.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-card border-border">
                      <CardContent className="p-6 text-center">
                        <div className="mb-4">
                          {user.image ? (
                            <Image
                              src={user.image || "/placeholder.svg"}
                              alt={user.username}
                              width={100}
                              height={100}
                              className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-primary"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full mx-auto bg-muted flex items-center justify-center border-4 border-primary">
                              <span className="text-2xl font-bold text-muted-foreground">
                                {user.username ? user.username.charAt(0).toUpperCase() : "?"}
                              </span>
                            </div>
                          )}
                        </div>

                        <h3 className="text-xl font-semibold text-card-foreground mb-2">{user.username}</h3>

                        <Badge className={getRankColor(user.group)}>{getRankDisplayName(user.group)}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Aushilfen */}
        <div className="mb-8">
          <button
            className="text-2xl font-bold text-foreground mb-4 w-full text-left"
            onClick={() => setAushilfeOpen(!isAushilfeOpen)}
          >
            Aushilfen
          </button>
          {isAushilfeOpen && (
            <div>
              {aushilfeUsers.length === 0 ? (
                <p className="text-muted-foreground text-lg">Keine Aushilfen vorhanden.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {aushilfeUsers.map((user) => (
                    <Card key={user.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-card border-border">
                      <CardContent className="p-6 text-center">
                        <div className="mb-4">
                          {user.image ? (
                            <Image
                              src={user.image || "/placeholder.svg"}
                              alt={user.username}
                              width={100}
                              height={100}
                              className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-primary"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full mx-auto bg-muted flex items-center justify-center border-4 border-primary">
                              <span className="text-2xl font-bold text-muted-foreground">
                                {user.username ? user.username.charAt(0).toUpperCase() : "?"}
                              </span>
                            </div>
                          )}
                        </div>

                        <h3 className="text-xl font-semibold text-card-foreground mb-2">{user.username}</h3>

                        <Badge className={getRankColor(user.group)}>{getRankDisplayName(user.group)}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
