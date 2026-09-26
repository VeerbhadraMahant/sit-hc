// Creates (or resets) the demo employee from DEMO_EMPLOYEE_* env vars, with an employee profile.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = process.env.DEMO_EMPLOYEE_EMAIL;
const password = process.env.DEMO_EMPLOYEE_PASSWORD;

const { data: list, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (listErr) throw listErr;
let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (user) {
  const { error } = await sb.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) throw error;
} else {
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Aarav Mehta" } });
  if (error) throw error;
  user = data.user;
}
const { error } = await sb.from("employee_profiles").upsert({ user_id: user.id, full_name: "Aarav Mehta", department: "Engineering" });
if (error) throw error;
console.log(`Demo employee ready: ${email}`);
