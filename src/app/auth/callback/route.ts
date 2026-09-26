import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles both OAuth (?code=) and email magic links (?token_hash=&type=).
 * Routes by role unless an explicit ?next= was requested:
 *   HR (hr_profiles row)            → /dashboard
 *   employee without a profile yet  → /portal/welcome
 *   employee                        → /portal
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const as = searchParams.get("as") === "hr" ? "hr" : "employee";

  const supabase = await createClient();
  let userId: string | undefined;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) userId = data.user?.id;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) userId = data.user?.id;
  }

  if (!userId) return NextResponse.redirect(`${origin}/login?error=auth&as=${as}`);

  const [{ data: hr }, { data: employee }] = await Promise.all([
    supabase.from("hr_profiles").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase.from("employee_profiles").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);

  if (next) {
    if (next.startsWith("/dashboard") && !hr) return NextResponse.redirect(`${origin}/login?error=not_hr&as=hr`);
    if (next.startsWith("/portal") && !employee) return NextResponse.redirect(`${origin}/portal/welcome`);
    return NextResponse.redirect(`${origin}${next}`);
  }
  if (as === "hr") {
    return NextResponse.redirect(hr ? `${origin}/dashboard` : `${origin}/login?error=not_hr&as=hr`);
  }
  return NextResponse.redirect(employee ? `${origin}/portal` : `${origin}/portal/welcome`);
}
