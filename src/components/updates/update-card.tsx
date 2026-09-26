import { Megaphone, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { UpdatePost } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

/** "You said, we did" card — used on the portal board and in the HR manager. */
export function UpdateCard({
  update,
  className,
  actions,
  compact,
}: {
  update: UpdatePost;
  className?: string;
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Card glow="lime" arc className={cn("flex flex-col gap-3", compact && "p-5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-lime text-obsidian" aria-hidden>
          <Megaphone className="size-4" />
        </span>
        {update.theme && <Badge>{update.theme}</Badge>}
        {update.department && <Badge className="text-pewter">{update.department}</Badge>}
        <span className="ml-auto text-xs text-pewter">{formatDate(update.published_at ?? update.created_at, { day: "numeric", month: "short", year: "numeric" })}</span>
      </div>
      <h3 className={cn("font-semibold text-ink", compact ? "text-base" : "text-heading-sm")}>{update.title}</h3>
      <div
        className={cn(
          "text-sm leading-relaxed text-graphite [&_a]:text-cobalt [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_p+p]:mt-2 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1",
          compact && "line-clamp-3",
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
          {update.body}
        </ReactMarkdown>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
        {update.feedback_count ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-pewter">
            <Users className="size-3.5" aria-hidden /> Based on {update.feedback_count} voice{update.feedback_count === 1 ? "" : "s"}
          </span>
        ) : null}
        {actions && <div className="ml-auto flex gap-1">{actions}</div>}
      </div>
    </Card>
  );
}
