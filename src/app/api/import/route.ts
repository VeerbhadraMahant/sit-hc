import { after, NextResponse } from "next/server";
import { z } from "zod";
import { extractFeedbackFromDocument, OCR_MIME_TYPES } from "@/lib/ai/ocr";
import { createFeedback, processFeedback } from "@/lib/pipeline";
import { createClient, getHrUser } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024;
/** Parallel AI analyses per request — keeps Gemini free-tier rate limits happy. */
const CONCURRENCY = 3;

const TextSchema = z.object({
  text: z.string().trim().min(3).max(8000),
  department: z.string().trim().max(80).nullable().optional(),
});

type ImportedItem = {
  id: string;
  trackingCode: string;
  summary: string | null;
  sentiment: string | null;
  urgency: string | null;
  themes: string[] | null;
  processing: string;
  excerpt: string;
};

/** Runs fn over items with at most `limit` in flight, preserving result order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/** Stores one entry and returns immediately; analysis is scheduled separately. */
async function store(text: string, channel: "ocr" | "text", department: string | null, language?: string | null): Promise<ImportedItem> {
  const { id, trackingCode } = await createFeedback({
    text,
    channel,
    source: "hr_import",
    department,
    isAnonymous: true,
    language: language ?? null,
    analyze: "background",
  });
  return { id, trackingCode, summary: null, sentiment: null, urgency: null, themes: null, processing: "pending", excerpt: text.slice(0, 140) };
}

/** Analyse after the response is sent, CONCURRENCY at a time. */
function analyzeLater(ids: string[]) {
  after(() => mapLimit(ids, CONCURRENCY, (id) => processFeedback(id)).then(() => undefined));
}

/**
 * HR bulk ingestion. Responds as soon as entries are stored; AI analysis runs afterwards.
 *  - multipart/form-data { file, department? } → OCR → one feedback per extracted entry
 *  - application/json { text, department? }    → one feedback (pasted CSV / lines)
 * Poll GET /api/import?ids=a,b for analysis results.
 */
export async function POST(req: Request) {
  const user = await getHrUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const deptField = String(form.get("department") ?? "").trim() || null;
      if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is larger than 15 MB" }, { status: 413 });
      const mime = file.type || "application/octet-stream";
      if (!OCR_MIME_TYPES.includes(mime))
        return NextResponse.json({ error: `Unsupported file type ${mime}. Use PNG, JPG, WEBP, HEIC or PDF.` }, { status: 415 });

      const ocr = await extractFeedbackFromDocument(Buffer.from(await file.arrayBuffer()), mime);
      const entries = ocr.items.filter((i) => i.text.replace(/\[illegible\]/g, "").trim().length >= 3);
      if (ocr.legibility === "illegible" || entries.length === 0)
        return NextResponse.json({ legibility: ocr.legibility, items: [], warning: "No readable feedback found in this document." });

      const items = await mapLimit(entries, CONCURRENCY, (e) => store(e.text, "ocr", deptField ?? e.department, ocr.language));
      analyzeLater(items.map((i) => i.id));
      return NextResponse.json({ legibility: ocr.legibility, language: ocr.language, items });
    }

    const parsed = TextSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Feedback text is too short" }, { status: 400 });
    const item = await store(parsed.data.text, "text", parsed.data.department || null);
    analyzeLater([item.id]);
    return NextResponse.json({ items: [item] });
  } catch (err) {
    console.error("[import]", err);
    return NextResponse.json({ error: (err as Error).message ?? "Import failed" }, { status: 500 });
  }
}

const IdsSchema = z.array(z.string().uuid()).min(1).max(100);

/** Analysis status for imported items: GET /api/import?ids=uuid,uuid */
export async function GET(req: Request) {
  const user = await getHrUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = IdsSchema.safeParse((new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean));
  if (!parsed.success) return NextResponse.json({ error: "Pass ids=uuid,uuid" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("id,summary,sentiment,urgency,themes,processing_status")
    .in("id", parsed.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    items: (data ?? []).map((r) => ({
      id: r.id as string,
      summary: r.summary as string | null,
      sentiment: r.sentiment as string | null,
      urgency: r.urgency as string | null,
      themes: r.themes as string[] | null,
      processing: r.processing_status as string,
    })),
  });
}
