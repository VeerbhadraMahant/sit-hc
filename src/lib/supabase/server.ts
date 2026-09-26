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
  if (!user) redirect("/login?as=hr");
  return user;
}

/** Verified claims for the current session (local JWT verification). Deduplicated per request. */
export const getSessionClaims = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const meta = (claims.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string };
  return {
    id: claims.sub,
    email: claims.email as string | undefined,
    metaName: meta.full_name ?? meta.name ?? null,
    avatarUrl: meta.avatar_url ?? null,
  };
});

export type EmployeeUser = {
  id: string;
  email: string | undefined;
  fullName: string | null;
  department: string | null;
  avatarUrl: string | null;
  /** false until the employee completes /portal/welcome */
  onboarded: boolean;
};

/** Any signed-in user can use the employee portal (HR staff are employees too). */
export const getEmployeeUser = cache(async (): Promise<EmployeeUser | null> => {
  const session = await getSessionClaims();
  if (!session) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("employee_profiles")
    .select("full_name, department")
    .eq("user_id", session.id)
    .maybeSingle();
  return {
    id: session.id,
    email: session.email,
    fullName: profile?.full_name ?? session.metaName,
    department: profile?.department ?? null,
    avatarUrl: session.avatarUrl,
    onboarded: !!profile,
  };
});

/** Guards /portal pages. Sends signed-out users to login and new users to onboarding. */
export async function requireEmployee({ allowUnonboarded = false } = {}) {
  const user = await getEmployeeUser();
  if (!user) redirect("/login?as=employee");
  if (!user.onboarded && !allowUnonboarded) redirect("/portal/welcome");
  return user;
}
