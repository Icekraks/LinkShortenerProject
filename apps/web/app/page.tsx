import LinkHistorySection from "@components/home/LinkHistory/LinkHistorySection"
import LinkShortenerSection from "@components/home/LinkShortenerSection"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center py-8 md:py-16 px-8 md:px-16 gap-y-8 md:gap-y-16">
        <LinkShortenerSection />
        <LinkHistorySection />
      </main>
    </div>
  )
}
