import AdminPage from "@/app/admin/page"

export default function AdminTabPage({ params }: { params: { tab?: string[] } }) {
  const pathSegment = params.tab?.[0] || "menu"

  const mapPathToTab = (path: string) => {
    switch (path) {
      case "bestellungen":
        return "orders"
      case "reservierungen":
        return "reservations"
      case "bewertungen":
        return "reviews"
      case "mitarbeiter":
        return "users"
      case "mitgleidschaften":
        return "mitgliedschaften"
      default:
        return path
    }
  }

  return <AdminPage initialTab={mapPathToTab(pathSegment)} />
}
