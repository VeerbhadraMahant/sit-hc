import Link from "next/link";
import { Logo } from "@/components/logo";

export function PublicHeader() {
  const org = process.env.NEXT_PUBLIC_ORG_NAME || "Your company";
  return (
    <header className="relative z-10 border-b border-mist bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
        <Logo />
        <span className="hidden text-edge sm:inline" aria-hidden>
          /
        </span>
        <span className="hidden truncate text-sm font-medium text-pewter sm:inline">{org}</span>
        <nav className="ml-auto flex items-center gap-1 text-sm font-medium">
          <Link href="/submit" className="rounded-navlinks px-3 py-2 text-ink hover:text-cobalt">
            Give feedback
          </Link>
          <Link href="/track" className="rounded-navlinks px-3 py-2 text-ink hover:text-cobalt">
            Track
          </Link>
        </nav>
      </div>
    </header>
  );
}
