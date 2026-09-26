import { ChevronRight, CircleCheck, ClipboardList } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { isOpen, listSurveysForEmployee, type EmployeeSurvey } from "./data";

/**
 * Employee: surveys to answer (server component). Usable on the portal home:
 *   <ActiveSurveysList userId={user.id} limit={3} />
 */
export async function ActiveSurveysList({
  userId,
  limit,
  includeClosed = false,
  className,
}: {
  userId: string;
  limit?: number;
  includeClosed?: boolean;
  className?: string;
}) {
  const all = await listSurveysForEmployee(userId, { includeClosed });
  const surveys = limit ? all.slice(0, limit) : all;
  if (!surveys.length) {
    return (
      <div className={cn("flex items-center gap-3 rounded-smallcards border border-dashed border-edge p-4 text-sm text-pewter", className)}>
        <ClipboardList className="size-5 shrink-0" aria-hidden />
        No surveys right now — we&apos;ll notify you when there&apos;s a new one.
      </div>
    );
  }
  return (
    <ul className={cn("grid gap-2", className)}>
      {surveys.map((s) => (
        <li key={s.id}>
          <SurveyRow survey={s} />
        </li>
      ))}
    </ul>
  );
}

export function SurveyRow({ survey: s }: { survey: EmployeeSurvey }) {
  const open = isOpen(s);
  const minutes = Math.max(1, Math.round(s.questions.length * 0.4));
  return (
    <Link
      href={`/portal/surveys/${s.id}`}
      className="group flex items-center gap-4 rounded-smallcards bg-paper p-4 shadow-card transition-shadow hover:shadow-screenshot"
    >
      <span
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
          s.answered ? "bg-mint-tint text-forest" : "bg-mist text-ink",
        )}
      >
        {s.answered ? <CircleCheck className="size-5" aria-hidden /> : <ClipboardList className="size-5" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{s.title}</span>
        <span className="block text-xs text-pewter">
          {s.questions.length} questions · ~{minutes} min
          {s.closes_at && open ? ` · closes ${formatDate(s.closes_at)}` : ""}
        </span>
      </span>
      {s.answered ? (
        <Badge>Answered</Badge>
      ) : open ? (
        <Badge className="border-carbon bg-carbon text-paper">Answer</Badge>
      ) : (
        <Badge className="text-pewter">Closed</Badge>
      )}
      <ChevronRight className="size-4 text-pewter transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
