"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyCode({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium text-ink shadow-field hover:bg-mist",
        className,
      )}
      aria-label={copied ? "Copied" : "Copy tracking code"}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
