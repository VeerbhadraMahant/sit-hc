import { ArrowRight, ClipboardList, HeartPulse, Megaphone, MessageSquarePlus, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckinWidget } from "@/components/portal/checkin-widget";
import { feedbackStats, listMyFeedback } from "@/components/portal/data";
import { StatusBadge } from "@/components/portal/status-timeline";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { isoWeekStart } from "@/lib/identity";
import { createClient, requireEmployee } from "@/lib/supabase/server";
import { MOOD_LABELS, type CheckIn, type Survey, type UpdatePost } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Home — Vocalyze" };

export default async function PortalHome() {
  const user = await requireEmployee();

  let feedback: Awaited<ReturnType<typeof listMyFeedback>> = [];
  let checkin: CheckIn | null = null;
  let surveys: Pick<Survey, "id" | "title" | "description" | "questions" | "closes_at">[] = [];
  let updates: UpdatePost[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = await createClient();
      const [f, checkinRes, surveysRes, updatesRes] = await Promise.all([
        listMyFeedback(user.id, 50),
        supabase
          .from("checkins")
          .select("id,created_at,week,mood,energy,note")
          .eq("user_id", user.id)
          .eq("week", isoWeekStart())
          .maybeSingle(),
        supabase
          .from("surveys")
          .select("id,title,description,questions,closes_at,published_at")
          .eq("status", "active")
          .order("published_at", { ascending: false })
          .limit(3),
        supabase
          .from("updates")
          .select("id,created_at,title,body,theme,department,feedback_count,published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(3),
      ]);
      feedback = f;
      checkin = (checkinRes.data as CheckIn | null) ?? null;
      surveys = (surveysRes.data ?? []) as Pick<Survey, "id" | "title" | "description" | "questions" | "closes_at">[];
      updates = (updatesRes.data ?? []) as UpdatePost[];
    } catch {
      feedback = await listMyFeedback(user.id);
    }
  } else {
    feedback = await listMyFeedback(user.id);
    checkin = {
      id: "demo-chk-today",
      created_at: new Date().toISOString(),
      week: isoWeekStart(),
      mood: 4,
      energy: 4,
      note: "Good week overall.",
    };
    updates = [
      {
        id: "demo-update-1",
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        title: "Actions on Ergonomic Equipment & Workstation Refresh",
        body: "Following recent feedback, facilities has replaced old task chairs on Floor 3 and will complete desk audits next week.",
        theme: "Facilities",
        department: "Operations",
        feedback_count: 5,
      },
    ];
  }

  const stats = feedbackStats(feedback);
  const firstName = user.fullName?.split(" ")[0];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{formatDate(new Date().toISOString(), { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 text-heading-md font-semibold text-obsidian">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="px-3 py-1 text-sm">
              <span className="font-semibold tabular-nums">{stats.total}</span> feedback given
            </Badge>
            <Badge className="px-3 py-1 text-sm">
              <span className="font-semibold tabular-nums">{stats.awaiting}</span> awaiting response
            </Badge>
            <Badge className="px-3 py-1 text-sm">
              <span className="font-semibold tabular-nums">{stats.responded}</span> responses from HR
            </Badge>
          </div>
        </div>
        <ButtonLink href="/portal/feedback/new" size="lg" className="shrink-0">
          <MessageSquarePlus className="size-4" aria-hidden /> Give feedback
        </ButtonLink>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card glow="mint" arc>
          <CardHeader
            eyebrow="Weekly check-in"
            title={checkin ? "You checked in this week" : "How's your week going?"}
            action={<HeartPulse className="size-5 text-ink" aria-hidden />}
          />
          {checkin ? (
            <div>
              <p className="text-ink">
                Mood <span className="font-semibold">{MOOD_LABELS[checkin.mood - 1]}</span> · Energy{" "}
                <span className="font-semibold">{checkin.energy}/5</span>
              </p>
              <p className="mt-2 text-sm text-pewter">Thanks for checking in. You can update it any time this week.</p>
              <Link href="/portal/checkin" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cobalt hover:underline">
                See your trend <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          ) : (
            <>
              <CheckinWidget existing={null} compact />
              <p className="mt-4 text-xs text-pewter">HR only ever sees anonymous averages for groups of 5 or more.</p>
            </>
          )}
        </Card>

        <Card>
          <CardHeader
            eyebrow="My feedback"
            title="Recent activity"
            action={
              <Link href="/portal/feedback" className="text-sm font-medium text-cobalt hover:underline">
                View all
              </Link>
            }
          />
          {feedback.length === 0 ? (
            <div className="rounded-smallcards bg-mist/50 p-6 text-center">
              <MessagesSquare className="mx-auto size-6 text-ink" aria-hidden />
              <p className="mt-3 font-medium text-ink">Nothing here yet</p>
              <p className="mt-1 text-sm text-pewter">Share your first piece of feedback — by text, voice or a photo of a note.</p>
            </div>
          ) : (
            <ul className="divide-y divide-mist">
              {feedback.slice(0, 5).map((f) => (
                <li key={f.tracking_code}>
                  <Link
                    href={`/portal/feedback/${f.tracking_code}`}
                    className="-mx-2 flex items-start gap-3 rounded-smallcards px-2 py-3 hover:bg-mist/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm text-ink">{f.summary ?? "Being analysed…"}</p>
                      <p className="mt-1 text-xs text-pewter">
                        {f.is_anonymous ? "Anonymous" : "With your name"} · {timeAgo(f.created_at)}
                        {f.hr_response && " · HR responded"}
                      </p>
                    </div>
                    <StatusBadge status={f.status} className="shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            eyebrow="Pulse surveys"
            title="Open surveys"
            action={
              <Link href="/portal/surveys" className="text-sm font-medium text-cobalt hover:underline">
                All surveys
              </Link>
            }
          />
          {surveys.length === 0 ? (
            <p className="text-sm text-pewter">No open surveys right now. We&apos;ll notify you when there&apos;s a new one.</p>
          ) : (
            <ul className="space-y-3">
              {surveys.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/portal/surveys/${s.id}`}
                    className="flex items-center gap-3 rounded-smallcards p-3 shadow-field hover:bg-mist/40"
                  >
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-smallcards bg-mist text-ink">
                      <ClipboardList className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{s.title}</span>
                      <span className="block text-xs text-pewter">
                        {Array.isArray(s.questions) ? s.questions.length : 0} questions · anonymous
                        {s.closes_at && ` · closes ${formatDate(s.closes_at)}`}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-pewter" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            eyebrow="You said, we did"
            title="Latest updates"
            action={
              <Link href="/portal/updates" className="text-sm font-medium text-cobalt hover:underline">
                All updates
              </Link>
            }
          />
          {updates.length === 0 ? (
            <p className="text-sm text-pewter">When HR acts on feedback themes, you&apos;ll see what changed here.</p>
          ) : (
            <ul className="space-y-4">
              {updates.map((u) => (
                <li key={u.id} className="flex gap-3">
                  <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-smallcards bg-mist text-ink">
                    <Megaphone className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{u.title}</p>
                    <p className="line-clamp-2 text-sm text-pewter">{u.body}</p>
                    <p className="mt-1 text-xs text-pewter">
                      {u.theme && `${u.theme} · `}
                      {timeAgo(u.published_at ?? u.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
