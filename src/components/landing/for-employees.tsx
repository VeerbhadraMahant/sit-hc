import { ClipboardList, Megaphone, MessagesSquare } from "lucide-react";
import { Screenshot } from "@/components/landing/screenshot";
import { Card } from "@/components/ui/card";

const PANELS = [
  {
    Icon: MessagesSquare,
    label: "Home & my feedback",
    body: "One place to give feedback, check status, and see HR's reply — even on anonymous items.",
    shot: "/screenshots/portal-home.png",
    alt: "Employee portal home showing feedback status, an open pulse survey and a recent update",
  },
  {
    Icon: ClipboardList,
    label: "Pulse surveys",
    body: "Short eNPS and scale surveys, answered in under two minutes, always anonymous.",
    shot: "/screenshots/portal-surveys.png",
    alt: "An employee answering a pulse survey in the Vocalyze portal",
  },
  {
    Icon: Megaphone,
    glow: "lime" as const,
    label: "You said, we did",
    body: "A public board showing exactly what changed because people spoke up.",
    shot: "/screenshots/portal-updates.png",
    alt: "The You said, we did board showing updates HR published from employee feedback",
  },
];

export function ForEmployees() {
  return (
    <section id="employees" className="scroll-mt-20 border-y border-mist bg-white/60 py-20 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="text-center">
          <p className="eyebrow">For employees</p>
          <h2 className="mt-3 text-[36px] leading-[1.02] font-semibold tracking-[-1px] text-obsidian sm:text-heading">
            A portal that closes the <span className="brush">loop</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-subheading text-graphite">
            Beyond one-off submissions: sign in to track every response, take a pulse survey, do a 10-second wellbeing
            check-in, and see what changed as a result.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PANELS.map(({ Icon, glow, label, body, shot, alt }) => (
            <Card key={label} glow={glow} arc={!!glow}>
              <span className="inline-flex size-9 items-center justify-center rounded-images bg-mist">
                <Icon className="size-4 text-ink" aria-hidden />
              </span>
              <h3 className="mt-3 text-[17px] font-semibold text-ink">{label}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-graphite">{body}</p>
              <div className="mt-4">
                <Screenshot src={shot} alt={alt} aspect="16/10" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
