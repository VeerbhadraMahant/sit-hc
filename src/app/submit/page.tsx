import type { Metadata } from "next";
import { PublicHeader } from "@/components/submit/public-header";
import { SubmitForm } from "@/components/submit/submit-form";

export const metadata: Metadata = {
  title: "Share feedback — Pulse",
  description: "Share anonymous feedback with your People team by text, voice note, or a photo of a handwritten note.",
};

export default function SubmitPage() {
  const org = process.env.NEXT_PUBLIC_ORG_NAME || "your company";
  return (
    <div className="grid-paper min-h-dvh">
      <PublicHeader />
      <main className="mx-auto max-w-[760px] px-4 pt-12 pb-20 sm:pt-16">
        <p className="eyebrow">Employee voice · {org}</p>
        <h1 className="mt-2 text-heading-md font-semibold text-obsidian sm:text-heading">
          Say it your <span className="brush">way</span>.
        </h1>
        <p className="mt-4 max-w-xl text-subheading text-graphite">
          Type it, say it, or snap a photo of a handwritten note — in any language. Anonymous by default, and read by
          people who can act on it.
        </p>
        <div className="mt-10">
          <SubmitForm />
        </div>
      </main>
    </div>
  );
}
