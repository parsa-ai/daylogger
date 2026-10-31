import type { DailyTask, PrismaClient, RecurringTask, User } from "@/generated/prisma/client";
import type { ScheduleConfig } from "./generation";
import { canSendAt, MAX_REMINDERS, nextActionAt } from "./reminders";
import { fromDbDate } from "./time";

type Db = Pick<PrismaClient, "dailyTask">;

export type DueTask = DailyTask & { user: User; recurringTask: RecurringTask | null };

/** The Telegram side of reminders, injected so this module is testable. */
export interface ReminderSender {
  /** Post reminder number `attempt` (1–3) to the group; returns its message id. */
  sendReminder(task: DueTask, attempt: number): Promise<number>;
  /** Remove the buttons from an older reminder message (best effort). */
  clearButtons(messageId: number): Promise<void>;
  /** Show a finalized task as not completed, keeping a Completed button for later today. */
  markIncomplete(task: DueTask, messageId: number): Promise<void>;
}

export const BATCH_LIMIT = 50;

export interface DeliveryResult {
  sent: number;
  skipped: number;
  failed: number;
}

function shouldSend(task: DueTask, now: Date, config: ScheduleConfig): task is DueTask & { reminderTime: string } {
  const def = task.recurringTask;
  return (
    task.reminderTime !== null &&
    task.user.isActive &&
    (def === null || (def.isActive && def.deletedAt === null)) &&
    canSendAt(now, fromDbDate(task.date), config)
  );
}

/**
 * Send every due reminder (PLAN.md §3). Each send first wins a conditional
 * "claim" update, so concurrent or repeated cron runs never double-send; a
 * failed send reverts the claim so the next run retries.
 */
export async function processDueReminders(
  db: Db,
  sender: ReminderSender,
  now: Date,
  config: ScheduleConfig,
  limit = BATCH_LIMIT,
): Promise<DeliveryResult> {
  const result: DeliveryResult = { sent: 0, skipped: 0, failed: 0 };
  const due = await db.dailyTask.findMany({
    where: { status: "PENDING", nextReminderAt: { lte: now }, reminderCount: { lt: MAX_REMINDERS } },
    include: { user: true, recurringTask: true },
    orderBy: { nextReminderAt: "asc" },
    take: limit,
  });

  for (const task of due) {
    const sentBefore = task.reminderCount;
    const guard = { id: task.id, status: "PENDING", reminderCount: sentBefore, nextReminderAt: task.nextReminderAt } as const;

    // Past the cutoff, another day, paused definition or inactive user:
    // no more reminders (the task is finalized at report time).
    if (!shouldSend(task, now, config)) {
      await db.dailyTask.updateMany({ where: guard, data: { nextReminderAt: null } });
      result.skipped++;
      continue;
    }

    const attempt = sentBefore + 1;
    const next = nextActionAt({ date: fromDbDate(task.date), reminderTime: task.reminderTime }, attempt, now, config);
    const claim = await db.dailyTask.updateMany({ where: guard, data: { reminderCount: attempt, nextReminderAt: next } });
    if (claim.count !== 1) continue; // another run got it, or the owner answered meanwhile

    let messageId: number;
    try {
      messageId = await sender.sendReminder(task, attempt);
    } catch (error) {
      console.error("Failed to send reminder", task.id, error);
      await db.dailyTask.updateMany({
        where: { id: task.id, status: "PENDING", reminderCount: attempt },
        data: { reminderCount: sentBefore, nextReminderAt: task.nextReminderAt },
      });
      result.failed++;
      continue;
    }

    await db.dailyTask.update({ where: { id: task.id }, data: { reminderMessageId: messageId } });
    if (task.reminderMessageId !== null) await sender.clearButtons(task.reminderMessageId).catch(() => {});
    result.sent++;
  }
  return result;
}
