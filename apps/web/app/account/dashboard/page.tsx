import LogoutButton from "@/components/buttons/LogoutButton"

export default function AccountDashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <aside className="min-h-screen">
        <ul>
          <li>
            <LogoutButton />
          </li>
        </ul>
      </aside>
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center gap-y-4 md:gap-y-8 py-32 px-16">
        <h1 className="text-xl font-bold font-mono">Dashboard</h1>

        <section className="w-full">WIP Dashboard</section>
      </main>
    </div>
  )
}
