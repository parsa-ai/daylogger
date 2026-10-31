import { describe, expect, it, vi } from "vitest";
import { buildDailyInstances, ensureTodayInstances, type ScheduleConfig } from "./generation";

const config: ScheduleConfig = { timeZone: "Europe/London", cutoff: "21:30" };

const def = (id: string, reminderTime: string) => ({ id, userId: "u1", title: `Task ${id}`, reminderTime });

describe("buildDailyInstances", () => {
  it("copies the definition and schedules the first reminder in group time", () => {
    const [instance] = buildDailyInstances([def("a", "10:00")], "2026-07-01", config);
    expect(instance).toEqual({
      userId: "u1",
      recurringTaskId: "a",
      title: "Task a",
      date: new Date("2026-07-01T00:00:00Z"),
      reminderTime: "10:00",
      nextReminderAt: new Date("2026-07-01T09:00:00Z"),
    });
  });

  it("schedules no reminder after the cutoff", () => {
    const instances = buildDailyInstances([def("a", "21:30"), def("b", "21:45")], "2026-07-01", config);
    expect(instances.map((i) => i.nextReminderAt)).toEqual([new Date("2026-07-01T20:30:00Z"), null]);
  });

  it("is DST-safe on change days", () => {
    const spring = buildDailyInstances([def("a", "10:00")], "2026-03-29", config);
    expect(spring[0].nextReminderAt).toEqual(new Date("2026-03-29T09:00:00Z"));
    const autumn = buildDailyInstances([def("a", "10:00")], "2026-10-25", config);
    expect(autumn[0].nextReminderAt).toEqual(new Date("2026-10-25T10:00:00Z"));
  });
});

describe("ensureTodayInstances", () => {
  function fakeDb(definitions: ReturnType<typeof def>[]) {
    return {
      recurringTask: { findMany: vi.fn().mockResolvedValue(definitions) },
      dailyTask: { createMany: vi.fn().mockResolvedValue({ count: definitions.length }) },
    };
  }

  it("uses the group-local date and only tasks created before today", async () => {
    const db = fakeDb([def("a", "10:00")]);
    // 23:30 UTC on 30 June = 00:30 on 1 July in London.
    const created = await ensureTodayInstances(db as never, new Date("2026-06-30T23:30:00Z"), config);

    expect(created).toBe(1);
    const where = db.recurringTask.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ isActive: true, deletedAt: null, user: { isActive: true } });
    expect(where.createdAt).toEqual({ lt: new Date("2026-06-30T23:00:00Z") });

    const { data, skipDuplicates } = db.dailyTask.createMany.mock.calls[0][0];
    expect(skipDuplicates).toBe(true);
    expect(data[0].date).toEqual(new Date("2026-07-01T00:00:00Z"));
  });

  it("skips the insert when there is nothing to generate", async () => {
    const db = fakeDb([]);
    expect(await ensureTodayInstances(db as never, new Date(), config)).toBe(0);
    expect(db.dailyTask.createMany).not.toHaveBeenCalled();
  });
});
