import { describe, expect, it, vi } from "vitest";
import { finalizeDay, finalizeDue, finalizePastDays } from "./finalize";

const now = new Date("2026-07-01T12:05:00Z");
const task = { id: "t1", reminderCount: 3, reminderMessageId: 77 };

function fakeDb(claimCount = 1) {
  return {
    dailyTask: {
      findMany: vi.fn().mockResolvedValue([task]),
      updateMany: vi.fn().mockResolvedValue({ count: claimCount }),
    },
  };
}

describe("finalizeDue", () => {
  it("marks unanswered tasks INCOMPLETE with a guarded update and edits the message", async () => {
    const db = fakeDb();
    const sender = { markIncomplete: vi.fn(async () => {}) };
    expect(await finalizeDue(db as never, sender, now)).toBe(1);

    expect(db.dailyTask.findMany.mock.calls[0][0].where).toEqual({
      status: "PENDING",
      reminderCount: { gte: 3 },
      nextReminderAt: { lte: now },
    });
    expect(db.dailyTask.updateMany).toHaveBeenCalledWith({
      where: { id: "t1", status: "PENDING", reminderCount: 3 },
      data: { status: "INCOMPLETE", nextReminderAt: null },
    });
    expect(sender.markIncomplete).toHaveBeenCalledWith(task, 77);
  });

  it("does not edit the message when another run won", async () => {
    const sender = { markIncomplete: vi.fn(async () => {}) };
    expect(await finalizeDue(fakeDb(0) as never, sender, now)).toBe(0);
    expect(sender.markIncomplete).not.toHaveBeenCalled();
  });

  it("still counts the task when the edit fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const sender = { markIncomplete: vi.fn(async () => Promise.reject(new Error("gone"))) };
    expect(await finalizeDue(fakeDb() as never, sender, now)).toBe(1);
  });
});

describe("day sweeps", () => {
  it("finalizes the given day and earlier days", async () => {
    const db = fakeDb(2);
    expect(await finalizeDay(db as never, "2026-07-01")).toBe(2);
    expect(db.dailyTask.updateMany.mock.calls[0][0].where).toEqual({
      status: "PENDING",
      date: new Date("2026-07-01T00:00:00Z"),
    });

    await finalizePastDays(db as never, "2026-07-01");
    expect(db.dailyTask.updateMany.mock.calls[1][0].where).toEqual({
      status: "PENDING",
      date: { lt: new Date("2026-07-01T00:00:00Z") },
    });
  });
});
