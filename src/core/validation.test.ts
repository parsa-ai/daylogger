import { describe, expect, it } from "vitest";
import { MAX_TITLE_LENGTH, parseTime, parseTitle } from "./validation";

describe("parseTitle", () => {
  it("trims and collapses whitespace", () => {
    expect(parseTitle("  Study\n  English\t")).toEqual({ ok: true, title: "Study English" });
  });

  it("rejects empty and too long titles", () => {
    expect(parseTitle("   ").ok).toBe(false);
    expect(parseTitle("x".repeat(MAX_TITLE_LENGTH + 1)).ok).toBe(false);
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
  ])("parses %j", (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });

  it.each(["24:00", "12:60", "9:5", "abc", "", "123"])("rejects %j", (input) => {
    expect(parseTime(input)).toBeNull();
  });
});
