import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUSES, STATUS_LABELS, type FeedbackStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_HINTS: Record<FeedbackStatus, string> = {
  new: "Your feedback is safely stored and has been analysed.",
  in_review: "The People team is reviewing it alongside related feedback.",
  actioned: "Action has been taken in response.",
  closed: "This item is closed. Thank you for speaking up.",
};

export function StatusTimeline({ status }: { status: FeedbackStatus }) {
  const current = STATUSES.indexOf(status);
  return (
    <ol className="grid gap-6 sm:grid-cols-4 sm:gap-2" aria-label="Status timeline">
      {STATUSES.map((s, i) => {
        const done = i <= current;
        const isCurrent = i === current;
        return (
          <li key={s} className="relative flex gap-3 sm:flex-col sm:gap-2" aria-current={isCurrent ? "step" : undefined}>
            {i < STATUSES.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-8 left-[15px] h-[calc(100%-8px)] w-0.5 sm:top-[15px] sm:left-8 sm:h-0.5 sm:w-[calc(100%-24px)]",
                  i < current ? "bg-carbon" : "bg-mist",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                done ? "bg-carbon text-paper" : "bg-paper text-pewter shadow-field",
                isCurrent && "ring-4 ring-lime",
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <div>
              <p className={cn("text-sm font-semibold", done ? "text-ink" : "text-pewter")}>{STATUS_LABELS[s]}</p>
              {isCurrent && <p className="mt-0.5 text-sm text-pewter">{STATUS_HINTS[s]}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const statusTone: Record<FeedbackStatus, string> = {
  new: "var(--color-slate-edge)",
  in_review: "var(--status-warning)",
  actioned: "var(--status-good)",
  closed: "var(--color-pewter)",
};

export function StatusBadge({ status, className }: { status: FeedbackStatus; className?: string }) {
  return (
    <Badge className={className}>
      <span className="size-2 rounded-full" style={{ background: statusTone[status] }} aria-hidden />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
