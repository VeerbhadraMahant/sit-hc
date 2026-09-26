"use client";

import { Download, Lock, RotateCcw, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import type { SurveyStatus } from "@/lib/types";

/** Status transitions + export for a survey (HR). */
export function SurveyActions({ id, status, responses }: { id: string; status: SurveyStatus; responses: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "publish" | "close" | "reopen") {
    setBusy(true);
    try {
      const res = await fetch(`/api/surveys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(
        action === "publish" ? "Published — employees have been notified." : action === "close" ? "Survey closed." : "Survey reopened.",
      );
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this draft? This can't be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/surveys/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Couldn't delete.");
      return;
    }
    toast.success("Draft deleted.");
    router.push("/dashboard/surveys");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "draft" && responses > 0 && (
        <a href={`/api/surveys/${id}/export`} className={buttonClass("subtle", "sm")}>
          <Download className="size-4" aria-hidden /> CSV
        </a>
      )}
      {status === "draft" && (
        <>
          <Button variant="subtle" size="sm" onClick={remove} disabled={busy}>
            <Trash2 className="size-4" aria-hidden /> Delete
          </Button>
          <Button size="sm" onClick={() => act("publish")} disabled={busy}>
            <Send className="size-4" aria-hidden /> Publish
          </Button>
        </>
      )}
      {status === "active" && (
        <Button variant="dark" size="sm" onClick={() => act("close")} disabled={busy}>
          <Lock className="size-4" aria-hidden /> Close survey
        </Button>
      )}
      {status === "closed" && (
        <Button variant="subtle" size="sm" onClick={() => act("reopen")} disabled={busy}>
          <RotateCcw className="size-4" aria-hidden /> Reopen
        </Button>
      )}
    </div>
  );
}
