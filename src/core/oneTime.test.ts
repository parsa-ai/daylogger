import { describe, expect, it, vi } from "vitest";
import { createOneTimeTask, resolveReminder, setOneTimeReminder } from "./oneTime";

const config = { timeZone: "Europe/London", cutoff: "21:30", reportTime: "22:00" };
const at = (iso: string) => new Date(iso);
const now = at("2026-07-01T09:10:00Z"); // 10:10 BST

describe("resolveReminder", () => {
  it("handles relative choices", () => {
    expect(resolveReminder({ kind: "in", minutes: 30 }, now, config)).toEqual({
      ok: true,
      reminderTime: "10:40",
      nextReminderAt: at("2026-07-01T09:40:00Z"),
    });
  });

  it("handles a specific time later today", () => {
    expect(resolveReminder({ kind: "at", time: "15:00" }, now, config)).toEqual({
      ok: true,
      reminderTime: "15:00",
      nextReminderAt: at("2026-07-01T14:00:00Z"),
    });
  });

  it("allows no reminder", () => {
    expect(resolveReminder({ kind: "none" }, now, config)).toEqual({
      ok: true,
      reminderTime: null,
      nextReminderAt: null,
    });
  });

  it("rejects times in the past", () => {
    expect(resolveReminder({ kind: "at", time: "10:10" }, now, config)).toEqual({ ok: false, reason: "past" });
    expect(resolveReminder({ kind: "at", time: "08:00" }, now, config)).toEqual({ ok: false, reason: "past" });
  });

  it("rejects times after the cutoff, including past midnight", () => {
    expect(resolveReminder({ kind: "at", time: "21:45" }, now, config)).toEqual({ ok: false, reason: "afterCutoff" });
    const late = at("2026-07-01T20:15:00Z"); // 21:15 BST
    expect(resolveReminder({ kind: "in", minutes: 30 }, late, config)).toEqual({ ok: false, reason: "afterCutoff" });
    expect(resolveReminder({ kind: "in", minutes: 60 }, at("2026-07-01T22:30:00Z"), config)).toEqual({
      ok: false,
      reason: "afterCutoff",
    });
  });
});

describe("createOneTimeTask", () => {
  const fakeDb = (count = 0) => ({
    dailyTask: {
      count: vi.fn().mockResolvedValue(count),
      create: vi.fn(async ({ data }) => ({ id: "t1", ...data })),
    },
  });

  it("creates a task for the group-local date without a definition", async () => {
    const db = fakeDb();
    const result = await createOneTimeTask(db as never, "u1", "Buy a charger", at("2026-06-30T23:30:00Z"), config);
    expect(result.ok).toBe(true);
    expect(db.dailyTask.create).toHaveBeenCalledWith({
      data: { userId: "u1", title: "Buy a charger", date: at("2026-07-01T00:00:00Z") },
    });
  });

  it("refuses after the report and over the daily limit", async () => {
    expect(await createOneTimeTask(fakeDb() as never, "u1", "x", at("2026-07-01T21:00:00Z"), config)).toEqual({
      ok: false,
      reason: "afterReport",
    });
    expect(await createOneTimeTask(fakeDb(20) as never, "u1", "x", now, config)).toEqual({ ok: false, reason: "limit" });
  });
});

describe("setOneTimeReminder", () => {
  it("only applies once to an untouched one-time task of the owner", async () => {
    const db = { dailyTask: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) } };
    const reminder = { reminderTime: "10:40", nextReminderAt: at("2026-07-01T09:40:00Z") };
    expect(await setOneTimeReminder(db as never, { id: "t1", userId: "u1" }, reminder)).toBe(false);
    expect(db.dailyTask.updateMany).toHaveBeenCalledWith({
      where: {
        id: "t1",
        userId: "u1",
        recurringTaskId: null,
        status: "PENDING",
        reminderCount: 0,
        reminderTime: null,
        nextReminderAt: null,
      },
      data: reminder,
    });
  });
});
