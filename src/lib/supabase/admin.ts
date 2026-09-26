import "server-only";
import { createClient } from "@supabase/supabase-js";

let admin: ReturnType<typeof createClient> | null = null;

/** Service-role client. Bypasses RLS — only use in route handlers after authorising the caller. */
export function createAdminClient() {
  if (!admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}
