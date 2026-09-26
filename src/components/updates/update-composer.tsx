"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { DEPARTMENTS, THEMES, type UpdatePost } from "@/lib/types";
import { UpdateInputSchema } from "./schema";

export type ComposerInitial = {
  id?: string;
  title?: string;
  body?: string;
  theme?: string | null;
  department?: string | null;
  feedback_count?: number | null;
};

/** Create or edit a "You said, we did" update. Publishing notifies every employee. */
export function UpdateComposer({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: ComposerInitial;
  onSaved?: (u: UpdatePost) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [theme, setTheme] = useState(initial?.theme ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [count, setCount] = useState(initial?.feedback_count ? String(initial.feedback_count) : "");
  const [busy, setBusy] = useState(false);
  const editing = !!initial?.id;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      body,
      theme: theme || null,
      department: department || null,
      feedback_count: count ? Number(count) : null,
    };
    const check = UpdateInputSchema.safeParse(payload);
    if (!check.success) {
      toast.error(check.error.issues[0]?.message ?? "Please check the update.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/updates/${initial!.id}` : "/api/updates", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(editing ? "Update saved." : "Published — every employee has been notified.");
      if (!editing) {
        setTitle("");
        setBody("");
        setTheme("");
        setDepartment("");
        setCount("");
      }
      onSaved?.(json.update as UpdatePost);
    } catch (err) {
      toast.error((err as Error).message || "Couldn't publish.");
    } finally {
      setBusy(false);
    }
  }

  const uid = initial?.id ?? "new";
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor={`u-title-${uid}`}>What changed?</Label>
        <Input
          id={`u-title-${uid}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. On-call is now a fair weekly rotation"
          maxLength={160}
        />
      </div>
      <div>
        <Label htmlFor={`u-body-${uid}`}>You said… we did…</Label>
        <Textarea
          id={`u-body-${uid}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-36"
          maxLength={4000}
          placeholder={"**You said:** weekend on-call was burning people out.\n**We did:** introduced a weekly rotation with a comp day after each on-call week."}
        />
        <p className="mt-1 text-xs text-pewter">Supports **bold**, lists and links.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`u-theme-${uid}`}>Theme</Label>
          <Select id={`u-theme-${uid}`} value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="">—</option>
            {THEMES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`u-dept-${uid}`}>Department</Label>
          <Select id={`u-dept-${uid}`} value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">Everyone</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`u-count-${uid}`}>Based on N feedback</Label>
          <Input
            id={`u-count-${uid}`}
            type="number"
            min={0}
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="e.g. 14"
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="subtle" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          <Send className="size-4" aria-hidden />
          {busy ? "Saving…" : editing ? "Save changes" : "Publish to employees"}
        </Button>
      </div>
    </form>
  );
}
