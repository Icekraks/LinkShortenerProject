import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@ui/drawer"
import { ScrollArea } from "@ui/scroll-area"
import { Button } from "@ui/button"
import Link from "next/link"
import { X } from "lucide-react"
import LogoutButton from "@components/buttons/LogoutButton"
import { cn } from "@/lib/utils"

type LinkItem = {
  name: string
  href: string
}

type MobileDashboardNavigationProps = {
  links: LinkItem[]
  className?: string
}

const MobileDashboardNavigation = ({ links, className = "" }: MobileDashboardNavigationProps) => {
  return (
    <nav aria-label="Mobile" className={cn("md:hidden", className)}>
      <Drawer direction="right" closeOnRouteChange>
        <DrawerTrigger asChild>
          <Button variant="outline" aria-label="Open dashboard menu">
            Dashboard Menu
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="flex flex-row justify-between gap-x-4 items-center">
            <DrawerTitle>Account Dashboard</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="outline" size="icon" aria-label="Close navigation menu">
                <X className="w-4 h-4" aria-hidden="true" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <ScrollArea>
            <ul className="flex flex-col gap-4 px-4 pb-4">
              {links.map((link) => (
                <li key={link.name}>
                  <Button
                    variant="outline"
                    nativeButton={false}
                    className="w-full text-sm text-muted-foreground hover:text-foreground"
                    render={
                      <Link
                        href={link.href}
                        target={link.href.startsWith("http") ? "_blank" : undefined}
                        rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      />
                    }
                  >
                    {link.name}
                  </Button>
                </li>
              ))}
              <li key="logout">
                <LogoutButton />
              </li>
            </ul>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </nav>
  )
}

export default MobileDashboardNavigation
