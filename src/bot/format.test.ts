import { describe, expect, it } from "vitest";
import { escapeHtml, fa, persianDate, progressBar } from "./format";

describe("format helpers", () => {
  it("shows Persian digits", () => {
    expect(fa("10:30")).toBe("۱۰:۳۰");
    expect(fa(75)).toBe("۷۵");
  });

  it("draws a progress bar", () => {
    expect(progressBar(0)).toBe("⬜".repeat(10));
    expect(progressBar(71)).toBe("🟩".repeat(7) + "⬜".repeat(3));
    expect(progressBar(100)).toBe("🟩".repeat(10));
  });

  it("formats dates in the Persian calendar", () => {
    expect(persianDate("2026-07-01")).toBe("چهارشنبه ۱۰ تیر");
    expect(persianDate("2026-03-21")).toBe("شنبه ۱ فروردین");
  });

  it("escapes HTML", () => {
    expect(escapeHtml("<b>&")).toBe("&lt;b&gt;&amp;");
  });
});
