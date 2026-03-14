import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ModeToggle } from "@/components/layout/ModeToggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <nav className="flex items-center space-x-4 lg:space-x-6">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="text-2xl font-bold">LifeOS</span>
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <ModeToggle />
                    <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
