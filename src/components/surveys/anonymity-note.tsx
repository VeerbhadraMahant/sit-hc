import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AnonymityNote() {
  return (
    <Card small glow="mint" arc className="h-fit space-y-3 p-5">
      <p className="flex items-center gap-2 font-semibold text-ink">
        <ShieldCheck className="size-5 text-forest" aria-hidden /> How your answers stay anonymous
      </p>
      <ul className="space-y-2 text-sm text-graphite">
        <li>Your name and email are never stored with your answers.</li>
        <li>We keep only a one-way code so you can answer once — HR can&apos;t trace it back, and it differs for every survey.</li>
        <li>Results by team only appear when at least 5 people answered.</li>
      </ul>
    </Card>
  );
}
