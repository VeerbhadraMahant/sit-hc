import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ employee: vi.fn(), hr: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getEmployeeUser: mocks.employee, getHrUser: mocks.hr }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mocks.from }) }));
import { authorizeConversation, hashReplyKey } from "../conversation-server";
import { anonHash } from "../identity";

const code = "VOC-ABCD-EFGH";
const key = "ab".repeat(32);
let link: { id: string; tracking_code: string; submitter_user_id: string | null; submitter_hash: string | null };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ANON_LINK_SECRET", "test-only-secret");
  mocks.employee.mockResolvedValue(null);
  mocks.hr.mockResolvedValue(null);
  link = { id: "feedback-1", tracking_code: code, submitter_user_id: null, submitter_hash: null };
  mocks.from.mockImplementation((table: string) => {
    const q = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    q.select.mockReturnValue(q); q.eq.mockReturnValue(q);
    q.maybeSingle.mockImplementation(async () => ({ data: table === "feedback" ? link : { reply_token_hash: hashReplyKey(key) }, error: null }));
    return q;
  });
});

describe("private conversation access", () => {
  it("does not allow a tracking code alone, including for an HR user in employee mode", async () => {
    mocks.hr.mockResolvedValue({ id: "hr" });
    expect(await authorizeConversation(new Request("https://example.test"), code, false)).toBeNull();
  });
  it("accepts the private guest key but rejects another key", async () => {
    expect(await authorizeConversation(new Request("https://example.test", { headers: { "x-reply-key": key } }), code, false)).toEqual(link);
    expect(await authorizeConversation(new Request("https://example.test", { headers: { "x-reply-key": "cd".repeat(32) } }), code, false)).toBeNull();
  });
  it("matches anonymous ownership without exposing or requiring an HR identity", async () => {
    link.submitter_hash = anonHash("owner");
    mocks.employee.mockResolvedValue({ id: "other" });
    expect(await authorizeConversation(new Request("https://example.test"), code, false)).toBeNull();
    mocks.employee.mockResolvedValue({ id: "owner" });
    expect(await authorizeConversation(new Request("https://example.test"), code, false)).toEqual(link);
  });
  it("requires a verified HR profile in HR mode", async () => {
    const request = new Request("https://example.test");
    expect(await authorizeConversation(request, code, true)).toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.hr.mockResolvedValue({ id: "hr" });
    expect(await authorizeConversation(request, code, true)).toEqual(link);
  });
});
