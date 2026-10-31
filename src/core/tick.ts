import type { PrismaClient } from "@/generated/prisma/client";
import { processDueReminders, type DeliveryResult, type GroupSender } from "./delivery";
import { finalizeDay, finalizeDue, finalizePastDays } from "./finalize";
import { ensureTodayInstances, type ScheduleConfig } from "./generation";
import { hasMissedReport, publishReportOnce } from "./report";
import { isTimeAfter, localDate, localTime, previousDate } from "./time";

export interface TickConfig extends ScheduleConfig {
  /** Local "HH:mm" at which the day is closed and the report goes out. */
  reportTime: string;
}

export interface TickResult {
  generated: number;
  finalized: number;
  reminders: DeliveryResult;
  /** Dates whose final report this tick published. */
  reported: string[];
}

/** One scheduler run (every 5 minutes). Every step is idempotent, so overlapping or repeated runs are safe. */
export async function runTick(
  db: PrismaClient,
  sender: GroupSender,
  now: Date,
  config: TickConfig,
): Promise<TickResult> {
  const today = localDate(now, config.timeZone);
  const afterReport = !isTimeAfter(config.reportTime, localTime(now, config.timeZone));

  const reported: string[] = [];
  const publish = async (date: string) => {
    if (await publishReportOnce(db, sender, date)) reported.push(date);
  };

  let finalized = await finalizePastDays(db, today);
  // Self-heal: yesterday's report if every evening tick was missed.
  const yesterday = previousDate(today);
  if (await hasMissedReport(db, yesterday)) await publish(yesterday);

  const generated = await ensureTodayInstances(db, now, config);
  finalized += await finalizeDue(db, sender, now);
  // Close the day and report before sending anything, so no reminder goes out after the report.
  if (afterReport) {
    finalized += await finalizeDay(db, today);
    await publish(today);
  }
  const reminders = await processDueReminders(db, sender, now, config);

  return { generated, finalized, reminders, reported };
}
