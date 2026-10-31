import { describe, expect, it } from "vitest";
import { isTimeAfter, localDate, localTime, startOfLocalDay, toDbDate, toUtc } from "./time";

const LONDON = "Europe/London";

describe("localDate / localTime", () => {
  it("uses the group timezone, not UTC", () => {
    // 23:30 UTC on 30 June is already 1 July in London (BST, UTC+1).
    const now = new Date("2026-06-30T23:30:00Z");
    expect(localDate(now, LONDON)).toBe("2026-07-01");
    expect(localTime(now, LONDON)).toBe("00:30");
    expect(localDate(now, "UTC")).toBe("2026-06-30");
  });

  it("handles winter (GMT) and other zones", () => {
    expect(localTime(new Date("2026-01-15T09:00:00Z"), LONDON)).toBe("09:00");
    expect(localDate(new Date("2026-01-15T21:00:00Z"), "Asia/Tehran")).toBe("2026-01-16");
  });
});

describe("toUtc", () => {
  it("converts summer and winter times", () => {
    expect(toUtc("2026-07-01", "10:00", LONDON).toISOString()).toBe("2026-07-01T09:00:00.000Z");
    expect(toUtc("2026-01-01", "10:00", LONDON).toISOString()).toBe("2026-01-01T10:00:00.000Z");
  });

  it("works on the spring-forward day (2026-03-29)", () => {
    expect(toUtc("2026-03-29", "00:30", LONDON).toISOString()).toBe("2026-03-29T00:30:00.000Z");
    expect(toUtc("2026-03-29", "10:00", LONDON).toISOString()).toBe("2026-03-29T09:00:00.000Z");
  });

  it("moves a skipped time forward by the gap", () => {
    // 01:30 doesn't exist in London on 2026-03-29; it becomes 02:30 BST.
    const utc = toUtc("2026-03-29", "01:30", LONDON);
    expect(utc.toISOString()).toBe("2026-03-29T01:30:00.000Z");
    expect(localTime(utc, LONDON)).toBe("02:30");
  });

  it("works on the fall-back day (2026-10-25)", () => {
    expect(toUtc("2026-10-25", "00:30", LONDON).toISOString()).toBe("2026-10-24T23:30:00.000Z");
    expect(toUtc("2026-10-25", "10:00", LONDON).toISOString()).toBe("2026-10-25T10:00:00.000Z");
    // Ambiguous 01:30 resolves to a real 01:30 local.
    expect(localTime(toUtc("2026-10-25", "01:30", LONDON), LONDON)).toBe("01:30");
  });
});

describe("helpers", () => {
  it("startOfLocalDay is local midnight", () => {
    expect(startOfLocalDay("2026-07-01", LONDON).toISOString()).toBe("2026-06-30T23:00:00.000Z");
  });

  it("toDbDate is UTC midnight of the local date", () => {
    expect(toDbDate("2026-07-01").toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("compares HH:mm", () => {
    expect(isTimeAfter("21:31", "21:30")).toBe(true);
    expect(isTimeAfter("21:30", "21:30")).toBe(false);
    expect(isTimeAfter("09:00", "21:30")).toBe(false);
  });
});
