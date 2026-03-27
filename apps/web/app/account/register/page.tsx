import LoginRegisterContainer from "@/components/accounts/LoginRegisterContainer"

export default function Register() {
  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center gap-y-4 md:gap-y-8 py-8 md:py-16 px-16">
        <h1 className="text-xl font-bold font-mono">Register</h1>

        <section className="w-full">
          <LoginRegisterContainer defaultTab="register" />
        </section>
      </main>
    </div>
  )
}
