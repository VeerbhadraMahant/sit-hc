import { cn } from "@/lib/utils";

export type Glow = "cyan" | "lime" | "orchid" | "mint" | "amber" | "citron" | "critical" | "warning" | "good";

type CardProps = React.HTMLAttributes<HTMLDivElement> & { glow?: Glow; arc?: boolean; small?: boolean };

export function Card({ glow, arc, small, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-paper shadow-card",
        small ? "rounded-smallcards p-4" : "rounded-cards p-6",
        glow && `glow-${glow}`,
        arc && "arc",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h3 className="text-heading-sm font-semibold text-ink">{title}</h3>
      </div>
      {action}
    </div>
  );
}
