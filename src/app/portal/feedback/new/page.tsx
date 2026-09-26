import type { Metadata } from "next";
import { SubmitForm } from "@/components/submit/submit-form";
import { requireEmployee } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Give feedback — Vocalyze" };

export default async function PortalNewFeedback() {
  const user = await requireEmployee();
  return (
    <div className="mx-auto max-w-[760px]">
      <p className="eyebrow">Give feedback</p>
      <h1 className="mt-2 text-heading-md font-semibold text-obsidian">
        Say it your <span className="brush">way</span>.
      </h1>
      <p className="mt-4 max-w-xl text-subheading text-graphite">
        Type it, say it, or snap a photo of a handwritten note — in any language. Anonymous by default, and you can still
        follow it in My feedback.
      </p>
      <div className="mt-10">
        <SubmitForm
          mode="portal"
          defaultName={user.fullName}
          defaultEmail={user.email ?? null}
          defaultDepartment={user.department}
        />
      </div>
    </div>
  );
}
