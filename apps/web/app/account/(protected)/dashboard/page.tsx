import { getActiveSession } from "@/lib/authSession"

import AccountSectionCard from "@/components/accounts/Dashboard/AccountSectionCard"
import AccountHistoryTable from "@/components/accounts/Dashboard/AccountHistory/AccountHistoryTable"
import AccountLinksTable from "@/components/accounts/Dashboard/AccountLinks/AccountLinksTable"

export default async function AccountDashboard() {
  const session = await getActiveSession()
  const userId = session.userId

  if (!userId) {
    throw new Error("Expected authenticated user in protected account route")
  }

  return (
    <>
      <h1 className="text-xl font-bold font-mono">Dashboard</h1>

      <section className="w-full flex flex-col gap-y-6 md:gap-y-8">
        <AccountSectionCard
          title="Your Permanent Links"
          description="View and manage your permanent links."
        >
          <AccountLinksTable userId={userId} />
        </AccountSectionCard>
        <AccountSectionCard
          title="Your Link History"
          description="View and manage your link history."
        >
          <AccountHistoryTable userId={userId} />
        </AccountSectionCard>
      </section>
    </>
  )
}
