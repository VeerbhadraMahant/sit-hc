import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { CheckinTrend } from "@/components/portal/checkin-trend";
import { CheckinWidget } from "@/components/portal/checkin-widget";
import { Card, CardHeader } from "@/components/ui/card";
import { isoWeekStart } from "@/lib/identity";
import { createClient, requireEmployee } from "@/lib/supabase/server";
import { MOOD_LABELS, type CheckIn } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Wellbeing check-in — Vocalyze" };

export default async function CheckinPage() {
  const user = await requireEmployee();
  const supabase = await createClient();
  const { data } = await supabase
    .from("checkins")
    .select("id,created_at,week,mood,energy,note")
    .eq("user_id", user.id)
    .order("week", { ascending: false })
    .limit(12);
  const items = (data ?? []) as CheckIn[];
  const week = isoWeekStart();
  const current = items.find((c) => c.week === week) ?? null;
  const avgMood = items.length ? items.reduce((s, c) => s + c.mood, 0) / items.length : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Wellbeing</p>
        <h1 className="mt-1 text-heading-md font-semibold text-obsidian">Weekly check-in</h1>
        <p className="mt-2 max-w-xl text-pewter">Ten seconds, once a week. It helps you notice patterns — and helps HR spot teams that need support.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card glow="mint" arc>
          <CardHeader
            eyebrow={`Week of ${formatDate(week, { day: "numeric", month: "long" })}`}
            title={current ? "Update this week's check-in" : "How was this week?"}
          />
          <CheckinWidget existing={current} />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Just for you" title="Your last 12 weeks" />
            <CheckinTrend items={items} />
            {avgMood !== null && items.length >= 2 && (
              <p className="mt-4 text-sm text-pewter">
                Average mood: <span className="font-medium text-ink">{MOOD_LABELS[Math.round(avgMood) - 1]}</span> ({avgMood.toFixed(1)}/5)
                over {items.length} check-ins.
              </p>
            )}
          </Card>

          <Card small className="flex gap-3 sm:p-5">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-ink">What HR can see</p>
              <p className="mt-1 text-pewter">
                Only anonymous averages for groups of 5 or more people. Never your individual answers, and never your private notes.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
