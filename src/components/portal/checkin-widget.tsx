"use client";

import { Annoyed, Check, Frown, Laugh, Loader2, Meh, Smile } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { MOOD_LABELS, type CheckIn } from "@/lib/types";
import { cn } from "@/lib/utils";

const MOOD_ICONS = [Frown, Annoyed, Meh, Smile, Laugh];
export const ENERGY_LABELS = ["Drained", "Tired", "Steady", "Energised", "Charged"] as const;

function Scale({
  label,
  value,
  onChange,
  options,
  name,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  options: { label: string; icon?: React.ReactNode }[];
  name: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{label}</legend>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {options.map((o, i) => {
          const v = i + 1;
          const selected = value === v;
          return (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={selected}
              name={name}
              onClick={() => onChange(v)}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1 rounded-smallcards px-1 py-2.5 text-[11px] font-medium transition-colors sm:text-xs",
                selected ? "bg-carbon text-paper" : "bg-paper text-ink shadow-field hover:bg-mist",
              )}
            >
              {o.icon ?? <span className="text-base font-semibold tabular-nums">{v}</span>}
              <span className="leading-tight">{o.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Weekly mood + energy check-in. `compact` = home-page quick widget (no note). */
export function CheckinWidget({ existing, compact = false }: { existing: CheckIn | null; compact?: boolean }) {
  const router = useRouter();
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [note, setNote] = useState(existing?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!mood || !energy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/portal/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, energy, note: compact ? existing?.note ?? null : note.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save your check-in.");
      setSaved(true);
      toast.success(existing ? "Check-in updated" : "Thanks for checking in");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Scale
        name="mood"
        label="How are you feeling this week?"
        value={mood}
        onChange={(v) => {
          setMood(v);
          setSaved(false);
        }}
        options={MOOD_LABELS.map((l, i) => {
          const Icon = MOOD_ICONS[i]!;
          return { label: l, icon: <Icon className="size-5" aria-hidden /> };
        })}
      />
      <Scale
        name="energy"
        label="And your energy?"
        value={energy}
        onChange={(v) => {
          setEnergy(v);
          setSaved(false);
        }}
        options={ENERGY_LABELS.map((l) => ({ label: l }))}
      />
      {!compact && (
        <div>
          <Label htmlFor="checkin-note">Private note (optional)</Label>
          <Textarea
            id="checkin-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSaved(false);
            }}
            maxLength={500}
            className="min-h-24"
            placeholder="Anything on your mind? Only you can see this note."
          />
        </div>
      )}
      <Button type="button" onClick={save} disabled={!mood || !energy || busy || saved} className={compact ? "w-full" : undefined}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : saved ? <Check className="size-4" aria-hidden /> : null}
        {saved ? "Saved" : existing ? "Update check-in" : "Save check-in"}
      </Button>
    </div>
  );
}
