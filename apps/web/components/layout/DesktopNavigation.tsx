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
    <nav aria-label="Primary" className="hidden md:block">
      <ul className="flex gap-4">
        {Links.map((link) => (
          <li key={link.name}>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground"
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
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
