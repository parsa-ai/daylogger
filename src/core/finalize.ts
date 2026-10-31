import type { PrismaClient } from "@/generated/prisma/client";
import { BATCH_LIMIT, type DueTask, type ReminderSender } from "./delivery";
import { MAX_REMINDERS } from "./reminders";
import { toDbDate } from "./time";

type Db = Pick<PrismaClient, "dailyTask">;

const INCOMPLETE = { status: "INCOMPLETE", nextReminderAt: null } as const;

/**
 * Tasks whose last reminder went unanswered for an hour become INCOMPLETE.
 * The guarded update makes this safe to race; only the winner edits the message.
 */
export async function finalizeDue(
  db: Db,
  sender: Pick<ReminderSender, "markIncomplete">,
  now: Date,
  limit = BATCH_LIMIT,
): Promise<number> {
  const due: DueTask[] = await db.dailyTask.findMany({
    where: { status: "PENDING", reminderCount: { gte: MAX_REMINDERS }, nextReminderAt: { lte: now } },
    include: { user: true, recurringTask: true },
    orderBy: { nextReminderAt: "asc" },
    take: limit,
  });

  let finalized = 0;
  for (const task of due) {
    const { count } = await db.dailyTask.updateMany({
      where: { id: task.id, status: "PENDING", reminderCount: task.reminderCount },
      data: INCOMPLETE,
    });
    if (count !== 1) continue;
    finalized++;
    if (task.reminderMessageId !== null) {
      await sender.markIncomplete(task, task.reminderMessageId).catch((error) => {
        console.error("Failed to edit finalized reminder", task.id, error);
      });
    }
  }
  return finalized;
}

/** Everything still PENDING on `date` becomes INCOMPLETE (pre-report sweep). */
export async function finalizeDay(db: Db, date: string): Promise<number> {
  const { count } = await db.dailyTask.updateMany({
    where: { status: "PENDING", date: toDbDate(date) },
    data: INCOMPLETE,
  });
  return count;
}

/** Self-heal: PENDING tasks from earlier days (e.g. a missed report run) become INCOMPLETE. */
export async function finalizePastDays(db: Db, today: string): Promise<number> {
  const { count } = await db.dailyTask.updateMany({
    where: { status: "PENDING", date: { lt: toDbDate(today) } },
    data: INCOMPLETE,
  });
  return count;
}
