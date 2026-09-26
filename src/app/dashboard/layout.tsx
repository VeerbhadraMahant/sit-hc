import { Logo } from "@/components/logo";
import { DashboardNav } from "@/components/dashboard/nav";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { requireHr } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireHr();
  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 border-b border-mist bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-4 sm:px-6">
          <Logo href="/dashboard" />
          <span className="hidden rounded-full border border-mist px-2 py-0.5 font-mono text-[11px] tracking-[1.5px] text-pewter uppercase sm:inline">
            HR Console
          </span>
          <DashboardNav className="mx-auto hidden md:flex" />
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <div className="hidden text-right leading-tight lg:block">
              <p className="text-sm font-medium text-ink">{user.fullName ?? "HR"}</p>
              <p className="text-xs text-pewter">{user.email}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
        <div className="border-t border-mist px-4 py-2 md:hidden">
          <DashboardNav />
        </div>
      </header>
      <main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
