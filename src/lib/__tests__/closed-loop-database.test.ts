import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let db: PGlite;
const id = "00000000-0000-0000-0000-000000000001";
beforeAll(async () => {
  db = new PGlite();
  // Minimal existing schema, with the same role/grant shape as migrations 0001/0002.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create table public.feedback(id uuid primary key, raw_text text, status text, hr_response text, responded_at timestamptz, processing_error text);
    create function public.is_hr() returns boolean language sql stable as $$ select true $$;
    grant usage on schema public to authenticated, anon, service_role;
    grant select(id, raw_text, status, hr_response, responded_at), update on public.feedback to authenticated;
    insert into public.feedback(id, raw_text) values('${id}', 'My name is Priya, employee EMP-1');
  `);
  await db.exec(readFileSync(new URL("../../../supabase/migrations/0003_closed_loop.sql", import.meta.url), "utf8"));
}, 30000);
afterAll(async () => { await db?.close(); });

describe("privacy and outcome database boundaries", () => {
  it("moves existing raw intake out of the HR-readable row", async () => {
    expect((await db.query<{ raw_text: string | null }>("select raw_text from public.feedback")).rows[0].raw_text).toBeNull();
    expect((await db.query<{ raw_text: string }>("select raw_text from public.feedback_private")).rows[0].raw_text).toContain("Priya");
  });
  it("automatically isolates new intake and service-role reprocessing input", async () => {
    const next = "00000000-0000-0000-0000-000000000002";
    await db.query("insert into public.feedback(id, raw_text) values($1, $2)", [next, "Private submission"]);
    await db.query("update public.feedback set raw_text=$1 where id=$2", ["Private replacement", next]);
    expect((await db.query<{ raw_text: string | null }>("select raw_text from public.feedback where id=$1", [next])).rows[0].raw_text).toBeNull();
    expect((await db.query<{ raw_text: string }>("select raw_text from public.feedback_private where feedback_id=$1", [next])).rows[0].raw_text).toBe("Private replacement");
  });
  it("denies HR raw input, private keys, and direct employee confirmation writes", async () => {
    await db.exec("set role authenticated");
    try {
      await expect(db.query("select raw_text from public.feedback")).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from public.feedback_private")).rejects.toThrow(/permission denied/);
      await expect(db.query("update public.feedback set raw_text='reveal'")).rejects.toThrow(/permission denied/);
      await expect(db.query("update public.feedback_actions set employee_outcome='resolved'")).rejects.toThrow(/permission denied/);
      await expect(db.query("insert into public.feedback_messages(feedback_id,author_role,body) values($1,'employee','Fake reply')", [id])).rejects.toThrow(/permission denied/);
      await expect(db.query("select id,status from public.feedback")).resolves.toBeDefined();
    } finally { await db.exec("reset role"); }
  });
  it("requires evidence, preserves history, and rejects stale confirmation updates", async () => {
    await expect(db.query("insert into public.feedback_actions(feedback_id,title,owner,due_date,status) values($1,'Fix approvals','People team','2026-10-01','completed')", [id])).rejects.toThrow(/check constraint/);
    await db.query("insert into public.feedback_actions(feedback_id,title,owner,due_date,status,evidence) values($1,'Fix approvals','People team','2026-10-01','completed','New overtime process published')", [id]);
    await db.query("update public.feedback_actions set employee_outcome='resolved', confirmed_at=now(), revision=2 where feedback_id=$1 and revision=1 and status='completed'", [id]);
    const stale = await db.query("update public.feedback_actions set employee_outcome='still_happening', revision=2 where feedback_id=$1 and revision=1 returning feedback_id", [id]);
    expect(stale.rows).toHaveLength(0);
    const history = await db.query<{ snapshot: { employee_outcome: string | null } }>("select snapshot from public.feedback_action_history order by created_at");
    expect(history.rows).toHaveLength(2);
    expect(history.rows[1].snapshot.employee_outcome).toBe("resolved");
  });
});
