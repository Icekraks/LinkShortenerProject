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
import { Menu, X } from "lucide-react"

const Links = [
  {
    name: "About Us",
    href: "/pages/about",
  },
  {
    name: "Contact",
    href: "/pages/contact",
  },
  {
    name: "Portfolio",
    href: "https://felix-hu.me",
  },
]

const MobileNavigation = () => {
  return (
    <nav aria-label="Mobile" className="md:hidden">
      <Drawer direction="right" closeOnRouteChange>
        <DrawerTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open navigation menu">
            <Menu className="w-8 h-8" aria-hidden="true" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="flex flex-row justify-between gap-x-4 items-center">
            <DrawerTitle>Navigation menu</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="outline" size="icon" aria-label="Close navigation menu">
                <X className="w-4 h-4" aria-hidden="true" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <ScrollArea>
            <ul className="flex flex-col gap-4 px-4 pb-4">
              {Links.map((link) => (
                <li key={link.name}>
                  <Button
                    variant="outline"
                    className="w-full text-sm text-muted-foreground hover:text-foreground"
                    render={
                      <Link
                        href={link.href}
                        target={link.href.startsWith("http") ? "_blank" : undefined}
                        rel={
                          link.href.startsWith("http")
                            ? "noopener noreferrer"
                            : undefined
                        }
                      />
                    }
                  >
                    {link.name}
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </nav>
  )
}

export default MobileNavigation
