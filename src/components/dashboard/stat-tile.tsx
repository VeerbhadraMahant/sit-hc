import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, type Glow } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  sub,
  delta,
  goodWhenUp = true,
  glow,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  delta?: { value: number; label: string } | null;
  goodWhenUp?: boolean;
  glow?: Glow;
}) {
  const up = delta && delta.value > 0;
  const good = delta ? (delta.value === 0 ? null : up === goodWhenUp) : null;
  return (
    <Card glow={glow} arc={!!glow} className="flex flex-col gap-1">
      <p className="eyebrow">{label}</p>
      <p className="text-[40px] leading-none font-semibold tracking-[-1px] text-obsidian">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-pewter">
        {delta && delta.value !== 0 && (
          <span
            className={cn("inline-flex items-center gap-0.5 font-medium")}
            style={{ color: good ? "#006300" : "var(--status-critical)" }}
          >
            {up ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}
            {delta.label}
          </span>
        )}
        {sub}
      </div>
    </Card>
  );
}
