// Creates two memorable, judge-facing demo accounts on top of the existing seed data:
//   developer_hr@vocalyze.demo        — HR console access
//   developer_employee@vocalyze.demo  — employee portal, with its own feedback history,
//                                        a check-in trend, and the active survey left
//                                        unanswered so it can be answered live.
// Safe to re-run: upserts the accounts/profiles and only inserts personal seed data once.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { createHmac, randomInt } from "node:crypto";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = process.env.ANON_LINK_SECRET;
const HR_EMAIL = process.env.DEV_HR_EMAIL;
const HR_PASSWORD = process.env.DEV_HR_PASSWORD;
const EMP_EMAIL = process.env.DEV_EMPLOYEE_EMAIL;
const EMP_PASSWORD = process.env.DEV_EMPLOYEE_PASSWORD;
if (!url || !serviceKey || !secret || !HR_EMAIL || !HR_PASSWORD || !EMP_EMAIL || !EMP_PASSWORD) {
  console.error(
    "Missing one of NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANON_LINK_SECRET, DEV_HR_EMAIL, DEV_HR_PASSWORD, DEV_EMPLOYEE_EMAIL, DEV_EMPLOYEE_PASSWORD in .env.local",
  );
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const EMP_NAME = "Dev Employee";
const EMP_DEPT = "Engineering";

const anonHash = (userId, scope = "employee") => createHmac("sha256", secret).update(`${scope}:${userId}`).digest("hex");
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const trackingCode = () => {
  const part = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `VOC-${part()}-${part()}`;
};
const DAY = 86_400_000;
const daysAgo = (d, hour = 10) => {
  const t = new Date(Date.now() - d * DAY);
  t.setHours(hour, 15, 0, 0);
  return new Date(Math.min(t.getTime(), Date.now() - 5 * 60_000)).toISOString();
};
function isoWeekStart(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

async function must(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function upsertUser(email, password, fullName) {
  const { data: list, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (user) {
    const { error: updErr } = await db.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (updErr) throw updErr;
  } else {
    const { data, error: createErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createErr) throw createErr;
    user = data.user;
  }
  return user;
}

async function main() {
  // ── HR account ────────────────────────────────────────────────
  const hrUser = await upsertUser(HR_EMAIL, HR_PASSWORD, "Dev HR");
  await must(db.from("hr_profiles").upsert({ user_id: hrUser.id, full_name: "Dev HR", role: "hr_admin" }), "hr_profiles");
  console.log(`HR account ready: ${HR_EMAIL}`);

  // ── Employee account ─────────────────────────────────────────
  const empUser = await upsertUser(EMP_EMAIL, EMP_PASSWORD, EMP_NAME);
  await must(
    db.from("employee_profiles").upsert({ user_id: empUser.id, full_name: EMP_NAME, department: EMP_DEPT }),
    "employee_profiles",
  );
  console.log(`Employee account ready: ${EMP_EMAIL}`);

  const hash = anonHash(empUser.id);

  // Personal feedback history (only seed once — skip if this account already has any).
  const { count: existingFeedback } = await db
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .or(`submitter_user_id.eq.${empUser.id},submitter_hash.eq.${hash}`);

  if (!existingFeedback) {
    const [identified, anon, pending] = await must(
      db
        .from("feedback")
        .insert([
          {
            tracking_code: trackingCode(),
            channel: "text",
            source: "seed",
            language: "English",
            raw_text:
              "The new CI pipeline cut our build times in half. Would love to see the same investment go into flaky test cleanup next.",
            redacted_text:
              "The new CI pipeline cut our build times in half. Would love to see the same investment go into flaky test cleanup next.",
            department: EMP_DEPT,
            category: "Appreciation",
            is_anonymous: false,
            submitter_name: EMP_NAME,
            submitter_email: EMP_EMAIL,
            submitter_user_id: empUser.id,
            status: "actioned",
            hr_response:
              "Thank you — glad the pipeline work is paying off! Flaky-test cleanup is now on the roadmap for next sprint; we'll share a tracking board in #eng-quality.",
            responded_at: daysAgo(4),
            processing_status: "done",
            sentiment: "positive",
            sentiment_score: 0.6,
            emotions: ["grateful", "hopeful"],
            themes: ["Tools & Resources", "Recognition"],
            summary: "Employee praises faster CI builds and requests investment in flaky test cleanup next.",
            urgency: "low",
            risk_flags: [],
            suggested_action: "Prioritise flaky-test cleanup in the next sprint and share progress publicly.",
            created_at: daysAgo(10),
          },
          {
            tracking_code: trackingCode(),
            channel: "voice",
            source: "seed",
            language: "English",
            raw_text: null,
            redacted_text:
              "Our on-call rotation only covers five people and it's been three weekends in a row for me. I'm exhausted and starting to dread Fridays.",
            department: EMP_DEPT,
            category: "Concern",
            is_anonymous: true,
            submitter_hash: hash,
            status: "in_review",
            processing_status: "done",
            sentiment: "negative",
            sentiment_score: -0.55,
            emotions: ["exhausted", "anxious"],
            themes: ["Workload & Burnout", "Work-Life Balance"],
            summary: "Employee reports repeated back-to-back on-call weekends causing exhaustion.",
            urgency: "high",
            risk_flags: ["burnout"],
            suggested_action: "Expand the on-call rotation and cap consecutive on-call weekends per person.",
            created_at: daysAgo(2),
          },
          {
            tracking_code: trackingCode(),
            channel: "text",
            source: "seed",
            language: "English",
            raw_text: null,
            redacted_text:
              "Could the team lead role rotate periodically? The same person has run every sprint planning for over a year.",
            department: EMP_DEPT,
            category: "Suggestion",
            is_anonymous: true,
            submitter_hash: hash,
            status: "new",
            processing_status: "done",
            sentiment: "neutral",
            sentiment_score: -0.05,
            emotions: ["curious"],
            themes: ["Management & Leadership", "Career Growth"],
            summary: "Employee suggests rotating the sprint-planning lead role periodically.",
            urgency: "low",
            risk_flags: [],
            suggested_action: "Consider a rotating facilitation schedule for sprint planning.",
            created_at: daysAgo(0.3),
          },
        ])
        .select("id,tracking_code"),
      "employee feedback",
    );

    await must(
      db.from("notifications").insert([
        {
          recipient_hash: hash,
          type: "feedback_response",
          title: "HR responded to your feedback",
          body: "About the CI pipeline and flaky-test cleanup.",
          link: `/portal/feedback/${identified.id}`,
          created_at: daysAgo(4),
        },
        {
          recipient_hash: hash,
          type: "feedback_status",
          title: "Your feedback is now in review",
          body: "Your anonymous voice note about on-call load is being reviewed by HR.",
          link: `/portal/feedback/${anon.id}`,
          created_at: daysAgo(2),
        },
      ]),
      "notifications",
    );
    console.log(`Inserted 3 feedback items (${identified.tracking_code}, ${anon.tracking_code}, ${pending.tracking_code}) + 2 notifications.`);
  } else {
    console.log(`Feedback history already present (${existingFeedback} items) — left as is.`);
  }

  // Check-in trend for the last 8 weeks, deliberately skipping the current week
  // so a live check-in can be demoed.
  const { count: existingCheckins } = await db
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", empUser.id);

  if (!existingCheckins) {
    const trend = [3, 3, 4, 3, 2, 3, 4, 4]; // a believable dip-and-recover story
    const rows = trend.map((mood, i) => {
      const weeksAgo = trend.length - i; // oldest first, current week (0) intentionally excluded
      return {
        user_id: empUser.id,
        week: isoWeekStart(new Date(Date.now() - weeksAgo * 7 * DAY)),
        mood,
        energy: Math.max(1, Math.min(5, mood + (i % 2 === 0 ? -1 : 0))),
        note: i === 4 ? "Rough sprint, on-call twice in a row." : null,
        department: EMP_DEPT,
        created_at: daysAgo(weeksAgo * 7 - 1),
      };
    });
    await must(db.from("checkins").insert(rows), "checkins");
    console.log(`Inserted ${rows.length} check-ins (this week left open for a live demo).`);
  } else {
    console.log(`Check-in history already present (${existingCheckins} weeks) — left as is.`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
