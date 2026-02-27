import Link from "next/link"
import DesktopNavigation from "@components/layout/DesktopNavigation"
import MobileNavigation from "@components/layout/MobileNavigation"
import Image from "next/image"

const Header = () => {
  return (
    <header className="flex justify-between items-center py-4 px-8 border-b">
      <span className="text-2xl font-bold">
        <Link
          href="/"
          aria-label="Go to Snipr homepage"
          className="bg-zinc-400 p-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src="/sniprLogo.webp"
            alt="Snipr"
            width={128}
            height={80}
            className="inline mr-2"
          />
        </Link>
      </span>
      <DesktopNavigation />
      <MobileNavigation />
    </header>
  )
}

export default Header
