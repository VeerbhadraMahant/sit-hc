"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, timeAgo } from "@/lib/utils";
import { NOTIFICATION_ICONS, type PortalNotification } from "./notification-bell";

export function NotificationsList({ initial }: { initial: PortalNotification[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const unread = items.filter((n) => !n.read).length;

  async function markRead(ids?: string[]) {
    setItems((list) => list.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
    await fetch("/api/portal/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    }).catch(() => {});
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <Card className="py-14 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-mist text-ink">
          <Bell className="size-5" aria-hidden />
        </span>
        <p className="mt-4 font-semibold text-ink">No notifications yet</p>
        <p className="mt-1 text-sm text-pewter">You&apos;ll hear from us when HR responds to your feedback or publishes something new.</p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-pewter">{unread ? `${unread} unread` : "All caught up"}</p>
        {unread > 0 && (
          <Button type="button" variant="subtle" size="sm" onClick={() => markRead()}>
            <CheckCheck className="size-4" aria-hidden /> Mark all read
          </Button>
        )}
      </div>
      <Card className="p-0">
        <ul>
          {items.map((n) => {
            const Icon = NOTIFICATION_ICONS[n.type] ?? Bell;
            return (
              <li key={n.id} className="border-b border-mist last:border-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!n.read) markRead([n.id]);
                    if (n.link) router.push(n.link);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer gap-4 px-5 py-4 text-left first:rounded-t-cards last:rounded-b-cards hover:bg-mist/50",
                    !n.read && "bg-mist/30",
                  )}
                >
                  <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-mist text-ink">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className={cn("text-ink", !n.read && "font-semibold")}>{n.title}</span>
                      <span className="shrink-0 text-xs text-pewter">{timeAgo(n.created_at)}</span>
                    </span>
                    {n.body && <span className="mt-1 block text-sm text-pewter">{n.body}</span>}
                  </span>
                  {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-cobalt" aria-label="Unread" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
