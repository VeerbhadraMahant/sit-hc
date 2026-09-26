// Seeds employee-portal demo data: ~24 demo employees, 8 weeks of wellbeing check-ins,
// pulse surveys with responses, "You said, we did" updates, notifications, and two
// feedback items owned by the demo employee (employee@vocalyze.demo).
//   npm run seed:portal            → removes previous portal seed data, then seeds
//   npm run seed:portal -- --reset → only removes portal seed data
// Standalone: no "server-only" imports. Hashes match src/lib/identity.ts exactly.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { createHmac, randomBytes, randomInt } from "node:crypto";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = process.env.ANON_LINK_SECRET;
const DEMO_EMAIL = (process.env.DEMO_EMPLOYEE_EMAIL || "employee@vocalyze.demo").toLowerCase();
if (!url || !serviceKey || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or ANON_LINK_SECRET in .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const onlyReset = process.argv.includes("--reset");

// ── helpers ─────────────────────────────────────────────────────
const anonHash = (userId: string, scope = "employee") => createHmac("sha256", secret!).update(`${scope}:${userId}`).digest("hex");
const surveyHash = (userId: string, surveyId: string) => anonHash(userId, `survey:${surveyId}`);

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42_2026);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const DAY = 86_400_000;
const daysAgo = (d: number, hour = 10) => {
  const t = new Date(Date.now() - d * DAY);
  t.setHours(hour, Math.floor(rand() * 60), 0, 0);
  return new Date(Math.min(t.getTime(), Date.now() - 5 * 60_000)).toISOString();
};
function isoWeekStart(d: Date) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const trackingCode = () => {
  const part = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `VOC-${part()}-${part()}`;
};
async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

// ── seed content ────────────────────────────────────────────────
const PEOPLE: [string, string][] = [
  ["Rohan Iyer", "Engineering"],
  ["Sneha Kulkarni", "Engineering"],
  ["Arjun Nair", "Engineering"],
  ["Meera Pillai", "Engineering"],
  ["Vikram Rao", "Engineering"],
  ["Priyanka Das", "Engineering"],
  ["Karthik Menon", "Engineering"],
  ["Ananya Gupta", "Sales"],
  ["Rahul Verma", "Sales"],
  ["Neha Joshi", "Sales"],
  ["Siddharth Bose", "Sales"],
  ["Pooja Reddy", "Sales"],
  ["Farhan Sheikh", "Customer Support"],
  ["Divya Krishnan", "Customer Support"],
  ["Aditya Singh", "Customer Support"],
  ["Kavya Hegde", "Customer Support"],
  ["Imran Qureshi", "Customer Support"],
  ["Ishita Banerjee", "Product"],
  ["Nikhil Chopra", "Product"],
  ["Tanvi Shah", "Design"],
  ["Aman Malhotra", "Marketing"],
  ["Riya Sen", "Marketing"],
  ["Suresh Patil", "Operations"],
  ["Lakshmi Narayan", "Finance"],
];
const emailFor = (name: string) => `${name.toLowerCase().replace(/\s+/g, ".")}@vocalyze.demo`;

const SURVEY_ENPS = {
  title: "Q3 eNPS & engagement",
  description: "Our quarterly two-minute check-in. How likely are you to recommend working here — and what would make it better?",
  questions: [
    { id: "q_enps", type: "enps", prompt: "How likely are you to recommend this company as a place to work?" },
    { id: "q_valued", type: "scale", prompt: "I feel valued for the work I do.", min_label: "Strongly disagree", max_label: "Strongly agree" },
    { id: "q_workload", type: "scale", prompt: "My workload is manageable.", min_label: "Strongly disagree", max_label: "Strongly agree" },
    {
      id: "q_improve",
      type: "choice",
      prompt: "What would most improve your day-to-day experience?",
      options: ["Clearer priorities", "Fewer meetings", "Better tools", "Career growth", "Flexible hours"],
    },
    { id: "q_change", type: "text", prompt: "What is the one thing we should change?", optional: true },
  ],
};
const SURVEY_HYBRID = {
  title: "Hybrid work pulse",
  description: "Tell us how the hybrid policy is working for you and your team. Takes about two minutes.",
  questions: [
    { id: "q_policy", type: "scale", prompt: "The hybrid work policy is clear to me.", min_label: "Not at all", max_label: "Completely" },
    { id: "q_days", type: "choice", prompt: "How many office days per week work best for you?", options: ["1 day", "2 days", "3 days", "Fully flexible"] },
    { id: "q_home", type: "scale", prompt: "I have what I need to work well from home.", min_label: "Not at all", max_label: "Completely" },
    { id: "q_idea", type: "text", prompt: "Anything else about hybrid work we should know?", optional: true },
  ],
};
const SURVEY_MANAGER = {
  title: "Manager effectiveness — H2",
  description: "Help us understand how well managers are supporting their teams. Answers are anonymous.",
  questions: [
    { id: "q_clear", type: "scale", prompt: "My manager sets clear goals and priorities.", min_label: "Strongly disagree", max_label: "Strongly agree" },
    { id: "q_feedback", type: "scale", prompt: "My manager gives me useful feedback regularly.", min_label: "Strongly disagree", max_label: "Strongly agree" },
    { id: "q_growth", type: "scale", prompt: "My manager supports my career growth.", min_label: "Strongly disagree", max_label: "Strongly agree" },
    { id: "q_1on1", type: "choice", prompt: "How often do you have 1:1s with your manager?", options: ["Weekly", "Every two weeks", "Monthly", "Rarely or never"] },
    { id: "q_more", type: "text", prompt: "What could your manager do more of, or less of?", optional: true },
  ],
};
const SURVEY_TITLES = [SURVEY_ENPS.title, SURVEY_HYBRID.title, SURVEY_MANAGER.title];

const CHANGE_TEXT: Record<string, string[]> = {
  Engineering: [
    "Fix the on-call rotation. Three weekends in a row is not sustainable.",
    "Protect focus time — no meetings on Wednesday afternoons would help a lot.",
    "Stop adding scope mid-sprint without dropping something else.",
    "Hire for the platform team; we're covering two roles each.",
    "Clearer priorities from leadership. Everything is P0 right now.",
  ],
  Sales: [
    "Explain the new commission plan with worked examples. Nobody understands the accelerators.",
    "Publish territory changes before the quarter starts, not after.",
    "The CRM needs cleanup — we lose leads because of duplicate accounts.",
  ],
  "Customer Support": [
    "The new support console is a huge improvement — more of this please!",
    "Keep the macros library updated; it saves us so much time.",
    "Recognise the night shift more; they carry the weekend queue.",
  ],
  default: [
    "More visibility into how decisions are made.",
    "Career paths for individual contributors, not just managers.",
    "Keep the Friday demos — they're the best part of the week.",
    "Fewer tools, better integrated.",
  ],
};
const HYBRID_TEXT = [
  "Please make anchor days team-specific; our team never overlaps in the office.",
  "The policy says 'flexible' but my manager expects 4 days. Which one is it?",
  "Parking and desk booking are the real problem on Tuesdays.",
  "Two anchor days works well for deep work the rest of the week.",
  "A clear FAQ would help — people keep interpreting it differently.",
  "Home internet reimbursement would make remote days much smoother.",
];

const UPDATES = [
  {
    title: "Hybrid policy FAQ + team anchor days",
    body: "**You said:** the hybrid policy was being interpreted differently across teams, and office days rarely overlapped with your own team.\n\n**We did:**\n- Published a one-page hybrid FAQ on the intranet\n- Each team now picks **two anchor days** together\n- Managers can no longer require more than the policy minimum",
    theme: "Remote & Hybrid Work",
    department: null,
    feedback_count: 18,
    days: 2,
  },
  {
    title: "On-call is now a fair weekly rotation",
    body: "**You said:** weekend on-call was landing on the same few people and burning them out.\n\n**We did:** moved Engineering to a weekly rotation across all 4 squads, added a **comp day after every on-call week**, and set up a second-line escalation so nobody is paged alone at night.",
    theme: "Workload & Burnout",
    department: "Engineering",
    feedback_count: 15,
    days: 5,
  },
  {
    title: "Sales commission plan, explained",
    body: "**You said:** the new commission plan and accelerators were confusing.\n\n**We did:** ran two live walkthroughs, published a calculator with worked examples, and froze territory changes until the start of next quarter.",
    theme: "Compensation & Benefits",
    department: "Sales",
    feedback_count: 9,
    days: 12,
  },
  {
    title: "New support console rolled out to every agent",
    body: "**You said:** switching between four tools slowed down every ticket.\n\n**We did:** rolled out the unified support console with a shared macros library. Average handle time is down and the queue is calmer — thank you for the pilot feedback.",
    theme: "Tools & Resources",
    department: "Customer Support",
    feedback_count: 7,
    days: 30,
  },
];
const UPDATE_TITLES = UPDATES.map((u) => u.title);

// Wellbeing model: t = 0 (oldest) … 7 (this week)
function moodFor(dept: string, t: number) {
  switch (dept) {
    case "Engineering":
      return { mood: 3.9 - Math.max(0, t - 3) * 0.4, energy: 3.7 - Math.max(0, t - 3) * 0.45 };
    case "Customer Support":
      return { mood: 2.9 + t * 0.15, energy: 2.8 + t * 0.16 };
    case "Sales":
      return { mood: t === 5 || t === 6 ? 2.7 : 3.4, energy: t === 5 || t === 6 ? 2.9 : 3.3 };
    default:
      return { mood: 3.7, energy: 3.5 };
  }
}
const NOTES = [
  "Long week, too many late deploys.",
  "Good sprint, felt productive.",
  "On-call again this weekend…",
  "Team lunch was great.",
  "Tired but okay.",
];

// ── reset ───────────────────────────────────────────────────────
async function findUsers() {
  const users: { id: string; email?: string }[] = [];
  for (let page = 1; page < 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

async function reset(demoId: string | null) {
  const users = await findUsers();
  const seeded = users.filter((u) => u.email?.toLowerCase().endsWith("@vocalyze.demo") && u.email.toLowerCase() !== DEMO_EMAIL);
  for (const u of seeded) {
    const { error } = await db.auth.admin.deleteUser(u.id);
    if (error) throw new Error(`delete user ${u.email}: ${error.message}`);
  }
  await must(db.from("surveys").delete().in("title", SURVEY_TITLES), "delete surveys");
  await must(db.from("updates").delete().in("title", UPDATE_TITLES), "delete updates");
  const notifTitles = [...UPDATE_TITLES.map((t) => `You said, we did: ${t}`), `New survey: ${SURVEY_HYBRID.title}`, `New survey: ${SURVEY_ENPS.title}`];
  await must(db.from("notifications").delete().in("title", notifTitles), "delete broadcast notifications");
  if (demoId) {
    const hash = anonHash(demoId);
    await must(db.from("checkins").delete().eq("user_id", demoId), "delete demo checkins");
    await must(db.from("notifications").delete().eq("recipient_hash", hash), "delete demo notifications");
    await must(db.from("notification_reads").delete().eq("recipient_hash", hash), "delete demo reads");
    await must(db.from("feedback").delete().eq("source", "seed").eq("submitter_user_id", demoId), "delete demo feedback");
    await must(db.from("feedback").delete().eq("source", "seed").eq("submitter_hash", hash), "delete demo anon feedback");
  }
  console.log(`Reset: removed ${seeded.length} demo users and portal seed content.`);
}

// ── main ────────────────────────────────────────────────────────
async function main() {
  const allUsers = await findUsers();
  const demo = allUsers.find((u) => u.email?.toLowerCase() === DEMO_EMAIL) ?? null;
  await reset(demo?.id ?? null);
  if (onlyReset) return;

  if (!demo) {
    console.error(`Demo employee ${DEMO_EMAIL} not found — run \`npm run create-employee\` first.`);
    process.exitCode = 1;
    return;
  }
  const demoProfile = await must(db.from("employee_profiles").select("department").eq("user_id", demo.id).maybeSingle(), "demo profile");
  const demoDept = (demoProfile as { department: string | null } | null)?.department ?? "Engineering";
  const hrRow = await must(db.from("hr_profiles").select("user_id").limit(1).maybeSingle(), "hr profile");
  const hrId = (hrRow as { user_id: string } | null)?.user_id ?? null;

  // 1. Employees
  const employees: { id: string; name: string; dept: string }[] = [];
  for (const [name, dept] of PEOPLE) {
    const { data, error } = await db.auth.admin.createUser({
      email: emailFor(name),
      password: randomBytes(18).toString("base64url"),
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) throw new Error(`create ${name}: ${error.message}`);
    employees.push({ id: data.user.id, name, dept });
  }
  await must(
    db.from("employee_profiles").upsert(employees.map((e) => ({ user_id: e.id, full_name: e.name, department: e.dept }))),
    "profiles",
  );
  console.log(`Created ${employees.length} demo employees.`);

  // 2. Check-ins (8 weeks). Big teams always check in so their groups clear k ≥ 5.
  const checkins: Record<string, unknown>[] = [];
  const everyone = [...employees, { id: demo.id, name: "Demo employee", dept: demoDept, isDemo: true } as { id: string; name: string; dept: string; isDemo?: boolean }];
  for (let t = 0; t < 8; t++) {
    const weeksAgo = 7 - t;
    const week = isoWeekStart(new Date(Date.now() - weeksAgo * 7 * DAY));
    for (const e of everyone) {
      const isDemo = "isDemo" in e && e.isDemo;
      if (isDemo && weeksAgo === 0) continue; // leave this week for the live demo
      const bigTeam = ["Engineering", "Sales", "Customer Support"].includes(e.dept);
      if (!bigTeam && rand() > 0.75) continue;
      const base = moodFor(e.dept, t);
      checkins.push({
        user_id: e.id,
        week,
        mood: clamp(Math.round(base.mood + (rand() - 0.5) * 1.6), 1, 5),
        energy: clamp(Math.round(base.energy + (rand() - 0.5) * 1.6), 1, 5),
        note: rand() < 0.15 ? pick(NOTES) : null,
        department: e.dept,
        created_at: new Date(Math.min(new Date(`${week}T09:00:00Z`).getTime() + rand() * 4 * DAY, Date.now() - 60_000)).toISOString(),
      });
    }
  }
  await must(db.from("checkins").insert(checkins), "checkins");
  console.log(`Inserted ${checkins.length} check-ins.`);

  // 3. Surveys
  const [enpsSurvey, hybridSurvey] = (await must(
    db
      .from("surveys")
      .insert([
        { ...SURVEY_ENPS, status: "closed", created_by: hrId, created_at: daysAgo(45), published_at: daysAgo(42), closes_at: daysAgo(28) },
        { ...SURVEY_HYBRID, status: "active", created_by: hrId, created_at: daysAgo(4), published_at: daysAgo(3), closes_at: new Date(Date.now() + 10 * DAY).toISOString() },
        { ...SURVEY_MANAGER, status: "draft", created_by: hrId, created_at: daysAgo(1) },
      ])
      .select("id,title"),
    "surveys",
  )) as { id: string; title: string }[];

  function enpsAnswer(dept: string) {
    const i = rand();
    if (dept === "Engineering") return i < 0.6 ? 3 + Math.floor(rand() * 4) : 7 + Math.floor(rand() * 3);
    if (dept === "Customer Support") return i < 0.7 ? 9 + Math.floor(rand() * 2) : 7 + Math.floor(rand() * 2);
    if (dept === "Sales") return 5 + Math.floor(rand() * 4);
    return i < 0.5 ? 9 + Math.floor(rand() * 2) : 6 + Math.floor(rand() * 3);
  }
  const enpsResponses = everyone.map((e) => {
    const eng = e.dept === "Engineering";
    const answers: Record<string, number | string> = {
      q_enps: enpsAnswer(e.dept),
      q_valued: clamp(Math.round((eng ? 2.8 : e.dept === "Customer Support" ? 4.1 : 3.6) + (rand() - 0.5) * 2), 1, 5),
      q_workload: clamp(Math.round((eng ? 1.9 : e.dept === "Sales" ? 3 : 3.7) + (rand() - 0.5) * 1.6), 1, 5),
      q_improve: eng ? pick(["Clearer priorities", "Fewer meetings", "Clearer priorities"]) : e.dept === "Sales" ? pick(["Better tools", "Career growth", "Clearer priorities"]) : pick(["Career growth", "Flexible hours", "Fewer meetings", "Better tools"]),
    };
    if (rand() < 0.7) answers.q_change = pick(CHANGE_TEXT[e.dept] ?? CHANGE_TEXT.default);
    return {
      survey_id: enpsSurvey.id,
      respondent_hash: surveyHash(e.id, enpsSurvey.id),
      department: e.dept,
      answers,
      created_at: daysAgo(30 + rand() * 11, 9 + Math.floor(rand() * 9)),
    };
  });
  const hybridRespondents = [
    ...employees.filter((e) => e.dept === "Engineering"),
    ...employees.filter((e) => e.dept === "Sales"),
    ...employees.filter((e) => e.dept === "Customer Support").slice(0, 3),
  ];
  const hybridResponses = hybridRespondents.map((e) => {
    const answers: Record<string, number | string> = {
      q_policy: clamp(Math.round(2.4 + (rand() - 0.5) * 2.2), 1, 5),
      q_days: pick(["2 days", "2 days", "Fully flexible", "1 day", "3 days"]),
      q_home: clamp(Math.round(3.8 + (rand() - 0.5) * 1.8), 1, 5),
    };
    if (rand() < 0.65) answers.q_idea = pick(HYBRID_TEXT);
    return {
      survey_id: hybridSurvey.id,
      respondent_hash: surveyHash(e.id, hybridSurvey.id),
      department: e.dept,
      answers,
      created_at: daysAgo(rand() * 2.8, 9 + Math.floor(rand() * 9)),
    };
  });
  await must(db.from("survey_responses").insert([...enpsResponses, ...hybridResponses]), "survey responses");
  console.log(`Surveys: 3 (closed/active/draft) · ${enpsResponses.length} + ${hybridResponses.length} responses.`);

  // 4. Updates + broadcast notifications
  await must(
    db.from("updates").insert(
      UPDATES.map(({ days, ...u }) => ({ ...u, published_by: hrId, status: "published", created_at: daysAgo(days), published_at: daysAgo(days) })),
    ),
    "updates",
  );
  const broadcasts = [
    ...UPDATES.map((u) => ({
      recipient_hash: null,
      type: "update",
      title: `You said, we did: ${u.title}`,
      body: u.department ? `An update for ${u.department}.` : "A new update from the People team.",
      link: "/portal/updates",
      created_at: daysAgo(u.days),
    })),
    {
      recipient_hash: null,
      type: "survey",
      title: `New survey: ${SURVEY_HYBRID.title}`,
      body: "Takes about two minutes. Your answers are anonymous.",
      link: `/portal/surveys/${hybridSurvey.id}`,
      created_at: daysAgo(3),
    },
  ];

  // 5. Demo employee's own feedback (one identified, one anonymous) + personal notifications
  const demoHash = anonHash(demo.id);
  const [identified, anonymous] = (await must(
    db
      .from("feedback")
      .insert([
        {
          tracking_code: trackingCode(),
          channel: "text",
          source: "seed",
          language: "English",
          raw_text: "Could we publish the on-call rotation a month ahead? Right now we find out on Thursday that we're on call for the weekend, which makes it impossible to plan anything with family.",
          redacted_text: "Could we publish the on-call rotation a month ahead? Right now we find out on Thursday that we're on call for the weekend, which makes it impossible to plan anything with family.",
          department: demoDept,
          category: "Suggestion",
          is_anonymous: false,
          submitter_name: "Aarav Mehta",
          submitter_email: DEMO_EMAIL,
          submitter_user_id: demo.id,
          status: "actioned",
          hr_response: "Thanks Aarav — this was one of the most common requests. From next month the on-call rota is published four weeks ahead, and every on-call week comes with a comp day.",
          responded_at: daysAgo(5),
          processing_status: "done",
          sentiment: "mixed",
          sentiment_score: -0.2,
          emotions: ["frustrated", "hopeful"],
          themes: ["Workload & Burnout", "Work-Life Balance"],
          summary: "Employee asks for the on-call rotation to be published a month in advance to allow personal planning.",
          urgency: "medium",
          risk_flags: [],
          suggested_action: "Publish the on-call schedule four weeks ahead and review weekend load distribution.",
          created_at: daysAgo(9),
        },
        {
          tracking_code: trackingCode(),
          channel: "voice",
          source: "seed",
          language: "English",
          raw_text: null,
          redacted_text: "I spend most of my week in status meetings that could be a written update. By the time I get to actual engineering work it's evening and I'm exhausted.",
          department: demoDept,
          category: "Concern",
          is_anonymous: true,
          submitter_hash: demoHash,
          status: "in_review",
          processing_status: "done",
          sentiment: "negative",
          sentiment_score: -0.6,
          emotions: ["exhausted", "frustrated"],
          themes: ["Workload & Burnout", "Communication"],
          summary: "Employee reports excessive status meetings crowding out focused work and causing exhaustion.",
          urgency: "medium",
          risk_flags: ["burnout"],
          suggested_action: "Audit recurring status meetings in Engineering and replace some with async written updates.",
          created_at: daysAgo(3),
        },
      ])
      .select("id,tracking_code"),
    "demo feedback",
  )) as { id: string; tracking_code: string }[];

  const personal = [
    {
      recipient_hash: demoHash,
      type: "feedback_response",
      title: "HR responded to your feedback",
      body: "About publishing the on-call rotation a month ahead.",
      link: `/portal/feedback/${identified.id}`,
      created_at: daysAgo(5),
    },
    {
      recipient_hash: demoHash,
      type: "feedback_status",
      title: "Your feedback is now in review",
      body: "Your anonymous voice note about status meetings is being reviewed by HR.",
      link: `/portal/feedback/${anonymous.id}`,
      created_at: daysAgo(1),
    },
  ];
  await must(db.from("notifications").insert([...broadcasts, ...personal]), "notifications");
  console.log(`Updates: ${UPDATES.length} · notifications: ${broadcasts.length} broadcast + ${personal.length} personal · demo feedback: 2.`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
