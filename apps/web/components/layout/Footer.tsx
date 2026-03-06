import { ThemeToggle } from "@components/buttons/ThemeToggle"

export default function Footer() {
  return (
    <footer className="relative w-full border-t bg-background/50 py-4 text-center text-sm text-muted-foreground">
      &copy; {new Date().getFullYear()} SniprUrl. All rights reserved.
      <ThemeToggle />
    </footer>
  )
}
