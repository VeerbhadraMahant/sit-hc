import { AlertOctagon, AlertTriangle, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sentiment, Urgency } from "@/lib/types";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-mist bg-paper px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-ink",
        className,
      )}
      {...props}
    />
  );
}

export const urgencyMeta: Record<
  Urgency,
  { label: string; color: string; Icon: typeof Info; badgeCls: string; loud?: boolean }
> = {
  low: {
    label: "Low",
    color: "var(--status-good)",
    Icon: CircleCheck,
    badgeCls: "bg-emerald-500/10 text-emerald-800 border-emerald-200/90",
  },
  medium: {
    label: "Medium",
    color: "var(--status-warning)",
    Icon: Info,
    badgeCls: "bg-amber-500/10 text-amber-900 border-amber-200/90",
  },
  high: {
    label: "High",
    color: "var(--status-serious)",
    Icon: AlertTriangle,
    badgeCls: "bg-orange-500/10 text-orange-950 border-orange-300 font-medium",
    loud: true,
  },
  critical: {
    label: "Critical",
    color: "var(--status-critical)",
    Icon: AlertOctagon,
    badgeCls: "bg-red-500/10 text-[#d03b3b] border-red-300 font-semibold shadow-xs",
    loud: true,
  },
};

// Critical/high urgency gets a tinted pill (not just a small colored icon) so it's
// unmistakable at a glance in dense lists — the whole point of flagging it as urgent.
export function UrgencyBadge({ urgency, className }: { urgency: Urgency | null; className?: string }) {
  if (!urgency) return <Badge className={cn("text-pewter", className)}>Pending</Badge>;
  const { label, color, Icon, badgeCls } = urgencyMeta[urgency];
  return (
    <Badge className={cn(badgeCls, className)}>
      <Icon className="size-3.5" style={{ color }} aria-hidden />
      {label}
      {urgency === "critical" && (
        <span className="relative ml-0.5 flex size-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-[#d03b3b]" />
        </span>
      )}
    </Badge>
  );
}

export const sentimentColor: Record<Sentiment, string> = {
  positive: "var(--viz-positive)",
  neutral: "var(--viz-neutral)",
  mixed: "var(--viz-neutral)",
  negative: "var(--viz-negative)",
};

export function SentimentBadge({ sentiment, className }: { sentiment: Sentiment | null; className?: string }) {
  if (!sentiment) return <Badge className={cn("text-pewter", className)}>Analyzing</Badge>;
  return (
    <Badge className={cn("capitalize", className)}>
      <span className="size-2 rounded-full" style={{ background: sentimentColor[sentiment] }} aria-hidden />
      {sentiment}
    </Badge>
  );
}
