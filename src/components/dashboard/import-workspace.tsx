"use client";

import { CheckCircle2, FileImage, FileText, Loader2, ScanText, TableProperties, TriangleAlert, Upload, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SentimentBadge, UrgencyBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Label, Select, Textarea } from "@/components/ui/field";
import { PillTabs } from "@/components/ui/pill-tabs";
import { DEPARTMENTS, type Sentiment, type Urgency } from "@/lib/types";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  trackingCode: string;
  summary: string | null;
  sentiment: Sentiment | null;
  urgency: Urgency | null;
  themes: string[] | null;
  processing: string;
  excerpt: string;
};

type Job = {
  key: string;
  label: string;
  kind: "file" | "text";
  status: "queued" | "running" | "done" | "error";
  items: Item[];
  message?: string;
};

const ACCEPT = "image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf";
/** Uploads in flight at once. The server stores entries and analyses them after responding. */
const CONCURRENCY = 3;
const POLL_MS = 3000;

/** Runs fn over items with at most `limit` in flight. */
async function eachLimit<T>(items: T[], limit: number, fn: (item: T, index: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    }),
  );
}

/** Minimal CSV line splitter that respects double quotes. */
function splitCsv(line: string) {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const deptLookup = new Map(DEPARTMENTS.map((d) => [d.toLowerCase(), d as string]));

export function parseLines(input: string): { text: string; department: string | null }[] {
  return input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l, i) => !(i === 0 && /^"?(department|dept)"?\s*,/i.test(l)))
    .map((line) => {
      const cols = splitCsv(line);
      if (cols.length >= 2) {
        const deptIdx = cols.findIndex((c) => deptLookup.has(c.toLowerCase()));
        if (deptIdx >= 0) {
          const text = cols.filter((_, i) => i !== deptIdx).join(", ").trim();
          return { text, department: deptLookup.get(cols[deptIdx].toLowerCase())! };
        }
      }
      return { text: line.replace(/^"|"$/g, ""), department: null };
    })
    .filter((r) => r.text.length >= 3);
}

export function ImportWorkspace() {
  const [tab, setTab] = useState<"scan" | "paste">("scan");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [department, setDepartment] = useState("");
  const [pasted, setPasted] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateJob = (key: string, patch: Partial<Job>) => setJobs((js) => js.map((j) => (j.key === key ? { ...j, ...patch } : j)));

  // Poll analysis results for items that were stored but not yet analysed.
  const pendingIds = jobs.flatMap((j) => j.items.filter((it) => it.processing === "pending").map((it) => it.id));
  const pendingKey = pendingIds.join(",");
  useEffect(() => {
    if (!pendingKey) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/import?ids=${pendingKey.split(",").slice(0, 100).join(",")}`, { cache: "no-store" });
        if (!res.ok) return;
        const { items } = (await res.json()) as { items: (Partial<Item> & { id: string })[] };
        const byId = new Map(items.map((i) => [i.id, i]));
        setJobs((js) =>
          js.map((j) => ({
            ...j,
            items: j.items.map((it) => {
              const u = byId.get(it.id);
              return u ? { ...it, ...u, processing: u.processing ?? it.processing } : it;
            }),
          })),
        );
      } catch {
        /* transient — next tick retries */
      }
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [pendingKey, jobs]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((f) => [...f, ...Array.from(list).filter((x) => ACCEPT.split(",").includes(x.type))].slice(0, 25));
  }

  async function runScan() {
    const queue: Job[] = files.map((f, i) => ({
      key: `${Date.now()}-${i}`,
      label: f.name,
      kind: "file",
      status: "queued",
      items: [],
    }));
    setJobs((j) => [...queue, ...j]);
    setRunning(true);
    const toSend = files;
    setFiles([]);
    await eachLimit(toSend, CONCURRENCY, async (file, i) => {
      const job = queue[i];
      updateJob(job.key, { status: "running" });
      try {
        const body = new FormData();
        body.set("file", file);
        if (department) body.set("department", department);
        const res = await fetch("/api/import", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Import failed");
        updateJob(job.key, {
          status: json.items.length ? "done" : "error",
          items: json.items,
          message: json.warning ?? (json.legibility === "partial" ? "Partly legible — review the extracted text" : undefined),
        });
      } catch (e) {
        updateJob(job.key, { status: "error", message: (e as Error).message });
      }
    });
    setRunning(false);
  }

  async function runPaste() {
    const rows = parseLines(pasted).slice(0, 200);
    if (!rows.length) return;
    const queue: Job[] = rows.map((r, i) => ({
      key: `${Date.now()}-p${i}`,
      label: r.text.length > 70 ? r.text.slice(0, 70) + "…" : r.text,
      kind: "text",
      status: "queued",
      items: [],
    }));
    setJobs((j) => [...queue, ...j]);
    setRunning(true);
    setPasted("");
    await eachLimit(rows, CONCURRENCY, async (row, i) => {
      const job = queue[i];
      updateJob(job.key, { status: "running" });
      try {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: row.text, department: row.department ?? (department || null) }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Import failed");
        updateJob(job.key, { status: "done", items: json.items });
      } catch (e) {
        updateJob(job.key, { status: "error", message: (e as Error).message });
      }
    });
    setRunning(false);
  }

  const done = jobs.filter((j) => j.status === "done" || j.status === "error").length;
  const created = jobs.reduce((n, j) => n + j.items.length, 0);
  const parsedCount = tab === "paste" ? parseLines(pasted).length : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card glow="cyan" arc>
        <PillTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "scan", label: <><ScanText className="size-4" aria-hidden /> Scan documents</> },
            { value: "paste", label: <><TableProperties className="size-4" aria-hidden /> Paste text / CSV</> },
          ]}
        />

        <div className="mt-6">
          <Label htmlFor="import-dept">Department (optional — overrides what&apos;s on the form)</Label>
          <Select id="import-dept" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">Detect from document / leave blank</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </div>

        {tab === "scan" ? (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "grid-paper flex w-full cursor-pointer flex-col items-center justify-center rounded-cards border-2 border-dashed px-6 py-10 text-center transition-colors",
                dragging ? "border-cobalt bg-white" : "border-edge hover:border-pewter",
              )}
            >
              <span className="inline-flex size-12 items-center justify-center rounded-smallcards bg-carbon">
                <Upload className="size-5 text-lime" aria-hidden />
              </span>
              <span className="mt-3 font-medium text-ink">Drop photos or scans here, or click to browse</span>
              <span className="mt-1 text-sm text-pewter">PNG, JPG, WEBP, HEIC or PDF · up to 25 files · 15 MB each</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {files.length > 0 && (
              <ul className="mt-4 space-y-2">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-smallcards bg-white px-3 py-2 text-sm shadow-[rgba(29,33,48,0.06)_0_0_0_1px]">
                    {f.type === "application/pdf" ? <FileText className="size-4 text-pewter" aria-hidden /> : <FileImage className="size-4 text-pewter" aria-hidden />}
                    <span className="truncate text-ink">{f.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-pewter">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                    <button
                      type="button"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                      className="cursor-pointer rounded-full p-1 text-pewter hover:bg-mist hover:text-ink"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button className="mt-5 w-full" size="lg" disabled={!files.length || running} onClick={runScan}>
              {running ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ScanText className="size-4" aria-hidden />}
              Read & analyse {files.length ? `${files.length} file${files.length > 1 ? "s" : ""}` : "files"}
            </Button>
          </div>
        ) : (
          <div className="mt-5">
            <Label htmlFor="paste">One feedback per line. Optional CSV with a department column.</Label>
            <Textarea
              id="paste"
              className="min-h-56 font-mono text-sm"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={`department,feedback\nEngineering,"On-call rotations are burning people out"\nSales,Targets for Q3 feel unrealistic given the new pricing\nThe new cafeteria menu is great!`}
            />
            <Button className="mt-5 w-full" size="lg" disabled={!parsedCount || running} onClick={runPaste}>
              {running && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Analyse {parsedCount || ""} {parsedCount === 1 ? "entry" : "entries"}
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          eyebrow="Results"
          title={jobs.length ? `${created} feedback item${created === 1 ? "" : "s"} created` : "Nothing imported yet"}
          action={
            jobs.length > 0 && (
              <span className="text-sm text-pewter tabular-nums" aria-live="polite">
                {done}/{jobs.length} processed
              </span>
            )
          }
        />
        {pendingIds.length > 0 && (
          <p className="-mt-2 mb-3 flex items-center gap-1.5 text-xs text-pewter" aria-live="polite">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> AI is analysing {pendingIds.length} item
            {pendingIds.length === 1 ? "" : "s"} in the background…
          </p>
        )}
        {jobs.length > 0 && (
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={done} aria-valuemax={jobs.length}>
            <div className="h-full rounded-full bg-cobalt transition-[width]" style={{ width: `${(done / jobs.length) * 100}%` }} />
          </div>
        )}
        {jobs.length === 0 ? (
          <p className="text-pewter">
            Each document is read with AI OCR, split into individual pieces of feedback, then analysed for sentiment, themes and
            risk — exactly like online submissions.
          </p>
        ) : (
          <ul className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {jobs.map((j) => (
              <li key={j.key} className="rounded-smallcards border border-mist p-3">
                <div className="flex items-center gap-2 text-sm">
                  {j.status === "running" || j.status === "queued" ? (
                    <Loader2 className={cn("size-4 shrink-0 text-pewter", j.status === "running" && "animate-spin")} aria-hidden />
                  ) : j.status === "done" ? (
                    <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--status-good)" }} aria-hidden />
                  ) : (
                    <TriangleAlert className="size-4 shrink-0" style={{ color: "var(--status-serious)" }} aria-hidden />
                  )}
                  <span className="truncate font-medium text-ink">{j.label}</span>
                  <span className="ml-auto shrink-0 text-xs text-pewter capitalize">
                    {j.status === "done" && j.kind === "file" ? `${j.items.length} found` : j.status}
                  </span>
                </div>
                {j.message && <p className="mt-1 text-xs text-pewter">{j.message}</p>}
                {j.items.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {j.items.map((it) => (
                      <li key={it.id}>
                        <Link href={`/dashboard/feedback?id=${it.id}`} className="block rounded-lg bg-white px-3 py-2 hover:bg-mist/60">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {it.processing === "pending" ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-mist bg-paper px-2.5 py-0.5 text-xs font-medium text-pewter">
                                <Loader2 className="size-3 animate-spin" aria-hidden /> Analyzing…
                              </span>
                            ) : it.processing === "failed" ? (
                              <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium text-ink">Analysis failed</span>
                            ) : (
                              <>
                                <UrgencyBadge urgency={it.urgency} />
                                <SentimentBadge sentiment={it.sentiment} />
                              </>
                            )}
                            {(it.themes ?? []).slice(0, 2).map((t) => (
                              <span key={t} className="text-xs text-pewter">
                                #{t}
                              </span>
                            ))}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-ink">{it.summary ?? it.excerpt}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
