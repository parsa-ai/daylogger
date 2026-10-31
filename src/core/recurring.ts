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

export type CreateResult = { ok: true; task: RecurringTask } | { ok: false; reason: "limit" };

export async function createRecurringTask(
  db: Db,
  userId: string,
  title: string,
  reminderTime: string,
): Promise<CreateResult> {
  const count = await db.recurringTask.count({ where: { userId, deletedAt: null } });
  if (count >= MAX_RECURRING_TASKS) return { ok: false, reason: "limit" };
  const task = await db.recurringTask.create({ data: { userId, title, reminderTime } });
  return { ok: true, task };
}

// Updates are guarded by owner and "not deleted", so a stale button or a
// non-owner can never change a task. Each returns whether a row changed.
// Existing DailyTask rows are never touched (definitions apply from tomorrow).

async function updateOwned(
  db: Db,
  taskId: string,
  userId: string,
  data: Partial<Pick<RecurringTask, "title" | "reminderTime" | "isActive" | "deletedAt">>,
): Promise<boolean> {
  const { count } = await db.recurringTask.updateMany({
    where: { id: taskId, userId, deletedAt: null },
    data,
  });
  return count === 1;
}

export const renameRecurringTask = (db: Db, taskId: string, userId: string, title: string) =>
  updateOwned(db, taskId, userId, { title });

export const rescheduleRecurringTask = (db: Db, taskId: string, userId: string, reminderTime: string) =>
  updateOwned(db, taskId, userId, { reminderTime });

export const setRecurringTaskActive = (db: Db, taskId: string, userId: string, isActive: boolean) =>
  updateOwned(db, taskId, userId, { isActive });

/** Soft delete: history (past DailyTask rows) keeps its link. */
export const deleteRecurringTask = (db: Db, taskId: string, userId: string, now = new Date()) =>
  updateOwned(db, taskId, userId, { deletedAt: now, isActive: false });
