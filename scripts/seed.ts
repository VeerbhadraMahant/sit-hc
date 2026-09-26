// Seeds realistic demo feedback with pre-computed analysis, then embeds it for semantic search.
//   npm run seed            → inserts demo data if none exists, then fills any missing embeddings
//   npm run seed -- --reset → deletes existing seed rows first
// Standalone: does not import app modules that are marked "server-only".
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";
import { config } from "dotenv";
import { SEED_ITEMS, type SeedItem } from "./seed-data";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiKey = process.env.GEMINI_API_KEY;
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const EMBED_DIM = 768;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const reset = process.argv.includes("--reset");

// Deterministic PRNG so the demo looks the same every time.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260926);

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const code = () => {
  const part = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `PLS-${part()}-${part()}`;
};

const DAY = 86400_000;

function createdAt(weeksAgo: number) {
  const now = Date.now();
  // Spread across the week; hours between 08:00 and 21:00 local-ish.
  const dayOffset = weeksAgo * 7 + rand() * 6.5;
  const t = new Date(now - dayOffset * DAY);
  t.setHours(8 + Math.floor(rand() * 13), Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
  return new Date(Math.min(t.getTime(), now - 10 * 60_000));
}

function defaultStatus(item: SeedItem) {
  if (item.status) return item.status;
  if (item.weeksAgo >= 6) return "closed";
  if (item.weeksAgo >= 3) return "in_review";
  return "new";
}

function defaultCategory(item: SeedItem) {
  if (item.category) return item.category;
  if (item.urgency === "critical") return "Report an issue";
  if (item.sentiment === "positive") return "Appreciation";
  if (item.sentiment === "negative") return "Concern";
  return "General";
}

function toRow(item: SeedItem) {
  const created = createdAt(item.weeksAgo);
  const identified = !!item.identified;
  const respondedAt = item.response ? new Date(Math.min(created.getTime() + (1 + rand() * 4) * DAY, Date.now())) : null;
  return {
    created_at: created.toISOString(),
    tracking_code: code(),
    channel: item.channel,
    source: "seed",
    language: item.language,
    // Anonymous submissions keep only the redacted English text (mirrors the live pipeline).
    raw_text: identified ? (item.raw ?? item.text) : null,
    redacted_text: item.text,
    department: item.dept,
    category: defaultCategory(item),
    is_anonymous: !identified,
    submitter_name: item.identified?.name ?? null,
    submitter_email: item.identified?.email ?? null,
    status: defaultStatus(item),
    hr_response: item.response ?? null,
    responded_at: respondedAt?.toISOString() ?? null,
    processing_status: "done",
    sentiment: item.sentiment,
    sentiment_score: item.score,
    emotions: item.emotions,
    themes: item.themes,
    summary: item.summary,
    urgency: item.urgency,
    risk_flags: item.flags,
    suggested_action: item.action,
  };
}

function normalize(v: number[]) {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

async function embedMissing() {
  if (!geminiKey) {
    console.warn("GEMINI_API_KEY not set — skipping embeddings (Ask AI will fall back to recent feedback).");
    return;
  }
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const { data, error } = await db
    .from("feedback")
    .select("id, summary, redacted_text")
    .is("embedding", null)
    .eq("processing_status", "done")
    .not("redacted_text", "is", null)
    .limit(2000);
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) {
    console.log("All rows already have embeddings.");
    return;
  }
  console.log(`Embedding ${rows.length} rows with ${EMBED_MODEL}…`);

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    let res;
    for (let attempt = 0; ; attempt++) {
      try {
        res = await ai.models.embedContent({
          model: EMBED_MODEL,
          contents: batch.map((r) => `${r.summary ?? ""}\n${r.redacted_text ?? ""}`),
          config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: EMBED_DIM },
        });
        break;
      } catch (err) {
        if (attempt >= 5) throw err;
        // Free tier counts every text in a batch as one request (100/min), so a 429 means
        // waiting out the minute: honour the server's retryDelay when present.
        const hint = /retry in ([\d.]+)s/i.exec(String((err as Error).message))?.[1];
        const wait = hint ? Math.ceil(Number(hint) + 2) * 1000 : 2000 * 2 ** attempt;
        console.warn(`  embed batch failed (${(err as Error).message?.slice(0, 80)}), retrying in ${wait / 1000}s`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    const vectors = (res.embeddings ?? []).map((e) => normalize(e.values ?? []));
    if (vectors.length !== batch.length) throw new Error("Embedding count mismatch");

    // Update with modest concurrency.
    const queue = batch.map((r, j) => ({ id: r.id, v: vectors[j] }));
    await Promise.all(
      Array.from({ length: 8 }, async () => {
        for (let job = queue.shift(); job; job = queue.shift()) {
          const { error: upErr } = await db
            .from("feedback")
            .update({ embedding: `[${job.v.join(",")}]` })
            .eq("id", job.id);
          if (upErr) throw upErr;
        }
      }),
    );
    console.log(`  embedded ${Math.min(i + 100, rows.length)}/${rows.length}`);
  }
}

async function main() {
  if (reset) {
    const { error, count } = await db.from("feedback").delete({ count: "exact" }).eq("source", "seed");
    if (error) throw error;
    console.log(`Removed ${count ?? 0} existing seed rows.`);
  }

  const { count: existing, error: countErr } = await db
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("source", "seed");
  if (countErr) throw countErr;

  if (existing && existing > 0) {
    console.log(`${existing} seed rows already present — skipping insert (use --reset to recreate).`);
  } else {
    const rows = SEED_ITEMS.map(toRow);
    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await db.from("feedback").insert(rows.slice(i, i + 50));
      if (error) throw error;
    }
    console.log(`Inserted ${rows.length} demo feedback items.`);
  }

  await embedMissing();

  const { count: total } = await db.from("feedback").select("id", { count: "exact", head: true });
  console.log(`Done. feedback rows in database: ${total}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
