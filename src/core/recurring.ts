import type { PrismaClient, RecurringTask, User } from "@/generated/prisma/client";

type Db = Pick<PrismaClient, "recurringTask">;

export const MAX_RECURRING_TASKS = 20;

export type TaskWithOwner = RecurringTask & { user: User };

/** The user's non-deleted recurring tasks, ordered by reminder time. */
export function listRecurringTasks(db: Db, userId: string): Promise<RecurringTask[]> {
  return db.recurringTask.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ reminderTime: "asc" }, { createdAt: "asc" }],
  });
}

/** A non-deleted recurring task with its owner, or null. */
export function findRecurringTask(db: Db, taskId: string): Promise<TaskWithOwner | null> {
  return db.recurringTask.findFirst({
    where: { id: taskId, deletedAt: null },
    include: { user: true },
  });
}

export function isOwner(task: { user: Pick<User, "telegramUserId"> }, telegramUserId: number): boolean {
  return task.user.telegramUserId === BigInt(telegramUserId);
}
