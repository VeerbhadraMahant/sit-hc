import { describe, expect, it } from "vitest";
import { ActionInput, reviewPrivacy } from "../closed-loop";

describe("privacy review", () => {
  it("flags and generalizes a unique role without sending the draft to a provider", () => {
    const result = reviewPrivacy("I'm the only trainee on the Tuesday night shift. Overtime is not recorded.");
    expect(result.warnings).toHaveLength(1);
    expect(result.suggestion).not.toContain("Tuesday");
    expect(result.suggestion).toContain("Overtime is not recorded.");
  });
  it("removes common direct identifiers and leaves other content unchanged", () => {
    const result = reviewPrivacy("My name is Priya. Email priya@example.com or +91 98765 43210. Employee ID: EMP-1042. Please fix overtime.");
    expect(result.suggestion).not.toMatch(/Priya|priya@|98765|EMP-1042/);
    expect(result.suggestion).toContain("Please fix overtime.");
    expect(reviewPrivacy("The approval process needs improvement.").warnings).toEqual([]);
  });
});

describe("action commitments", () => {
  const base = { title: "Correct overtime approvals", owner: "People Operations", due_date: "2026-10-01", status: "planned", evidence: "", revision: 0 };
  it("requires evidence before HR can call an action complete", () => {
    expect(ActionInput.safeParse(base).success).toBe(true);
    expect(ActionInput.safeParse({ ...base, status: "completed" }).success).toBe(false);
    expect(ActionInput.safeParse({ ...base, status: "completed", evidence: "Updated the approval process and informed shift leads." }).success).toBe(true);
  });
  it("rejects invented dates, missing accountability and injected confirmation fields", () => {
    expect(ActionInput.safeParse({ ...base, due_date: "2026-02-30" }).success).toBe(false);
    expect(ActionInput.safeParse({ ...base, owner: "" }).success).toBe(false);
    expect(ActionInput.safeParse({ ...base, employee_outcome: "resolved" }).success).toBe(false);
  });
});
