import type { DailyTask, PrismaClient, User } from "@/generated/prisma/client";
import { toDbDate } from "./time";

type Db = Pick<PrismaClient, "dailyTask">;

export type DailyTaskWithOwner = DailyTask & { user: User };

export function findDailyTask(db: Db, id: string): Promise<DailyTaskWithOwner | null> {
  return db.dailyTask.findUnique({ where: { id }, include: { user: true } });
}

export type CompleteResult = "completed" | "already" | "closed";

/**
 * Mark a task completed by its owner (guarded update, so repeat clicks are
 * no-ops). Only today's PENDING tasks can be completed.
 */
export async function completeTask(
  db: Db,
  task: Pick<DailyTask, "id" | "userId" | "status">,
  now: Date,
  today: string,
): Promise<CompleteResult> {
  const { count } = await db.dailyTask.updateMany({
    where: { id: task.id, userId: task.userId, status: "PENDING", date: toDbDate(today) },
    data: { status: "COMPLETED", completedAt: now, nextReminderAt: null },
  });
  if (count === 1) return "completed";
  const current = await db.dailyTask.findUnique({ where: { id: task.id }, select: { status: true } });
  return current?.status === "COMPLETED" ? "already" : "closed";
}
