import { Database, EyeOff, MicOff, Trash2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

const PROMISES: { Icon: LucideIcon; title: string; body: string }[] = [
  { Icon: MicOff, title: "No audio stored", body: "Voice notes are transcribed in memory and discarded." },
  { Icon: EyeOff, title: "Automatic redaction", body: "Names, emails, phones and IDs are masked before HR reads anything." },
  { Icon: Trash2, title: "Raw text deleted", body: "For anonymous feedback, only the redacted English version is kept." },
  { Icon: Database, title: "Locked-down data", body: "Row-level security. Only verified HR accounts can read feedback." },
];

const QUOTES = [
  {
    q: "I finally said what I’d been holding in for months, in Hindi, from my phone, without worrying who would read it.",
    who: "Warehouse associate",
  },
  {
    q: "Two weeks after I flagged the broken shift-swap tool, my tracking code said ‘Action taken’. That never happened before.",
    who: "Customer support agent",
  },
  {
    q: "Our quarterly survey took six weeks to analyse. Now I walk into leadership meetings with this week’s themes.",
    who: "HR business partner",
  },
];

export function PrivacyBand() {
  return (
    <section id="privacy" className="scroll-mt-20 bg-obsidian py-20 text-paper lg:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="font-mono text-[12px] font-medium tracking-[2px] text-silver uppercase">Privacy first</p>
            <h2 className="mt-3 text-[36px] leading-[1.02] font-semibold tracking-[-1px] sm:text-heading">
              People only speak up when they feel <span className="brush">safe</span>
            </h2>
            <p className="mt-6 max-w-[520px] text-subheading text-silver">
              Anonymity is enforced by the system, not promised in a policy. Here is what happens to every submission.
            </p>
            <Link href="/submit" className={buttonClass("outline", "lg", "mt-8 text-paper")}>
              Try it anonymously
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {PROMISES.map(({ Icon, title, body }) => (
              <li key={title} className="rounded-cards border border-white/10 bg-white/[0.03] p-6">
                <Icon className="size-5 text-paper" aria-hidden />
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-silver">{body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-20">
          <p className="font-mono text-[12px] font-medium tracking-[2px] text-silver uppercase">
            What people could say · illustrative examples
          </p>
          <ul className="mt-6 grid gap-5 md:grid-cols-3">
            {QUOTES.map((x, i) => (
              <li
                key={x.who}
                className="flex flex-col justify-between rounded-cards p-6 text-obsidian"
                style={{
                  background: "var(--gradient-amber-glow)",
                  transform: `rotate(${[-1.2, 0.8, -0.6][i]}deg)`,
                }}
              >
                <blockquote className="text-[17px] leading-relaxed font-medium">“{x.q}”</blockquote>
                <p className="mt-6 font-mono text-[11px] tracking-[1.5px] text-obsidian/70 uppercase">
                  — {x.who} (example)
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
