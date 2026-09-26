import { NextResponse } from "next/server";
import { extractFeedbackFromDocument, OCR_MIME_TYPES } from "@/lib/ai/ocr";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  if (!rateLimit(`ocr:${clientIp(req)}`, 10)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart upload with a 'file' field." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 10 MB)." }, { status: 413 });
  }
  const mimeType = file.type;
  if (!OCR_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: "Please upload a photo (PNG, JPG, WEBP, HEIC) or a PDF." }, { status: 415 });
  }

  try {
    const result = await extractFeedbackFromDocument(Buffer.from(await file.arrayBuffer()), mimeType);
    const items = result.items.filter((i) => i.text.trim());
    if (!items.length || result.legibility === "illegible") {
      return NextResponse.json(
        { error: "We couldn't read any text in that image. Try a sharper, well-lit photo." },
        { status: 422 },
      );
    }
    return NextResponse.json({ ...result, items });
  } catch (err) {
    console.error("[api/ocr]", err);
    return NextResponse.json(
      { error: "Text extraction is temporarily unavailable. You can type your feedback instead." },
      { status: 502 },
    );
  }
}
