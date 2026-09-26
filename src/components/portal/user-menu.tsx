"use client";

import { ChevronDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PortalUserMenu({ name, email }: { name: string | null; email: string | null; avatarUrl: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = (name ?? email ?? "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-full pr-2 pl-0.5 text-ink shadow-field hover:bg-mist"
      >
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-carbon text-xs font-semibold text-paper">
          {initials}
        </span>
        <ChevronDown className="size-3.5" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-smallcards bg-paper shadow-card">
          <div className="border-b border-mist px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{name ?? "Employee"}</p>
            {email && <p className="truncate text-xs text-pewter">{email}</p>}
          </div>
          <Link
            role="menuitem"
            href="/portal/welcome?edit=1"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-mist/60"
          >
            <UserRound className="size-4" aria-hidden /> Edit profile
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={signOut}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-ink hover:bg-mist/60"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
