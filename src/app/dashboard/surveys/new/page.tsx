import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SurveyBuilder } from "@/components/surveys/survey-builder";
import { requireHr } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New survey — Vocalyze HR" };

export default async function NewSurveyPage() {
  await requireHr();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/surveys" className="inline-flex items-center gap-1 text-sm text-pewter hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Surveys
        </Link>
        <p className="eyebrow mt-3">New pulse survey</p>
        <h1 className="text-heading-md font-semibold text-obsidian">Build a survey</h1>
      </div>
      <SurveyBuilder />
    </div>
  );
}
