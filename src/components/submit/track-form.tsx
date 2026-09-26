"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function TrackForm({ notFound }: { notFound?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState(notFound ? "We couldn't find feedback with that code. Check it and try again." : "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!/^PLS-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(clean)) {
      setError("That doesn't look like a tracking code (format: PLS-XXXX-XXXX).");
      return;
    }
    router.push(`/track/${clean}`);
  }

  return (
    <form onSubmit={submit} noValidate>
      <Label htmlFor="code">Tracking code</Label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
          placeholder="PLS-XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? "code-error" : undefined}
          className="font-mono tracking-wider uppercase"
        />
        <Button type="submit" size="lg" className="h-12 shrink-0">
          Track <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
      {error && (
        <p id="code-error" role="alert" className="mt-3 text-sm text-critical">
          {error}
        </p>
      )}
    </form>
  );
}
