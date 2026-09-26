import { describe, expect, it } from "vitest";
import {
  tokenizeHighlightedText,
  SAMPLE_FEEDBACK_ITEMS,
  type HighlightSpan,
} from "@/lib/feedback-comparison-data";

describe("tokenizeHighlightedText", () => {
  it("returns a single unhighlighted segment when highlights list is empty", () => {
    const text = "Every voice matters in this team.";
    const result = tokenizeHighlightedText(text, []);
    expect(result).toEqual([{ text, isHighlight: false }]);
  });

  it("accurately slices text into plain and highlighted segments", () => {
    const text = "The manager does not communicate clearly with anyone.";
    const highlights: HighlightSpan[] = [
      { text: "does not communicate", type: "negative" },
      { text: "clearly", type: "attention" },
    ];

    const result = tokenizeHighlightedText(text, highlights);
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ text: "The manager ", isHighlight: false });
    expect(result[1]).toEqual({
      text: "does not communicate",
      isHighlight: true,
      type: "negative",
      label: undefined,
    });
    expect(result[2]).toEqual({ text: " ", isHighlight: false });
    expect(result[3]).toEqual({
      text: "clearly",
      isHighlight: true,
      type: "attention",
      label: undefined,
    });
    expect(result[4]).toEqual({ text: " with anyone.", isHighlight: false });

    // Ensure reconstructed string matches original exactly
    const reconstructed = result.map((r) => r.text).join("");
    expect(reconstructed).toBe(text);
  });

  it("handles case-insensitive match while preserving original casing in slice", () => {
    const text = "I NEVER GET PAID FOR OVERTIME during peak sprints.";
    const highlights: HighlightSpan[] = [
      { text: "never get paid for overtime", type: "negative", label: "Wage issue" },
    ];

    const result = tokenizeHighlightedText(text, highlights);
    expect(result).toHaveLength(3);
    expect(result[0].text).toBe("I ");
    expect(result[0].isHighlight).toBe(false);
    expect(result[1].text).toBe("NEVER GET PAID FOR OVERTIME");
    expect(result[1].isHighlight).toBe(true);
    expect(result[1].type).toBe("negative");
    expect(result[1].label).toBe("Wage issue");
    expect(result[2].text).toBe(" during peak sprints.");
    expect(result[2].isHighlight).toBe(false);

    const reconstructed = result.map((r) => r.text).join("");
    expect(reconstructed).toBe(text);
  });

  it("supports positive, negative, and attention highlights simultaneously", () => {
    const text = "Great people to work with, but burnout is setting in due to alert noise.";
    const highlights: HighlightSpan[] = [
      { text: "Great people to work with", type: "positive" },
      { text: "burnout is setting in", type: "negative" },
      { text: "alert noise", type: "attention" },
    ];

    const result = tokenizeHighlightedText(text, highlights);
    expect(result.some((r) => r.isHighlight && r.type === "positive")).toBe(true);
    expect(result.some((r) => r.isHighlight && r.type === "negative")).toBe(true);
    expect(result.some((r) => r.isHighlight && r.type === "attention")).toBe(true);

    const reconstructed = result.map((r) => r.text).join("");
    expect(reconstructed).toBe(text);
  });

  it("all SAMPLE_FEEDBACK_ITEMS reconstruct their exact text without character loss", () => {
    for (const item of SAMPLE_FEEDBACK_ITEMS) {
      const segments = tokenizeHighlightedText(item.text, item.highlights);
      const reconstructed = segments.map((s) => s.text).join("");
      expect(reconstructed).toBe(item.text);

      // Verify each item has at least one highlight
      const highlightCount = segments.filter((s) => s.isHighlight).length;
      expect(highlightCount).toBeGreaterThan(0);
    }
  });
});
