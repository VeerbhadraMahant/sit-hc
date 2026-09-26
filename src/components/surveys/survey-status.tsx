import { CircleCheck, CircleDashed, CircleStop } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SurveyStatus } from "@/lib/types";

const META: Record<SurveyStatus, { label: string; Icon: typeof CircleCheck; color: string }> = {
  draft: { label: "Draft", Icon: CircleDashed, color: "var(--color-pewter)" },
  active: { label: "Live", Icon: CircleCheck, color: "var(--status-good)" },
  closed: { label: "Closed", Icon: CircleStop, color: "var(--color-graphite)" },
};

export function SurveyStatusBadge({ status }: { status: SurveyStatus }) {
  const { label, Icon, color } = META[status];
  return (
    <Badge>
      <Icon className="size-3.5" style={{ color }} aria-hidden />
      {label}
    </Badge>
  );
}
