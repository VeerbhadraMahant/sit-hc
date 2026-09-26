import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/portal/notification-bell";
import { PortalNav } from "@/components/portal/nav";
import { PortalUserMenu } from "@/components/portal/user-menu";
import { requireEmployee } from "@/lib/supabase/server";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Pages call requireEmployee() themselves; here we only need a session (welcome page is un-onboarded).
  const user = await requireEmployee({ allowUnonboarded: true });
  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 border-b border-mist bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:px-6">
          <Logo href="/portal" />
          <span className="hidden rounded-full border border-mist px-2 py-0.5 font-mono text-[11px] tracking-[1.5px] text-pewter uppercase sm:inline">
            Employee
          </span>
          {user.onboarded && <PortalNav className="mx-auto hidden md:flex" />}
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {user.onboarded && <NotificationBell />}
            <PortalUserMenu name={user.fullName} email={user.email ?? null} avatarUrl={user.avatarUrl} />
          </div>
        </div>
        {user.onboarded && (
          <div className="border-t border-mist px-4 py-2 md:hidden">
            <PortalNav />
          </div>
        )}
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
