"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { cn } from "@/lib/utils";
import { DASHBOARD_LINKS } from "./nav";

function DashboardMobileNavInner() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isUrgentActive = pathname === "/dashboard/feedback" && searchParams.get("urgency") === "critical";

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="dashboard-mobile-menu"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-mist"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>

      {open && (
        <div
          id="dashboard-mobile-menu"
          className="absolute inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-mist bg-paper px-3 py-3 shadow-card"
        >
          <nav aria-label="Dashboard" className="flex flex-col gap-1">
            {DASHBOARD_LINKS.map(({ href, label, Icon, isAlert }) => {
              const active = isAlert
                ? isUrgentActive
                : href === "/dashboard"
                ? pathname === href
                : href === "/dashboard/feedback"
                ? pathname === href && !isUrgentActive
                : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-navlinks px-4 py-3 text-base font-medium transition-colors",
                    isAlert
                      ? active
                        ? "bg-[#d03b3b] text-white"
                        : "bg-red-500/[0.06] text-[#d03b3b]"
                      : active
                        ? "bg-carbon text-paper"
                        : "text-ink hover:bg-mist",
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  {label}
                  {isAlert && (
                    <span className="relative ml-auto flex size-2" aria-hidden>
                      <span
                        className={cn(
                          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                          active ? "bg-white" : "bg-red-400",
                        )}
                      />
                      <span className={cn("relative inline-flex size-2 rounded-full", active ? "bg-white" : "bg-[#d03b3b]")} />
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}

export function DashboardMobileNav() {
  return (
    <Suspense fallback={<div className="size-10 md:hidden" />}>
      <DashboardMobileNavInner />
    </Suspense>
  );
}
