/** Mock EmailProvider (spec 03 §10): records every message; optionally relays to Mailpit. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockEmailProvider, verificationEmail } from "../../src/email.js";

afterEach(() => vi.unstubAllGlobals());

describe("createMockEmailProvider", () => {
  it("records sent messages in memory without any network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const provider = createMockEmailProvider({ from: "Zynoa <no-reply@zynoa.test>" });
    const result = await provider.send(
      { to: "a@example.com", subject: "Hi", text: "Body" },
      "key-1",
    );
    expect(result.id).toMatch(/^mock_/);
    expect(provider.sent).toEqual([
      expect.objectContaining({ to: "a@example.com", subject: "Hi", text: "Body", key: "key-1" }),
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is idempotent per key (a retried send is not delivered twice)", async () => {
    const provider = createMockEmailProvider({ from: "no-reply@zynoa.test" });
    const first = await provider.send({ to: "a@example.com", subject: "S", text: "T" }, "same");
    const second = await provider.send({ to: "a@example.com", subject: "S", text: "T" }, "same");
    expect(second.id).toBe(first.id);
    expect(provider.sent).toHaveLength(1);
  });

  it("relays to Mailpit's HTTP send API when a Mailpit URL is configured", async () => {
    const fetchSpy = vi.fn(
      async () => new Response(JSON.stringify({ ID: "mp1" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const provider = createMockEmailProvider({
      from: "Zynoa <no-reply@zynoa.test>",
      mailpitUrl: "http://localhost:8025/",
    });
    await provider.send({ to: "b@example.com", subject: "S", text: "T", html: "<p>T</p>" }, "k");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:8025/api/v1/send");
    expect(JSON.parse(init.body as string)).toEqual({
      From: { Email: "no-reply@zynoa.test", Name: "Zynoa" },
      To: [{ Email: "b@example.com" }],
      Subject: "S",
      Text: "T",
      HTML: "<p>T</p>",
    });
  });

  it("surfaces a Mailpit failure instead of pretending the mail went out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    const provider = createMockEmailProvider({
      from: "no-reply@zynoa.test",
      mailpitUrl: "http://localhost:8025",
    });
    await expect(
      provider.send({ to: "c@example.com", subject: "S", text: "T" }, "k"),
    ).rejects.toThrow(/Mailpit/);
  });
});

describe("verificationEmail", () => {
  it("addresses the user by name, includes the link and the 24-hour expiry", () => {
    const message = verificationEmail({
      to: "d@example.com",
      name: "Dana",
      url: "http://localhost:4000/api/auth/verify-email?token=abc",
    });
    expect(message.to).toBe("d@example.com");
    expect(message.subject).toMatch(/verify/i);
    expect(message.text).toContain("Dana");
    expect(message.text).toContain("http://localhost:4000/api/auth/verify-email?token=abc");
    expect(message.text).toMatch(/24 hours/);
  });

  it("escapes HTML in the user's name", () => {
    const message = verificationEmail({ to: "e@example.com", name: "<b>x</b>", url: "http://x" });
    expect(message.html).not.toContain("<b>x</b>");
    expect(message.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
