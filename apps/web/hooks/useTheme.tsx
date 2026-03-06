"use client"

import { useState, createContext, useMemo, useCallback, useContext, useEffect } from "react"
import { useIsMounted } from "@/hooks/useIsMounted"

type ThemeContextType = "light" | "dark" | "system"

type ThemeContextValue = {
  setTheme: React.Dispatch<React.SetStateAction<ThemeContextType>>
  toggleTheme: () => void
  isThemeDark: boolean
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mounted = useIsMounted()
  const [theme, setTheme] = useState<ThemeContextType>(() => {
    if (typeof window === "undefined") return "light"

    const storedTheme = window.localStorage.getItem("theme")
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      return storedTheme
    }

    return "light"
  })

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      if (prevTheme === "dark") return "light"
      return "dark"
    })
  }, [])

  const isThemeDark = useMemo(() => {
    if (!mounted) return false

    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    }

    return theme === "dark"
  }, [mounted, theme])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    root.classList.toggle("dark", isThemeDark)
    localStorage.setItem("theme", theme)
  }, [mounted, theme, isThemeDark])

  const value = useMemo(
    () => ({
      setTheme,
      isThemeDark,
      toggleTheme,
      mounted,
    }),
    [toggleTheme, isThemeDark, mounted],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const themeContext = useContext(ThemeContext)

  if (!themeContext) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return themeContext
}
