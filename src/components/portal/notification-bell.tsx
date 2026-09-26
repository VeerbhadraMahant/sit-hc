"use client";

import { Bell, CheckCheck, ClipboardList, Megaphone, MessageSquareReply, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn, timeAgo } from "@/lib/utils";

export type PortalNotification = {
  id: string;
  created_at: string;
  type: "feedback_status" | "feedback_response" | "survey" | "update" | "system";
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
};

export const NOTIFICATION_ICONS = {
  feedback_status: RefreshCw,
  feedback_response: MessageSquareReply,
  survey: ClipboardList,
  update: Megaphone,
  system: Bell,
} as const;

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PortalNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/notifications?limit=12", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: PortalNotification[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* offline — keep last state */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

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

  async function markRead(ids?: string[]) {
    setItems((list) => list.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
    setUnread((u) => (ids ? Math.max(0, u - ids.filter((id) => items.find((n) => n.id === id && !n.read)).length) : 0));
    await fetch("/api/portal/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    }).catch(() => {});
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="relative inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-ink shadow-field hover:bg-mist"
      >
        <Bell className="size-4" aria-hidden />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-cobalt px-1 text-[10px] font-semibold text-paper tabular-nums ring-2 ring-paper">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-smallcards bg-paper shadow-card">
          <div className="flex items-center justify-between border-b border-mist px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => markRead()} className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-cobalt hover:underline">
                <CheckCheck className="size-3.5" aria-hidden /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[360px] overflow-y-auto">
            {!loaded && <li className="px-4 py-6 text-sm text-pewter">Loading…</li>}
            {loaded && items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-pewter">You&apos;re all caught up.</li>
            )}
            {items.map((n) => {
              const Icon = NOTIFICATION_ICONS[n.type] ?? Bell;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.read) markRead([n.id]);
                      setOpen(false);
                      if (n.link) router.push(n.link);
                    }}
                    className={cn(
                      "flex w-full cursor-pointer gap-3 border-b border-mist px-4 py-3 text-left last:border-0 hover:bg-mist/50",
                      !n.read && "bg-mist/30",
                    )}
                  >
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-mist text-ink">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <span className={cn("text-sm text-ink", !n.read && "font-semibold")}>{n.title}</span>
                        {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-cobalt" aria-label="Unread" />}
                      </span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-pewter">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-pewter">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Link
            href="/portal/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-mist px-4 py-3 text-center text-sm font-medium text-cobalt hover:bg-mist/50"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
