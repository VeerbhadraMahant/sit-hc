import { NextResponse } from "next/server";
import { z } from "zod";
import { extractFeedbackFromDocument, OCR_MIME_TYPES } from "@/lib/ai/ocr";
import { createFeedback } from "@/lib/pipeline";
import { getHrUser } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024;

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

async function ingest(text: string, channel: "ocr" | "text", department: string | null, language?: string | null): Promise<ImportedItem> {
  const { id, trackingCode, row } = await createFeedback({
    text,
    channel,
    source: "hr_import",
    department,
    isAnonymous: true,
    language: language ?? null,
  });
  return {
    id,
    trackingCode,
    summary: row?.summary ?? null,
    sentiment: row?.sentiment ?? null,
    urgency: row?.urgency ?? null,
    themes: row?.themes ?? null,
    processing: row?.processing_status ?? "pending",
    excerpt: text.slice(0, 140),
  };
}

/**
 * HR bulk ingestion.
 *  - multipart/form-data { file, department? } → OCR → one feedback per extracted entry
 *  - application/json { text, department? }    → one feedback (pasted CSV / lines)
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

      const items: ImportedItem[] = [];
      for (const e of entries) items.push(await ingest(e.text, "ocr", deptField ?? e.department, ocr.language));
      return NextResponse.json({ legibility: ocr.legibility, language: ocr.language, items });
    }

    const parsed = TextSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Feedback text is too short" }, { status: 400 });
    const item = await ingest(parsed.data.text, "text", parsed.data.department || null);
    return NextResponse.json({ items: [item] });
  } catch (err) {
    console.error("[import]", err);
    return NextResponse.json({ error: (err as Error).message ?? "Import failed" }, { status: 500 });
  }
}
