import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { UpdatePost } from "@/lib/types";
import { cn } from "@/lib/utils";
import { UPDATE_COLUMNS } from "./schema";
import { UpdateCard } from "./update-card";

export async function getPublishedUpdates(limit = 50): Promise<UpdatePost[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("updates")
    .select(UPDATE_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as UpdatePost[];
}

/**
 * Latest "You said, we did" updates (server component). Usable on the portal home:
 *   <LatestUpdates limit={2} />
 */
export async function LatestUpdates({ limit = 3, className }: { limit?: number; className?: string }) {
  const updates = await getPublishedUpdates(limit);
  if (!updates.length) {
    return (
      <div className={cn("flex items-center gap-3 rounded-smallcards border border-dashed border-edge p-4 text-sm text-pewter", className)}>
        <Megaphone className="size-5 shrink-0" aria-hidden />
        No updates yet — changes made from your feedback will appear here.
      </div>
    );
  }
  return (
    <div className={cn("grid gap-3", className)}>
      {updates.map((u) => (
        <UpdateCard key={u.id} update={u} compact />
      ))}
    </div>
  );
}
