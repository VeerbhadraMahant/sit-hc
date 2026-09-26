import "server-only";
import { createHmac } from "node:crypto";

/**
 * One-way, keyed link between an employee account and their anonymous activity
 * (anonymous feedback, survey responses, notifications). HR cannot read the column
 * and cannot compute it without ANON_LINK_SECRET, which only the server holds.
 */
export function anonHash(userId: string, scope = "employee"): string {
  const secret = process.env.ANON_LINK_SECRET;
  if (!secret) throw new Error("ANON_LINK_SECRET is not set");
  return createHmac("sha256", secret).update(`${scope}:${userId}`).digest("hex");
}

/** Monday (UTC) of the ISO week containing `d`, as YYYY-MM-DD. */
export function isoWeekStart(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}
