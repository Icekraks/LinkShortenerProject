import { redirect } from "next/navigation"

import { hasActiveSession } from "@/lib/authSession"
import MobileDashboardNavigation from "@/components/navigations/MobileDashboardNavigation"
import DesktopDashboardNavigation from "@/components/navigations/DesktopDashboardNavigation"

export default async function AccountDashboard() {
  const isLoggedIn = await hasActiveSession()

  if (!isLoggedIn) {
    redirect("/account/login")
  }

  const links: { name: string; href: string }[] = []

  return (
    <div className="flex flex-col md:flex-row min-h-screen items-center justify-center font-sans px-16 gap-x-8 w-full py-8">
      <DesktopDashboardNavigation links={links} />
      <MobileDashboardNavigation links={links} />
      <main className="flex min-h-screen w-full md:w-3/4 flex-col items-center gap-y-4 md:gap-y-8 mt-8 md:mt-0">
        <h1 className="text-xl font-bold font-mono">Dashboard</h1>

        <section className="w-full">WIP Dashboard</section>
      </main>
    </div>
  )
}
