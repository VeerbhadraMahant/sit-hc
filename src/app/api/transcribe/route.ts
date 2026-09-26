import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  if (!rateLimit(`transcribe:${clientIp(req)}`, 10)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart upload with an 'audio' field." }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "No audio received. Please record again." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Recording is too large (max 10 MB)." }, { status: 413 });
  }
  const mimeType = audio.type || "audio/webm";
  if (!mimeType.startsWith("audio/")) {
    return NextResponse.json({ error: "Unsupported audio format." }, { status: 415 });
  }

  try {
    const buf = Buffer.from(await audio.arrayBuffer());
    const result = await transcribeAudio(buf, mimeType);
    if (!result.transcript.trim()) {
      return NextResponse.json(
        { error: "We couldn't hear anything in that recording. Try again a little closer to the mic." },
        { status: 422 },
      );
    }
    return NextResponse.json({ transcript: result.transcript.trim(), language: result.language });
  } catch (err) {
    console.error("[api/transcribe]", err);
    return NextResponse.json(
      { error: "Transcription is temporarily unavailable. You can type your feedback instead." },
      { status: 502 },
    );
  }
}
