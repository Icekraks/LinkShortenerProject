import Link from "next/link"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">404</p>
      <h1 className="text-xl font-bold font-mono">Page Not Found</h1>
      <p className="max-w-md">
        The page you are looking for does not exist or may have been moved or may have expired.
      </p>
      <Link
        href="/"
        className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Back to Homepage
      </Link>
    </main>
  )
}
