"use client";

import { Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UpdateComposer } from "./update-composer";

/**
 * Opens the "You said, we did" composer prefilled from an insight action item.
 *   <PublishUpdateButton action={{ title, description, theme, department, feedbackCount }} />
 */
export function PublishUpdateButton({
  action,
  className,
  label = "Publish to employees",
}: {
  action: { title: string; description?: string; theme?: string | null; department?: string | null; feedbackCount?: number | null };
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const body = `**You said:** ${action.description ?? action.title}\n\n**We did:** `;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-cobalt hover:underline print:hidden",
          published && "text-forest",
          className,
        )}
      >
        <Megaphone className="size-3.5" aria-hidden />
        {published ? "Published" : label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-obsidian/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Publish a You said, we did update"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-cards bg-paper p-6 shadow-screenshot sm:rounded-cards"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">You said, we did</p>
                <h2 className="text-heading-sm font-semibold text-ink">Tell employees what&apos;s changing</h2>
              </div>
              <Button variant="ghost" size="sm" aria-label="Close" onClick={() => setOpen(false)} className="px-2">
                <X className="size-5" aria-hidden />
              </Button>
            </div>
            <UpdateComposer
              initial={{
                title: action.title,
                body,
                theme: action.theme ?? null,
                department: action.department ?? null,
                feedback_count: action.feedbackCount ?? null,
              }}
              onCancel={() => setOpen(false)}
              onSaved={() => {
                setPublished(true);
                setOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
