"use client";

import { AlertOctagon, ClipboardList, FileUp, LayoutGrid, Megaphone, MessageSquareText, MessagesSquare, Sparkles } from "lucide-react";
import { NavigationLink } from "@/components/ui/navigation-link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

export const DASHBOARD_LINKS = [
  { href: "/dashboard", label: "Overview", Icon: LayoutGrid, isAlert: false },
  { href: "/dashboard/feedback?urgency=critical", label: "Alerts", Icon: AlertOctagon, isAlert: true },
  { href: "/dashboard/feedback", label: "Feedback", Icon: MessagesSquare, isAlert: false },
  { href: "/dashboard/insights", label: "Insights", Icon: Sparkles, isAlert: false },
  { href: "/dashboard/ask", label: "Ask AI", Icon: MessageSquareText, isAlert: false },
  { href: "/dashboard/surveys", label: "Surveys", Icon: ClipboardList, isAlert: false },
  { href: "/dashboard/updates", label: "Updates", Icon: Megaphone, isAlert: false },
  { href: "/dashboard/import", label: "Import", Icon: FileUp, isAlert: false },
] as const;

function DashboardNavInner({ className }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isUrgentActive = pathname === "/dashboard/feedback" && searchParams.get("urgency") === "critical";

  return (
    <nav
      className={cn(
        "flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-mist bg-paper p-1 shadow-[rgba(29,33,48,0.08)_0_0_0_1px]",
        className,
      )}
    >
      {DASHBOARD_LINKS.map(({ href, label, Icon, isAlert }) => {
        const active = isAlert
          ? isUrgentActive
          : href === "/dashboard"
          ? pathname === href
          : href === "/dashboard/feedback"
          ? pathname === href && !isUrgentActive
          : pathname.startsWith(href);

        return (
          <NavigationLink
            key={href}
            href={href}
            active={active}
            Icon={Icon}
            label={label}
            className={
              isAlert
                ? active
                  ? "bg-[#d03b3b] text-white shadow-xs hover:bg-[#b83232]"
                  : "border border-red-200/80 bg-red-500/[0.06] text-[#d03b3b] hover:bg-red-500/12"
                : undefined
            }
            extra={
              isAlert ? (
                <span className="relative flex size-2 shrink-0" aria-hidden>
                  <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", active ? "bg-white" : "bg-red-400")} />
                  <span className={cn("relative inline-flex size-2 rounded-full", active ? "bg-white" : "bg-[#d03b3b]")} />
                </span>
              ) : undefined
            }
          />
        );
      })}
    </nav>
  );
}

export function DashboardNav({ className }: { className?: string }) {
  return (
    <Suspense fallback={<nav className={cn("h-11 rounded-full border border-mist bg-paper", className)} />}>
      <DashboardNavInner className={className} />
    </Suspense>
  );
}
