import { redirect } from "next/navigation"

import { getActiveSession } from "@/lib/authSession"
import MobileDashboardNavigation from "@components/navigations/MobileDashboardNavigation"
import DesktopDashboardNavigation from "@components/navigations/DesktopDashboardNavigation"

const links: { name: string; href: string }[] = []

export default async function AccountProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getActiveSession()

  if (!session.isLoggedIn || !session.userId) {
    redirect("/account/login")
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen justify-center font-sans px-4 gap-x-8 w-full py-8">
      <DesktopDashboardNavigation links={links} />
      <MobileDashboardNavigation links={links} />
      <main className="flex min-h-screen w-full md:w-3/4 flex-col items-center gap-y-4 md:gap-y-8 mt-8 md:mt-0">
        {children}
      </main>
    </div>
  )
}
