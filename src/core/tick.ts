import type { PrismaClient } from "@/generated/prisma/client";
import { processDueReminders, type DeliveryResult, type ReminderSender } from "./delivery";
import { ensureTodayInstances, type ScheduleConfig } from "./generation";

export interface TickResult {
  generated: number;
  reminders: DeliveryResult;
}

/** One scheduler run (every 5 minutes). Every step is idempotent, so overlapping or repeated runs are safe. */
export async function runTick(
  db: PrismaClient,
  sender: ReminderSender,
  now: Date,
  config: ScheduleConfig,
): Promise<TickResult> {
  const generated = await ensureTodayInstances(db, now, config);
  const reminders = await processDueReminders(db, sender, now, config);
  return { generated, reminders };
}
