import AccountHistoryTable from "@/components/accounts/Dashboard/AccountHistory/AccountHistoryTable"

const AccountHistorySection = () => {
  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-4">Your Link History</h2>
      <p className="text-gray-600 mb-4">This section displays your created short links history.</p>
      <AccountHistoryTable />
    </div>
  )
}

export default AccountHistorySection
