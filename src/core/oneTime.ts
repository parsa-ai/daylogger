import type { DailyTask, PrismaClient } from "@/generated/prisma/client";
import type { TickConfig } from "./tick";
import { isTimeAfter, localDate, localTime, toDbDate, toUtc } from "./time";

type Db = Pick<PrismaClient, "dailyTask">;

export const MAX_ONE_TIME_PER_DAY = 20;

export type ReminderChoice = { kind: "in"; minutes: number } | { kind: "at"; time: string } | { kind: "none" };

export type ResolvedReminder =
  | { ok: true; reminderTime: string | null; nextReminderAt: Date | null }
  | { ok: false; reason: "past" | "afterCutoff" };

/** Turn a reminder choice into the stored fields; times must be later today and not after the cutoff. */
export function resolveReminder(
  choice: ReminderChoice,
  now: Date,
  config: Pick<TickConfig, "timeZone" | "cutoff">,
): ResolvedReminder {
  if (choice.kind === "none") return { ok: true, reminderTime: null, nextReminderAt: null };

  const today = localDate(now, config.timeZone);
  const at =
    choice.kind === "in"
      ? new Date(now.getTime() + choice.minutes * 60_000)
      : toUtc(today, choice.time, config.timeZone);

  if (at.getTime() <= now.getTime()) return { ok: false, reason: "past" };
  const time = localTime(at, config.timeZone);
  if (localDate(at, config.timeZone) !== today || isTimeAfter(time, config.cutoff)) {
    return { ok: false, reason: "afterCutoff" };
  }
  return { ok: true, reminderTime: time, nextReminderAt: at };
}

export type CreateOneTimeResult = { ok: true; task: DailyTask } | { ok: false; reason: "afterReport" | "limit" };

/**
 * A one-time task for today (no recurring definition, never repeats). It starts
 * without a reminder until the owner picks one, so it is in the report either way.
 */
export async function createOneTimeTask(
  db: Db,
  userId: string,
  title: string,
  now: Date,
  config: Pick<TickConfig, "timeZone" | "reportTime">,
): Promise<CreateOneTimeResult> {
  const today = localDate(now, config.timeZone);
  if (!isTimeAfter(config.reportTime, localTime(now, config.timeZone))) return { ok: false, reason: "afterReport" };

  const date = toDbDate(today);
  const count = await db.dailyTask.count({ where: { userId, date, recurringTaskId: null } });
  if (count >= MAX_ONE_TIME_PER_DAY) return { ok: false, reason: "limit" };

  const task = await db.dailyTask.create({ data: { userId, title, date } });
  return { ok: true, task };
}

/**
 * Set the reminder of a fresh one-time task. Guarded so it only applies once,
 * by the owner, before anything was scheduled or sent.
 */
export async function setOneTimeReminder(
  db: Db,
  task: Pick<DailyTask, "id" | "userId">,
  reminder: { reminderTime: string | null; nextReminderAt: Date | null },
): Promise<boolean> {
  const { count } = await db.dailyTask.updateMany({
    where: {
      id: task.id,
      userId: task.userId,
      recurringTaskId: null,
      status: "PENDING",
      reminderCount: 0,
      reminderTime: null,
      nextReminderAt: null,
    },
    data: reminder,
  });
  return count === 1;
}
