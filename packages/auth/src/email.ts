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
          // Awaited inside sign-up/resend: never let a hung relay hang those.
          signal: AbortSignal.timeout(5000),
          redirect: "error",
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

/**
 * The display name is attacker-controlled (anyone can sign up with someone
 * else's address), so it is flattened to one short line before it appears in
 * an email we send: no newlines/control characters to fake extra paragraphs
 * ("Your account is locked, call…"), capped at 50 characters.
 */
export function safeDisplayName(name: string): string {
  // Code-point test instead of a regex with control-char literals (lint-clean).
  const isControl = (cp: number) =>
    cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f) || cp === 0x2028 || cp === 0x2029;
  const flat = Array.from(name, (ch) => (isControl(ch.codePointAt(0) ?? 0) ? " " : ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > 50 ? `${flat.slice(0, 49)}…` : flat;
}

/** US-102 verification email. The link is valid for 24 hours (spec 16 US-102 AC1). */
export function verificationEmail(input: { to: string; name: string; url: string }): EmailMessage {
  const subject = "Verify your email for Zynoa";
  const name = safeDisplayName(input.name);
  const text = [
    name ? `Hi ${name},` : "Hi,",
    "",
    "Confirm your email address to finish setting up your Zynoa account:",
    input.url,
    "",
    "This link expires in 24 hours. If you didn't sign up, you can ignore this email.",
  ].join("\n");
  const html = [
    name ? `<p>Hi ${escapeHtml(name)},</p>` : "<p>Hi,</p>",
    "<p>Confirm your email address to finish setting up your Zynoa account:</p>",
    `<p><a href="${escapeHtml(input.url)}">Verify email</a></p>`,
    "<p>This link expires in 24 hours. If you didn't sign up, you can ignore this email.</p>",
  ].join("\n");
  return { to: input.to, subject, text, html };
}
