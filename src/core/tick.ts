import type { PrismaClient } from "@/generated/prisma/client";
import { ensureTodayInstances, type ScheduleConfig } from "./generation";

export interface TickResult {
  generated: number;
}

/** One scheduler run (every 5 minutes). Every step is idempotent, so overlapping or repeated runs are safe. */
export async function runTick(db: PrismaClient, now: Date, config: ScheduleConfig): Promise<TickResult> {
  const generated = await ensureTodayInstances(db, now, config);
  return { generated };
}
