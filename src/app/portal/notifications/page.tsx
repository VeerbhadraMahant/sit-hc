import type { Metadata } from "next";
import { NotificationsList } from "@/components/portal/notifications-list";
import { listNotifications } from "@/lib/notify";
import { requireEmployee } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications — Vocalyze" };

export default async function NotificationsPage() {
  const user = await requireEmployee();
  const { items } = await listNotifications(user.id, 100);
  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      <div>
        <p className="eyebrow">Inbox</p>
        <h1 className="mt-1 text-heading-md font-semibold text-obsidian">Notifications</h1>
      </div>
      <NotificationsList initial={items} />
    </div>
  );
}
