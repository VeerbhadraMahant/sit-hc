"use client";

import { Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const MAX_SECONDS = 180;

type Phase = "idle" | "recording" | "transcribing" | "review" | "error";

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function VoiceRecorder({
  transcript,
  onTranscript,
  onLanguage,
}: {
  transcript: string;
  onTranscript: (t: string) => void;
  onLanguage: (l: string | null) => void;
}) {
  const [phase, setPhase] = useState<Phase>(transcript ? "review" : "idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording isn't supported in this browser. Please use the Write tab.");
      setPhase("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => void handleStop(rec.mimeType || mimeType || "audio/webm");
      rec.start(250);
      recorderRef.current = rec;
      setSeconds(0);
      setPhase("recording");
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Microphone access was blocked. Allow it in your browser settings, or use the Write tab.");
      setPhase("error");
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function handleStop(mimeType: string) {
    const blob = new Blob(chunksRef.current, { type: mimeType });
    if (blob.size < 1000) {
      setError("That recording was too short. Try again.");
      setPhase("error");
      return;
    }
    setAudioUrl(URL.createObjectURL(blob));
    setPhase("transcribing");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "voice-note");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed.");
      onTranscript(data.transcript);
      setLanguage(data.language);
      onLanguage(data.language);
      setPhase("review");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }

  function reset() {
    setAudioUrl(null);
    setLanguage(null);
    onLanguage(null);
    onTranscript("");
    setSeconds(0);
    setError("");
    setPhase("idle");
  }

  return (
    <div>
      {(phase === "idle" || phase === "recording" || phase === "error") && (
        <div className="flex flex-col items-center rounded-smallcards border border-dashed border-edge bg-white/60 px-4 py-10 text-center">
          <div className="relative flex size-24 items-center justify-center">
            {phase === "recording" && (
              <>
                <span className="animate-pulse-ring absolute inset-0 rounded-full bg-lime" aria-hidden />
                <span className="animate-pulse-ring absolute inset-0 rounded-full bg-lime [animation-delay:0.7s]" aria-hidden />
              </>
            )}
            <button
              type="button"
              onClick={phase === "recording" ? stop : start}
              aria-label={phase === "recording" ? "Stop recording" : "Start recording"}
              className={cn(
                "relative flex size-20 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cobalt",
                phase === "recording" ? "bg-carbon text-paper" : "bg-lime text-obsidian shadow-bead",
              )}
            >
              {phase === "recording" ? <Square className="size-7 fill-current" /> : <Mic className="size-8" />}
            </button>
          </div>
          <p className="mt-5 font-mono text-2xl text-obsidian tabular-nums" aria-live="polite">
            {fmt(seconds)} <span className="text-base text-pewter">/ {fmt(MAX_SECONDS)}</span>
          </p>
          <p className="mt-2 max-w-sm text-sm text-pewter">
            {phase === "recording"
              ? "Recording… speak naturally, in any language. Tap stop when you're done."
              : "Tap the mic and speak in any language. You'll review the transcript before sending. The audio itself is never stored."}
          </p>
          {error && (
            <p role="alert" className="mt-4 text-sm text-critical">
              {error}
            </p>
          )}
        </div>
      )}

      {phase === "transcribing" && (
        <div className="flex flex-col items-center rounded-smallcards border border-dashed border-edge bg-white/60 px-4 py-12 text-center">
          <Loader2 className="size-8 animate-spin text-ink" aria-hidden />
          <p className="mt-4 font-medium text-ink" aria-live="polite">
            Transcribing your voice note…
          </p>
          <p className="mt-1 text-sm text-pewter">Usually a few seconds.</p>
        </div>
      )}

      {phase === "review" && (
        <div className="space-y-4">
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full" />
          )}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="transcript" className="text-sm font-medium text-ink">
                Transcript <span className="font-normal text-pewter">— edit anything we misheard</span>
              </label>
              {language && <span className="eyebrow !leading-none">{language}</span>}
            </div>
            <Textarea
              id="transcript"
              value={transcript}
              onChange={(e) => onTranscript(e.target.value)}
              maxLength={5000}
            />
          </div>
          <Button type="button" variant="subtle" size="sm" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden /> Record again
          </Button>
        </div>
      )}
    </div>
  );
}
