import type { PrismaClient } from "@/generated/prisma/client";
import { processDueReminders, type DeliveryResult, type ReminderSender } from "./delivery";
import { finalizeDay, finalizeDue, finalizePastDays } from "./finalize";
import { ensureTodayInstances, type ScheduleConfig } from "./generation";
import { isTimeAfter, localDate, localTime } from "./time";

export interface TickConfig extends ScheduleConfig {
  /** Local "HH:mm" at which the day is closed and the report goes out. */
  reportTime: string;
}

export interface TickResult {
  generated: number;
  finalized: number;
  reminders: DeliveryResult;
}

/** One scheduler run (every 5 minutes). Every step is idempotent, so overlapping or repeated runs are safe. */
export async function runTick(
  db: PrismaClient,
  sender: ReminderSender,
  now: Date,
  config: TickConfig,
): Promise<TickResult> {
  const today = localDate(now, config.timeZone);
  const afterReport = !isTimeAfter(config.reportTime, localTime(now, config.timeZone));

  let finalized = await finalizePastDays(db, today);
  const generated = await ensureTodayInstances(db, now, config);
  finalized += await finalizeDue(db, sender, now);
  // Close the day before sending anything, so no reminder goes out after the report.
  if (afterReport) finalized += await finalizeDay(db, today);
  const reminders = await processDueReminders(db, sender, now, config);

  return { generated, finalized, reminders };
}
