import LinkShortenerForm from "@/components/forms/LinkShortenerForm"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16">
        <section className="w-full">
          <h1 className="text-xl font-bold mb-4">Snipr Shortener Form</h1>
          <LinkShortenerForm />
        </section>
      </main>
    </div>
  )
}
