import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ authorize: vi.fn(), load: vi.fn(), from: vi.fn(), after: vi.fn(), q: { update: vi.fn(), insert: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() } }));
vi.mock("@/lib/conversation-server", () => ({ authorizeConversation: mocks.authorize, loadConversation: mocks.load }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mocks.from }) }));
vi.mock("@/lib/rate-limit", () => ({ clientIp: () => "test", rateLimit: () => true }));
vi.mock("@/lib/notify", () => ({ feedbackRecipientHash: () => null, notify: vi.fn() }));
vi.mock("next/server", async (importOriginal) => ({ ...await importOriginal<typeof import("next/server")>(), after: mocks.after }));
import { POST } from "@/app/api/conversations/[code]/route";
const context = { params: Promise.resolve({ code: "VOC-ABCD-EFGH" }) };
const request = (body: unknown, hr = false) => new Request(`https://example.test/api/conversations/VOC-ABCD-EFGH${hr ? "?as=hr" : ""}`, { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorize.mockResolvedValue({ id: "feedback-1" });
  mocks.load.mockResolvedValue({ messages: [], action: null, history: [], canReply: true });
  mocks.from.mockReturnValue(mocks.q);
  mocks.q.update.mockReturnValue(mocks.q); mocks.q.eq.mockReturnValue(mocks.q); mocks.q.select.mockReturnValue(mocks.q);
  mocks.q.insert.mockResolvedValue({ error: null });
  mocks.q.maybeSingle.mockResolvedValue({ data: { feedback_id: "feedback-1" }, error: null });
});
describe("conversation mutations", () => {
  it("rejects unauthorized access before touching the database", async () => {
    mocks.authorize.mockResolvedValue(null);
    expect((await POST(request({ kind: "message", body: "Hello" }), context)).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("does not allow HR to claim employee confirmation", async () => {
    expect((await POST(request({ kind: "outcome", outcome: "resolved", revision: 1 }, true), context)).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("requires employee privacy review and assigns the author on the server", async () => {
    expect((await POST(request({ kind: "message", body: "The issue persists." }), context)).status).toBe(400);
    expect(mocks.q.insert).not.toHaveBeenCalled();
    expect((await POST(request({ kind: "message", body: "The issue persists.", privacyReviewed: true }), context)).status).toBe(200);
    expect(mocks.q.insert).toHaveBeenCalledWith({ feedback_id: "feedback-1", author_role: "employee", body: "The issue persists." });
  });
  it("guards confirmation against stale revisions and incomplete actions", async () => {
    mocks.q.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await POST(request({ kind: "outcome", outcome: "resolved", revision: 2 }), context)).status).toBe(409);
    expect(mocks.q.eq).toHaveBeenCalledWith("revision", 2);
    expect(mocks.q.eq).toHaveBeenCalledWith("status", "completed");
  });
  it("resets confirmation when HR changes a commitment", async () => {
    expect((await POST(request({ kind: "action", action: { title: "Fix approvals", owner: "People team", due_date: "2026-10-01", status: "in_progress", evidence: "", revision: 3 } }, true), context)).status).toBe(200);
    expect(mocks.q.update).toHaveBeenCalledWith(expect.objectContaining({ revision: 4, employee_outcome: null, confirmed_at: null }));
    expect(mocks.q.eq).toHaveBeenCalledWith("revision", 3);
  });
});
