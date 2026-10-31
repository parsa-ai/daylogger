import { describe, expect, it, vi } from "vitest";
import { processDueReminders, type DueTask, type ReminderSender } from "./delivery";
import type { ScheduleConfig } from "./generation";

const config: ScheduleConfig = { timeZone: "Europe/London", cutoff: "21:30" };

function makeTask(overrides: Partial<DueTask> = {}): DueTask {
  return {
    id: "t1",
    userId: "u1",
    recurringTaskId: "r1",
    title: "Study English",
    date: new Date("2026-07-01T00:00:00Z"),
    reminderTime: "10:00",
    status: "PENDING",
    reminderCount: 0,
    nextReminderAt: new Date("2026-07-01T09:00:00Z"),
    reminderMessageId: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { isActive: true } as DueTask["user"],
    recurringTask: { isActive: true, deletedAt: null } as DueTask["recurringTask"],
    ...overrides,
  };
}

/** One-row fake that applies `updateMany` only when every `where` field matches. */
function fakeDb(task: DueTask) {
  const row = { ...task };
  const matches = (where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => {
      const actual = row[k as keyof DueTask];
      return actual instanceof Date && v instanceof Date ? actual.getTime() === v.getTime() : actual === v;
    });
  return {
    row,
    dailyTask: {
      findMany: vi.fn(async () => (row.status === "PENDING" ? [{ ...row }] : [])),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: object }) => {
        if (!matches(where)) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      }),
      update: vi.fn(async ({ data }: { data: object }) => Object.assign(row, data)),
    },
  };
}

function fakeSender(messageId = 100): ReminderSender & { sendReminder: ReturnType<typeof vi.fn> } {
  return {
    sendReminder: vi.fn(async () => messageId),
    clearButtons: vi.fn(async () => {}),
    markIncomplete: vi.fn(async () => {}),
  };
}

const at = (iso: string) => new Date(iso);

describe("processDueReminders", () => {
  it("sends the initial reminder and schedules follow-up #1", async () => {
    const db = fakeDb(makeTask());
    const sender = fakeSender(100);
    const result = await processDueReminders(db as never, sender, at("2026-07-01T09:01:00Z"), config);

    expect(result).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect(sender.sendReminder).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }), 1);
    expect(db.row).toMatchObject({
      reminderCount: 1,
      nextReminderAt: at("2026-07-01T10:00:00Z"),
      reminderMessageId: 100,
    });
  });

  it("handles one-time tasks (no definition) the same way", async () => {
    // "/add … in 30 min" at 10:10 BST → reminder at 10:40.
    const oneTime = makeTask({
      recurringTaskId: null,
      recurringTask: null,
      reminderTime: "10:40",
      nextReminderAt: at("2026-07-01T09:40:00Z"),
    });
    const db = fakeDb(oneTime);
    const sender = fakeSender(200);
    const result = await processDueReminders(db as never, sender, at("2026-07-01T09:40:00Z"), config);

    expect(result.sent).toBe(1);
    expect(db.row).toMatchObject({ reminderCount: 1, nextReminderAt: at("2026-07-01T10:40:00Z") });
  });

  it("never sends for a one-time task without a reminder", async () => {
    const db = fakeDb(makeTask({ recurringTaskId: null, recurringTask: null, reminderTime: null }));
    const sender = fakeSender();
    await processDueReminders(db as never, sender, at("2026-07-01T09:40:00Z"), config);
    expect(sender.sendReminder).not.toHaveBeenCalled();
  });

  it("clears buttons on the previous reminder", async () => {
    const db = fakeDb(makeTask({ reminderCount: 1, reminderMessageId: 99, nextReminderAt: at("2026-07-01T10:00:00Z") }));
    const sender = fakeSender(101);
    await processDueReminders(db as never, sender, at("2026-07-01T10:00:00Z"), config);
    expect(sender.clearButtons).toHaveBeenCalledWith(99);
    expect(db.row).toMatchObject({ reminderCount: 2, reminderMessageId: 101 });
  });

  it("sends only once when two runs race", async () => {
    const db = fakeDb(makeTask());
    const sender = fakeSender();
    const now = at("2026-07-01T09:00:00Z");
    await Promise.all([
      processDueReminders(db as never, sender, now, config),
      processDueReminders(db as never, sender, now, config),
    ]);
    expect(sender.sendReminder).toHaveBeenCalledTimes(1);
    expect(db.row.reminderCount).toBe(1);
  });

  it("reverts the claim when Telegram fails", async () => {
    const task = makeTask();
    const db = fakeDb(task);
    const sender = fakeSender();
    sender.sendReminder.mockRejectedValueOnce(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await processDueReminders(db as never, sender, at("2026-07-01T09:00:00Z"), config);
    expect(result.failed).toBe(1);
    expect(db.row).toMatchObject({ reminderCount: 0, nextReminderAt: task.nextReminderAt });
  });

  it.each([
    ["after the cutoff", makeTask(), "2026-07-01T20:35:00Z"],
    ["on a later day", makeTask(), "2026-07-02T09:00:00Z"],
    ["for a paused definition", makeTask({ recurringTask: { isActive: false, deletedAt: null } as never }), "2026-07-01T09:00:00Z"],
    ["for a deleted definition", makeTask({ recurringTask: { isActive: true, deletedAt: new Date() } as never }), "2026-07-01T09:00:00Z"],
    ["for an inactive user", makeTask({ user: { isActive: false } as never }), "2026-07-01T09:00:00Z"],
  ])("sends nothing %s and stops scheduling", async (_label, task, now) => {
    const db = fakeDb(task);
    const sender = fakeSender();
    const result = await processDueReminders(db as never, sender, at(now), config);
    expect(result.skipped).toBe(1);
    expect(sender.sendReminder).not.toHaveBeenCalled();
    expect(db.row.nextReminderAt).toBeNull();
    expect(db.row.status).toBe("PENDING");
  });
});
