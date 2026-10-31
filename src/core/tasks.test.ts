import { describe, expect, it, vi } from "vitest";
import { completeTask } from "./tasks";

const now = new Date("2026-07-01T10:30:00Z");
const task = { id: "t1", userId: "u1", status: "PENDING" as const };

function fakeDb(count: number, statusAfter: string) {
  return {
    dailyTask: {
      updateMany: vi.fn().mockResolvedValue({ count }),
      findUnique: vi.fn().mockResolvedValue({ status: statusAfter }),
    },
  };
}

describe("completeTask", () => {
  it("completes a pending or incomplete task for today, guarded by owner and date", async () => {
    const db = fakeDb(1, "COMPLETED");
    expect(await completeTask(db as never, task, now, "2026-07-01")).toBe("completed");
    expect(db.dailyTask.updateMany).toHaveBeenCalledWith({
      where: {
        id: "t1",
        userId: "u1",
        status: { in: ["PENDING", "INCOMPLETE"] },
        date: new Date("2026-07-01T00:00:00Z"),
      },
      data: { status: "COMPLETED", completedAt: now, nextReminderAt: null },
    });
  });

  it("is a no-op on a repeat click", async () => {
    expect(await completeTask(fakeDb(0, "COMPLETED") as never, task, now, "2026-07-01")).toBe("already");
  });

  it("reports cancelled or past tasks as closed", async () => {
    expect(await completeTask(fakeDb(0, "CANCELLED") as never, task, now, "2026-07-01")).toBe("closed");
  });
});
