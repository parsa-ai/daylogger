import type { Context } from "grammy";
import { loadReport } from "@/core/report";
import { localDate } from "@/core/time";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatReport } from "../report";

/** `/report` — the day so far (not the final 22:00 report). */
export async function reportCommand(ctx: Context) {
  const today = localDate(new Date(), env().GROUP_TIMEZONE);
  const data = await loadReport(db(), today);
  for (const text of formatReport(data, "snapshot")) {
    await ctx.reply(text, { parse_mode: "HTML" });
  }
}
