import { runTick } from "@/core/tick";
import { safeEqual } from "@/lib/auth";
import { db } from "@/lib/db";
import { env, scheduleConfig } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called every 5 minutes by Vercel Cron (or an external pinger, see PLAN.md D1).
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${env().CRON_SECRET}`)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (env().GROUP_CHAT_ID === undefined) {
    return new Response("GROUP_CHAT_ID is not configured", { status: 503 });
  }

  const result = await runTick(db(), new Date(), scheduleConfig());
  return Response.json(result);
}
