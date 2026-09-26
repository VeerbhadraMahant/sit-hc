import "server-only";
import { anonHash } from "@/lib/identity";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType = "feedback_status" | "feedback_response" | "survey" | "update" | "system";

export type NotificationRow = {
  id: string;
  created_at: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
};

/**
 * Creates an in-app notification.
 * recipient: an employee user id, an existing submitter_hash, or "all" for a broadcast.
 */
export async function notify({
  recipient,
  type,
  title,
  body,
  link,
}: {
  recipient: { userId: string } | { hash: string } | "all";
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
}) {
  const recipient_hash = recipient === "all" ? null : "hash" in recipient ? recipient.hash : anonHash(recipient.userId);
  const { error } = await createAdminClient()
    .from("notifications")
    .insert({ recipient_hash, type, title, body: body ?? null, link: link ?? null } as never);
  if (error) console.error("[notify]", error.message);
}

/** Recipient hash for a feedback row's submitter, or null if it came from a signed-out visitor. */
export function feedbackRecipientHash(row: { submitter_user_id?: string | null; submitter_hash?: string | null }) {
  if (row.submitter_user_id) return anonHash(row.submitter_user_id);
  return row.submitter_hash ?? null;
}

/** Newest notifications for an employee (personal + broadcasts) with read state. */
export async function listNotifications(userId: string, limit = 30): Promise<{ items: NotificationRow[]; unread: number }> {
  const db = createAdminClient();
  const hash = anonHash(userId);
  const [{ data: rows }, { data: reads }] = await Promise.all([
    db
      .from("notifications")
      .select("id,created_at,type,title,body,link,read_at,recipient_hash")
      .or(`recipient_hash.eq.${hash},recipient_hash.is.null`)
      .order("created_at", { ascending: false })
      .limit(limit),
    db.from("notification_reads").select("notification_id").eq("recipient_hash", hash).limit(500),
  ]);
  const readIds = new Set((reads ?? []).map((r: { notification_id: string }) => r.notification_id));
  const items = ((rows ?? []) as (Omit<NotificationRow, "read"> & { read_at: string | null })[]).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    type: r.type,
    title: r.title,
    body: r.body,
    link: r.link,
    read: !!r.read_at || readIds.has(r.id),
  }));
  return { items, unread: items.filter((i) => !i.read).length };
}

/** Marks notifications read for this employee (ids omitted = all visible ones). */
export async function markNotificationsRead(userId: string, ids?: string[]) {
  const db = createAdminClient();
  const hash = anonHash(userId);
  const targetIds = ids ?? (await listNotifications(userId, 100)).items.filter((i) => !i.read).map((i) => i.id);
  if (!targetIds.length) return;
  await db
    .from("notification_reads")
    .upsert(targetIds.map((id) => ({ notification_id: id, recipient_hash: hash })) as never, { ignoreDuplicates: true });
}
