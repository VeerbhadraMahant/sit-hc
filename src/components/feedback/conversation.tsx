"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { CheckCircle2, LockKeyhole, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { reviewPrivacy, type Action, type Conversation } from "@/lib/closed-loop";

const labels = { planned: "Planned", in_progress: "In progress", completed: "HR completed the action" };
/** `viewerIsHr` decides whether the employee's own outcome reads in the third person
 * (HR's view of someone else) or the second person (the employee reading about themselves). */
const outcomeLabel = (action: Action, viewerIsHr: boolean) => {
  const who = viewerIsHr ? "Employee" : "You";
  const verb = viewerIsHr ? "says" : "say";
  if (action.employee_outcome === "resolved") return `${who} confirmed it helped`;
  if (action.employee_outcome === "still_happening") return `${who} ${verb} it's still happening`;
  return action.status === "completed" ? `Awaiting ${viewerIsHr ? "employee" : "your"} confirmation` : `Confirmation opens once this is marked completed`;
};
const storageKey = (code: string) => `vocalyze-reply:${code}`;

export function FeedbackConversation({ code, hr = false }: { code: string; hr?: boolean }) {
  const [data, setData] = useState<Conversation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState("");
  const [draft, setDraft] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const id = useId();
  const endpoint = `/api/conversations/${encodeURIComponent(code)}${hr ? "?as=hr" : ""}`;
  const headers = useCallback((): Record<string, string> => {
    let saved = "";
    try { saved = localStorage.getItem(storageKey(code)) ?? ""; } catch { /* manual key still works */ }
    return { "Content-Type": "application/json", ...(!hr && (key || saved) ? { "x-reply-key": key || saved } : {}) };
  }, [code, hr, key]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(endpoint, { headers: headers(), cache: "no-store" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result);
    } catch (e) { setError((e as Error).message || "Could not load conversation."); }
    finally { setLoading(false); }
  }, [endpoint, headers]);

  useEffect(() => { void load(); }, [load]);

  async function send(body: unknown) {
    setBusy(true); setError("");
    try {
      const res = await fetch(endpoint, { method: "POST", headers: headers(), body: JSON.stringify(body) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result);
      return true;
    } catch (e) { setError((e as Error).message || "Could not save update."); return false; }
    finally { setBusy(false); }
  }

  const privacy = reviewPrivacy(draft);
  return (
    <Card className="mt-6 space-y-5" glow="cyan">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-2"><LockKeyhole className="size-4" /> Private follow-up</p>
          <h2 className="text-heading-sm font-semibold text-ink">From speaking up to seeing change</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={busy || loading} aria-label="Refresh conversation">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <p className="text-sm text-pewter">{hr
        ? "Ask for the context you need without requesting names or identifying details. Only the employee can confirm whether an action helped."
        : "HR sees your replies as Employee, without your account details. Review each reply for details that could identify you. Keep your reply key private."}</p>
      {error && <p role="alert" className="rounded-smallcards border border-edge p-3 text-sm text-serious">{error}</p>}
      {!data && loading && <p role="status" className="text-sm text-pewter">Loading your conversation…</p>}
      {!hr && !data && !loading && (
        <form onSubmit={(e) => {
          e.preventDefault();
          const input = new FormData(e.currentTarget).get("replyKey")?.toString().trim() ?? "";
          try { localStorage.setItem(storageKey(code), input); } catch { /* keep in memory */ }
          setKey(input);
          if (input === key) void load();
        }} className="space-y-3">
          <Label htmlFor={`${id}-key`}>Private reply key</Label>
          <Input id={`${id}-key`} name="replyKey" type="password" required minLength={64} maxLength={64} autoComplete="off" placeholder="Paste the key saved when you submitted" />
          <p className="text-xs text-pewter">Your tracking code shows status. This separate key unlocks replies and confirmation. You can also sign in to the account that submitted the feedback. Older guest submissions have no reply key.</p>
          <Button type="submit" variant="dark">Unlock conversation</Button>
        </form>
      )}
      {data && <>
        {data.action ? (
          <section className="space-y-3 rounded-smallcards border border-edge bg-white p-4" aria-label="Action commitment">
            <p className="eyebrow">Action commitment · revision {data.action.revision}</p>
            <h3 className="font-semibold text-ink">{data.action.title}</h3>
            <p className="text-sm text-pewter">Owner: {data.action.owner} · Due: {data.action.due_date}</p>
            <p className="text-sm font-medium text-ink">{labels[data.action.status]}{data.action.status !== "completed" && data.action.due_date < new Date().toISOString().slice(0, 10) ? " · Overdue" : ""}</p>
            {data.action.evidence && <div><p className="eyebrow">What changed / evidence</p><p className="whitespace-pre-wrap text-sm text-ink">{data.action.evidence}</p></div>}
            <p className="flex items-center gap-2 rounded-smallcards bg-mist p-3 text-sm font-medium text-ink"><CheckCircle2 className="size-4 shrink-0" />{outcomeLabel(data.action, hr)}</p>
            {!hr && data.action.status === "completed" && <div className="space-y-2">
              <p className="text-sm text-ink">Did this action improve the situation? You can update your answer if things change.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={busy || data.action.employee_outcome === "resolved"} onClick={() => send({ kind: "outcome", outcome: "resolved", revision: data.action!.revision })}>Yes, it helped</Button>
                <Button size="sm" variant="dark" disabled={busy || data.action.employee_outcome === "still_happening"} onClick={() => send({ kind: "outcome", outcome: "still_happening", revision: data.action!.revision })}>Still happening</Button>
              </div>
            </div>}
          </section>
        ) : <p className="rounded-smallcards bg-mist/50 p-4 text-sm text-pewter">No action commitment yet. {hr ? "Set an owner and due date below." : "You can ask HR about next steps in the conversation."}</p>}
        {hr && <ActionEditor key={data.action?.revision ?? 0} action={data.action} busy={busy} save={(action) => send({ kind: "action", action })} />}
        {data.history.length > 0 && <details className="text-sm">
          <summary className="cursor-pointer font-medium text-cobalt">Action and confirmation history</summary>
          <ol className="mt-3 space-y-3">{data.history.map((event) => <li key={event.id} className="border-l-2 border-edge pl-3">
            <p className="text-xs text-pewter">{new Date(event.created_at).toLocaleString()} · revision {event.snapshot.revision}</p>
            <p className="text-ink">{event.snapshot.title} · {labels[event.snapshot.status]}</p>
            <p className="text-pewter">{outcomeLabel(event.snapshot, hr)}</p>
          </li>)}</ol>
        </details>}
        <section aria-label="Conversation" className="border-t border-mist pt-4">
          <h3 className="eyebrow mb-3 flex items-center gap-2"><MessageCircle className="size-4" /> Conversation</h3>
          {!data.messages.length && <p className="text-sm text-pewter">No follow-ups yet. Start a conversation to understand the issue and agree on next steps.</p>}
          <ol className="max-h-96 space-y-3 overflow-y-auto">{data.messages.map((message) => <li key={message.id} className={`rounded-smallcards p-4 ${message.author_role === "hr" ? "border border-edge bg-white" : "bg-mist/60"}`}>
            <p className="mb-1 text-xs text-pewter"><strong>{message.author_role === "hr" ? "People team" : hr ? "Employee" : "You"}</strong> · {new Date(message.created_at).toLocaleString()}</p>
            <p className="whitespace-pre-wrap break-words text-sm text-ink">{message.body}</p>
          </li>)}</ol>
          <form className="mt-4 space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            if (!hr && !reviewed) { setReviewed(true); return; }
            if (await send({ kind: "message", body: draft, privacyReviewed: !hr })) { setDraft(""); setReviewed(false); }
          }}>
            <Label htmlFor={`${id}-reply`}>{hr ? "Ask a question or share an update" : "Your reply"}</Label>
            <Textarea id={`${id}-reply`} value={draft} onChange={(e) => { setDraft(e.target.value); setReviewed(false); }} maxLength={4000} required className="min-h-24" placeholder={hr ? "What would help us understand the situation?" : "Share helpful context without names or unique identifying details."} />
            {!hr && reviewed && <div className="space-y-3 rounded-smallcards border border-edge p-4" role="status">
              <p className="flex items-center gap-2 font-medium text-ink"><ShieldCheck className="size-4" /> Review before sharing</p>
              {privacy.warnings.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-ink">{privacy.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p className="text-sm text-pewter">No common identifiers detected. Check names, locations, dates and unique incidents yourself.</p>}
              {privacy.suggestion !== draft && <>
                <p className="text-xs font-medium text-pewter">Suggested wording — review it for accuracy:</p>
                <p className="whitespace-pre-wrap text-sm text-ink">{privacy.suggestion}</p>
                <Button type="button" size="sm" variant="dark" onClick={() => { setDraft(privacy.suggestion); setReviewed(false); }}>Use suggested wording</Button>
              </>}
              <p className="text-xs text-pewter">This is a basic on-device check, not a guarantee of anonymity. Your exact reply below will be shared when you send.</p>
              <blockquote className="whitespace-pre-wrap border-l-2 border-edge pl-3 text-sm text-ink">{draft}</blockquote>
            </div>}
            <Button type="submit" variant="dark" disabled={busy || !draft.trim()}>{busy ? "Saving…" : hr ? "Send follow-up" : reviewed ? "Send reviewed reply" : "Review privacy"}</Button>
          </form>
        </section>
      </>}
    </Card>
  );
}

function ActionEditor({ action, busy, save }: { action: Action | null; busy: boolean; save: (value: unknown) => Promise<boolean> }) {
  const id = useId();
  const [status, setStatus] = useState(action?.status ?? "planned");
  return <details open={!action} className="rounded-smallcards border border-mist p-4">
    <summary className="cursor-pointer text-sm font-medium text-cobalt">{action ? "Update action commitment" : "Create action commitment"}</summary>
    <form className="mt-4 space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      await save({ title: form.get("title"), owner: form.get("owner"), due_date: form.get("due_date"), status, evidence: form.get("evidence"), revision: action?.revision ?? 0 });
    }}>
      <div><Label htmlFor={`${id}-title`}>What will change?</Label><Input id={`${id}-title`} name="title" required minLength={3} maxLength={500} defaultValue={action?.title} placeholder="Review overtime records and correct the approval process" /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor={`${id}-owner`}>Accountable team or owner</Label><Input id={`${id}-owner`} name="owner" required minLength={2} maxLength={120} defaultValue={action?.owner} placeholder="People Operations" /></div>
        <div><Label htmlFor={`${id}-due`}>Due date</Label><Input id={`${id}-due`} name="due_date" type="date" required defaultValue={action?.due_date} /></div>
      </div>
      <div><Label htmlFor={`${id}-status`}>Action status</Label><Select id={`${id}-status`} value={status} onChange={(e) => setStatus(e.target.value as Action["status"])}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed by HR</option></Select></div>
      <div><Label htmlFor={`${id}-evidence`}>What changed / evidence {status === "completed" ? "(required)" : "(optional)"}</Label><Textarea id={`${id}-evidence`} name="evidence" className="min-h-24" required={status === "completed"} minLength={status === "completed" ? 10 : undefined} maxLength={4000} defaultValue={action?.evidence} placeholder="Describe the change and how the employee can verify it. Avoid personal information." /></div>
      {action?.employee_outcome && <p className="text-xs text-pewter">Changing the commitment requests a fresh employee confirmation. Earlier confirmations remain in history.</p>}
      <Button type="submit" size="sm" variant="dark" disabled={busy}>{busy ? "Saving…" : "Save commitment"}</Button>
    </form>
  </details>;
}
