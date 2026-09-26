import type { Metadata } from "next";
import { PublicHeader } from "@/components/submit/public-header";
import { TrackForm } from "@/components/submit/track-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Track your feedback — Pulse" };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ notfound?: string }> }) {
  const { notfound } = await searchParams;
  return (
    <div className="grid-paper min-h-dvh">
      <PublicHeader />
      <main className="mx-auto max-w-[560px] px-4 py-16 sm:py-24">
        <p className="eyebrow text-center">Track your feedback</p>
        <h1 className="mt-2 text-center text-heading-md font-semibold text-obsidian sm:text-heading">
          See what <span className="brush">happened</span>
        </h1>
        <Card glow="cyan" arc className="mt-10">
          <p className="mb-5 text-ink">
            Enter the tracking code you received after submitting. It looks like{" "}
            <span className="font-mono text-sm whitespace-nowrap">PLS-7K4M-Q2XD</span>.
          </p>
          <TrackForm notFound={notfound === "1"} />
        </Card>
        <p className="mt-6 text-sm text-pewter">
          Tracking codes are the only link between you and your feedback. We can&apos;t recover a lost code for
          anonymous submissions — that&apos;s what keeps them anonymous.
        </p>
      </main>
    </div>
  );
}
