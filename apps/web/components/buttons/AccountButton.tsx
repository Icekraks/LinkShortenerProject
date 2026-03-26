import { Button } from "@ui/button"
import { CircleUser } from "lucide-react"
import { cache } from "react"
import Link from "next/link"

import { hasActiveSession } from "@/lib/authSession"

const getCachedHasActiveSession = cache(async () => hasActiveSession())

const AccountButton = async () => {
  const isLoggedIn = await getCachedHasActiveSession()
  const accountHref = isLoggedIn ? "/account/dashboard" : "/account/login"
  const accountAriaLabel = isLoggedIn ? "Open your account dashboard" : "Login to your account"

  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={
        <Link
          href={accountHref}
          className="text-sm text-muted-foreground hover:text-foreground"
          aria-label={accountAriaLabel}
        />
      }
    >
      <CircleUser className="w-5 h-5" aria-hidden="true" />
    </Button>
  )
}

export default AccountButton
