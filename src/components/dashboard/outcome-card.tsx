import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export async function OutcomeCard() {
  const db = await createClient();
  const queries = [
    db.from("feedback_actions").select("feedback_id", { count: "exact", head: true }).eq("employee_outcome", "resolved"),
    db.from("feedback_actions").select("feedback_id", { count: "exact", head: true }).eq("status", "completed").is("employee_outcome", null),
    db.from("feedback_actions").select("feedback_id", { count: "exact", head: true }).eq("employee_outcome", "still_happening"),
    db.from("feedback_actions").select("feedback_id", { count: "exact", head: true }).neq("status", "completed").lt("due_date", new Date().toISOString().slice(0, 10)),
  ];
  const [results, attention] = await Promise.all([Promise.all(queries), db.from("feedback_actions").select("feedback_id,title,employee_outcome,due_date,status")
    .or(`employee_outcome.eq.still_happening,and(status.neq.completed,due_date.lt.${new Date().toISOString().slice(0, 10)})`)
    .order("due_date").limit(5)]);
  const labels = ["Employee confirmed it helped", "HR completed · awaiting confirmation", "Employee says still happening", "Overdue commitments"];
  return <Card glow="lime" className="space-y-4">
    <div><p className="eyebrow">Proof of action · all time</p><h2 className="text-heading-sm font-semibold text-ink">Did the change actually help?</h2></div>
    {results.some((r) => r.error) || attention.error ? <p className="text-sm text-pewter">Action outcomes are temporarily unavailable.</p> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{results.map((result, i) => <div key={labels[i]} className="rounded-smallcards border border-mist p-4">
        <p className="text-3xl font-semibold tabular-nums text-obsidian">{result.count ?? 0}</p>
        <p className="mt-1 text-sm text-pewter">{labels[i]}</p>
      </div>)}</div>
      {!!attention.data?.length && <div><p className="eyebrow mb-2">Follow through</p><ul className="space-y-2">{attention.data.map((action) => <li key={action.feedback_id}>
        <Link href={`/dashboard/feedback?id=${action.feedback_id}`} className="text-sm font-medium text-cobalt hover:underline">{action.title}</Link>
        <span className="ml-2 text-xs text-pewter">{action.employee_outcome === "still_happening" ? "Employee needs further action" : `Overdue since ${action.due_date}`}</span>
      </li>)}</ul></div>}
      <p className="text-xs text-pewter">Confirmation is recorded by the submitting employee or a holder of their private reply key. Closing a feedback ticket does not count as employee confirmation.</p>
    </>}
  </Card>;
}
