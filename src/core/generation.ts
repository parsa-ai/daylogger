import type { Prisma, PrismaClient, RecurringTask } from "@/generated/prisma/client";
import { firstReminderAt } from "./reminders";
import { localDate, startOfLocalDay, toDbDate } from "./time";

type Db = Pick<PrismaClient, "recurringTask" | "dailyTask">;

export interface ScheduleConfig {
  timeZone: string;
  /** Latest local "HH:mm" at which a reminder may be sent. */
  cutoff: string;
}

type Definition = Pick<RecurringTask, "id" | "userId" | "title" | "reminderTime">;

/**
 * Daily instances for `date`, copying title and time from each definition so later
 * edits never change them. A reminder time after the cutoff gets no reminder.
 */
export function buildDailyInstances(
  definitions: Definition[],
  date: string,
  config: ScheduleConfig,
): Prisma.DailyTaskCreateManyInput[] {
  return definitions.map((d) => ({
    userId: d.userId,
    recurringTaskId: d.id,
    title: d.title,
    date: toDbDate(date),
    reminderTime: d.reminderTime,
    nextReminderAt: firstReminderAt(date, d.reminderTime, config),
  }));
}

/**
 * Create today's instances for every active recurring task (idempotent: the
 * `(recurringTaskId, date)` unique key skips existing ones, so every cron run can
 * call this and a missed midnight self-heals). Tasks created today first appear
 * tomorrow (PLAN.md D9). Returns how many instances were created.
 */
export async function ensureTodayInstances(db: Db, now: Date, config: ScheduleConfig): Promise<number> {
  const date = localDate(now, config.timeZone);
  const definitions = await db.recurringTask.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      createdAt: { lt: startOfLocalDay(date, config.timeZone) },
      user: { isActive: true },
    },
    select: { id: true, userId: true, title: true, reminderTime: true },
  });
  if (definitions.length === 0) return 0;

  const { count } = await db.dailyTask.createMany({
    data: buildDailyInstances(definitions, date, config),
    skipDuplicates: true,
  });
  return count;
}
