import LogoutButton from "@/components/buttons/LogoutButton"
import { cn } from "@/lib/utils"

type LinkItem = {
  name: string
  href: string
}

type DesktopDashboardNavigationProps = {
  links: LinkItem[]
  className?: string
}

const DesktopDashboardNavigation = ({ links, className = "" }: DesktopDashboardNavigationProps) => {
  return (
    <aside
      aria-labelledby="account-sidebar-title"
      className={cn("hidden md:block min-h-screen md:w-1/4 md:max-w-85", className)}
    >
      <h2 id="account-sidebar-title" className="text-base font-bold">
        Account
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Hello, <span className="font-semibold text-foreground">User</span>
      </p>

      <nav aria-label="Account actions" className="mt-6">
        <ul>
          {links.map((link) => (
            <li key={link.name}></li>
          ))}
          <li>
            <LogoutButton />
          </li>
        </ul>
      </nav>
    </aside>
  )
}

export default DesktopDashboardNavigation
