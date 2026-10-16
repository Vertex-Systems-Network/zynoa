/**
 * EmailProvider (spec 03 §10) — auth's slice of it. Real providers
 * (resend/postmark/ses) arrive with packages/integrations; local and CI use
 * the mock, which records every message and, when MAILPIT_URL is set, relays
 * it to Mailpit's HTTP send API so it shows up in the local inbox
 * (spec 05 §2: "in local/CI all mail goes to Mailpit/capture"). Nothing ever
 * leaves the machine.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendResult {
  id: string;
}

export interface EmailProvider {
  /** `key` is an idempotency key: the same key must never deliver twice. */
  send(message: EmailMessage, key: string): Promise<SendResult>;
}

export interface MockEmailProvider extends EmailProvider {
  readonly sent: ReadonlyArray<EmailMessage & { key: string; id: string }>;
}

/** Parse `Name <email>` or a bare address. */
function parseAddress(value: string): { Email: string; Name?: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
  if (!match) return { Email: value.trim() };
  const [, name, email] = match;
  return name ? { Email: (email ?? "").trim(), Name: name } : { Email: (email ?? "").trim() };
}

export function createMockEmailProvider(options: {
  from: string;
  mailpitUrl?: string | undefined;
}): MockEmailProvider {
  const sent: Array<EmailMessage & { key: string; id: string }> = [];
  const byKey = new Map<string, SendResult>();
  let counter = 0;

  return {
    sent,
    async send(message, key) {
      const previous = byKey.get(key);
      if (previous) return previous;

      if (options.mailpitUrl) {
        const url = `${options.mailpitUrl.replace(/\/+$/, "")}/api/v1/send`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            From: parseAddress(options.from),
            To: [{ Email: message.to }],
            Subject: message.subject,
            Text: message.text,
            ...(message.html ? { HTML: message.html } : {}),
          }),
        });
        if (!response.ok) {
          throw new Error(`Mailpit relay failed with HTTP ${response.status}`);
        }
      }

      const result = { id: `mock_${++counter}` };
      sent.push({ ...message, key, id: result.id });
      byKey.set(key, result);
      return result;
    },
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** US-102 verification email. The link is valid for 24 hours (spec 16 US-102 AC1). */
export function verificationEmail(input: { to: string; name: string; url: string }): EmailMessage {
  const subject = "Verify your email for Zynoa";
  const text = [
    `Hi ${input.name},`,
    "",
    "Confirm your email address to finish setting up your Zynoa account:",
    input.url,
    "",
    "This link expires in 24 hours. If you didn't sign up, you can ignore this email.",
  ].join("\n");
  const html = [
    `<p>Hi ${escapeHtml(input.name)},</p>`,
    "<p>Confirm your email address to finish setting up your Zynoa account:</p>",
    `<p><a href="${escapeHtml(input.url)}">Verify email</a></p>`,
    "<p>This link expires in 24 hours. If you didn't sign up, you can ignore this email.</p>",
  ].join("\n");
  return { to: input.to, subject, text, html };
}
