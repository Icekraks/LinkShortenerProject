"use client"

import { useIsMounted } from "@/hooks/useIsMounted"

const GreetingComponent = () => {
  const mounted = useIsMounted()
  const fallbackGreeting =
    "Good morning, and in case I don't see ya, good afternoon, good evening, and good night!"

  const timeZone = mounted ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined

  const currentHour = (() => {
    if (!mounted || !timeZone) return null

    try {
      return Number(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          hour12: false,
          timeZone,
        }).format(new Date()),
      )
    } catch {
      return null
    }
  })()

  const currentGreeting = () => {
    if (currentHour === null) {
      return fallbackGreeting
    }

    if (currentHour >= 5 && currentHour < 12) {
      return "Good morning!"
    }

    if (currentHour >= 12 && currentHour < 17) {
      return "Good afternoon!"
    }

    if (currentHour >= 17 && currentHour < 21) {
      return "Good evening!"
    }

    return "Good night!"
  }

  return (
    <>
      <span className="text-xl font-bold mb-2">{currentGreeting()}</span>
      <h2>Welcome to the Link Shortener App! Create and manage your short links with ease.</h2>
    </>
  )
}

export default GreetingComponent
