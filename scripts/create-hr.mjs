// Creates (or updates) the HR admin from HR_ADMIN_* env vars and grants HR access.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
const email = process.env.HR_ADMIN_EMAIL;
const password = process.env.HR_ADMIN_PASSWORD;
const name = process.env.HR_ADMIN_NAME || "HR Admin";
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: list, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (listErr) throw listErr;
let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (user) {
  const { error } = await sb.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) throw error;
} else {
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (error) throw error;
  user = data.user;
}
const { error } = await sb.from("hr_profiles").upsert({ user_id: user.id, full_name: name, role: "hr_admin" });
if (error) throw error;
console.log(`HR admin ready: ${email}`);
