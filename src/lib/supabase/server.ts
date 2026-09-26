import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

/** Cookie-bound client that acts as the signed-in user (RLS applies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — middleware refreshes the session instead.
        }
      },
    },
  });
}

export type HrUser = { id: string; email: string | undefined; fullName: string | null; role: string };

/** Current HR user or null. Deduplicated per request. */
export const getHrUser = cache(async (): Promise<HrUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase
    .from("hr_profiles")
    .select("full_name, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) return null;
  return {
    id: userId,
    email: data.claims.email as string | undefined,
    fullName: profile.full_name,
    role: profile.role,
  };
});

export async function requireHr() {
  const user = await getHrUser();
  if (!user) redirect("/login");
  return user;
}
