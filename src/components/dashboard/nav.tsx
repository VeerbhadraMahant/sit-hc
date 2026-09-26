"use client";

import { ClipboardList, FileUp, LayoutGrid, Megaphone, MessageSquareText, MessagesSquare, Sparkles } from "lucide-react";
import { NavigationLink } from "@/components/ui/navigation-link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const DASHBOARD_LINKS = [
  { href: "/dashboard", label: "Overview", Icon: LayoutGrid },
  { href: "/dashboard/feedback", label: "Feedback", Icon: MessagesSquare },
  { href: "/dashboard/insights", label: "Insights", Icon: Sparkles },
  { href: "/dashboard/ask", label: "Ask AI", Icon: MessageSquareText },
  { href: "/dashboard/surveys", label: "Surveys", Icon: ClipboardList },
  { href: "/dashboard/updates", label: "Updates", Icon: Megaphone },
  { href: "/dashboard/import", label: "Import", Icon: FileUp },
] as const;

export function DashboardNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav
      className={cn(
        "flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-mist bg-paper p-1 shadow-[rgba(29,33,48,0.08)_0_0_0_1px]",
        className,
      )}
    >
      {DASHBOARD_LINKS.map(({ href, label, Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <NavigationLink
            key={href}
            href={href}
            active={active}
            Icon={Icon}
            label={label}
          />
        );
      })}
    </nav>
  );
}
