import type { Metadata } from "next";
import { UPDATE_COLUMNS } from "@/components/updates/schema";
import { UpdatesManager } from "@/components/updates/updates-manager";
import { createClient, requireHr } from "@/lib/supabase/server";
import type { UpdatePost } from "@/lib/types";

export const metadata: Metadata = { title: "Updates — Vocalyze HR" };

export default async function UpdatesPage() {
  await requireHr();
  const supabase = await createClient();
  const { data } = await supabase
    .from("updates")
    .select(UPDATE_COLUMNS)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">You said, we did</p>
        <h1 className="text-heading-md font-semibold text-obsidian sm:text-heading">Show employees their feedback changed something</h1>
        <p className="mt-1 max-w-2xl text-pewter">
          Updates appear on every employee&apos;s portal and trigger a notification. Tip: publish directly from an action item on the Insights page.
        </p>
      </div>
      <UpdatesManager initial={(data ?? []) as UpdatePost[]} />
    </div>
  );
}
