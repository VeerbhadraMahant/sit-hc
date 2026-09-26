"use client";

import { AlertTriangle, KeyRound, Loader2, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { PillTabs } from "@/components/ui/pill-tabs";
import { createClient } from "@/lib/supabase/client";

export type LoginAs = "employee" | "hr";

const ERRORS: Record<string, string> = {
  not_hr: "This account doesn't have HR access. Ask an HR admin to grant it, or continue to the employee portal.",
  auth: "We couldn't complete sign in. The link may have expired — please try again.",
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

function callbackUrl(as: LoginAs, next: string | null) {
  const params = new URLSearchParams({ as });
  if (next) params.set("next", next);
  return `${window.location.origin}/auth/callback?${params}`;
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-pewter">
      <span className="h-px flex-1 bg-mist" />
      <span className="font-mono tracking-[2px] uppercase">or</span>
      <span className="h-px flex-1 bg-mist" />
    </div>
  );
}

function ErrorBox({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div role="alert" className="mt-6 flex gap-3 rounded-smallcards border border-mist bg-white p-4 text-sm text-ink">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" style={{ color: "var(--status-serious)" }} aria-hidden />
      <div>
        <p>{message}</p>
        {children}
      </div>
    </div>
  );
}

export function LoginPanel({
  initialAs,
  next,
  error,
  signedInEmail,
}: {
  initialAs: LoginAs;
  next: string | null;
  error?: string;
  signedInEmail: string | null;
}) {
  const router = useRouter();
  const [as, setAs] = useState<LoginAs>(initialAs);
  const [message, setMessage] = useState<string | null>(error ? (ERRORS[error] ?? ERRORS.auth) : null);

  function switchTab(v: LoginAs) {
    setAs(v);
    setMessage(null);
    const params = new URLSearchParams({ as: v });
    if (next) params.set("next", next);
    window.history.replaceState(null, "", `/login?${params}`);
  }

  async function onSwitchAccount() {
    await createClient().auth.signOut();
    router.replace(`/login?as=${as}`);
    router.refresh();
  }

  return (
    <Card className="p-6 sm:p-8">
      <PillTabs<LoginAs>
        value={as}
        onChange={switchTab}
        className="mb-6 w-full [&>button]:flex-1 [&>button]:justify-center"
        tabs={[
          { value: "employee", label: "Employee" },
          { value: "hr", label: "HR" },
        ]}
      />

      {message && (
        <ErrorBox message={message}>
          {signedInEmail && error === "not_hr" && (
            <p className="mt-2 text-pewter">
              Signed in as <span className="font-medium text-ink">{signedInEmail}</span>.{" "}
              <Link href="/portal" className="font-medium text-cobalt hover:underline">
                Go to employee portal
              </Link>{" "}
              ·{" "}
              <button type="button" onClick={onSwitchAccount} className="cursor-pointer font-medium text-cobalt hover:underline">
                Use another account
              </button>
            </p>
          )}
        </ErrorBox>
      )}

      {as === "employee" ? (
        <EmployeeSignIn next={next} onError={setMessage} />
      ) : (
        <HrSignIn next={next} onError={setMessage} />
      )}
    </Card>
  );
}

function EmployeeSignIn({ next, onError }: { next: string | null; onError: (m: string | null) => void }) {
  const router = useRouter();
  const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL;
  const [email, setEmail] = useState(isDemo ? "alex@vocalyze.internal" : "");
  const [password, setPassword] = useState(isDemo ? "demo1234" : "");
  const [usePassword, setUsePassword] = useState(isDemo ? true : false);
  const [busy, setBusy] = useState<"google" | "link" | "password" | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onGoogle() {
    setBusy("google");
    onError(null);
    if (isDemo) {
      router.replace(next?.startsWith("/portal") ? next : "/portal");
      router.refresh();
      return;
    }
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl("employee", next) },
    });
    if (error) {
      onError(error.message);
      setBusy(null);
    }
  }

  async function sendLink(e?: React.FormEvent) {
    e?.preventDefault();
    if (isDemo) {
      window.location.href = next?.startsWith("/portal") ? next : "/portal";
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      onError("Please enter a valid email address.");
      return;
    }
    setBusy("link");
    onError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl("employee", next), shouldCreateUser: true },
    });
    setBusy(null);
    if (error) {
      onError(
        /rate|seconds/i.test(error.message)
          ? "You requested a link very recently. Please wait a minute before trying again."
          : "We couldn't send a sign-in link to that address. Try Google, or check the email and try again.",
      );
      return;
    }
    setSentTo(email);
    setCooldown(60);
  }

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy("password");
    onError(null);
    if (isDemo) {
      window.location.href = next?.startsWith("/portal") ? next : "/portal";
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      onError(error.message === "Invalid login credentials" ? "That email and password don't match." : error.message);
      setBusy(null);
      return;
    }
    router.replace(next?.startsWith("/portal") ? next : "/portal");
    router.refresh();
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-mist text-ink">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <p className="eyebrow mt-5">Check your inbox</p>
        <h2 className="mt-1 text-heading-sm font-semibold text-obsidian">We sent you a sign-in link</h2>
        <p className="mt-2 text-pewter">
          Open the email we sent to <span className="font-medium text-ink">{sentTo}</span> on this device and tap the
          link to sign in. It expires in an hour.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button type="button" variant="subtle" disabled={cooldown > 0 || busy !== null} onClick={() => sendLink()}>
            {busy === "link" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSentTo(null);
              onError(null);
            }}
          >
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow">Employee sign in</p>
      <h2 className="mt-1 text-heading-md font-semibold text-obsidian">Your voice, your portal</h2>
      <p className="mt-2 text-pewter">Give feedback, follow HR&apos;s responses, answer pulse surveys and check in weekly.</p>

      {isDemo && (
        <div className="mt-4 rounded-smallcards border border-edge bg-mist/60 p-3 text-xs text-ink">
          <p className="font-semibold text-obsidian">Demo Mode Active</p>
          <p className="mt-0.5 text-pewter">
            No remote Supabase credentials detected. Click &ldquo;Sign in&rdquo; to access the employee portal in demo mode.
          </p>
        </div>
      )}

      <Button type="button" variant="subtle" size="lg" className="mt-6 w-full" onClick={onGoogle} disabled={busy !== null}>
        {busy === "google" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <Divider />

      {usePassword ? (
        <form onSubmit={onPassword} className="space-y-4">
          <div>
            <Label htmlFor="emp-email">Work email</Label>
            <Input id="emp-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div>
            <Label htmlFor="emp-password">Password</Label>
            <Input id="emp-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
            {busy === "password" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Sign in
          </Button>
        </form>
      ) : (
        <form onSubmit={sendLink} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="emp-email">Work email</Label>
            <Input id="emp-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
            {busy === "link" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}
            Email me a sign-in link
          </Button>
        </form>
      )}

      <button
        type="button"
        onClick={() => {
          setUsePassword((v) => !v);
          onError(null);
        }}
        className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-cobalt hover:underline"
      >
        <KeyRound className="size-3.5" aria-hidden />
        {usePassword ? "Email me a link instead" : "Use a password instead"}
      </button>

      <p className="mt-6 border-t border-mist pt-5 text-sm text-pewter">
        Prefer not to sign in?{" "}
        <Link href="/submit" className="font-medium text-cobalt hover:underline">
          Share feedback anonymously
        </Link>{" "}
        — no account needed.
      </p>
    </div>
  );
}

function HrSignIn({ next, onError }: { next: string | null; onError: (m: string | null) => void }) {
  const router = useRouter();
  const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL;
  const [email, setEmail] = useState(isDemo ? "hr@vocalyze.internal" : "");
  const [password, setPassword] = useState(isDemo ? "demo1234" : "");
  const [busy, setBusy] = useState<"password" | "google" | null>(null);
  const hrNext = next?.startsWith("/dashboard") ? next : "/dashboard";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("password");
    onError(null);
    if (isDemo) {
      window.location.href = hrNext;
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      onError(error?.message === "Invalid login credentials" ? "That email and password don't match." : (error?.message ?? ERRORS.auth));
      setBusy(null);
      return;
    }
    const { data: profile } = await supabase.from("hr_profiles").select("user_id").eq("user_id", data.user.id).maybeSingle();
    if (!profile) {
      await supabase.auth.signOut();
      onError("This account doesn't have HR access. Use the Employee tab to reach your portal.");
      setBusy(null);
      return;
    }
    router.replace(hrNext);
    router.refresh();
  }

  async function onGoogle() {
    setBusy("google");
    onError(null);
    if (isDemo) {
      window.location.href = hrNext;
      return;
    }
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl("hr", hrNext) },
    });
    if (error) {
      onError(error.message);
      setBusy(null);
    }
  }

  return (
    <div>
      <p className="eyebrow">HR sign in</p>
      <h2 className="mt-1 text-heading-md font-semibold text-obsidian">Welcome back</h2>
      <p className="mt-2 text-pewter">Sign in to the Vocalyze HR console.</p>

      {isDemo && (
        <div className="mt-4 rounded-smallcards border border-edge bg-mist/60 p-3 text-xs text-ink">
          <p className="font-semibold text-obsidian">Demo Mode Active</p>
          <p className="mt-0.5 text-pewter">
            No remote Supabase credentials detected. Click &ldquo;Sign in&rdquo; to access the full HR console in demo mode.
          </p>
        </div>
      )}

      <Button type="button" variant="subtle" size="lg" className="mt-6 w-full" onClick={onGoogle} disabled={busy !== null}>
        {busy === "google" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <Divider />

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="hr-email">Work email</Label>
          <Input id="hr-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div>
          <Label htmlFor="hr-password">Password</Label>
          <Input id="hr-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
          {busy === "password" && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Sign in
        </Button>
      </form>

      <p className="mt-6 border-t border-mist pt-5 text-sm text-pewter">
        HR team members have an employee portal too — sign in on the <span className="font-medium text-ink">Employee</span> tab.
      </p>
    </div>
  );
}

