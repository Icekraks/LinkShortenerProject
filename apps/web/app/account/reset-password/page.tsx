import ResetPasswordForm from "@/components/forms/ResetPasswordForm"

const ResetPasswordPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center gap-y-4 md:gap-y-8 py-32 px-16">
        <h1 className="text-xl font-bold font-mono">Reset Password</h1>

        <section className="w-full">
          <ResetPasswordForm />
        </section>
      </main>
    </div>
  )
}

export default ResetPasswordPage
