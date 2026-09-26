"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Sign out"
      title="Sign out"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace("/login");
        router.refresh();
      }}
      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-ink shadow-field hover:bg-mist"
    >
      <LogOut className="size-4" aria-hidden />
    </button>
  );
}
