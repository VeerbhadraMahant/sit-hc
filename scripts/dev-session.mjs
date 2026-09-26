// Prints a Cookie header value for a signed-in session (for curl-testing APIs/pages).
//   node scripts/dev-session.mjs hr        → HR admin (HR_ADMIN_*)
//   node scripts/dev-session.mjs employee  → demo employee (DEMO_EMPLOYEE_*)
import { createServerClient } from "@supabase/ssr";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const who = process.argv[2] === "employee" ? "employee" : "hr";
const email = who === "hr" ? process.env.HR_ADMIN_EMAIL : process.env.DEMO_EMPLOYEE_EMAIL;
const password = who === "hr" ? process.env.HR_ADMIN_PASSWORD : process.env.DEMO_EMPLOYEE_PASSWORD;
const jar = new Map();
const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (l) => l.forEach(({ name, value }) => jar.set(name, value)) },
});
const { error } = await sb.auth.signInWithPassword({ email, password });
if (error) throw error;
process.stdout.write([...jar].map(([n, v]) => `${n}=${v}`).join("; "));
