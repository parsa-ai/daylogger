import { describe, expect, it } from "vitest";
import type { ScheduleConfig } from "./generation";
import { canSendAt, firstReminderAt, nextActionAt } from "./reminders";

const config: ScheduleConfig = { timeZone: "Europe/London", cutoff: "21:30" };
const utc = (iso: string) => new Date(iso);

describe("firstReminderAt", () => {
  it("is the task time in group time, unless past the cutoff", () => {
    expect(firstReminderAt("2026-07-01", "10:00", config)).toEqual(utc("2026-07-01T09:00:00Z"));
    expect(firstReminderAt("2026-07-01", "21:30", config)).toEqual(utc("2026-07-01T20:30:00Z"));
    expect(firstReminderAt("2026-07-01", "21:31", config)).toBeNull();
  });
});

describe("canSendAt", () => {
  it("allows only the task's own day, up to the cutoff", () => {
    expect(canSendAt(utc("2026-07-01T20:30:00Z"), "2026-07-01", config)).toBe(true); // 21:30 BST
    expect(canSendAt(utc("2026-07-01T20:31:00Z"), "2026-07-01", config)).toBe(false);
    expect(canSendAt(utc("2026-07-02T08:00:00Z"), "2026-07-01", config)).toBe(false);
  });
});

describe("nextActionAt", () => {
  const task = { date: "2026-07-01", reminderTime: "10:00" }; // 09:00Z

  it("follows the T+1h / T+2h grid when on time", () => {
    expect(nextActionAt(task, 1, utc("2026-07-01T09:02:00Z"), config)).toEqual(utc("2026-07-01T10:00:00Z"));
    expect(nextActionAt(task, 2, utc("2026-07-01T10:03:00Z"), config)).toEqual(utc("2026-07-01T11:00:00Z"));
  });

  it("finalizes one hour after the last reminder", () => {
    expect(nextActionAt(task, 3, utc("2026-07-01T11:04:00Z"), config)).toEqual(utc("2026-07-01T12:04:00Z"));
  });

  it("keeps a minimum gap when sending late", () => {
    // Initial sent 3h late (cron outage): next follow-up 45 min later, not immediately.
    expect(nextActionAt(task, 1, utc("2026-07-01T12:00:00Z"), config)).toEqual(utc("2026-07-01T12:45:00Z"));
  });

  it("stops at the cutoff", () => {
    const late = { date: "2026-07-01", reminderTime: "20:00" }; // 19:00Z
    expect(nextActionAt(late, 1, utc("2026-07-01T19:00:00Z"), config)).toEqual(utc("2026-07-01T20:00:00Z"));
    // 22:00 is past the 21:30 cutoff.
    expect(nextActionAt(late, 2, utc("2026-07-01T20:00:00Z"), config)).toBeNull();

    const at2115 = { date: "2026-07-01", reminderTime: "21:15" };
    expect(nextActionAt(at2115, 1, utc("2026-07-01T20:15:00Z"), config)).toBeNull();
  });

  it("is DST-safe", () => {
    // Fall-back day: 10:00 local is 10:00Z (GMT); follow-up at 11:00 local.
    const autumn = { date: "2026-10-25", reminderTime: "10:00" };
    expect(nextActionAt(autumn, 1, utc("2026-10-25T10:00:00Z"), config)).toEqual(utc("2026-10-25T11:00:00Z"));
    // Spring-forward day: an initial at 00:30 local → follow-up at 02:30 BST (01:30Z).
    const spring = { date: "2026-03-29", reminderTime: "00:30" };
    expect(nextActionAt(spring, 1, utc("2026-03-29T00:30:00Z"), config)).toEqual(utc("2026-03-29T01:30:00Z"));
  });
});
