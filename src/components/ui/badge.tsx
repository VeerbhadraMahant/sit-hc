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

export const urgencyMeta: Record<Urgency, { label: string; color: string; Icon: typeof Info; loud?: boolean }> = {
  low: { label: "Low", color: "var(--status-good)", Icon: CircleCheck },
  medium: { label: "Medium", color: "var(--status-warning)", Icon: Info },
  high: { label: "High", color: "var(--status-serious)", Icon: AlertTriangle, loud: true },
  critical: { label: "Critical", color: "var(--status-critical)", Icon: AlertOctagon, loud: true },
};

// Critical/high urgency gets a tinted pill (not just a small colored icon) so it's
// unmistakable at a glance in dense lists — the whole point of flagging it as urgent.
export function UrgencyBadge({ urgency, className }: { urgency: Urgency | null; className?: string }) {
  if (!urgency) return <Badge className={cn("text-pewter", className)}>Pending</Badge>;
  const { label, color, Icon, loud } = urgencyMeta[urgency];
  return (
    <Badge
      className={className}
      style={loud ? { color, background: `color-mix(in srgb, ${color} 12%, var(--color-paper))`, borderColor: `color-mix(in srgb, ${color} 30%, transparent)` } : undefined}
    >
      <Icon className="size-3.5" style={{ color }} aria-hidden />
      {label}
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
