import Link from "next/link"
import DesktopNavigation from "@components/layout/DesktopNavigation"
import MobileNavigation from "@components/layout/MobileNavigation"

const Header = () => {
  return (
    <header className="flex justify-between items-center py-4 px-8 border-b">
      <span className="text-2xl font-bold">
        <Link href="/">Snipr</Link>
      </span>
      <DesktopNavigation />
      <MobileNavigation />
    </header>
  )
}

export default Header
