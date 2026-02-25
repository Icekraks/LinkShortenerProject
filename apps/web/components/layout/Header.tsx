import Link from "next/link";
import DesktopNavigation from "@components/layout/DesktopNavigation";
import MobileNavigation from "@components/layout/MobileNavigation";

const Header = () => {
  return (
    <header className="flex justify-between items-center py-4 px-8 border-b">
      <h1 className="text-2xl font-bold">
        <Link href="/">Snipr</Link>
      </h1>
      <DesktopNavigation />
      <MobileNavigation />
    </header>
  );
};

export default Header;
