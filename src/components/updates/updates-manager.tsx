"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/ui/card";
import type { UpdatePost } from "@/lib/types";
import { UpdateCard } from "./update-card";
import { UpdateComposer } from "./update-composer";

export function UpdatesManager({ initial }: { initial: UpdatePost[] }) {
  const router = useRouter();
  const [updates, setUpdates] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);

  async function remove(id: string) {
    if (!window.confirm("Delete this update? Employees will no longer see it.")) return;
    const prev = updates;
    setUpdates((u) => u.filter((x) => x.id !== id));
    const res = await fetch(`/api/updates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setUpdates(prev);
      toast.error("Couldn't delete the update.");
      return;
    }
    toast.success("Update deleted.");
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader eyebrow="New update" title="Close the loop" />
        <UpdateComposer
          onSaved={(u) => {
            setUpdates((list) => [u, ...list]);
            router.refresh();
          }}
        />
      </Card>

      <section>
        <h2 className="eyebrow mb-3">Published · {updates.length}</h2>
        {updates.length === 0 ? (
          <p className="rounded-smallcards border border-dashed border-edge p-6 text-sm text-pewter">
            Nothing published yet. Share one change you made because of employee feedback — it&apos;s the fastest way to build trust in the process.
          </p>
        ) : (
          <div className="grid gap-4">
            {updates.map((u) =>
              editing === u.id ? (
                <Card key={u.id}>
                  <CardHeader eyebrow="Editing" title={u.title} />
                  <UpdateComposer
                    initial={u}
                    onCancel={() => setEditing(null)}
                    onSaved={(saved) => {
                      setUpdates((list) => list.map((x) => (x.id === saved.id ? saved : x)));
                      setEditing(null);
                      router.refresh();
                    }}
                  />
                </Card>
              ) : (
                <UpdateCard
                  key={u.id}
                  update={u}
                  actions={
                    <>
                      <button
                        type="button"
                        aria-label="Edit update"
                        title="Edit"
                        onClick={() => setEditing(u.id)}
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-mist"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete update"
                        title="Delete"
                        onClick={() => remove(u.id)}
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-mist"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  }
                />
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
