// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WaitlistForm } from "../src/components/waitlist-form";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => vi.unstubAllGlobals());

describe("WaitlistForm", () => {
  it("renders the survey fields and a consent checkbox that is unchecked by default", () => {
    render(<WaitlistForm endpoint="https://example.test/waitlist" />);
    expect(screen.getByRole("textbox", { name: /name/i })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /email/i })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /best describes you/i })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /biggest problem/i })).toBeTruthy();
    const consent = screen.getByRole("checkbox", { name: /product updates/i });
    expect((consent as HTMLInputElement).checked).toBe(false);
  });

  it("submits the answers to the configured endpoint and shows a thank-you", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<WaitlistForm endpoint="https://example.test/waitlist" />);
    await user.type(screen.getByRole("textbox", { name: /name/i }), "Sana");
    await user.type(screen.getByRole("textbox", { name: /email/i }), "sana@example.com");
    await user.selectOptions(
      screen.getByRole("combobox", { name: /best describes you/i }),
      "freelancer",
    );
    await user.type(screen.getByRole("textbox", { name: /biggest problem/i }), "Too many tools");
    await user.click(screen.getByRole("button", { name: /join/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.test/waitlist");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      name: "Sana",
      email: "sana@example.com",
      role: "freelancer",
      pain: "Too many tools",
      updatesConsent: false,
    });
    expect(await screen.findByText(/you're on the list/i)).toBeTruthy();
  });

  it("requires an email before submitting", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<WaitlistForm endpoint="https://example.test/waitlist" />);
    await user.click(screen.getByRole("button", { name: /join/i }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a friendly fallback when no endpoint is configured", () => {
    render(<WaitlistForm endpoint={undefined} />);
    expect(screen.getByText(/not open yet/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /join/i })).toBeNull();
  });

  it("surfaces a retry message when the endpoint fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const user = userEvent.setup();
    render(<WaitlistForm endpoint="https://example.test/waitlist" />);
    await user.type(screen.getByRole("textbox", { name: /email/i }), "x@example.com");
    await user.click(screen.getByRole("button", { name: /join/i }));
    expect(await screen.findByText(/try again/i)).toBeTruthy();
  });
});
