import { AskChat } from "@/components/ask/ask-chat";
import { requireHr } from "@/lib/supabase/server";

export const metadata = { title: "Ask AI — Vocalyze" };

export default async function AskPage() {
  await requireHr();
  return <AskChat />;
}
