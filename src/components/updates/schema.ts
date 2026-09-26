import { z } from "zod";
import { THEMES } from "@/lib/types";

export const UPDATE_COLUMNS = "id,created_at,title,body,theme,department,feedback_count,status,published_at";

export const UpdateInputSchema = z.object({
  title: z.string().trim().min(3, "Add a title.").max(160),
  body: z.string().trim().min(10, "Tell employees what changed (at least a sentence).").max(4000),
  theme: z.enum(THEMES).nullish(),
  department: z.string().trim().max(80).nullish(),
  feedback_count: z.number().int().min(0).max(100000).nullish(),
});
export type UpdateInput = z.infer<typeof UpdateInputSchema>;
