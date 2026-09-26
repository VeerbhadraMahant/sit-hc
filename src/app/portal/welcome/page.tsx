import { KeyRound, ShieldCheck, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/portal/profile-form";
import { Card } from "@/components/ui/card";
import { requireEmployee } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Welcome — Vocalyze" };

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, sp] = await Promise.all([requireEmployee({ allowUnonboarded: true }), searchParams]);
  const editing = sp.edit === "1";
  if (user.onboarded && !editing) redirect("/portal");

  return (
    <div className="mx-auto grid max-w-[960px] gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
      <div>
        <p className="eyebrow">{editing ? "Your profile" : "Welcome to Vocalyze"}</p>
        <h1 className="mt-2 text-heading-md font-semibold text-obsidian sm:text-heading">
          {editing ? (
            "Keep your details current"
          ) : (
            <>
              Your voice, <span className="brush">heard</span>.
            </>
          )}
        </h1>
        <p className="mt-4 max-w-md text-subheading text-graphite">
          {editing
            ? "Your department helps group check-ins and surveys. It's never shown with anonymous feedback."
            : "Two quick details and you're in. Share feedback, follow what HR does with it, answer pulse surveys and check in on your week."}
        </p>
        <ul className="mt-8 space-y-4">
          {[
            {
              Icon: ShieldCheck,
              t: "Anonymous stays anonymous",
              d: "Anonymous feedback is linked to your account only by a one-way code. HR can't read it or reverse it.",
            },
            {
              Icon: UsersRound,
              t: "Groups, not individuals",
              d: "Check-ins and survey results reach HR only as aggregates of 5 or more people.",
            },
            {
              Icon: KeyRound,
              t: "Your notes stay yours",
              d: "Private check-in notes are visible only to you.",
            },
          ].map(({ Icon, t, d }) => (
            <li key={t} className="flex gap-3">
              <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-smallcards bg-mist text-ink">
                <Icon className="size-4" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-ink">{t}</p>
                <p className="text-sm text-pewter">{d}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Card glow="lime" arc className="p-6 sm:p-8">
        <ProfileForm
          mode={editing ? "edit" : "welcome"}
          defaultName={user.fullName ?? ""}
          defaultDepartment={user.department ?? ""}
        />
      </Card>
    </div>
  );
}
