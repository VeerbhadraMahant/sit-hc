import { redirect } from "next/navigation";
import { ChartNoAxesColumn, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { LoginForm } from "@/components/dashboard/login-form";
import { createClient, getHrUser } from "@/lib/supabase/server";

export const metadata = { title: "HR sign in — Pulse" };

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  let error = typeof sp.error === "string" ? sp.error : undefined;

  const hr = await getHrUser();
  if (hr) redirect(next);

  // Signed in (e.g. via Google) but not provisioned as HR.
  let signedInEmail: string | null = null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) {
    signedInEmail = (data.claims.email as string | undefined) ?? "this account";
    error = "not_hr";
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
          <p className="eyebrow text-silver">HR Console</p>
          <h1 className="mt-3 text-heading font-semibold">
            Hear every voice. <span className="brush">Act</span> on what matters.
          </h1>
          <ul className="mt-10 space-y-5 text-silver">
            {[
              { Icon: Sparkles, t: "AI themes, sentiment and risk flags on every submission" },
              { Icon: ChartNoAxesColumn, t: "Trends by team, theme and week — at a glance" },
              { Icon: ShieldCheck, t: "Anonymity by design: PII is redacted before you read it" },
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
          <LoginForm next={next} error={error} signedInEmail={signedInEmail} />
        </div>
      </main>
    </div>
  );
}
