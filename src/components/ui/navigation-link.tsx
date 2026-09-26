"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavigationLink({
  href,
  label,
  Icon,
  active,
  className,
  labelClassName,
  extra,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  className?: string;
  /** Extra classes on the label span — e.g. "hidden lg:inline" to go icon-only at narrower widths. */
  labelClassName?: string;
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Eagerly prefetch route data on mount so transitions are instant
  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Preserve browser default behavior for middle-click or modifier keys
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    // Prevent redundant reload if already on the active tab
    if (active) {
      return;
    }
    e.preventDefault();
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Link
      href={href}
      prefetch={true}
      onClick={handleClick}
      onMouseEnter={() => router.prefetch(href)}
      onFocus={() => router.prefetch(href)}
      aria-current={active ? "page" : undefined}
      aria-busy={isPending}
      aria-label={label}
      title={labelClassName ? label : undefined}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-navlinks px-3.5 text-sm font-medium whitespace-nowrap transition-all duration-150 select-none",
        active
          ? "bg-carbon text-paper shadow-xs"
          : isPending
            ? "bg-mist text-cobalt ring-2 ring-cobalt/30"
            : "text-ink hover:bg-mist",
        className,
      )}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin text-cobalt" aria-hidden />
      ) : (
        <Icon className="size-4" aria-hidden />
      )}
      <span className={labelClassName}>{label}</span>
      {extra}
      {isPending && <span className="sr-only">Loading {label}...</span>}
    </Link>
  );
}
