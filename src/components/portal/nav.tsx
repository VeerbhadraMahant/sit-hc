"use client";

import { ClipboardList, HeartPulse, Home, Megaphone, MessageSquarePlus, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const PORTAL_LINKS = [
  { href: "/portal", label: "Home", Icon: Home },
  { href: "/portal/feedback/new", label: "Give feedback", Icon: MessageSquarePlus },
  { href: "/portal/feedback", label: "My feedback", Icon: MessagesSquare, exact: true },
  { href: "/portal/surveys", label: "Surveys", Icon: ClipboardList },
  { href: "/portal/checkin", label: "Check-in", Icon: HeartPulse },
  { href: "/portal/updates", label: "Updates", Icon: Megaphone },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (href === "/portal") return pathname === href;
  if (href === "/portal/feedback") return pathname === href || (/^\/portal\/feedback\/[^/]+$/.test(pathname) && !pathname.endsWith("/new"));
  return exact ? pathname === href : pathname.startsWith(href);
}

export function PortalNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav
      className={cn(
        "flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-mist bg-paper p-1 shadow-[rgba(29,33,48,0.08)_0_0_0_1px]",
        className,
      )}
    >
      {PORTAL_LINKS.map((l) => {
        const active = isActive(pathname, l.href, "exact" in l ? l.exact : undefined);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-navlinks px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
              active ? "bg-carbon text-paper" : "text-ink hover:bg-mist",
            )}
          >
            <l.Icon className="size-4" aria-hidden />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
