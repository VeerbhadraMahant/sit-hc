import { Megaphone } from "lucide-react";
import type { Metadata } from "next";
import { getPublishedUpdates } from "@/components/updates/latest-updates";
import { UpdateCard } from "@/components/updates/update-card";
import { buttonClass } from "@/components/ui/button";
import { requireEmployee } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata: Metadata = { title: "You said, we did — Vocalyze" };

export default async function PortalUpdatesPage() {
  await requireEmployee();
  const updates = await getPublishedUpdates(60);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">You said, we did</p>
          <h1 className="text-heading-md font-semibold text-obsidian">
            What changed because you <span className="brush">spoke up</span>
          </h1>
          <p className="mt-2 max-w-2xl text-pewter">
            Every card here started as employee feedback — often anonymous. Keep it coming.
          </p>
        </div>
        <Link href="/portal/feedback/new" className={buttonClass("primary", "md")}>
          Give feedback
        </Link>
      </div>

      {updates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-cards border border-dashed border-edge py-16 text-center">
          <Megaphone className="size-8 text-pewter" aria-hidden />
          <p className="font-semibold text-ink">No updates yet</p>
          <p className="max-w-md text-sm text-pewter">When HR acts on feedback, they&apos;ll post what changed here.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {updates.map((u) => (
            <UpdateCard key={u.id} update={u} />
          ))}
        </div>
      )}
    </div>
  );
}
