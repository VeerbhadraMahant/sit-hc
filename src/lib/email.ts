import "server-only";

/**
 * Transactional email via Resend's HTTP API.
 * Without a verified domain Resend only delivers from onboarding@resend.dev to the
 * Resend account owner's address — verify a domain and set EMAIL_FROM for real use.
 */
export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY not set" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Vocalyze <onboarding@resend.dev>",
        to,
        subject,
        html,
        reply_to: replyTo,
      }),
    });
    if (!res.ok) {
      const error = await res.text();
      console.error("[email] send failed", res.status, error);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] send failed", err);
    return { ok: false, error: String(err) };
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Shared email shell in the Vocalyze visual language. */
export function emailLayout({ eyebrow, title, body, cta }: { eyebrow: string; title: string; body: string; cta?: { label: string; href: string } }) {
  return `<!doctype html><html><body style="margin:0;background:#fcfcfd;font-family:'IBM Plex Sans',Segoe UI,Arial,sans-serif;color:#151720">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:24px;box-shadow:0 0 0 1px rgba(29,33,48,.08);padding:32px">
<tr><td style="font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#6b6d72">${esc(eyebrow)}</td></tr>
<tr><td style="padding-top:8px;font-size:24px;font-weight:600;letter-spacing:-.3px;color:#0a0d16">${esc(title)}</td></tr>
<tr><td style="padding-top:16px;font-size:15px;line-height:1.6;color:#1d2130">${body}</td></tr>
${cta ? `<tr><td style="padding-top:24px"><a href="${esc(cta.href)}" style="display:inline-block;background:#bfff5a;color:#0a0d16;text-decoration:none;font-weight:500;padding:14px 28px;border-radius:56px">${esc(cta.label)}</a></td></tr>` : ""}
<tr><td style="padding-top:32px;font-size:12px;color:#6b6d72">Sent by Vocalyze · AI employee feedback &amp; insights</td></tr>
</table></td></tr></table></body></html>`;
}

export { esc as escapeHtml };
