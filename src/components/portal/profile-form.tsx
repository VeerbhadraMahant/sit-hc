"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { DEPARTMENTS } from "@/lib/types";

export function ProfileForm({
  defaultName,
  defaultDepartment,
  mode,
}: {
  defaultName: string;
  defaultDepartment: string;
  mode: "welcome" | "edit";
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(defaultName);
  const [department, setDepartment] = useState(defaultDepartment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) return setError("Please tell us your name.");
    if (!department) return setError("Please choose your department.");
    setBusy(true);
    try {
      const res = await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), department }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      if (mode === "edit") toast.success("Profile updated");
      router.replace("/portal");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="full-name">Your name</Label>
        <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" maxLength={120} />
        <p className="mt-1.5 text-xs text-pewter">Only shown to HR on feedback you choose to send with your name.</p>
      </div>
      <div>
        <Label htmlFor="department">Department</Label>
        <Select id="department" value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="" disabled>
            Choose your department
          </option>
          {DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </Select>
        <p className="mt-1.5 text-xs text-pewter">Used to group check-ins and surveys. Teams under 5 people are never shown to HR.</p>
      </div>
      {error && (
        <p role="alert" className="rounded-smallcards border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {mode === "welcome" ? (
          <>
            Enter my portal <ArrowRight className="size-4" aria-hidden />
          </>
        ) : (
          "Save profile"
        )}
      </Button>
    </form>
  );
}
