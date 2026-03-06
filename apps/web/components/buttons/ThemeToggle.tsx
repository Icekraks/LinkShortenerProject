"use client"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/useTheme"
import { Moon, Sun } from "lucide-react"

export const ThemeToggle = () => {
  const theme = useTheme()

  return (
    <Button
      className="absolute top-1/2 right-1 -translate-y-1/2"
      onClick={theme.toggleTheme}
      size="icon"
    >
      {!theme.mounted ? <Sun /> : theme.isThemeDark ? <Sun /> : <Moon />}
    </Button>
  )
}
