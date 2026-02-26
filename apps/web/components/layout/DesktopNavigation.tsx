import { Button } from "@ui/button"
import Link from "next/link"

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

const DesktopNavigation = () => {
  return (
    <nav className="hidden md:block">
      <ul className="flex gap-4">
        {Links.map((link) => (
          <li key={link.name}>
            <Button
              variant="outline"
              render={
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground"
                />
              }
            >
              {link.name}
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
export default DesktopNavigation
