import { ChartNoAxesColumn, HeartPulse, MessageSquareHeart, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPanel, type LoginAs } from "@/components/auth/login-panel";
import { Logo } from "@/components/logo";
import { getHrUser, getSessionClaims } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in — Vocalyze" };

function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const as: LoginAs = sp.as === "hr" || (!sp.as && next?.startsWith("/dashboard")) ? "hr" : "employee";
  let error = typeof sp.error === "string" ? sp.error : undefined;

  const session = await getSessionClaims();
  let signedInEmail: string | null = null;
  if (session && error !== "auth") {
    if (as === "hr") {
      const hr = await getHrUser();
      if (hr) redirect(next?.startsWith("/dashboard") ? next : "/dashboard");
      // Signed in (e.g. via Google) but not provisioned as HR.
      signedInEmail = session.email ?? "this account";
      error = "not_hr";
    } else {
      redirect(next?.startsWith("/portal") ? next : "/portal");
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-obsidian p-12 text-paper lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right,#fcfcfd 1px,transparent 1px),linear-gradient(to bottom,#fcfcfd 1px,transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <Logo className="relative text-paper" />
        <div className="relative mt-auto max-w-md">
          <p className="eyebrow text-silver">Employees &amp; HR</p>
          <h1 className="mt-3 text-heading font-semibold">
            Every voice <span className="brush">heard</span>. Every theme acted on.
          </h1>
          <ul className="mt-10 space-y-5 text-silver">
            {[
              { Icon: MessageSquareHeart, t: "Employees: give feedback by text, voice or a photo — and see what HR did about it" },
              { Icon: HeartPulse, t: "Weekly wellbeing check-ins and pulse surveys, anonymous by design" },
              { Icon: ChartNoAxesColumn, t: "HR: AI themes, sentiment and risk flags on every submission" },
              { Icon: ShieldCheck, t: "Anonymous feedback is linked to you only by a one-way code HR can't read" },
            ].map(({ Icon, t }) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-smallcards bg-carbon">
                  <Icon className="size-4 text-lime" aria-hidden />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="grid-paper flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <LoginPanel key={as} initialAs={as} next={next} error={error} signedInEmail={signedInEmail} />
        </div>
      </main>
    </div>
  );
}
