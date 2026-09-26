"use client";

import { Camera, FileText, Loader2, RotateCcw, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type OcrItem = { text: string; department: string | null; handwritten: boolean };
type OcrResponse = { items: OcrItem[]; language: string; legibility: "clear" | "partial" | "illegible" };

const MAX_BYTES = 10 * 1024 * 1024;

export function ScanUpload({
  text,
  onText,
  onLanguage,
  onDepartment,
}: {
  text: string;
  onText: (t: string) => void;
  onLanguage: (l: string | null) => void;
  onDepartment: (d: string | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OcrResponse | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function handleFile(f: File) {
    setError("");
    if (f.size > MAX_BYTES) return setError("That file is larger than 10 MB.");
    if (!f.type.startsWith("image/") && f.type !== "application/pdf") return setError("Please upload a photo or a PDF.");
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/ocr", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read that document.");
      const r = data as OcrResponse;
      setResult(r);
      const all = r.items.map((_, i) => i);
      setSelected(all);
      applySelection(r, all);
      onLanguage(r.language);
      const dept = r.items.find((i) => i.department)?.department ?? null;
      if (dept) onDepartment(dept);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function applySelection(r: OcrResponse, idx: number[]) {
    onText(
      idx
        .sort((a, b) => a - b)
        .map((i) => r.items[i].text.trim())
        .join("\n\n"),
    );
  }

  function toggle(i: number) {
    if (!result) return;
    const next = selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i];
    setSelected(next);
    applySelection(result, next);
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setSelected([]);
    setError("");
    onText("");
    onLanguage(null);
  }

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = "";
  };

  if (!file) {
    return (
      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className={cn(
            "flex flex-col items-center rounded-smallcards border border-dashed px-4 py-10 text-center transition-colors",
            dragging ? "border-cobalt bg-mist" : "border-edge bg-white/60",
          )}
        >
          <span className="flex size-14 items-center justify-center rounded-smallcards bg-mist text-ink">
            <FileText className="size-6" aria-hidden />
          </span>
          <p className="mt-4 font-medium text-ink">Photograph or upload a handwritten note</p>
          <p className="mt-1 max-w-sm text-sm text-pewter">
            Suggestion slips, paper survey forms, letters — handwritten or printed, any language. PNG, JPG, HEIC or PDF up to
            10 MB.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button type="button" variant="dark" size="sm" onClick={() => cameraRef.current?.click()}>
              <Camera className="size-4" aria-hidden /> Take photo
            </Button>
            <Button type="button" variant="subtle" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" aria-hidden /> Upload file
            </Button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPick} tabIndex={-1} aria-hidden />
          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={onPick} tabIndex={-1} aria-hidden />
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-critical">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 rounded-smallcards border border-mist bg-white/60 p-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Uploaded note" className="size-20 shrink-0 rounded-images object-cover shadow-screenshot" />
        ) : (
          <span className="flex size-20 shrink-0 items-center justify-center rounded-images bg-mist">
            <FileText className="size-7 text-ink" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{file.name}</p>
          <p className="text-xs text-pewter">{(file.size / 1024).toFixed(0)} KB</p>
          {busy && (
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-ink" aria-live="polite">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Reading the handwriting…
            </p>
          )}
          {result && (
            <p className="mt-2 text-sm text-pewter">
              {result.items.length} {result.items.length === 1 ? "entry" : "entries"} found · {result.language}
              {result.legibility === "partial" && " · some words were hard to read"}
            </p>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={reset} aria-label="Remove file">
          <RotateCcw className="size-4" aria-hidden />
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}

      {result && result.items.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">
            Several entries were found — choose which to include
          </legend>
          <div className="space-y-2">
            {result.items.map((item, i) => (
              <label
                key={i}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-smallcards p-3 text-sm shadow-field",
                  selected.includes(i) ? "bg-white" : "bg-paper opacity-70",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(i)}
                  onChange={() => toggle(i)}
                  className="mt-0.5 size-4 accent-[#151720]"
                />
                <span className="line-clamp-3 text-ink">{item.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {result && (
        <div>
          <label htmlFor="ocr-text" className="mb-2 block text-sm font-medium text-ink">
            Extracted text <span className="font-normal text-pewter">— correct anything we misread</span>
          </label>
          <Textarea id="ocr-text" value={text} onChange={(e) => onText(e.target.value)} maxLength={5000} />
        </div>
      )}
    </div>
  );
}
