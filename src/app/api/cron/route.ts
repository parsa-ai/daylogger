import { telegramReminderSender } from "@/bot/sender";
import { runTick } from "@/core/tick";
import { safeEqual } from "@/lib/auth";
import { db } from "@/lib/db";
import { env, scheduleConfig } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called by a free external pinger (cron-job.org) every 5–10 minutes; see docs/SCHEDULER.md.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${env().CRON_SECRET}`)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (env().GROUP_CHAT_ID === undefined) {
    return new Response("GROUP_CHAT_ID is not configured", { status: 503 });
  }

  const result = await runTick(db(), telegramReminderSender(), new Date(), scheduleConfig());
  return Response.json(result);
}
