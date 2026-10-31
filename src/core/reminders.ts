import type { ScheduleConfig } from "./generation";
import { isTimeAfter, localDate, localTime, toUtc } from "./time";

// Reminder state machine (PLAN.md §3). `reminderCount` is how many reminders
// have been sent: 1 = initial, 2 and 3 = follow-ups. At 3 the next action is
// finalization (→ INCOMPLETE), not another message.

export const MAX_REMINDERS = 3;
export const FOLLOW_UP_INTERVAL_MS = 60 * 60 * 1000;
export const FINALIZE_AFTER_MS = 60 * 60 * 1000;
/** Follow-ups never come sooner than this after the previous one (e.g. after a cron outage). */
export const MIN_GAP_MS = 45 * 60 * 1000;

/** Whether a reminder for a task on `date` may be sent at `now`. */
export function canSendAt(now: Date, date: string, config: ScheduleConfig): boolean {
  return localDate(now, config.timeZone) === date && !isTimeAfter(localTime(now, config.timeZone), config.cutoff);
}

/**
 * When the cron should next act on a task after reminder number `sentCount` was
 * sent at `sentAt`. Follow-ups stay on the T+1h / T+2h grid, but at least
 * MIN_GAP after the previous one; one past the cutoff means no more reminders
 * (null — the task is finalized at report time). After the last reminder, the
 * result is the finalize time.
 */
export function nextActionAt(
  task: { date: string; reminderTime: string },
  sentCount: number,
  sentAt: Date,
  config: ScheduleConfig,
): Date | null {
  if (sentCount >= MAX_REMINDERS) return new Date(sentAt.getTime() + FINALIZE_AFTER_MS);

  const onGrid = toUtc(task.date, task.reminderTime, config.timeZone).getTime() + sentCount * FOLLOW_UP_INTERVAL_MS;
  const next = new Date(Math.max(onGrid, sentAt.getTime() + MIN_GAP_MS));
  return canSendAt(next, task.date, config) ? next : null;
}

/** The first reminder for a task, or null if its time is past the cutoff. */
export function firstReminderAt(date: string, reminderTime: string, config: ScheduleConfig): Date | null {
  return isTimeAfter(reminderTime, config.cutoff) ? null : toUtc(date, reminderTime, config.timeZone);
}
