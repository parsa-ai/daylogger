import { describe, expect, it } from "vitest";
import { isCancel, MAX_TITLE_LENGTH, parseTime, parseTitle, toAsciiDigits } from "./validation";

describe("parseTitle", () => {
  it("trims and collapses whitespace", () => {
    expect(parseTitle("  Study\n  English\t")).toEqual({ ok: true, title: "Study English" });
  });

  it("keeps Persian text and ZWNJ intact", () => {
    expect(parseTitle(" مطالعه‌ی زبان ")).toEqual({ ok: true, title: "مطالعه‌ی زبان" });
  });

  it("rejects empty and too long titles", () => {
    expect(parseTitle("   ")).toEqual({ ok: false, reason: "empty" });
    expect(parseTitle("x".repeat(MAX_TITLE_LENGTH + 1))).toEqual({ ok: false, reason: "tooLong" });
    expect(parseTitle("x".repeat(MAX_TITLE_LENGTH)).ok).toBe(true);
  });
});

describe("parseTime", () => {
  it.each([
    ["9", "09:00"],
    ["9:30", "09:30"],
    ["09:30", "09:30"],
    ["21.15", "21:15"],
    [" 0:00 ", "00:00"],
    ["23:59", "23:59"],
    ["۱۰:۳۰", "10:30"],
    ["۹٫۳۰", "09:30"],
    ["۲۱", "21:00"],
    ["٢١:١٥", "21:15"],
  ])("parses %j", (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });

  it.each(["24:00", "12:60", "9:5", "abc", "", "123", "۲۵:۰۰"])("rejects %j", (input) => {
    expect(parseTime(input)).toBeNull();
  });
});

describe("helpers", () => {
  it("converts Persian and Arabic digits", () => {
    expect(toAsciiDigits("۱۲۳ ٤٥٦ 789")).toBe("123 456 789");
  });

  it("recognises cancel words in both languages", () => {
    expect(isCancel(" لغو ")).toBe(true);
    expect(isCancel("بی‌خیال")).toBe(true);
    expect(isCancel("Cancel")).toBe(true);
    expect(isCancel("خرید شارژر")).toBe(false);
  });
});
