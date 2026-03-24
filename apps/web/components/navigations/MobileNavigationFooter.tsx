import { hasActiveSession } from "@/lib/authSession"
import { Button } from "@ui/button"
import Link from "next/link"

const MobileNavigationFooter = async () => {
  const isLoggedIn = await hasActiveSession()

  return (
    <>
      {isLoggedIn ? (
        <Button
          variant="outline"
          nativeButton={false}
          className="w-full"
          render={
            <Link
              href="/account/dashboard"
              className="flex flex-1 text-sm text-muted-foreground hover:text-foreground"
              aria-label="Open your account dashboard"
            />
          }
        >
          Dashboard
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href="/account/register"
                className="flex flex-1 text-sm text-muted-foreground hover:text-foreground"
                aria-label="Sign up for an account"
              />
            }
          >
            Sign Up
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href="/account/login"
                className="flex flex-1 text-sm text-muted-foreground hover:text-foreground"
                aria-label="Login to your account"
              />
            }
          >
            Login
          </Button>
        </>
      )}
    </>
  )
}

export default MobileNavigationFooter
