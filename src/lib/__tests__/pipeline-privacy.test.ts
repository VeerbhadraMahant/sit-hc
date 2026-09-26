import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ from: vi.fn(), analyze: vi.fn(), embed: vi.fn(), privateUpdate: vi.fn(), feedbackUpdate: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mocks.from }) }));
vi.mock("@/lib/ai/analyze", () => ({ analyzeFeedback: mocks.analyze }));
vi.mock("@/lib/ai/embed", () => ({ embedText: mocks.embed, toPgVector: () => "[0]" }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(), emailLayout: vi.fn(), escapeHtml: (v: string) => v }));
import { processFeedback } from "../pipeline";

const feedback = { id: "item", is_anonymous: true, department: null, category: null, processing_status: "pending" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.analyze.mockResolvedValue({ redacted_text: "[NAME] needs support", summary: "Support needed", urgency: "low" });
  mocks.embed.mockResolvedValue([0]);
  mocks.from.mockImplementation((table: string) => {
    const q = { select: vi.fn(), eq: vi.fn(), single: vi.fn(), maybeSingle: vi.fn(), update: vi.fn() };
    q.select.mockReturnValue(q); q.eq.mockReturnValue(q);
    q.single.mockResolvedValue({ data: feedback, error: null });
    q.maybeSingle.mockResolvedValue({ data: { raw_text: "My name is Priya. I need support." }, error: null });
    q.update.mockImplementation((value: unknown) => {
      (table === "feedback_private" ? mocks.privateUpdate : mocks.feedbackUpdate)(value);
      q.single.mockResolvedValue({ data: { ...feedback, processing_status: "done" }, error: null });
      return q;
    });
    return q;
  });
});
describe("anonymous processing privacy", () => {
  it("keeps failed raw input private and returns no raw input or provider error text", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.embed.mockRejectedValue(new Error("Provider echo: My name is Priya"));
      const result = await processFeedback("item");
      expect(result?.processing_status).toBe("failed");
      expect(JSON.stringify(result)).not.toContain("Priya");
      expect(result).not.toHaveProperty("raw_text");
      expect(mocks.privateUpdate).not.toHaveBeenCalled();
      expect(JSON.stringify(mocks.feedbackUpdate.mock.calls)).not.toContain("Priya");
      expect(JSON.stringify(log.mock.calls)).not.toContain("Priya");
    } finally { log.mockRestore(); }
  });
  it("clears private anonymous text after successful processing without returning it", async () => {
    const result = await processFeedback("item");
    expect(mocks.privateUpdate).toHaveBeenCalledWith({ raw_text: null });
    expect(result).not.toHaveProperty("raw_text");
  });
});
