"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

const ERRORS: Record<string, string> = {
  not_hr: "This account doesn't have HR access. Ask an HR admin to grant you access, or sign in with a different account.",
  auth: "We couldn't complete sign in. Please try again.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function LoginForm({ next, error, signedInEmail }: { next: string; error?: string; signedInEmail: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"password" | "google" | null>(null);
  const [message, setMessage] = useState<string | null>(error ? (ERRORS[error] ?? ERRORS.auth) : null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("password");
    setMessage(null);
    const supabase = createClient();
    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setMessage(error?.message ?? ERRORS.auth);
      setBusy(null);
      return;
    }
    const { data: profile } = await supabase.from("hr_profiles").select("user_id").eq("user_id", data.user.id).maybeSingle();
    if (!profile) {
      await supabase.auth.signOut();
      setMessage(ERRORS.not_hr);
      setBusy(null);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function onGoogle() {
    setBusy("google");
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setMessage(error.message);
      setBusy(null);
    }
  }

  async function onSwitchAccount() {
    await createClient().auth.signOut();
    router.replace(`/login?next=${encodeURIComponent(next)}`);
    router.refresh();
  }

  return (
    <Card className="p-8">
      <p className="eyebrow">HR sign in</p>
      <h2 className="mt-1 text-heading-md font-semibold text-obsidian">Welcome back</h2>
      <p className="mt-2 text-pewter">Sign in to the Pulse HR console.</p>

      {message && (
        <div role="alert" className="mt-6 flex gap-3 rounded-smallcards border border-mist bg-white p-4 text-sm text-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" style={{ color: "var(--status-serious)" }} aria-hidden />
          <div>
            <p>{message}</p>
            {signedInEmail && error === "not_hr" && (
              <p className="mt-2 text-pewter">
                Signed in as <span className="font-medium text-ink">{signedInEmail}</span>.{" "}
                <button type="button" onClick={onSwitchAccount} className="cursor-pointer font-medium text-cobalt hover:underline">
                  Use another account
                </button>
              </p>
            )}
          </div>
        </div>
      )}

      <Button type="button" variant="subtle" size="lg" className="mt-6 w-full" onClick={onGoogle} disabled={busy !== null}>
        {busy === "google" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs text-pewter">
        <span className="h-px flex-1 bg-mist" />
        <span className="font-mono tracking-[2px] uppercase">or</span>
        <span className="h-px flex-1 bg-mist" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
          {busy === "password" && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-sm text-pewter">
        Not in HR?{" "}
        <a href="/submit" className="font-medium text-cobalt hover:underline">
          Share feedback instead
        </a>
      </p>
    </Card>
  );
}
